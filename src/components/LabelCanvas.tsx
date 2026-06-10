/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { LabelConfig, LabelObject, SheetLayoutConfig } from "../types";
import { BarcodeRenderer } from "./BarcodeRenderer";
import { QRCodeRenderer } from "./QRCodeRenderer";
import { mmToPx, pxToMm, constrainCoordinates, BASE_DPI_SCALE } from "../utils";
import { Trash, Maximize2, Move, LayoutGrid, RefreshCw } from "lucide-react";

interface LabelCanvasProps {
  labelConfig: LabelConfig;
  objects: LabelObject[];
  selectedId: string | null;
  selectedIds?: string[];
  pixelScale: number; // Pixels per millimeter (e.g., 4)
  gridSnapSize: number; // snappy size in mm (e.g., 1mm. 0 means none)
  onSelectObject: (id: string | null) => void;
  onSelectObjectWithModifier?: (id: string | null, isMultiSelect: boolean) => void;
  onSelectMultipleObjects?: (ids: string[]) => void;
  onUpdateObjectCoordinates: (id: string, x: number, y: number) => void;
  onUpdateMultipleObjectsCoordinates?: (coordsList: Array<{ id: string; x: number; y: number }>) => void;
  onUpdateObjectGeometry: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  onDeleteObject: (id: string) => void;
  isBatchPrinting?: boolean;
  excelData?: any[];
  resolveDynamicObjects?: (
    objs: LabelObject[],
    rowIndex: number,
  ) => LabelObject[];
  sheetConfig?: SheetLayoutConfig;
  officePreviewMode?: "design" | "sheet";
  printCopies?: number;
  printManifestLength?: number;
  isSystemPrinting?: boolean;
  onAddImageObject?: (content: string) => void;
  onUpdateObject?: (updated: LabelObject) => void;
  currentFilePath?: string | null;
  currentLocalStorageKey?: string | null;
  saveLogs?: Array<{ time: string; path: string; type: 'save' | 'import' | 'quick-save' }>;
  onUpdateGridSnapSize?: (size: number) => void;
}

const getRotatedCursor = (
  handle:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center"
    | "left-center"
    | "right-center",
  angle: number = 0,
): string => {
  if (!angle) {
    if (handle === "top-center" || handle === "bottom-center")
      return "ns-resize";
    if (handle === "left-center" || handle === "right-center")
      return "ew-resize";
    if (handle === "top-left" || handle === "bottom-right")
      return "nwse-resize";
    if (handle === "top-right" || handle === "bottom-left")
      return "nesw-resize";
    return "move";
  }

  let baseAngle = 0;
  if (handle === "top-center") baseAngle = 0;
  else if (handle === "top-right") baseAngle = 45;
  else if (handle === "right-center") baseAngle = 90;
  else if (handle === "bottom-right") baseAngle = 135;
  else if (handle === "bottom-center") baseAngle = 180;
  else if (handle === "bottom-left") baseAngle = 225;
  else if (handle === "left-center") baseAngle = 270;
  else if (handle === "top-left") baseAngle = 315;

  const totalAngle = (baseAngle + angle) % 360;
  const normalized = totalAngle < 0 ? totalAngle + 360 : totalAngle;

  if (
    normalized >= 337.5 ||
    normalized < 22.5 ||
    (normalized >= 157.5 && normalized < 202.5)
  ) {
    return "ns-resize";
  } else if (
    (normalized >= 22.5 && normalized < 67.5) ||
    (normalized >= 202.5 && normalized < 247.5)
  ) {
    return "nesw-resize";
  } else if (
    (normalized >= 67.5 && normalized < 112.5) ||
    (normalized >= 247.5 && normalized < 292.5)
  ) {
    return "ew-resize";
  } else {
    return "nwse-resize";
  }
};

const parseFormattedDate = (val: string): Date | null => {
  if (!val) return null;
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }
  const dmYRegex = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const match = val.trim().match(dmYRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    const d = new Date(year, month, day, hour, minute, second);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }
  return null;
};

const formatLabelDateTime = (date: Date, format: string): string => {
  const pad = (num: number, size: number = 2) => {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
  };
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  let formatted = format;
  formatted = formatted.replace(/YYYY/g, year.toString());
  formatted = formatted.replace(/YY/g, (year % 100).toString().padStart(2, "0"));
  formatted = formatted.replace(/MM/g, pad(month));
  formatted = formatted.replace(/DD/g, pad(day));
  formatted = formatted.replace(/HH/g, pad(hours));
  formatted = formatted.replace(/mm/g, pad(minutes));
  formatted = formatted.replace(/ss/g, pad(seconds));
  formatted = formatted.replace(/D/g, day.toString());
  formatted = formatted.replace(/M/g, month.toString());
  return formatted;
};

const formatLabelNumber = (
  num: number,
  decimalSeparator: "." | "," = ".",
  useThousands: boolean = false,
  decimalPlaces?: number,
): string => {
  const decPlaces = decimalPlaces !== undefined ? decimalPlaces : (num % 1 === 0 ? 0 : 2);
  let formatted = num.toFixed(decPlaces);
  const parts = formatted.split(".");
  let integerPart = parts[0];
  const decimalPart = parts[1];

  if (useThousands) {
    const thousandsSeparator = decimalSeparator === "." ? "," : ".";
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  }

  if (decimalPart !== undefined && decimalPart.length > 0) {
    return integerPart + decimalSeparator + decimalPart;
  }
  return integerPart;
};

export const formatLabelText = (obj: LabelObject): string => {
  if (obj.dataFormatType === "datetime" && obj.useSystemTime) {
    const now = new Date();
    return formatLabelDateTime(now, obj.datetimeFormat || "DD/MM/YYYY HH:mm");
  }

  let rawValue = obj.content;
  if (!rawValue) return "";

  if (obj.dataFormatType === "number") {
    // Keep prefix/suffix cleaner by removing non-numeric chars for the internal parsed decimal formatter
    const cleanStr = rawValue.replace(/[^\d.-]/g, "");
    const num = parseFloat(cleanStr);
    if (!isNaN(num)) {
      return formatLabelNumber(
        num,
        obj.numberDecimalSeparator || ".",
        obj.numberThousandsSeparator ?? false,
        obj.numberDecimalPlaces,
      );
    }
  } else if (obj.dataFormatType === "datetime") {
    const date = parseFormattedDate(rawValue);
    if (date) {
      return formatLabelDateTime(date, obj.datetimeFormat || "DD/MM/YYYY HH:mm");
    }
  }

  return rawValue;
};

const ShapeRenderer = ({ obj, pixelScale }: { obj: LabelObject; pixelScale: number }) => {
  const shapeType = obj.shapeType || "rect";
  const strokeColor = obj.shapeStrokeColor || "#000000";
  const fillColor = obj.shapeFillColor || "transparent";
  const strokeWidthMm = obj.shapeStrokeWidth !== undefined ? obj.shapeStrokeWidth : 1;
  const strokeWidthPx = strokeWidthMm * pixelScale;
  const cornerRadiusMm = obj.shapeCornerRadius || 0;
  const cornerRadiusPx = cornerRadiusMm * pixelScale;
  const strokeStyle = obj.shapeStrokeStyle || "solid";

  if (shapeType === "line") {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          style={{
            width: "100%",
            height: 0,
            borderTop: `${strokeWidthPx}px ${strokeStyle} ${strokeColor}`,
          }}
        />
      </div>
    );
  }

  const isCircle = shapeType === "circle";
  const isOval = shapeType === "oval";
  const borderRadiusStyle = isCircle || isOval ? "50%" : `${cornerRadiusPx}px`;

  return (
    <div
      className="w-full h-full"
      style={{
        border: strokeWidthPx > 0 ? `${strokeWidthPx}px ${strokeStyle} ${strokeColor}` : "none",
        backgroundColor: fillColor,
        borderRadius: borderRadiusStyle,
        boxSizing: "border-box",
      }}
    />
  );
};

const renderTextElement = (obj: LabelObject, pixelScale: number) => {
  const displayContent = formatLabelText(obj);

  const resolveFontFamily = (family: string | undefined) => {
    if (family === "Arial") return "Arial, Helvetica, sans-serif";
    if (family === "Times New Roman") return "'Times New Roman', Times, serif";
    if (family === "Tahoma") return "Tahoma, Geneva, sans-serif";
    if (family === "monospace") return "var(--font-mono)";
    return "var(--font-sans)";
  };

  // Resolve alignment / flow origin classes
  const origin =
    obj.textFlowOrigin ||
    (obj.textAlign === "center"
      ? "center"
      : obj.textAlign === "right"
        ? "top-right"
        : "top-left");

  let justifyClass = "justify-start";
  let alignClass = "items-start";
  let textalign = "left";

  if (origin.startsWith("top")) {
    justifyClass = "justify-start";
  } else if (origin.startsWith("center") || origin === "center") {
    justifyClass = "justify-center";
  } else if (origin.startsWith("bottom")) {
    justifyClass = "justify-end";
  }

  if (origin.endsWith("left")) {
    alignClass = "items-start";
    textalign = "left";
  } else if (origin === "center" || origin.endsWith("center")) {
    alignClass = "items-center";
    textalign = "center";
  } else if (origin.endsWith("right")) {
    alignClass = "items-end";
    textalign = "right";
  }

  const renderSegment = (
    text: string,
    fontSizeVal?: number,
    fontFamilyVal?: string,
    fontWeightVal?: "normal" | "bold",
    fontStyleVal?: "normal" | "italic",
    underlineVal?: boolean,
    lineThroughVal?: boolean,
    superSubVal?: "normal" | "subscript" | "superscript",
    colorVal?: string,
  ) => {
    let decs = [];
    if (underlineVal) decs.push("underline");
    if (lineThroughVal) decs.push("line-through");
    const deco = decs.length > 0 ? decs.join(" ") : "none";

    let wrapped: React.ReactNode = text;
    if (superSubVal === "subscript") {
      wrapped = (
        <sub className="align-sub text-[70%] font-semibold leading-none">
          {text}
        </sub>
      );
    } else if (superSubVal === "superscript") {
      wrapped = (
        <sup className="align-super text-[70%] font-semibold leading-none">
          {text}
        </sup>
      );
    }

    return (
      <span
        style={{
          fontFamily: resolveFontFamily(fontFamilyVal || obj.fontFamily),
          fontWeight: fontWeightVal || "normal",
          fontStyle: fontStyleVal || "normal",
          textDecoration: deco,
          fontSize: `${(fontSizeVal || obj.fontSize || 11) * 0.352777 * pixelScale}px`,
          color: colorVal || undefined,
        }}
      >
        {wrapped}
      </span>
    );
  };

  const flexJustify =
    textalign === "center"
      ? "center"
      : textalign === "right"
        ? "flex-end"
        : "flex-start";

  return (
    <div
      className={`w-full h-full select-none leading-normal break-words overflow-hidden flex flex-col ${justifyClass} ${alignClass}`}
      style={{
        textAlign: textalign as any,
        whiteSpace: "pre-wrap",
        color: obj.color || "#000000",
      }}
    >
      <div
        className="max-w-full w-full flex flex-wrap items-baseline"
        style={{ justifyContent: flexJustify }}
      >
        {obj.prefixText &&
          renderSegment(
            obj.prefixText,
            obj.prefixFontSize,
            obj.prefixFontFamily,
            obj.prefixFontWeight,
            obj.prefixFontStyle,
            obj.prefixTextDecorationUnderline,
            obj.prefixTextDecorationLineThrough,
            obj.prefixTextSuperSub,
            obj.prefixColor,
          )}
        {renderSegment(
          displayContent,
          obj.fontSize,
          obj.fontFamily,
          obj.fontWeight,
          obj.fontStyle,
          obj.textDecorationUnderline,
          obj.textDecorationLineThrough,
          obj.textSuperSub,
          obj.color,
        )}
        {obj.suffixText &&
          renderSegment(
            obj.suffixText,
            obj.suffixFontSize,
            obj.suffixFontFamily,
            obj.suffixFontWeight,
            obj.suffixFontStyle,
            obj.suffixTextDecorationUnderline,
            obj.suffixTextDecorationLineThrough,
            obj.suffixTextSuperSub,
            obj.suffixColor,
          )}
      </div>
    </div>
  );
};

const getTextTransform = (origin: string | undefined) => {
  if (!origin) return "none";
  switch (origin) {
    case "top-left":
      return "none";
    case "top-center":
      return "translate(-50%, 0)";
    case "top-right":
      return "translate(-100%, 0)";
    case "center-left":
      return "translate(0, -50%)";
    case "center":
      return "translate(-50%, -50%)";
    case "center-right":
      return "translate(-100%, -50%)";
    case "bottom-left":
      return "translate(0, -100%)";
    case "bottom-center":
      return "translate(-50%, -100%)";
    case "bottom-right":
      return "translate(-100%, -100%)";
    default:
      return "none";
  }
};

export function LabelCanvas({
  labelConfig,
  objects,
  selectedId,
  selectedIds = [],
  pixelScale,
  gridSnapSize,
  onSelectObject,
  onSelectObjectWithModifier,
  onSelectMultipleObjects,
  onUpdateObjectCoordinates,
  onUpdateMultipleObjectsCoordinates,
  onUpdateObjectGeometry,
  onDeleteObject,
  isBatchPrinting = false,
  excelData = [],
  resolveDynamicObjects,
  sheetConfig,
  officePreviewMode = "design",
  printCopies,
  printManifestLength,
  isSystemPrinting = false,
  onAddImageObject,
  onUpdateObject,
  currentFilePath,
  currentLocalStorageKey,
  saveLogs,
  onUpdateGridSnapSize,
}: LabelCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);

  // Dynamic values in pixels (defined at top to allow safe closure referencing in drag and marquee handlers)
  const pxWidth = mmToPx(labelConfig.width, pixelScale);
  const pxHeight = mmToPx(labelConfig.height, pixelScale);

  const [showAllPagesOnScreen, setShowAllPagesOnScreen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showLogsPopupBottom, setShowLogsPopupBottom] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => {
      flushSync(() => {
        setIsPrinting(true);
      });
    };
    const handleAfterPrint = () => {
      flushSync(() => {
        setIsPrinting(false);
      });
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const limitPreview =
    !isPrinting && !isSystemPrinting && !showAllPagesOnScreen;

  // The scale used for rendering elements during printing must always be standard (BASE_DPI_SCALE = 3.7795)
  // to avoid zoom level (pixelScale) affecting layout dimensions on paper.
  const printScale =
    isPrinting || isSystemPrinting ? BASE_DPI_SCALE : pixelScale;

  const safeLength = (len: number) => {
    if (isNaN(len) || !isFinite(len) || len < 0) return 0;
    return Math.min(10000, Math.floor(len));
  };

  // Synchronize document print-size variables dynamically based on active sheet config or label size.
  useEffect(() => {
    const root = document.documentElement;
    const isOfficeMode = sheetConfig && sheetConfig.mode === "office";
    const showOfficeSheet = isOfficeMode && officePreviewMode === "sheet";
    const isThermalMode = sheetConfig && sheetConfig.mode === "thermal";
    const showThermalSheetGrid =
      isThermalMode && sheetConfig && officePreviewMode === "sheet";

    if (showOfficeSheet && sheetConfig) {
      let baseWidth = 210; // A4
      let baseHeight = 297;
      if (sheetConfig.paperSize === "A5") {
        baseWidth = 148;
        baseHeight = 210;
      } else if (sheetConfig.paperSize === "custom") {
        baseWidth = sheetConfig.customWidth || 210;
        baseHeight = sheetConfig.customHeight || 297;
      }
      if (sheetConfig.orientation === "landscape") {
        const temp = baseWidth;
        baseWidth = baseHeight;
        baseHeight = temp;
      }
      root.style.setProperty("--print-width", `${baseWidth}mm`);
      root.style.setProperty("--print-height", `${baseHeight}mm`);
    } else if (showThermalSheetGrid && sheetConfig) {
      const cols = sheetConfig.cols || 1;
      const colGap = sheetConfig.colGap || 0;
      const rollSideMargin = sheetConfig.rollSideMargin !== undefined ? sheetConfig.rollSideMargin : 1;
      const backingWidth = cols * labelConfig.width + (cols - 1) * colGap + rollSideMargin * 2;
      root.style.setProperty("--print-width", `${backingWidth}mm`);
      root.style.setProperty("--print-height", `${labelConfig.height}mm`);
      root.style.setProperty("--print-padding-left", `${rollSideMargin}mm`);
      root.style.setProperty("--print-padding-right", `${rollSideMargin}mm`);
    } else {
      root.style.setProperty("--print-width", `${labelConfig.width}mm`);
      root.style.setProperty("--print-height", `${labelConfig.height}mm`);
      root.style.setProperty("--print-padding-left", "0mm");
      root.style.setProperty("--print-padding-right", "0mm");
    }
  }, [
    labelConfig.width,
    labelConfig.height,
    sheetConfig,
    officePreviewMode,
    isBatchPrinting,
  ]);

  // Dragging event states
  const [dragState, setDragState] = useState<{
    objectId: string;
    origX: number; // in mm
    origY: number; // in mm
    startX: number; // clientX
    startY: number; // clientY
    origPositions?: Array<{ id: string; x: number; y: number }>;
  } | null>(null);

  // Resizing event states
  const [resizeState, setResizeState] = useState<{
    objectId: string;
    handle:
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right"
      | "top-center"
      | "bottom-center"
      | "left-center"
      | "right-center";
    origX: number; // in mm
    origY: number; // in mm
    origWidth: number; // in mm
    origHeight: number; // in mm
    startX: number; // clientX
    startY: number; // clientY
  } | null>(null);

  // Rotation event states
  const [rotateState, setRotateState] = useState<{
    objectId: string;
    centerX: number;
    centerY: number;
    startAngle: number;
  } | null>(null);

  const [localRotateAngle, setLocalRotateAngle] = useState<{
    id: string;
    angle: number;
  } | null>(null);
  const latestRotateAngleRef = useRef<{ id: string; angle: number } | null>(
    null,
  );

  // Local real-time coordinates/dimensions for smooth rendering
  const [localDragCoords, setLocalDragCoords] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [localDragCoordsList, setLocalDragCoordsList] = useState<Array<{
    id: string;
    x: number;
    y: number;
  }> | null>(null);
  const [localResizeDims, setLocalResizeDims] = useState<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const latestCoordsRef = useRef<{ id: string; x: number; y: number } | null>(
    null,
  );
  const latestCoordsListRef = useRef<Array<{ id: string; x: number; y: number }> | null>(
    null,
  );
  const latestResizeRef = useRef<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Listen to keyboard nudges
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;

      // Disable arrow-key scrolling / navigation if workspace is active
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT")
      ) {
        return; // Avoid intercepting inputs
      }

      const activeObj = objects.find((o) => o.id === selectedId);
      if (!activeObj) return;

      // To prevent rounding snap-back locks (越南语: tránh bị kẹt do bo tròn),
      // nudge increment must match or be a multiple of the grid snap size if grid snapping is active.
      const increment = e.shiftKey
        ? gridSnapSize > 0
          ? gridSnapSize * 5
          : 5
        : gridSnapSize > 0
          ? gridSnapSize
          : 0.5;

      const targetIds = selectedIds && selectedIds.length > 1 && selectedIds.includes(selectedId)
        ? selectedIds
        : [selectedId];

      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -increment;
        if (e.key === "ArrowRight") dx = increment;
        if (e.key === "ArrowUp") dy = -increment;
        if (e.key === "ArrowDown") dy = increment;

        const updatedCoords = targetIds.map(id => {
          const obj = objects.find(o => o.id === id);
          if (!obj) return null;

          const coords = constrainCoordinates(
            obj.x + dx,
            obj.y + dy,
            obj.width,
            obj.height,
            labelConfig.width,
            labelConfig.height,
            gridSnapSize,
            obj.angle || 0,
          );
          return { id, x: coords.x, y: coords.y };
        }).filter(Boolean) as Array<{ id: string; x: number; y: number }>;

        if (updatedCoords.length > 0) {
          if (onUpdateMultipleObjectsCoordinates) {
            onUpdateMultipleObjectsCoordinates(updatedCoords);
          } else {
            updatedCoords.forEach(c => onUpdateObjectCoordinates(c.id, c.x, c.y));
          }
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Only trigger delete if not typing in form
        targetIds.forEach(id => {
          onDeleteObject(id);
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedId,
    selectedIds,
    objects,
    labelConfig,
    gridSnapSize,
    onUpdateObjectCoordinates,
    onUpdateMultipleObjectsCoordinates,
    onDeleteObject,
  ]);

  // Marquee selection state
  const [marqueeState, setMarqueeState] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Mousemove and mouseup handlers for marquee selection box
  useEffect(() => {
    if (!marqueeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      setMarqueeState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentX,
          currentY,
        };
      });
    };

    const handleMouseUp = () => {
      if (!containerRef.current) {
        setMarqueeState(null);
        return;
      }
      
      const x1 = Math.min(marqueeState.startX, marqueeState.currentX);
      const x2 = Math.max(marqueeState.startX, marqueeState.currentX);
      const y1 = Math.min(marqueeState.startY, marqueeState.currentY);
      const y2 = Math.max(marqueeState.startY, marqueeState.currentY);
      
      const boxW = x2 - x1;
      const boxH = y2 - y1;
      
      if (boxW > 3 || boxH > 3) {
        const newlySelectedIds: string[] = [];
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Compute selection bounds in viewport coordinate values for pixel-perfect intersection
        const selLeft = containerRect.left + x1;
        const selRight = containerRect.left + x2;
        const selTop = containerRect.top + y1;
        const selBottom = containerRect.top + y2;
        
        objects.forEach((obj) => {
          const el = document.getElementById(`object-${obj.id}`);
          if (el) {
            const elRect = el.getBoundingClientRect();
            const isOverlapping = 
              elRect.left < selRight &&
              elRect.right > selLeft &&
              elRect.top < selBottom &&
              elRect.bottom > selTop;
              
            if (isOverlapping) {
              newlySelectedIds.push(obj.id);
            }
          }
        });
        
        if (onSelectMultipleObjects) {
          onSelectMultipleObjects(newlySelectedIds);
        } else if (newlySelectedIds.length > 0) {
          onSelectObject(newlySelectedIds[0]);
        } else {
          onSelectObject(null);
        }
      }

      setMarqueeState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [marqueeState, objects, onSelectMultipleObjects, onSelectObject]);

  // Pointer dragging handler on canvas area or workspace body
  const handleLabelMouseDown = (e: React.MouseEvent) => {
    // Only proceed if mouse down is NOT on a handle or an object wrapper
    const target = e.target as HTMLElement;
    const isInteractive = target.closest(
      ".resize-handle, .rotate-handle, .object-print-class, input, button, select, textarea, [role=\"button\"], a"
    );
    if (isInteractive) {
      return; 
    }

    onSelectObject(null);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      setMarqueeState({
        startX,
        startY,
        currentX: startX,
        currentY: startY,
      });
    }
  };

  const handleObjectMouseDown = (e: React.MouseEvent, obj: LabelObject) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if Shift or Ctrl/Cmd is pressed
    const isMultiSelectKey = e.ctrlKey || e.metaKey || e.shiftKey;

    if (onSelectObjectWithModifier) {
      onSelectObjectWithModifier(obj.id, isMultiSelectKey);
    } else {
      onSelectObject(obj.id);
    }

    const currentSelectedIds = selectedIds && selectedIds.includes(obj.id)
      ? selectedIds
      : [obj.id];

    // If we just clicked with a multi-select modifier and the element wasn't originally selected, let's include it
    const effectiveSelectedIds = isMultiSelectKey && !currentSelectedIds.includes(obj.id)
      ? [...currentSelectedIds, obj.id]
      : currentSelectedIds;

    const origPositions = objects
      .filter((o) => effectiveSelectedIds.includes(o.id))
      .map((o) => ({ id: o.id, x: o.x, y: o.y }));

    setDragState({
      objectId: obj.id,
      origX: obj.x,
      origY: obj.y,
      startX: e.clientX,
      startY: e.clientY,
      origPositions,
    });
  };

  // Dragging event tracking
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const activeObj = objects.find((o) => o.id === dragState.objectId);
      if (!activeObj) return;

      const deltaXpx = e.clientX - dragState.startX;
      const deltaYpx = e.clientY - dragState.startY;

      // Convert delta px to millimeters
      const deltaXmm = deltaXpx / pixelScale;
      const deltaYmm = deltaYpx / pixelScale;

      const origPositions = dragState.origPositions || [
        { id: dragState.objectId, x: dragState.origX, y: dragState.origY },
      ];
      const mainOrigPos = origPositions.find((p) => p.id === dragState.objectId) || {
        id: dragState.objectId,
        x: dragState.origX,
        y: dragState.origY,
      };

      const targetMainX = mainOrigPos.x + deltaXmm;
      const targetMainY = mainOrigPos.y + deltaYmm;

      // Constrain inside label boundary with grid snapping
      const mainCoords = constrainCoordinates(
        targetMainX,
        targetMainY,
        activeObj.width,
        activeObj.height,
        labelConfig.width,
        labelConfig.height,
        gridSnapSize,
        activeObj.angle || 0,
      );

      // Snapped delta
      const snappedDeltaX = mainCoords.x - mainOrigPos.x;
      const snappedDeltaY = mainCoords.y - mainOrigPos.y;

      const updatedList = origPositions.map((pos) => {
        const item = objects.find((o) => o.id === pos.id);
        const w = item ? item.width : 10;
        const h = item ? item.height : 10;
        const ang = item ? (item.angle || 0) : 0;

        let activeX = pos.x + snappedDeltaX;
        let activeY = pos.y + snappedDeltaY;

        // Constraint boundaries for each item based on its rotation angle
        const constrained = constrainCoordinates(
          activeX,
          activeY,
          w,
          h,
          labelConfig.width,
          labelConfig.height,
          0, // no snapping again
          ang,
        );

        return {
          id: pos.id,
          x: constrained.x,
          y: constrained.y,
        };
      });

      latestCoordsListRef.current = updatedList;
      setLocalDragCoordsList(updatedList);
    };

    const handleMouseUp = () => {
      if (latestCoordsListRef.current && latestCoordsListRef.current.length > 0) {
        if (onUpdateMultipleObjectsCoordinates) {
          onUpdateMultipleObjectsCoordinates(latestCoordsListRef.current);
        } else {
          latestCoordsListRef.current.forEach((c) => {
            onUpdateObjectCoordinates(c.id, c.x, c.y);
          });
        }
      }
      latestCoordsListRef.current = null;
      setLocalDragCoordsList(null);
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState,
    objects,
    pixelScale,
    gridSnapSize,
    labelConfig,
    onUpdateObjectCoordinates,
    onUpdateMultipleObjectsCoordinates,
  ]);

  const handleResizeStart = (
    e: React.MouseEvent,
    obj: LabelObject,
    handle:
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right"
      | "top-center"
      | "bottom-center"
      | "left-center"
      | "right-center",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectObject(obj.id);

    setResizeState({
      objectId: obj.id,
      handle,
      origX: obj.x,
      origY: obj.y,
      origWidth: obj.width,
      origHeight: obj.height,
      startX: e.clientX,
      startY: e.clientY,
    });
  };

  // Resizing event tracking
  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const activeObj = objects.find((o) => o.id === resizeState.objectId);
      if (!activeObj) return;

      const deltaXpx = e.clientX - resizeState.startX;
      const deltaYpx = e.clientY - resizeState.startY;

      // Convert delta in pixels to millimeters
      const deltaXmm = deltaXpx / pixelScale;
      const deltaYmm = deltaYpx / pixelScale;

      let newX = resizeState.origX;
      let newY = resizeState.origY;
      let newWidth = resizeState.origWidth;
      let newHeight = resizeState.origHeight;

      const angleRad = ((activeObj.angle || 0) * Math.PI) / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);

      // Pivot logic to ensure fixed point in space doesn't move
      const cx_orig = resizeState.origX + resizeState.origWidth / 2;
      const cy_orig = resizeState.origY + resizeState.origHeight / 2;

      let oppX_orig = 0;
      let oppY_orig = 0;

      if (
        resizeState.handle === "right-center" ||
        resizeState.handle === "bottom-right" ||
        resizeState.handle === "top-right"
      ) {
        oppX_orig = -resizeState.origWidth / 2;
      } else if (
        resizeState.handle === "left-center" ||
        resizeState.handle === "bottom-left" ||
        resizeState.handle === "top-left"
      ) {
        oppX_orig = resizeState.origWidth / 2;
      }

      if (
        resizeState.handle === "bottom-center" ||
        resizeState.handle === "bottom-left" ||
        resizeState.handle === "bottom-right"
      ) {
        oppY_orig = -resizeState.origHeight / 2;
      } else if (
        resizeState.handle === "top-center" ||
        resizeState.handle === "top-left" ||
        resizeState.handle === "top-right"
      ) {
        oppY_orig = resizeState.origHeight / 2;
      }

      // World pivot point (stationary offset from origin)
      const pFixedX = cx_orig + (oppX_orig * cos - oppY_orig * sin);
      const pFixedY = cy_orig + (oppX_orig * sin + oppY_orig * cos);

      // Translate the client drag delta back into the rotated object's local axis
      const localDeltaXmm = deltaXmm * cos + deltaYmm * sin;
      const localDeltaYmm = -deltaXmm * sin + deltaYmm * cos;

      if (
        resizeState.handle === "right-center" ||
        resizeState.handle === "top-right" ||
        resizeState.handle === "bottom-right"
      ) {
        newWidth = resizeState.origWidth + localDeltaXmm;
      } else if (
        resizeState.handle === "left-center" ||
        resizeState.handle === "top-left" ||
        resizeState.handle === "bottom-left"
      ) {
        newWidth = resizeState.origWidth - localDeltaXmm;
      }

      if (
        resizeState.handle === "bottom-center" ||
        resizeState.handle === "bottom-left" ||
        resizeState.handle === "bottom-right"
      ) {
        newHeight = resizeState.origHeight + localDeltaYmm;
      } else if (
        resizeState.handle === "top-center" ||
        resizeState.handle === "top-left" ||
        resizeState.handle === "top-right"
      ) {
        newHeight = resizeState.origHeight - localDeltaYmm;
      }

      // Minimum size limit in mm to prevent tiny/negative items
      const MIN_SIZE_MM = 3;
      if (newWidth < MIN_SIZE_MM) newWidth = MIN_SIZE_MM;
      if (newHeight < MIN_SIZE_MM) newHeight = MIN_SIZE_MM;

      // Snapping size if grid is active
      if (gridSnapSize > 0) {
        newWidth = Math.round(newWidth / gridSnapSize) * gridSnapSize;
        newHeight = Math.round(newHeight / gridSnapSize) * gridSnapSize;

        // Ensure minimum size remains valid after snapping
        if (newWidth < gridSnapSize) newWidth = gridSnapSize;
        if (newHeight < gridSnapSize) newHeight = gridSnapSize;
      }

      // Calculate new center based on stationary world pivot and new dimensions
      let oppX_new = 0;
      let oppY_new = 0;

      if (
        resizeState.handle === "right-center" ||
        resizeState.handle === "bottom-right" ||
        resizeState.handle === "top-right"
      ) {
        oppX_new = -newWidth / 2;
      } else if (
        resizeState.handle === "left-center" ||
        resizeState.handle === "bottom-left" ||
        resizeState.handle === "top-left"
      ) {
        oppX_new = newWidth / 2;
      }

      if (
        resizeState.handle === "bottom-center" ||
        resizeState.handle === "bottom-left" ||
        resizeState.handle === "bottom-right"
      ) {
        oppY_new = -newHeight / 2;
      } else if (
        resizeState.handle === "top-center" ||
        resizeState.handle === "top-left" ||
        resizeState.handle === "top-right"
      ) {
        oppY_new = newHeight / 2;
      }

      const cx_new = pFixedX - (oppX_new * cos - oppY_new * sin);
      const cy_new = pFixedY - (oppX_new * sin + oppY_new * cos);

      newX = cx_new - newWidth / 2;
      newY = cy_new - newHeight / 2;

      // Keep inside label boundaries
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX + newWidth > labelConfig.width) {
        newX = Math.max(0, labelConfig.width - newWidth);
      }
      if (newY + newHeight > labelConfig.height) {
        newY = Math.max(0, labelConfig.height - newHeight);
      }

      // Final fallback boundaries check
      if (newWidth >= MIN_SIZE_MM && newHeight >= MIN_SIZE_MM) {
        const xVal = parseFloat(newX.toFixed(2));
        const yVal = parseFloat(newY.toFixed(2));
        const wVal = parseFloat(newWidth.toFixed(2));
        const hVal = parseFloat(newHeight.toFixed(2));

        latestResizeRef.current = {
          id: resizeState.objectId,
          x: xVal,
          y: yVal,
          width: wVal,
          height: hVal,
        };

        setLocalResizeDims({
          id: resizeState.objectId,
          x: xVal,
          y: yVal,
          width: wVal,
          height: hVal,
        });
      }
    };

    const handleMouseUp = () => {
      if (
        latestResizeRef.current &&
        latestResizeRef.current.id === resizeState.objectId
      ) {
        onUpdateObjectGeometry(
          resizeState.objectId,
          latestResizeRef.current.x,
          latestResizeRef.current.y,
          latestResizeRef.current.width,
          latestResizeRef.current.height,
        );
      }
      latestResizeRef.current = null;
      setLocalResizeDims(null);
      setResizeState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    resizeState,
    objects,
    pixelScale,
    gridSnapSize,
    labelConfig,
    onUpdateObjectGeometry,
  ]);

  const handleRotateStart = (e: React.MouseEvent, obj: LabelObject) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectObject(obj.id);

    // Find center of current object in screen coordinates
    const el = document.getElementById(`object-${obj.id}`);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setRotateState({
      objectId: obj.id,
      centerX,
      centerY,
      startAngle: obj.angle || 0,
    });
  };

  // Rotating event tracking
  useEffect(() => {
    if (!rotateState) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate angle from center of element to mouse
      const rad = Math.atan2(
        e.clientY - rotateState.centerY,
        e.clientX - rotateState.centerX,
      );
      // straight up is 0/360, so add 90 degrees
      let deg = (rad * 180) / Math.PI + 90;

      // Keep within [0, 360] degree range
      if (deg < 0) deg += 360;
      deg = Math.round(deg);

      // Snap degrees to nearest 15 degrees if Shift is pressed
      if (e.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }

      latestRotateAngleRef.current = { id: rotateState.objectId, angle: deg };
      setLocalRotateAngle({ id: rotateState.objectId, angle: deg });
    };

    const handleMouseUp = () => {
      if (
        latestRotateAngleRef.current &&
        latestRotateAngleRef.current.id === rotateState.objectId
      ) {
        const activeObj = objects.find((o) => o.id === rotateState.objectId);
        if (activeObj && onUpdateObject) {
          onUpdateObject({
            ...activeObj,
            angle: latestRotateAngleRef.current.angle,
          });
        }
      }
      latestRotateAngleRef.current = null;
      setLocalRotateAngle(null);
      setRotateState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [rotateState, objects, onUpdateObject]);

  // Ticks and helper structures can safely read top-level pxWidth and pxHeight values

  // Generate ticks for Rulers (1 tick per 5mm, numeric label every 10mm)
  const topTicksCount = Math.floor(labelConfig.width / 5);
  const leftTicksCount = Math.floor(labelConfig.height / 5);

  const getSheetDimensions = (config: any) => {
    let baseWidth = 210; // A4
    let baseHeight = 297;
    if (config?.paperSize === "A5") {
      baseWidth = 148;
      baseHeight = 210;
    } else if (config?.paperSize === "custom") {
      baseWidth = config.customWidth || 210;
      baseHeight = config.customHeight || 297;
    }
    if (config?.orientation === "landscape") {
      return { width: baseHeight, height: baseWidth };
    }
    return { width: baseWidth, height: baseHeight };
  };

  const isOfficeMode = sheetConfig && sheetConfig.mode === "office";
  const showOfficeSheet = isOfficeMode && officePreviewMode === "sheet";

  // Office sheet grid printable view
  if (showOfficeSheet && sheetConfig) {
    const previewScale = BASE_DPI_SCALE; // Always use standard print DPI scale to ensure 100% accurate WYSIWYG
    const { width: sW, height: sH } = getSheetDimensions(sheetConfig);
    const pxSheetW = mmToPx(sW, previewScale);
    const pxSheetH = mmToPx(sH, previewScale);

    const pxML = mmToPx(sheetConfig.marginLeft, previewScale);
    const pxMR = mmToPx(sheetConfig.marginRight, previewScale);
    const pxMT = mmToPx(sheetConfig.marginTop, previewScale);
    const pxMB = mmToPx(sheetConfig.marginBottom, previewScale);
    const pxCG = mmToPx(sheetConfig.colGap, previewScale);
    const pxRG = mmToPx(sheetConfig.rowGap, previewScale);

    const pxCellW = mmToPx(labelConfig.width, previewScale);
    const pxCellH = mmToPx(labelConfig.height, previewScale);

    const cellsPerSheet = Math.max(
      1,
      (sheetConfig.rows || 1) * (sheetConfig.cols || 1),
    );

    let totalItems = 0;
    const hasExcel = excelData && excelData.length > 0;
    if (hasExcel) {
      totalItems =
        printManifestLength !== undefined
          ? printManifestLength
          : excelData.length;
    } else {
      totalItems = printCopies || cellsPerSheet;
    }

    const totalSheets = Math.max(1, Math.ceil(totalItems / cellsPerSheet));

    return (
      <div
        ref={containerRef}
        id="label-editor-workspace"
        className="flex-1 flex flex-col items-center bg-slate-200/60 overflow-auto select-none p-2.5 relative print:p-0 print:m-0 print:bg-white"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectObject(null);
          }
        }}
      >
        {/* On screen preview header badge */}
        <div className="bg-white/95 rounded-lg border border-gray-200 p-3 mb-5 shadow-sm text-center max-w-xl z-20 no-print">
          <p className="text-[12px] font-bold text-[#1E293B] flex items-center justify-center space-x-1.5">
            <LayoutGrid className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>
              Trang xem trước bản in (
              {sheetConfig.paperSize === "custom"
                ? "Tự chọn"
                : sheetConfig.paperSize}{" "}
              -{" "}
              {sheetConfig.orientation === "portrait" ? "Khổ dọc" : "Khổ ngang"}
              )
            </span>
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
            Áp dụng ma trận lề lề trên: {sheetConfig.marginTop}mm, trái:{" "}
            {sheetConfig.marginLeft}mm | {sheetConfig.cols} cột x{" "}
            {sheetConfig.rows} hàng.
          </p>
          <div className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-bold mt-1.5 inline-block border border-gray-200">
            {hasExcel
              ? `Liên kết Excel: ${totalItems} hàng (${totalSheets} trang)`
              : `Số nhãn lặp đầy ô: ${totalItems} (${totalSheets} trang)`}
          </div>
        </div>

        <div className="flex flex-col select-none items-center print:m-0 print:p-0">
          {Array.from({ length: safeLength(totalSheets) }).map((_, sIdx) => {
            if (limitPreview && sIdx >= 3) return null;
            return (
              <div
                key={`sheet-page-${sIdx}`}
                className="office-print-page bg-white relative shadow-lg border border-gray-300 md:mb-8 shrink-0 print:m-0 print:shadow-none print:border-none"
                style={
                  {
                    width: `${pxSheetW}px`,
                    height: `${pxSheetH}px`,
                    paddingTop: `${pxMT}px`,
                    paddingBottom: `${pxMB}px`,
                    paddingLeft: `${pxML}px`,
                    paddingRight: `${pxMR}px`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${sheetConfig.cols || 1}, ${pxCellW}px)`,
                    gridTemplateRows: `repeat(${sheetConfig.rows || 1}, ${pxCellH}px)`,
                    columnGap: `${pxCG}px`,
                    rowGap: `${pxRG}px`,
                    boxSizing: "border-box",
                    alignContent: "start",
                    justifyContent: "start",
                    "--print-width": `${sW}mm`,
                    "--print-height": `${sH}mm`,
                    "--sheet-m-top": `${sheetConfig.marginTop}mm`,
                    "--sheet-m-bottom": `${sheetConfig.marginBottom}mm`,
                    "--sheet-m-left": `${sheetConfig.marginLeft}mm`,
                    "--sheet-m-right": `${sheetConfig.marginRight}mm`,
                    "--sheet-grid-cols": `repeat(${sheetConfig.cols || 1}, ${labelConfig.width}mm)`,
                    "--sheet-grid-rows": `repeat(${sheetConfig.rows || 1}, ${labelConfig.height}mm)`,
                    "--sheet-col-gap": `${sheetConfig.colGap}mm`,
                    "--sheet-row-gap": `${sheetConfig.rowGap}mm`,
                  } as React.CSSProperties
                }
              >
                {Array.from({ length: safeLength(cellsPerSheet) }).map(
                  (_, cIdx) => {
                    const globalIdx = sIdx * cellsPerSheet + cIdx;
                    if (globalIdx < totalItems) {
                      const resolvedObjs = resolveDynamicObjects
                        ? resolveDynamicObjects(objects, globalIdx)
                        : objects;

                      return (
                        <div
                          key={`cell-${sIdx}-${cIdx}`}
                          className="office-print-cell relative overflow-hidden select-none print:bg-transparent"
                          style={
                            {
                              width: `${pxCellW}px`,
                              height: `${pxCellH}px`,
                              backgroundColor: labelConfig.bgColor || "#ffffff",
                              border: sheetConfig.showBorder
                                ? `${sheetConfig.borderWidth}px solid ${sheetConfig.borderColor || '#9ca3af'}`
                                : "none",
                              borderRadius: `${sheetConfig.borderRadius}mm`,
                              boxSizing: "border-box",
                              "--cell-w": `${labelConfig.width}mm`,
                              "--cell-h": `${labelConfig.height}mm`,
                              "--cell-radius": `${sheetConfig.borderRadius}mm`,
                              "--cell-border": sheetConfig.showBorder
                                ? `${sheetConfig.borderWidth}px solid ${sheetConfig.borderColor || '#9ca3af'}`
                                : "none",
                            } as React.CSSProperties
                          }
                        >
                          {/* Watermark/Background Image overlay */}
                          {labelConfig.bgImage && (
                            <div
                              className="absolute inset-0 pointer-events-none select-none"
                              style={{
                                backgroundImage: `url(${labelConfig.bgImage})`,
                                backgroundSize:
                                  labelConfig.bgImageSize || "contain",
                                backgroundPosition: "center",
                                backgroundRepeat:
                                  labelConfig.bgImageSize === "repeat"
                                    ? "repeat"
                                    : "no-repeat",
                                opacity:
                                  labelConfig.bgImageOpacity !== undefined
                                    ? labelConfig.bgImageOpacity
                                    : 0.3,
                                zIndex: 0,
                              }}
                            />
                          )}
                          {resolvedObjs.map((obj) => {
                            const itemX = mmToPx(obj.x, previewScale);
                            const itemY = mmToPx(obj.y, previewScale);
                            const itemW = mmToPx(obj.width, previewScale);
                            const itemH = mmToPx(obj.height, previewScale);
                            const xPct = (obj.x / labelConfig.width) * 100;
                            const yPct = (obj.y / labelConfig.height) * 100;
                            const wPct = (obj.width / labelConfig.width) * 100;
                            const hPct =
                              (obj.height / labelConfig.height) * 100;
                            const trans =
                              obj.type === "text"
                                ? getTextTransform(obj.textFlowOrigin)
                                : "none";
                            const rotationStr = obj.angle
                              ? `rotate(${obj.angle}deg)`
                              : "";
                            const finalTransform =
                              `${rotationStr} ${trans !== "none" ? trans : ""}`.trim() ||
                              "none";

                            return (
                              <div
                                key={obj.id}
                                className="object-print-class absolute flex flex-col items-stretch"
                                style={
                                  {
                                    left: `${xPct}%`,
                                    top: `${yPct}%`,
                                    width: `${wPct}%`,
                                    height:
                                      obj.type === "text" ? "auto" : `${hPct}%`,
                                    minHeight:
                                      obj.type === "text"
                                        ? `${hPct}%`
                                        : undefined,
                                    transform: finalTransform,
                                    transformOrigin: obj.angle
                                      ? "center center"
                                      : "top left",
                                    "--o-transform-origin": obj.angle
                                      ? "center center"
                                      : "top left",
                                    "--o-x": `${obj.x}mm`,
                                    "--o-y": `${obj.y}mm`,
                                    "--o-w": `${obj.width}mm`,
                                    "--o-h": `${obj.height}mm`,
                                    "--o-print-height":
                                      obj.type === "text"
                                        ? "auto"
                                        : `${obj.height}mm`,
                                    "--o-print-min-height":
                                      obj.type === "text"
                                        ? `${obj.height}mm`
                                        : "0mm",
                                    "--o-transform": finalTransform,
                                  } as React.CSSProperties
                                }
                              >
                                <div className="w-full h-full p-0.5 select-none overflow-hidden relative">
                                  {obj.type === "text" &&
                                    renderTextElement(obj, previewScale)}

                                  {obj.type === "barcode" && (
                                    <BarcodeRenderer
                                      content={obj.content}
                                      format={obj.barcodeFormat}
                                      displayValue={obj.displayValue}
                                      barcodeWidth={obj.barcodeWidth}
                                      barcodeHeight={obj.barcodeHeight}
                                      fontSize={obj.barcodeFontSize || 7}
                                      pixelScale={previewScale}
                                      barcodeShowTextAbove={
                                        obj.barcodeShowTextAbove
                                      }
                                      barcodeShowTextBelow={
                                        obj.barcodeShowTextBelow
                                      }
                                      barcodeFontFamily={obj.barcodeFontFamily}
                                      barcodeFontSize={obj.barcodeFontSize}
                                      barcodeFontWeight={obj.barcodeFontWeight}
                                      barcodeFontStyle={obj.barcodeFontStyle}
                                      barcodeTextMargin={obj.barcodeTextMargin}
                                      textFlowOrigin={obj.textFlowOrigin}
                                      color={obj.color}
                                      barcodeTextColor={obj.barcodeTextColor}
                                    />
                                  )}

                                  {obj.type === "qrcode" && (
                                    <QRCodeRenderer
                                      content={obj.content}
                                      size={itemW * 0.9}
                                      textFlowOrigin={obj.textFlowOrigin}
                                      color={obj.color}
                                    />
                                  )}

                                  {obj.type === "image" && (
                                    <img
                                      src={obj.content}
                                      alt="Label Element"
                                      className="w-full h-full pointer-events-none select-none max-w-full max-h-full"
                                      style={{
                                        objectFit: obj.imageFit || "contain",
                                        opacity:
                                          obj.imageOpacity !== undefined
                                            ? obj.imageOpacity
                                            : 1,
                                        display: "block",
                                      }}
                                      referrerPolicy="no-referrer"
                                    />
                                  )}

                                  {obj.type === "shape" && (
                                    <ShapeRenderer obj={obj} pixelScale={previewScale} />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={`empty-cell-${sIdx}-${cIdx}`}
                          className="office-print-cell relative border border-dashed border-gray-100 flex items-center justify-center bg-slate-50/15 print:border-none print:bg-transparent"
                          style={
                            {
                              width: `${pxCellW}px`,
                              height: `${pxCellH}px`,
                              boxSizing: "border-box",
                              "--cell-w": `${labelConfig.width}mm`,
                              "--cell-h": `${labelConfig.height}mm`,
                              "--cell-border": "none",
                            } as React.CSSProperties
                          }
                        >
                          <span className="text-[9px] text-gray-300 font-mono no-print">
                            Trống
                          </span>
                        </div>
                      );
                    }
                  },
                )}
              </div>
            );
          })}
        </div>

        {limitPreview && totalSheets > 3 && (
          <div className="mt-4 mb-2 p-3.5 bg-amber-50/95 border border-amber-250/70 rounded-xl shadow-md text-center max-w-lg mx-auto no-print flex flex-col items-center justify-center space-y-2 select-none animate-fadeIn">
            <p className="text-[11.5px] text-amber-950 font-bold leading-relaxed">
              ⚡ Đang chỉ hiển thị trước 3 / {totalSheets} trang thiết kế để giữ
              tốc độ phản hồi siêu mượt.
            </p>
            <p className="text-[10px] text-amber-900 leading-normal font-medium">
              Toàn bộ {totalSheets} trang sẽ tự động được gửi và xuất đầy đủ khi
              bạn in ấn (Print / Ctrl+P)!
            </p>
            <button
              type="button"
              onClick={() => setShowAllPagesOnScreen(true)}
              className="mt-1 px-4 py-1.5 bg-amber-600 hover:bg-amber-750 text-white font-bold rounded-lg text-xs leading-none transition-all shadow-sm border border-amber-600 cursor-pointer"
            >
              Hiển thị tất cả {totalSheets} trang thiết kế ngay
            </button>
          </div>
        )}
      </div>
    );
  }

  // Integrated multi-column and gap-aware thermal preview/print engine
  const isThermalMode = sheetConfig && sheetConfig.mode === "thermal";
  const showThermalSheetGrid =
    isThermalMode && sheetConfig && officePreviewMode === "sheet";

  if (showThermalSheetGrid && sheetConfig) {
    const previewScale = BASE_DPI_SCALE; // Always use standard print DPI scale to ensure 100% accurate WYSIWYG
    const cols = Math.max(1, sheetConfig.cols || 1);
    const colGap = sheetConfig.colGap || 0;
    const rowGap = sheetConfig.rowGap !== undefined ? sheetConfig.rowGap : 3.0; // standard 3mm (~0.12 in)
    const labelW = labelConfig.width;
    const labelH = labelConfig.height;
    const rollSideMargin = sheetConfig.rollSideMargin !== undefined ? sheetConfig.rollSideMargin : 1;
    const backingWidth = cols * labelW + (cols - 1) * colGap + rollSideMargin * 2;

    const pxBackingW = mmToPx(backingWidth, previewScale);
    const pxBackingH = mmToPx(labelH, previewScale);
    const pxColGap = mmToPx(colGap, previewScale);
    const pxRowGap = mmToPx(rowGap, previewScale);
    const pxSideMargin = mmToPx(rollSideMargin, previewScale);

    const pxCellW = mmToPx(labelW, previewScale);
    const pxCellH = mmToPx(labelH, previewScale);

    let totalItems = 0;
    const hasExcel = excelData && excelData.length > 0;
    if (hasExcel) {
      totalItems =
        printManifestLength !== undefined
          ? printManifestLength
          : excelData.length;
    } else {
      totalItems = printCopies || cols;
    }

    const totalRows = Math.max(1, Math.ceil(totalItems / cols));

    return (
      <div
        ref={containerRef}
        id="label-editor-workspace"
        className="flex-1 flex flex-col items-center bg-slate-200/60 overflow-auto select-none p-2.5 relative print:p-0 print:m-0 print:bg-white"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectObject(null);
          }
        }}
      >
        {/* On screen preview header badge */}
        <div className="bg-white/95 rounded-lg border border-gray-200 p-3 mb-5 shadow-sm text-center max-w-xl z-20 no-print">
          <p className="text-[12px] font-bold text-[#1E293B] flex items-center justify-center space-x-1.5">
            <LayoutGrid className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Xem trước bản in cuộn ({cols} tem 1 hàng)</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed font-semibold">
            Chiều rộng phôi cuộn: {backingWidth}mm | Khoảng cách cột: {colGap}mm
            | Khoảng trống hàng (Gap): {rowGap}mm (~{(rowGap / 25.4).toFixed(3)}{" "}
            inch)
          </p>
          <div className="text-[10px] bg-sky-50 text-kiot-navy px-2.5 py-0.5 rounded-md font-bold mt-1.5 inline-block border border-kiot-cyan/35 ring-1 ring-kiot-cyan/5">
            {hasExcel
              ? `Liên kết Excel: ${totalItems} hàng (${totalRows} hàng tem)`
              : `Số nhãn in thử: ${totalItems} (${totalRows} hàng tem)`}
          </div>
        </div>

        <div className="flex flex-col select-none items-center print:m-0 print:p-0">
          {Array.from({ length: safeLength(totalRows) }).map((_, rIdx) => {
            if (limitPreview && rIdx >= 20) return null;
            return (
              <div
                key={`thermal-row-${rIdx}`}
                className="batch-print-page bg-white relative shadow-lg shrink-0 print:m-0 print:shadow-none print:border-none flex"
                style={
                  {
                    width: `${pxBackingW}px`,
                    height: `${pxBackingH}px`,
                    display: "flex",
                    flexDirection: "row",
                    gap: `${pxColGap}px`,
                    boxSizing: "border-box",
                    marginBottom: `${pxRowGap}px`, // visual gap on screen
                    "--print-width": `${backingWidth}mm`,
                    "--print-height": `${labelH}mm`,
                    "--print-col-gap": `${colGap}mm`,
                    "--print-padding-left": `${rollSideMargin}mm`,
                    "--print-padding-right": `${rollSideMargin}mm`,
                    paddingLeft: `${pxSideMargin}px`,
                    paddingRight: `${pxSideMargin}px`,
                  } as React.CSSProperties
                }
              >
                {Array.from({ length: safeLength(cols) }).map((_, cIdx) => {
                  const globalIdx = rIdx * cols + cIdx;
                  if (globalIdx < totalItems) {
                    const resolvedObjs = resolveDynamicObjects
                      ? resolveDynamicObjects(objects, globalIdx)
                      : objects;

                    return (
                      <div
                        key={`thermal-cell-${rIdx}-${cIdx}`}
                        className="batch-print-cell relative overflow-hidden select-none print:bg-transparent"
                        style={
                          {
                            width: `${pxCellW}px`,
                            height: `${pxCellH}px`,
                            backgroundColor: labelConfig.bgColor || "#ffffff",
                            boxSizing: "border-box",
                            border: sheetConfig.showBorder
                              ? `${sheetConfig.borderWidth}px solid ${sheetConfig.borderColor || '#9ca3af'}`
                              : "none",
                            borderRadius: `${sheetConfig.borderRadius}mm`,
                            "--cell-w": `${labelConfig.width}mm`,
                            "--cell-h": `${labelConfig.height}mm`,
                          } as React.CSSProperties
                        }
                      >
                        {/* Watermark/Background Image overlay */}
                        {labelConfig.bgImage && (
                          <div
                            className="absolute inset-0 pointer-events-none select-none"
                            style={{
                              backgroundImage: `url(${labelConfig.bgImage})`,
                              backgroundSize:
                                labelConfig.bgImageSize || "contain",
                              backgroundPosition: "center",
                              backgroundRepeat:
                                labelConfig.bgImageSize === "repeat"
                                  ? "repeat"
                                  : "no-repeat",
                              opacity:
                                labelConfig.bgImageOpacity !== undefined
                                  ? labelConfig.bgImageOpacity
                                  : 0.3,
                              zIndex: 0,
                            }}
                          />
                        )}
                        {resolvedObjs.map((obj) => {
                          const itemX = mmToPx(obj.x, previewScale);
                          const itemY = mmToPx(obj.y, previewScale);
                          const itemW = mmToPx(obj.width, previewScale);
                          const itemH = mmToPx(obj.height, previewScale);
                          const xPct = (obj.x / labelConfig.width) * 100;
                          const yPct = (obj.y / labelConfig.height) * 100;
                          const wPct = (obj.width / labelConfig.width) * 100;
                          const hPct = (obj.height / labelConfig.height) * 100;
                          const trans =
                            obj.type === "text"
                              ? getTextTransform(obj.textFlowOrigin)
                              : "none";
                          const rotationStr = obj.angle
                            ? `rotate(${obj.angle}deg)`
                            : "";
                          const finalTransform =
                            `${rotationStr} ${trans !== "none" ? trans : ""}`.trim() ||
                            "none";

                          return (
                            <div
                              key={obj.id}
                              className="object-print-class absolute flex flex-col items-stretch"
                              style={
                                {
                                  left: `${xPct}%`,
                                  top: `${yPct}%`,
                                  width: `${wPct}%`,
                                  height:
                                    obj.type === "text" ? "auto" : `${hPct}%`,
                                  minHeight:
                                    obj.type === "text"
                                      ? `${hPct}%`
                                      : undefined,
                                  transform: finalTransform,
                                  transformOrigin: obj.angle
                                    ? "center center"
                                    : "top left",
                                  "--o-transform-origin": obj.angle
                                    ? "center center"
                                    : "top left",
                                  "--o-x": `${obj.x}mm`,
                                  "--o-y": `${obj.y}mm`,
                                  "--o-w": `${obj.width}mm`,
                                  "--o-h": `${obj.height}mm`,
                                  "--o-print-height":
                                    obj.type === "text"
                                      ? "auto"
                                      : `${obj.height}mm`,
                                  "--o-print-min-height":
                                    obj.type === "text"
                                      ? `${obj.height}mm`
                                      : "0mm",
                                  "--o-transform": finalTransform,
                                } as React.CSSProperties
                              }
                            >
                              <div className="w-full h-full p-0.5 select-none overflow-hidden relative">
                                {obj.type === "text" &&
                                  renderTextElement(obj, previewScale)}

                                {obj.type === "barcode" && (
                                  <BarcodeRenderer
                                    content={obj.content}
                                    format={obj.barcodeFormat}
                                    displayValue={obj.displayValue}
                                    barcodeWidth={obj.barcodeWidth}
                                    barcodeHeight={obj.barcodeHeight}
                                    fontSize={obj.barcodeFontSize || 7}
                                    pixelScale={previewScale}
                                    barcodeShowTextAbove={
                                      obj.barcodeShowTextAbove
                                    }
                                    barcodeShowTextBelow={
                                      obj.barcodeShowTextBelow
                                    }
                                    barcodeFontFamily={obj.barcodeFontFamily}
                                    barcodeFontSize={obj.barcodeFontSize}
                                    barcodeFontWeight={obj.barcodeFontWeight}
                                    barcodeFontStyle={obj.barcodeFontStyle}
                                    barcodeTextMargin={obj.barcodeTextMargin}
                                    textFlowOrigin={obj.textFlowOrigin}
                                    color={obj.color}
                                    barcodeTextColor={obj.barcodeTextColor}
                                  />
                                )}

                                {obj.type === "qrcode" && (
                                  <QRCodeRenderer
                                    content={obj.content}
                                    size={itemW * 0.9}
                                    textFlowOrigin={obj.textFlowOrigin}
                                    color={obj.color}
                                  />
                                )}

                                {obj.type === "image" && (
                                  <img
                                    src={obj.content}
                                    alt="Label Element"
                                    className="w-full h-full pointer-events-none select-none max-w-full max-h-full"
                                    style={{
                                      objectFit: obj.imageFit || "contain",
                                      opacity:
                                        obj.imageOpacity !== undefined
                                          ? obj.imageOpacity
                                          : 1,
                                      display: "block",
                                    }}
                                    referrerPolicy="no-referrer"
                                  />
                                )}

                                {obj.type === "shape" && (
                                  <ShapeRenderer obj={obj} pixelScale={previewScale} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={`empty-thermal-cell-${rIdx}-${cIdx}`}
                        className="batch-print-cell relative border border-dashed border-gray-150 flex items-center justify-center bg-slate-50/15 print:border-none print:bg-transparent"
                        style={
                          {
                            width: `${pxCellW}px`,
                            height: `${pxCellH}px`,
                            boxSizing: "border-box",
                            "--cell-w": `${labelConfig.width}mm`,
                            "--cell-h": `${labelConfig.height}mm`,
                          } as React.CSSProperties
                        }
                      >
                        <span className="text-[9px] text-gray-300 font-mono no-print">
                          Trống
                        </span>
                      </div>
                    );
                  }
                })}
              </div>
            );
          })}
        </div>

        {limitPreview && totalRows > 20 && (
          <div className="mt-4 mb-2 p-3.5 bg-sky-50/95 border border-sky-200/70 rounded-xl shadow-md text-center max-w-lg mx-auto no-print flex flex-col items-center justify-center space-y-2 select-none animate-fadeIn">
            <p className="text-[11.5px] text-sky-950 font-bold leading-relaxed">
              ⚡ Đang chỉ hiển thị trước 20 / {totalRows} hàng tem để đảm bảo
              trình duyệt cuộn mượt mà.
            </p>
            <p className="text-[10px] text-sky-900 leading-normal font-medium">
              Toàn bộ {totalRows} hàng ({totalItems} tem) sẽ tự động được gửi và
              xuất đầy đủ khi bạn in ấn (Print / Ctrl+P)!
            </p>
            <button
              type="button"
              onClick={() => setShowAllPagesOnScreen(true)}
              className="mt-1 px-4 py-1.5 bg-kiot-cyan hover:bg-sky-600 text-white font-bold rounded-lg text-xs leading-none transition-all shadow-sm border border-kiot-cyan cursor-pointer"
            >
              Hiển thị tất cả {totalRows} hàng tem ngay
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="label-editor-workspace"
      onMouseDown={handleLabelMouseDown}
      className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-150/50 border border-gray-200 shadow-inner overflow-auto relative select-none"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/") && onAddImageObject) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              onAddImageObject(event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
        }
      }}
    >
      {/* Center Wrapper for Rulers and the Active Canvas to scroll together perfectly */}
      <div
        id="canvas-ruler-wrapper"
        className="relative shrink-0 flex-initial"
        style={{
          width: `${pxWidth + 24}px`,
          height: `${pxHeight + 24}px`,
        }}
      >
        {/* CORNER RULER ANCHOR */}
        <div
          className="absolute bg-gray-200 border-r border-b border-gray-350 text-[10px] text-gray-550 font-bold select-none z-10 flex items-center justify-center select-none no-print"
          style={{
            width: "24px",
            height: "24px",
            left: 0,
            top: 0,
          }}
        >
          mm
        </div>

        {/* HORIZONTAL RULER (TOP) */}
        <div
          className="absolute bg-gray-50 border-b border-gray-300 overflow-hidden select-none z-10 flex no-print"
          style={{
            height: "24px",
            width: `${pxWidth}px`,
            left: "24px",
            top: 0,
          }}
        >
          {Array.from({ length: safeLength(topTicksCount + 1) }).map((_, i) => {
            const valueMm = i * 5;
            const leftPx = mmToPx(valueMm, pixelScale);
            const isMajor = valueMm % 10 === 0;

            return (
              <div
                key={`h-tick-${i}`}
                className="absolute border-l border-gray-300 flex flex-col items-start transition-all"
                style={{
                  left: `${leftPx}px`,
                  height: isMajor ? "24px" : "12px",
                  bottom: 0,
                }}
              >
                {isMajor && (
                  <span className="text-[9px] font-mono text-gray-500 pl-1 pt-0.5 leading-none select-none">
                    {valueMm}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* VERTICAL RULER (LEFT) */}
        <div
          className="absolute bg-gray-50 border-r border-gray-300 overflow-hidden select-none z-10 no-print"
          style={{
            width: "24px",
            height: `${pxHeight}px`,
            left: 0,
            top: "24px",
          }}
        >
          {Array.from({ length: safeLength(leftTicksCount + 1) }).map(
            (_, i) => {
              const valueMm = i * 5;
              const topPx = mmToPx(valueMm, pixelScale);
              const isMajor = valueMm % 10 === 0;

              return (
                <div
                  key={`v-tick-${i}`}
                  className="absolute border-t border-gray-300 flex items-center transition-all"
                  style={{
                    top: `${topPx}px`,
                    width: isMajor ? "24px" : "12px",
                    right: 0,
                  }}
                >
                  {isMajor && (
                    <span className="text-[9px] font-mono text-gray-500 pr-1 pb-1 leading-none absolute right-3 rotate-270 origin-right select-none">
                      {valueMm}
                    </span>
                  )}
                </div>
              );
            },
          )}
        </div>

        {/* PRINT SHEET - PRIMARY CANVAS WRAPPER */}
        <div
          ref={labelRef}
          id="thermal-label-canvas"
          onMouseDown={handleLabelMouseDown}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onSelectObject(null);
            }
          }}
          className={`shadow-xl absolute transition-shadow duration-300 print:shadow-none print:border-none print:m-0 print:p-0 ${
            gridSnapSize > 0
              ? "bg-[radial-gradient(#e2e8f0_1px,transparent_1.2px)] [background-size:10px_10px]"
              : ""
          }`}
          style={{
            width: `${pxWidth}px`,
            height: `${pxHeight}px`,
            left: "24px",
            top: "24px",
            maxWidth: "100%",
            backgroundColor: labelConfig.bgColor || "#ffffff",
          }}
          title="Làm việc kéo thả bên trong phạm vi phôi nhãn trắng"
        >
          {/* Watermark/Background Image overlay */}
          {labelConfig.bgImage && (
            <div
              className="absolute inset-0 pointer-events-none select-none"
              style={{
                backgroundImage: `url(${labelConfig.bgImage})`,
                backgroundSize: labelConfig.bgImageSize || "contain",
                backgroundPosition: "center",
                backgroundRepeat:
                  labelConfig.bgImageSize === "repeat" ? "repeat" : "no-repeat",
                opacity:
                  labelConfig.bgImageOpacity !== undefined
                    ? labelConfig.bgImageOpacity
                    : 0.3,
                zIndex: 0,
              }}
            />
          )}
          {/* Render individual items */}
          {objects.map((obj) => {
            const isSelected = selectedIds && selectedIds.length > 0 ? selectedIds.includes(obj.id) : (obj.id === selectedId);
            const isPrimarySelected = obj.id === selectedId;

            const dragItem = localDragCoordsList ? localDragCoordsList.find(c => c.id === obj.id) : null;
            const isDraggingThis = dragItem ? true : !!(localDragCoords && localDragCoords.id === obj.id);
            const isResizingThis =
              localResizeDims && localResizeDims.id === obj.id;

            const activeX = isResizingThis
              ? localResizeDims.x
              : isDraggingThis
                ? (dragItem ? dragItem.x : localDragCoords!.x)
                : obj.x;
            const activeY = isResizingThis
              ? localResizeDims.y
              : isDraggingThis
                ? (dragItem ? dragItem.y : localDragCoords!.y)
                : obj.y;
            const activeW = isResizingThis ? localResizeDims.width : obj.width;
            const activeH = isResizingThis
              ? localResizeDims.height
              : obj.height;

            const itemX = mmToPx(activeX, printScale);
            const itemY = mmToPx(activeY, printScale);
            const itemW = mmToPx(activeW, printScale);
            const itemH = mmToPx(activeH, printScale);
            const xPct = (activeX / labelConfig.width) * 100;
            const yPct = (activeY / labelConfig.height) * 100;
            const wPct = (activeW / labelConfig.width) * 100;
            const hPct = (activeH / labelConfig.height) * 100;

            const isRotatingThis =
              localRotateAngle && localRotateAngle.id === obj.id;
            const activeAngle = isRotatingThis
              ? localRotateAngle!.angle
              : obj.angle || 0;

            const rotationStr = activeAngle ? `rotate(${activeAngle}deg)` : "";
            const trans =
              obj.type === "text"
                ? getTextTransform(obj.textFlowOrigin)
                : "none";
            const finalTransform =
              `${rotationStr} ${trans !== "none" ? trans : ""}`.trim() ||
              "none";

            return (
              <div
                key={obj.id}
                id={`object-${obj.id}`}
                onMouseDown={(e) => handleObjectMouseDown(e, obj)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (obj.type === "text") {
                    setEditingTextId(obj.id);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className={`object-print-class absolute flex flex-col items-stretch group cursor-move select-none transition-shadow ${
                  isSelected
                    ? "ring-2 ring-kiot-cyan ring-offset-[1.5px] bg-sky-50/10 z-30 shadow-md"
                    : "hover:ring-1 hover:ring-kiot-cyan/40 z-20 hover:bg-gray-50/30"
                }`}
                style={
                  {
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    width: `${wPct}%`,
                    height: obj.type === "text" ? "auto" : `${hPct}%`,
                    minHeight: obj.type === "text" ? `${hPct}%` : undefined,
                    transform: finalTransform,
                    transformOrigin: activeAngle ? "center center" : "top left",
                    "--o-transform-origin": activeAngle ? "center center" : "top left",
                    // Standard inline properties as custom CSS variables for our print-stylesheet engine:
                    "--o-x": `${activeX}mm`,
                    "--o-y": `${activeY}mm`,
                    "--o-w": `${activeW}mm`,
                    "--o-h": `${activeH}mm`,
                    "--o-print-height":
                      obj.type === "text" ? "auto" : `${activeH}mm`,
                    "--o-print-min-height":
                      obj.type === "text" ? `${activeH}mm` : "0mm",
                    "--o-transform": finalTransform,
                  } as React.CSSProperties
                }
              >
                {/* Dynamic Content Rendering */}
                <div className="w-full h-full p-0.5 select-none overflow-hidden relative">
                  {obj.type === "text" &&
                    (editingTextId === obj.id ? (
                      <textarea
                        autoFocus
                        defaultValue={obj.content}
                        onChange={(e) => {
                          if (onUpdateObject) {
                            onUpdateObject({
                              ...obj,
                              content: e.target.value,
                            });
                          }
                        }}
                        onBlur={() => setEditingTextId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setEditingTextId(null);
                          }
                          e.stopPropagation();
                        }}
                        onKeyUp={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full h-full p-1 border-0 rounded-none bg-sky-50/90 text-slate-900 outline-none resize-none overflow-auto focus:ring-0 whitespace-pre-wrap select-text leading-normal z-50 text-[13px] font-semibold"
                        style={{
                          fontFamily:
                            obj.fontFamily === "Arial"
                              ? "Arial, Helvetica, sans-serif"
                              : obj.fontFamily === "Times New Roman"
                                ? "'Times New Roman', Times, serif"
                                : obj.fontFamily === "Tahoma"
                                  ? "Tahoma, Geneva, sans-serif"
                                  : obj.fontFamily === "monospace"
                                    ? "var(--font-mono)"
                                    : "var(--font-sans)",
                          fontWeight: obj.fontWeight || "normal",
                          fontStyle: obj.fontStyle || "normal",
                          fontSize: `${(obj.fontSize || 11) * 0.352777 * printScale}px`,
                          textAlign: obj.textAlign || "left",
                          lineHeight: "1.25",
                        }}
                      />
                    ) : (
                      renderTextElement(obj, printScale)
                    ))}

                  {obj.type === "barcode" && (
                    <BarcodeRenderer
                      content={obj.content}
                      format={obj.barcodeFormat}
                      displayValue={obj.displayValue}
                      barcodeWidth={obj.barcodeWidth}
                      barcodeHeight={obj.barcodeHeight}
                      fontSize={obj.barcodeFontSize || 7}
                      pixelScale={printScale}
                      barcodeShowTextAbove={obj.barcodeShowTextAbove}
                      barcodeShowTextBelow={obj.barcodeShowTextBelow}
                      barcodeFontFamily={obj.barcodeFontFamily}
                      barcodeFontSize={obj.barcodeFontSize}
                      barcodeFontWeight={obj.barcodeFontWeight}
                      barcodeFontStyle={obj.barcodeFontStyle}
                      barcodeTextMargin={obj.barcodeTextMargin}
                      textFlowOrigin={obj.textFlowOrigin}
                      color={obj.color}
                      barcodeTextColor={obj.barcodeTextColor}
                      onUpdateContent={(newVal) => {
                        if (onUpdateObject) {
                          onUpdateObject({
                            ...obj,
                            content: newVal,
                          });
                        }
                      }}
                    />
                  )}

                  {obj.type === "qrcode" && (
                    <QRCodeRenderer
                      content={obj.content}
                      size={itemW * 0.9} // Take 90% space to fit beautifully
                      textFlowOrigin={obj.textFlowOrigin}
                      color={obj.color}
                    />
                  )}

                  {obj.type === "image" && (
                    <img
                      src={obj.content}
                      alt="Label Element"
                      className="w-full h-full pointer-events-none select-none max-w-full max-h-full"
                      style={{
                        objectFit: obj.imageFit || "contain",
                        opacity:
                          obj.imageOpacity !== undefined ? obj.imageOpacity : 1,
                        display: "block",
                      }}
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {obj.type === "shape" && (
                    <ShapeRenderer obj={obj} pixelScale={printScale} />
                  )}
                </div>

                {/* Selection Border handles for a premium feel */}
                {isPrimarySelected && (
                  <>
                    {/* Rotation line and handle */}
                    <div className="absolute top-0 left-1/2 w-[1.5px] h-8 bg-kiot-cyan -translate-x-1/2 -translate-y-full hover:scale-x-150 transition-all pointer-events-none no-print z-40" />
                    <div
                      onMouseDown={(e) => handleRotateStart(e, obj)}
                      className="absolute top-0 left-1/2 w-4.5 h-4.5 bg-white border border-kiot-cyan text-kiot-cyan hover:bg-[#E0F2FE] hover:text-sky-700 cursor-alias flex items-center justify-center -translate-x-1/2 -translate-y-[36px] rounded-full shadow-md z-40 hover:scale-125 transition-all no-print"
                      title="Kéo để xoay đối tượng (Giữ Shift để hít 15°)"
                    >
                      <RefreshCw className="w-2.5 h-2.5 stroke-[3]" />
                    </div>

                    {/* Corner Handles */}
                    {/* Top-Left */}
                    <div
                      onMouseDown={(e) => handleResizeStart(e, obj, "top-left")}
                      style={{
                        cursor: getRotatedCursor("top-left", obj.angle),
                      }}
                      className="absolute top-0 left-0 w-2.5 h-2.5 bg-kiot-cyan border border-white -translate-x-1/2 -translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-40 no-print"
                      title="Kéo góc để thay đổi kích thước đồng thời"
                    />
                    {/* Top-Right */}
                    <div
                      onMouseDown={(e) =>
                        handleResizeStart(e, obj, "top-right")
                      }
                      style={{
                        cursor: getRotatedCursor("top-right", obj.angle),
                      }}
                      className="absolute top-0 right-0 w-2.5 h-2.5 bg-kiot-cyan border border-white translate-x-1/2 -translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-40 no-print"
                      title="Kéo góc để thay đổi kích thước đồng thời"
                    />
                    {/* Bottom-Left */}
                    <div
                      onMouseDown={(e) =>
                        handleResizeStart(e, obj, "bottom-left")
                      }
                      style={{
                        cursor: getRotatedCursor("bottom-left", obj.angle),
                      }}
                      className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-kiot-cyan border border-white -translate-x-1/2 translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-40 no-print"
                      title="Kéo góc để thay đổi kích thước đồng thời"
                    />
                    {/* Bottom-Right */}
                    <div
                      onMouseDown={(e) =>
                        handleResizeStart(e, obj, "bottom-right")
                      }
                      style={{
                        cursor: getRotatedCursor("bottom-right", obj.angle),
                      }}
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-kiot-cyan border border-white translate-x-1/2 translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-40 no-print"
                      title="Kéo góc để thay đổi kích thước đồng thời"
                    />

                    {/* Middle Edge Handles */}
                    {/* Top-Center */}
                    <div
                      onMouseDown={(e) =>
                        handleResizeStart(e, obj, "top-center")
                      }
                      style={{
                        cursor: getRotatedCursor("top-center", obj.angle),
                      }}
                      className="absolute top-0 left-1/2 w-2 h-2 bg-kiot-cyan border border-white -translate-x-1/2 -translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-45 no-print"
                      title="Kéo cạnh để thay đổi kích thước"
                    />
                    {/* Bottom-Center */}
                    <div
                      onMouseDown={(e) =>
                        handleResizeStart(e, obj, "bottom-center")
                      }
                      style={{
                        cursor: getRotatedCursor("bottom-center", obj.angle),
                      }}
                      className="absolute bottom-0 left-1/2 w-2 h-2 bg-kiot-cyan border border-white -translate-x-1/2 translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-45 no-print"
                      title="Kéo cạnh để thay đổi kích thước"
                    />
                    {/* Left-Center */}
                    <div
                      onMouseDown={(e) =>
                        handleResizeStart(e, obj, "left-center")
                      }
                      style={{
                        cursor: getRotatedCursor("left-center", obj.angle),
                      }}
                      className="absolute top-1/2 left-0 w-2 h-2 bg-kiot-cyan border border-white -translate-x-1/2 -translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-45 no-print"
                      title="Kéo cạnh để thay đổi kích thước"
                    />
                    {/* Right-Center */}
                    <div
                      onMouseDown={(e) =>
                        handleResizeStart(e, obj, "right-center")
                      }
                      style={{
                        cursor: getRotatedCursor("right-center", obj.angle),
                      }}
                      className="absolute top-1/2 right-0 w-2 h-2 bg-kiot-cyan border border-white translate-x-1/2 -translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-45 no-print"
                      title="Kéo cạnh để thay đổi kích thước"
                    />

                    <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-kiot-navy text-[12px] text-white px-2 py-1 rounded-lg shadow-xl whitespace-nowrap opacity-100 font-mono font-bold select-none z-50 flex items-center space-x-1.5 pointer-events-none no-print border-2 border-kiot-cyan/40">
                      <span>X: {obj.x}mm</span>
                      <span>•</span>
                      <span>Y: {obj.y}mm</span>
                      <span>•</span>
                      <span>W: {obj.width}mm</span>
                      <span>•</span>
                      <span>H: {obj.height}mm</span>
                      {activeAngle > 0 && (
                        <>
                          <span>•</span>
                          <span>R: {activeAngle}°</span>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Alignment Status and helpful guides */}
      <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[11px] text-gray-500 pointer-events-none font-sans no-print">
        <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm shadow border border-gray-100 py-1 px-2.5 rounded-full pointer-events-auto">
          <span className="flex items-center space-x-1">
            <LayoutGrid className="w-3.5 h-3.5 text-kiot-cyan" />
            <span>
              Phôi nhãn dán:{" "}
              <strong>
                {labelConfig.width} x {labelConfig.height}mm
              </strong>
            </span>
          </span>
          <span>•</span>
          <span>Tỷ lệ hiển thị: 1mm = {pixelScale}px</span>
          <span>•</span>
          <span className="flex items-center space-x-1.5">
            <span>Hút lưới (Snap):</span>
            <select
              value={gridSnapSize}
              onChange={(e) => onUpdateGridSnapSize?.(parseFloat(e.target.value))}
              className="bg-sky-50 border border-kiot-cyan/20 outline-none text-[11px] py-px px-1.5 text-kiot-navy font-bold rounded-full cursor-pointer hover:bg-sky-100 transition"
            >
              <option value={0}>Tắt</option>
              <option value={0.5}>Mịn (0.5mm)</option>
              <option value={1}>1.0 mm (Mặc định)</option>
              <option value={2}>2.0 mm (Thô)</option>
              <option value={5}>5.0 mm (Lớn)</option>
            </select>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {currentFilePath ? (
            <div 
              className="relative flex items-center space-x-1.5 text-[10.5px] font-bold text-emerald-600 bg-white/95 backdrop-blur-sm shadow border border-emerald-250/50 px-2.5 py-1 rounded-full cursor-pointer pointer-events-auto"
              onMouseEnter={() => setShowLogsPopupBottom(true)}
              onMouseLeave={() => setShowLogsPopupBottom(false)}
              onClick={() => setShowLogsPopupBottom(!showLogsPopupBottom)}
              title="Nhấp để xem chi tiết liên kết tệp mẫu này"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-mono text-[9px] uppercase font-extrabold text-emerald-800 shrink-0">LIÊN KẾT:</span>
              <span className="truncate max-w-[130px]" title={`File: ${currentFilePath}`}>{currentFilePath.split(/[\\/]/).pop()}</span>
              
              {showLogsPopupBottom && (
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-white text-slate-800 rounded-lg shadow-xl border border-gray-250 p-2 text-left z-50 pointer-events-auto select-all">
                  <h5 className="font-extrabold text-[10px] text-zinc-500 uppercase tracking-wider border-b border-gray-150 pb-1 mb-1.5">Nhật ký liên kết file</h5>
                  <div className="text-[9.5px] space-y-1 max-h-32 overflow-y-auto font-mono text-slate-600">
                    <div><strong className="text-emerald-700 font-extrabold text-[9px] uppercase">Đường dẫn đầy đủ:</strong></div>
                    <div className="break-all select-all font-semibold text-[10px] text-slate-700 bg-slate-50 p-1 rounded border border-slate-200/50 mb-1.5">{currentFilePath}</div>
                    
                    <div className="font-extrabold text-slate-500 text-[8.5px] uppercase tracking-wider mb-1">Cập nhật gần đây:</div>
                    {!saveLogs || saveLogs.length === 0 ? (
                      <div className="text-gray-400 italic py-0.5">Chưa ghi nhận hoạt động nào</div>
                    ) : (
                      saveLogs.slice(0, 5).map((log, index) => (
                        <div key={index} className="flex justify-between items-center py-0.5 border-b border-dashed border-gray-100 last:border-0">
                          <span className="truncate text-slate-500">
                            {log.type === 'save' ? '💾 Lưu mới (As)' : log.type === 'quick-save' ? '🔄 Ghi đè file' : '📂 Nhập file'}
                          </span>
                          <span className="text-gray-400 font-medium shrink-0 ml-1">{log.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : currentLocalStorageKey ? (
            <div 
              className="relative flex items-center space-x-1.5 text-[10.5px] font-bold text-indigo-600 bg-white/95 backdrop-blur-sm shadow border border-indigo-200/40 px-2.5 py-1 rounded-full cursor-pointer pointer-events-auto"
              onMouseEnter={() => setShowLogsPopupBottom(true)}
              onMouseLeave={() => setShowLogsPopupBottom(false)}
              onClick={() => setShowLogsPopupBottom(!showLogsPopupBottom)}
              title="Nhấp để xem chi tiết bộ lưu trữ này"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
              <span className="font-mono text-[9px] uppercase font-extrabold text-indigo-800 shrink-0">BẢN LƯU WEB:</span>
              <span className="truncate max-w-[130px]" title={`Mẫu lưu trình duyệt: ${currentLocalStorageKey}`}>{currentLocalStorageKey}</span>
              
              {showLogsPopupBottom && (
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-white text-slate-800 rounded-lg shadow-xl border border-gray-250 p-2 text-left z-50 pointer-events-auto select-all">
                  <h5 className="font-extrabold text-[10px] text-zinc-500 uppercase tracking-wider border-b border-gray-150 pb-1 mb-1.5">Trạng thái bộ lưu mẫu</h5>
                  <div className="text-[9.5px] space-y-1 font-mono text-slate-600">
                    <div><strong className="text-indigo-700 font-extrabold text-[9px] uppercase">Tên mẫu lưu trữ:</strong></div>
                    <div className="break-all font-semibold text-[10px] text-slate-700 bg-slate-50 p-1 rounded border border-slate-200/50 mb-1.5">{currentLocalStorageKey}</div>
                    <p className="text-[9px] text-slate-400 font-sans leading-normal">Bản vẽ này được lưu đè trực tiếp trên trình duyệt bằng phím tắt <strong>Ctrl + S</strong> thay vì mở dialog lựa chọn mới.</p>
                    
                    <div className="font-extrabold text-slate-500 text-[8.5px] uppercase tracking-wider mb-1">Cập nhật gần đây:</div>
                    {!saveLogs || saveLogs.length === 0 ? (
                      <div className="text-gray-400 italic py-0.5">Chưa ghi nhận hoạt động nào</div>
                    ) : (
                      saveLogs.slice(0, 5).map((log, index) => (
                        <div key={index} className="flex justify-between items-center py-0.5 border-b border-dashed border-gray-100 last:border-0">
                          <span className="truncate text-slate-500">
                            {log.type === 'save' ? '💾 Lưu mới (As)' : log.type === 'quick-save' ? '🔄 Ghi đè' : '📂 Nhập file'}
                          </span>
                          <span className="text-gray-400 font-medium shrink-0 ml-1">{log.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex items-center bg-white/90 backdrop-blur-sm shadow border border-gray-100 py-1 px-3 rounded-full space-x-2 pointer-events-auto">
            <span>
              💡 <strong>Nút di chuyển:</strong> Sử dụng các phím mũi tên ⬅️ ➡️ ⬆️
              ⬇️ để dịch nhãn, phím Delete để xoá nhanh.
            </span>
          </div>
        </div>
      </div>

      {/* Marquee Selection Rectangle Overlay */}
      {marqueeState && (
        <div
          className="absolute border-2 border-kiot-cyan bg-kiot-cyan/15 pointer-events-none z-50 rounded"
          style={{
            left: `${Math.min(marqueeState.startX, marqueeState.currentX)}px`,
            top: `${Math.min(marqueeState.startY, marqueeState.currentY)}px`,
            width: `${Math.abs(marqueeState.startX - marqueeState.currentX)}px`,
            height: `${Math.abs(marqueeState.startY - marqueeState.currentY)}px`,
            borderStyle: "dashed",
          }}
        />
      )}
    </div>
  );
}
