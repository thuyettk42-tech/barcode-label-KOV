/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { LabelConfig, LabelObject, SheetLayoutConfig } from "../types";
import { BarcodeRenderer } from "./BarcodeRenderer";
import { QRCodeRenderer } from "./QRCodeRenderer";
import { mmToPx, pxToMm, constrainCoordinates, BASE_DPI_SCALE } from "../utils";
import { Trash, Maximize2, Move, LayoutGrid, RefreshCw } from "lucide-react";

interface LabelCanvasProps {
  labelConfig: LabelConfig;
  objects: LabelObject[];
  selectedId: string | null;
  pixelScale: number; // Pixels per millimeter (e.g., 4)
  gridSnapSize: number; // snappy size in mm (e.g., 1mm. 0 means none)
  onSelectObject: (id: string | null) => void;
  onUpdateObjectCoordinates: (id: string, x: number, y: number) => void;
  onUpdateObjectGeometry: (id: string, x: number, y: number, width: number, height: number) => void;
  onDeleteObject: (id: string) => void;
  isBatchPrinting?: boolean;
  excelData?: any[];
  resolveDynamicObjects?: (objs: LabelObject[], rowIndex: number) => LabelObject[];
  sheetConfig?: SheetLayoutConfig;
  officePreviewMode?: 'design' | 'sheet';
  printCopies?: number;
  printManifestLength?: number;
  isSystemPrinting?: boolean;
  onAddImageObject?: (content: string) => void;
  onUpdateObject?: (updated: LabelObject) => void;
}

const getRotatedCursor = (
  handle: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center" | "left-center" | "right-center",
  angle: number = 0
): string => {
  if (!angle) {
    if (handle === "top-center" || handle === "bottom-center") return "ns-resize";
    if (handle === "left-center" || handle === "right-center") return "ew-resize";
    if (handle === "top-left" || handle === "bottom-right") return "nwse-resize";
    if (handle === "top-right" || handle === "bottom-left") return "nesw-resize";
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

  if ((normalized >= 337.5 || normalized < 22.5) || (normalized >= 157.5 && normalized < 202.5)) {
    return "ns-resize";
  } else if ((normalized >= 22.5 && normalized < 67.5) || (normalized >= 202.5 && normalized < 247.5)) {
    return "nesw-resize";
  } else if ((normalized >= 67.5 && normalized < 112.5) || (normalized >= 247.5 && normalized < 292.5)) {
    return "ew-resize";
  } else {
    return "nwse-resize";
  }
};

const renderTextElement = (obj: LabelObject, pixelScale: number) => {
  const resolveFontFamily = (family: string | undefined) => {
    if (family === "Arial") return "Arial, Helvetica, sans-serif";
    if (family === "Times New Roman") return "'Times New Roman', Times, serif";
    if (family === "Tahoma") return "Tahoma, Geneva, sans-serif";
    if (family === "monospace") return "var(--font-mono)";
    return "var(--font-sans)";
  };

  // Resolve alignment / flow origin classes
  const origin = obj.textFlowOrigin || (obj.textAlign === "center" ? "center" : (obj.textAlign === "right" ? "top-right" : "top-left"));
  
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
    fontWeightVal?: 'normal' | 'bold',
    fontStyleVal?: 'normal' | 'italic',
    underlineVal?: boolean,
    lineThroughVal?: boolean,
    superSubVal?: 'normal' | 'subscript' | 'superscript'
  ) => {
    let decs = [];
    if (underlineVal) decs.push("underline");
    if (lineThroughVal) decs.push("line-through");
    const deco = decs.length > 0 ? decs.join(" ") : "none";

    let wrapped: React.ReactNode = text;
    if (superSubVal === "subscript") {
      wrapped = <sub className="align-sub text-[70%] font-semibold leading-none">{text}</sub>;
    } else if (superSubVal === "superscript") {
      wrapped = <sup className="align-super text-[70%] font-semibold leading-none">{text}</sup>;
    }

    return (
      <span
        style={{
          fontFamily: resolveFontFamily(fontFamilyVal || obj.fontFamily),
          fontWeight: fontWeightVal || "normal",
          fontStyle: fontStyleVal || "normal",
          textDecoration: deco,
          fontSize: `${(fontSizeVal || obj.fontSize || 11) * 0.352777 * pixelScale}px`,
        }}
      >
        {wrapped}
      </span>
    );
  };

  const flexJustify = textalign === 'center' ? 'center' : textalign === 'right' ? 'flex-end' : 'flex-start';

  return (
    <div
      className={`w-full h-full select-none leading-normal break-words overflow-hidden flex flex-col ${justifyClass} ${alignClass}`}
      style={{
        textAlign: textalign as any,
        whiteSpace: "pre-wrap",
        color: obj.color || "#000000"
      }}
    >
      <div 
        className="max-w-full w-full flex flex-wrap items-baseline" 
        style={{ justifyContent: flexJustify }}
      >
        {obj.prefixText && renderSegment(
          obj.prefixText,
          obj.prefixFontSize,
          obj.prefixFontFamily,
          obj.prefixFontWeight,
          obj.prefixFontStyle,
          obj.prefixTextDecorationUnderline,
          obj.prefixTextDecorationLineThrough,
          obj.prefixTextSuperSub
        )}
        {renderSegment(
          obj.content,
          obj.fontSize,
          obj.fontFamily,
          obj.fontWeight,
          obj.fontStyle,
          obj.textDecorationUnderline,
          obj.textDecorationLineThrough,
          obj.textSuperSub
        )}
        {obj.suffixText && renderSegment(
          obj.suffixText,
          obj.suffixFontSize,
          obj.suffixFontFamily,
          obj.suffixFontWeight,
          obj.suffixFontStyle,
          obj.suffixTextDecorationUnderline,
          obj.suffixTextDecorationLineThrough,
          obj.suffixTextSuperSub
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
  pixelScale,
  gridSnapSize,
  onSelectObject,
  onUpdateObjectCoordinates,
  onUpdateObjectGeometry,
  onDeleteObject,
  isBatchPrinting = false,
  excelData = [],
  resolveDynamicObjects,
  sheetConfig,
  officePreviewMode = 'design',
  printCopies,
  printManifestLength,
  isSystemPrinting = false,
  onAddImageObject,
  onUpdateObject
}: LabelCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);

  const [showAllPagesOnScreen, setShowAllPagesOnScreen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const limitPreview = !isPrinting && !isSystemPrinting && !showAllPagesOnScreen;

  // The scale used for rendering elements during printing must always be standard (BASE_DPI_SCALE = 3.7795)
  // to avoid zoom level (pixelScale) affecting layout dimensions on paper.
  const printScale = (isPrinting || isSystemPrinting) ? BASE_DPI_SCALE : pixelScale;

  const safeLength = (len: number) => {
    if (isNaN(len) || !isFinite(len) || len < 0) return 0;
    return Math.min(10000, Math.floor(len));
  };

  // Synchronize document print-size variables dynamically based on active sheet config or label size.
  useEffect(() => {
    const root = document.documentElement;
    const isOfficeMode = sheetConfig && sheetConfig.mode === 'office';
    const showOfficeSheet = isOfficeMode && officePreviewMode === 'sheet';
    const isThermalMode = sheetConfig && sheetConfig.mode === 'thermal';
    const showThermalSheetGrid = isThermalMode && sheetConfig && officePreviewMode === 'sheet';

    if (showOfficeSheet && sheetConfig) {
      let baseWidth = 210; // A4
      let baseHeight = 297;
      if (sheetConfig.paperSize === 'A5') {
        baseWidth = 148;
        baseHeight = 210;
      } else if (sheetConfig.paperSize === 'custom') {
        baseWidth = sheetConfig.customWidth || 210;
        baseHeight = sheetConfig.customHeight || 297;
      }
      if (sheetConfig.orientation === 'landscape') {
        const temp = baseWidth;
        baseWidth = baseHeight;
        baseHeight = temp;
      }
      root.style.setProperty('--print-width', `${baseWidth}mm`);
      root.style.setProperty('--print-height', `${baseHeight}mm`);
    } else if (showThermalSheetGrid && sheetConfig) {
      const cols = sheetConfig.cols || 1;
      const colGap = sheetConfig.colGap || 0;
      const backingWidth = cols * labelConfig.width + (cols - 1) * colGap;
      root.style.setProperty('--print-width', `${backingWidth}mm`);
      root.style.setProperty('--print-height', `${labelConfig.height}mm`);
    } else {
      root.style.setProperty('--print-width', `${labelConfig.width}mm`);
      root.style.setProperty('--print-height', `${labelConfig.height}mm`);
    }
  }, [labelConfig.width, labelConfig.height, sheetConfig, officePreviewMode, isBatchPrinting]);

  // Dragging event states
  const [dragState, setDragState] = useState<{
    objectId: string;
    origX: number; // in mm
    origY: number; // in mm
    startX: number; // clientX
    startY: number; // clientY
  } | null>(null);

  // Resizing event states
  const [resizeState, setResizeState] = useState<{
    objectId: string;
    handle: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center" | "left-center" | "right-center";
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

  const [localRotateAngle, setLocalRotateAngle] = useState<{ id: string; angle: number } | null>(null);
  const latestRotateAngleRef = useRef<{ id: string; angle: number } | null>(null);

  // Local real-time coordinates/dimensions for smooth rendering
  const [localDragCoords, setLocalDragCoords] = useState<{ id: string; x: number; y: number } | null>(null);
  const [localResizeDims, setLocalResizeDims] = useState<{ id: string; x: number; y: number; width: number; height: number } | null>(null);

  const latestCoordsRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const latestResizeRef = useRef<{ id: string; x: number; y: number; width: number; height: number } | null>(null);

  // Listen to keyboard nudges
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;

      // Disable arrow-key scrolling / navigation if workspace is active
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT")) {
        return; // Avoid intercepting inputs
      }

      const activeObj = objects.find((o) => o.id === selectedId);
      if (!activeObj) return;

      // To prevent rounding snap-back locks (越南语: tránh bị kẹt do bo tròn),
      // nudge increment must match or be a multiple of the grid snap size if grid snapping is active.
      const increment = e.shiftKey
        ? (gridSnapSize > 0 ? gridSnapSize * 5 : 5)
        : (gridSnapSize > 0 ? gridSnapSize : 0.5);

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const coords = constrainCoordinates(
          activeObj.x - increment,
          activeObj.y,
          activeObj.width,
          activeObj.height,
          labelConfig.width,
          labelConfig.height,
          gridSnapSize
        );
        onUpdateObjectCoordinates(selectedId, coords.x, coords.y);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const coords = constrainCoordinates(
          activeObj.x + increment,
          activeObj.y,
          activeObj.width,
          activeObj.height,
          labelConfig.width,
          labelConfig.height,
          gridSnapSize
        );
        onUpdateObjectCoordinates(selectedId, coords.x, coords.y);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const coords = constrainCoordinates(
          activeObj.x,
          activeObj.y - increment,
          activeObj.width,
          activeObj.height,
          labelConfig.width,
          labelConfig.height,
          gridSnapSize
        );
        onUpdateObjectCoordinates(selectedId, coords.x, coords.y);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const coords = constrainCoordinates(
          activeObj.x,
          activeObj.y + increment,
          activeObj.width,
          activeObj.height,
          labelConfig.width,
          labelConfig.height,
          gridSnapSize
        );
        onUpdateObjectCoordinates(selectedId, coords.x, coords.y);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Only trigger delete if not typing in form
        onDeleteObject(selectedId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, objects, labelConfig, gridSnapSize, onUpdateObjectCoordinates, onDeleteObject]);

  // Pointer dragging handler on canvas area
  const handleLabelMouseDown = (e: React.MouseEvent) => {
    // Click outside deselects
    if (e.target === labelRef.current) {
      onSelectObject(null);
    }
  };

  const handleObjectMouseDown = (e: React.MouseEvent, obj: LabelObject) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectObject(obj.id);

    setDragState({
      objectId: obj.id,
      origX: obj.x,
      origY: obj.y,
      startX: e.clientX,
      startY: e.clientY
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

      const newX = dragState.origX + deltaXmm;
      const newY = dragState.origY + deltaYmm;

      // Constrain inside label boundary with grid snapping
      const coords = constrainCoordinates(
        newX,
        newY,
        activeObj.width,
        activeObj.height,
        labelConfig.width,
        labelConfig.height,
        gridSnapSize
      );

      latestCoordsRef.current = { id: dragState.objectId, x: coords.x, y: coords.y };
      setLocalDragCoords({ id: dragState.objectId, x: coords.x, y: coords.y });
    };

    const handleMouseUp = () => {
      if (latestCoordsRef.current && latestCoordsRef.current.id === dragState.objectId) {
        onUpdateObjectCoordinates(dragState.objectId, latestCoordsRef.current.x, latestCoordsRef.current.y);
      }
      latestCoordsRef.current = null;
      setLocalDragCoords(null);
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, objects, pixelScale, gridSnapSize, labelConfig, onUpdateObjectCoordinates]);

  const handleResizeStart = (
    e: React.MouseEvent,
    obj: LabelObject,
    handle: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center" | "left-center" | "right-center"
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
      startY: e.clientY
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

      const angleRad = (activeObj.angle || 0) * Math.PI / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);

      // Pivot logic to ensure fixed point in space doesn't move
      const cx_orig = resizeState.origX + resizeState.origWidth / 2;
      const cy_orig = resizeState.origY + resizeState.origHeight / 2;

      let oppX_orig = 0;
      let oppY_orig = 0;

      if (resizeState.handle === "right-center" || resizeState.handle === "bottom-right" || resizeState.handle === "top-right") {
        oppX_orig = -resizeState.origWidth / 2;
      } else if (resizeState.handle === "left-center" || resizeState.handle === "bottom-left" || resizeState.handle === "top-left") {
        oppX_orig = resizeState.origWidth / 2;
      }

      if (resizeState.handle === "bottom-center" || resizeState.handle === "bottom-left" || resizeState.handle === "bottom-right") {
        oppY_orig = -resizeState.origHeight / 2;
      } else if (resizeState.handle === "top-center" || resizeState.handle === "top-left" || resizeState.handle === "top-right") {
        oppY_orig = resizeState.origHeight / 2;
      }

      // World pivot point (stationary offset from origin)
      const pFixedX = cx_orig + (oppX_orig * cos - oppY_orig * sin);
      const pFixedY = cy_orig + (oppX_orig * sin + oppY_orig * cos);

      // Translate the client drag delta back into the rotated object's local axis
      const localDeltaXmm = deltaXmm * cos + deltaYmm * sin;
      const localDeltaYmm = -deltaXmm * sin + deltaYmm * cos;

      if (resizeState.handle === "right-center" || resizeState.handle === "top-right" || resizeState.handle === "bottom-right") {
        newWidth = resizeState.origWidth + localDeltaXmm;
      } else if (resizeState.handle === "left-center" || resizeState.handle === "top-left" || resizeState.handle === "bottom-left") {
        newWidth = resizeState.origWidth - localDeltaXmm;
      }

      if (resizeState.handle === "bottom-center" || resizeState.handle === "bottom-left" || resizeState.handle === "bottom-right") {
        newHeight = resizeState.origHeight + localDeltaYmm;
      } else if (resizeState.handle === "top-center" || resizeState.handle === "top-left" || resizeState.handle === "top-right") {
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

      if (resizeState.handle === "right-center" || resizeState.handle === "bottom-right" || resizeState.handle === "top-right") {
        oppX_new = -newWidth / 2;
      } else if (resizeState.handle === "left-center" || resizeState.handle === "bottom-left" || resizeState.handle === "top-left") {
        oppX_new = newWidth / 2;
      }

      if (resizeState.handle === "bottom-center" || resizeState.handle === "bottom-left" || resizeState.handle === "bottom-right") {
        oppY_new = -newHeight / 2;
      } else if (resizeState.handle === "top-center" || resizeState.handle === "top-left" || resizeState.handle === "top-right") {
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
          height: hVal
        };

        setLocalResizeDims({
          id: resizeState.objectId,
          x: xVal,
          y: yVal,
          width: wVal,
          height: hVal
        });
      }
    };

    const handleMouseUp = () => {
      if (latestResizeRef.current && latestResizeRef.current.id === resizeState.objectId) {
        onUpdateObjectGeometry(
          resizeState.objectId,
          latestResizeRef.current.x,
          latestResizeRef.current.y,
          latestResizeRef.current.width,
          latestResizeRef.current.height
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
  }, [resizeState, objects, pixelScale, gridSnapSize, labelConfig, onUpdateObjectGeometry]);

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
      startAngle: obj.angle || 0
    });
  };

  // Rotating event tracking
  useEffect(() => {
    if (!rotateState) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate angle from center of element to mouse
      const rad = Math.atan2(e.clientY - rotateState.centerY, e.clientX - rotateState.centerX);
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
      if (latestRotateAngleRef.current && latestRotateAngleRef.current.id === rotateState.objectId) {
        const activeObj = objects.find((o) => o.id === rotateState.objectId);
        if (activeObj && onUpdateObject) {
          onUpdateObject({
            ...activeObj,
            angle: latestRotateAngleRef.current.angle
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

  // Dynamic values in pixels
  const pxWidth = mmToPx(labelConfig.width, pixelScale);
  const pxHeight = mmToPx(labelConfig.height, pixelScale);

  // Generate ticks for Rulers (1 tick per 5mm, numeric label every 10mm)
  const topTicksCount = Math.floor(labelConfig.width / 5);
  const leftTicksCount = Math.floor(labelConfig.height / 5);

  const getSheetDimensions = (config: any) => {
    let baseWidth = 210; // A4
    let baseHeight = 297;
    if (config?.paperSize === 'A5') {
      baseWidth = 148;
      baseHeight = 210;
    } else if (config?.paperSize === 'custom') {
      baseWidth = config.customWidth || 210;
      baseHeight = config.customHeight || 297;
    }
    if (config?.orientation === 'landscape') {
      return { width: baseHeight, height: baseWidth };
    }
    return { width: baseWidth, height: baseHeight };
  };

  const isOfficeMode = sheetConfig && sheetConfig.mode === 'office';
  const showOfficeSheet = isOfficeMode && officePreviewMode === 'sheet';

  // Office sheet grid printable view
  if (showOfficeSheet && sheetConfig) {
    const { width: sW, height: sH } = getSheetDimensions(sheetConfig);
    const pxSheetW = mmToPx(sW, pixelScale);
    const pxSheetH = mmToPx(sH, pixelScale);

    const pxML = mmToPx(sheetConfig.marginLeft, pixelScale);
    const pxMR = mmToPx(sheetConfig.marginRight, pixelScale);
    const pxMT = mmToPx(sheetConfig.marginTop, pixelScale);
    const pxMB = mmToPx(sheetConfig.marginBottom, pixelScale);
    const pxCG = mmToPx(sheetConfig.colGap, pixelScale);
    const pxRG = mmToPx(sheetConfig.rowGap, pixelScale);

    const pxCellW = mmToPx(labelConfig.width, pixelScale);
    const pxCellH = mmToPx(labelConfig.height, pixelScale);

    const cellsPerSheet = Math.max(1, (sheetConfig.rows || 1) * (sheetConfig.cols || 1));

    let totalItems = 0;
    const hasExcel = excelData && excelData.length > 0;
    if (hasExcel) {
      totalItems = printManifestLength !== undefined ? printManifestLength : excelData.length;
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
            <span>Trang xem trước bản in ({sheetConfig.paperSize === "custom" ? "Tự chọn" : sheetConfig.paperSize} - {sheetConfig.orientation === "portrait" ? "Khổ dọc" : "Khổ ngang"})</span>
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
            Áp dụng ma trận lề lề trên: {sheetConfig.marginTop}mm, trái: {sheetConfig.marginLeft}mm | {sheetConfig.cols} cột x {sheetConfig.rows} hàng.
          </p>
          <div className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-bold mt-1.5 inline-block border border-gray-200">
            {hasExcel ? `Liên kết Excel: ${totalItems} hàng (${totalSheets} trang)` : `Số nhãn lặp đầy ô: ${totalItems} (${totalSheets} trang)`}
          </div>
        </div>

        <div className="flex flex-col select-none items-center print:m-0 print:p-0">
          {Array.from({ length: safeLength(totalSheets) }).map((_, sIdx) => {
            if (limitPreview && sIdx >= 3) return null;
            return (
              <div
                key={`sheet-page-${sIdx}`}
              className="office-print-page bg-white relative shadow-lg border border-gray-300 md:mb-8 shrink-0 print:m-0 print:shadow-none print:border-none"
              style={{
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
              } as React.CSSProperties}
            >
              {Array.from({ length: safeLength(cellsPerSheet) }).map((_, cIdx) => {
                const globalIdx = sIdx * cellsPerSheet + cIdx;
                if (globalIdx < totalItems) {
                  const resolvedObjs = resolveDynamicObjects
                    ? resolveDynamicObjects(objects, globalIdx)
                    : objects;

                  return (
                    <div
                      key={`cell-${sIdx}-${cIdx}`}
                      className="office-print-cell relative overflow-hidden select-none print:bg-transparent"
                      style={{
                        width: `${pxCellW}px`,
                        height: `${pxCellH}px`,
                        backgroundColor: labelConfig.bgColor || "#ffffff",
                        border: sheetConfig.showBorder ? `${sheetConfig.borderWidth}px solid rgba(156, 163, 175, 0.45)` : "none",
                        borderRadius: `${sheetConfig.borderRadius}mm`,
                        boxSizing: "border-box",
                        "--cell-w": `${labelConfig.width}mm`,
                        "--cell-h": `${labelConfig.height}mm`,
                        "--cell-radius": `${sheetConfig.borderRadius}mm`,
                        "--cell-border": sheetConfig.showBorder ? `${sheetConfig.borderWidth}px solid rgba(156, 163, 175, 0.6)` : "none",
                      } as React.CSSProperties}
                    >
                      {/* Watermark/Background Image overlay */}
                      {labelConfig.bgImage && (
                        <div 
                          className="absolute inset-0 pointer-events-none select-none"
                          style={{
                            backgroundImage: `url(${labelConfig.bgImage})`,
                            backgroundSize: labelConfig.bgImageSize || "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: labelConfig.bgImageSize === "repeat" ? "repeat" : "no-repeat",
                            opacity: labelConfig.bgImageOpacity !== undefined ? labelConfig.bgImageOpacity : 0.3,
                            zIndex: 0,
                          }}
                        />
                      )}
                      {resolvedObjs.map((obj) => {
                        const itemX = mmToPx(obj.x, printScale);
                        const itemY = mmToPx(obj.y, printScale);
                        const itemW = mmToPx(obj.width, printScale);
                        const itemH = mmToPx(obj.height, printScale);
                        const xPct = (obj.x / labelConfig.width) * 100;
                        const yPct = (obj.y / labelConfig.height) * 100;
                        const wPct = (obj.width / labelConfig.width) * 100;
                        const hPct = (obj.height / labelConfig.height) * 100;
                        const trans = obj.type === "text" ? getTextTransform(obj.textFlowOrigin) : "none";
                        const rotationStr = obj.angle ? `rotate(${obj.angle}deg)` : "";
                        const finalTransform = `${rotationStr} ${trans !== "none" ? trans : ""}`.trim() || "none";

                        return (
                          <div
                            key={obj.id}
                            className="object-print-class absolute flex flex-col items-stretch"
                            style={{
                              left: `${xPct}%`,
                              top: `${yPct}%`,
                              width: `${wPct}%`,
                              height: obj.type === "text" ? "auto" : `${hPct}%`,
                              minHeight: obj.type === "text" ? `${hPct}%` : undefined,
                              transform: finalTransform,
                              transformOrigin: obj.angle ? "center center" : "top left",
                              "--o-x": `${obj.x}mm`,
                              "--o-y": `${obj.y}mm`,
                              "--o-w": `${obj.width}mm`,
                              "--o-h": `${obj.height}mm`,
                              "--o-print-height": obj.type === "text" ? "auto" : `${obj.height}mm`,
                              "--o-print-min-height": obj.type === "text" ? `${obj.height}mm` : "0mm",
                              "--o-transform": finalTransform
                            } as React.CSSProperties}
                          >
                            <div className="w-full h-full p-0.5 select-none overflow-hidden relative">
                              {obj.type === "text" && renderTextElement(obj, printScale)}

                              {obj.type === "barcode" && (
                                <BarcodeRenderer
                                  content={obj.content}
                                  format={obj.barcodeFormat}
                                  displayValue={obj.displayValue}
                                  barcodeWidth={obj.barcodeWidth}
                                  barcodeHeight={obj.barcodeHeight}
                                  fontSize={obj.barcodeFontSize || 11}
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
                                    opacity: obj.imageOpacity !== undefined ? obj.imageOpacity : 1,
                                    display: "block"
                                  }}
                                  referrerPolicy="no-referrer"
                                />
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
                      style={{
                        width: `${pxCellW}px`,
                        height: `${pxCellH}px`,
                        boxSizing: "border-box",
                        "--cell-w": `${labelConfig.width}mm`,
                        "--cell-h": `${labelConfig.height}mm`,
                        "--cell-border": "none",
                      } as React.CSSProperties}
                    >
                      <span className="text-[9px] text-gray-300 font-mono no-print">Trống</span>
                    </div>
                  );
                }
              })}
            </div>
            );
          })}
        </div>

        {limitPreview && totalSheets > 3 && (
          <div className="mt-4 mb-2 p-3.5 bg-amber-50/95 border border-amber-250/70 rounded-xl shadow-md text-center max-w-lg mx-auto no-print flex flex-col items-center justify-center space-y-2 select-none animate-fadeIn">
            <p className="text-[11.5px] text-amber-950 font-bold leading-relaxed">
              ⚡ Đang chỉ hiển thị trước 3 / {totalSheets} trang thiết kế để giữ tốc độ phản hồi siêu mượt.
            </p>
            <p className="text-[10px] text-amber-900 leading-normal font-medium">
              Toàn bộ {totalSheets} trang sẽ tự động được gửi và xuất đầy đủ khi bạn in ấn (Print / Ctrl+P)!
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
  const isThermalMode = sheetConfig && sheetConfig.mode === 'thermal';
  const showThermalSheetGrid = isThermalMode && sheetConfig && officePreviewMode === 'sheet';

  if (showThermalSheetGrid && sheetConfig) {
    const cols = Math.max(1, sheetConfig.cols || 1);
    const colGap = sheetConfig.colGap || 0;
    const rowGap = sheetConfig.rowGap !== undefined ? sheetConfig.rowGap : 3.0; // standard 3mm (~0.12 in)
    const labelW = labelConfig.width;
    const labelH = labelConfig.height;
    const backingWidth = cols * labelW + (cols - 1) * colGap;

    const pxBackingW = mmToPx(backingWidth, pixelScale);
    const pxBackingH = mmToPx(labelH, pixelScale);
    const pxColGap = mmToPx(colGap, pixelScale);
    const pxRowGap = mmToPx(rowGap, pixelScale);

    const pxCellW = mmToPx(labelW, pixelScale);
    const pxCellH = mmToPx(labelH, pixelScale);

    let totalItems = 0;
    const hasExcel = excelData && excelData.length > 0;
    if (hasExcel) {
      totalItems = printManifestLength !== undefined ? printManifestLength : excelData.length;
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
            Chiều rộng phôi cuộn: {backingWidth}mm | Khoảng cách cột: {colGap}mm | Khoảng trống hàng (Gap): {rowGap}mm (~{(rowGap / 25.4).toFixed(3)} inch)
          </p>
          <div className="text-[10px] bg-sky-50 text-kiot-navy px-2.5 py-0.5 rounded-md font-bold mt-1.5 inline-block border border-kiot-cyan/35 ring-1 ring-kiot-cyan/5">
            {hasExcel ? `Liên kết Excel: ${totalItems} hàng (${totalRows} hàng tem)` : `Số nhãn in thử: ${totalItems} (${totalRows} hàng tem)`}
          </div>
        </div>

        <div className="flex flex-col select-none items-center print:m-0 print:p-0">
          {Array.from({ length: safeLength(totalRows) }).map((_, rIdx) => {
            if (limitPreview && rIdx >= 20) return null;
            return (
              <div
                key={`thermal-row-${rIdx}`}
              className="batch-print-page bg-white relative shadow-lg shrink-0 print:m-0 print:shadow-none print:border-none flex"
              style={{
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
              } as React.CSSProperties}
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
                      style={{
                        width: `${pxCellW}px`,
                        height: `${pxCellH}px`,
                        backgroundColor: labelConfig.bgColor || "#ffffff",
                        boxSizing: "border-box",
                        border: sheetConfig.showBorder ? `${sheetConfig.borderWidth}px solid rgba(156, 163, 175, 0.45)` : "none",
                        borderRadius: `${sheetConfig.borderRadius}mm`,
                        "--cell-w": `${labelConfig.width}mm`,
                        "--cell-h": `${labelConfig.height}mm`,
                      } as React.CSSProperties}
                    >
                      {/* Watermark/Background Image overlay */}
                      {labelConfig.bgImage && (
                        <div 
                          className="absolute inset-0 pointer-events-none select-none"
                          style={{
                            backgroundImage: `url(${labelConfig.bgImage})`,
                            backgroundSize: labelConfig.bgImageSize || "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: labelConfig.bgImageSize === "repeat" ? "repeat" : "no-repeat",
                            opacity: labelConfig.bgImageOpacity !== undefined ? labelConfig.bgImageOpacity : 0.3,
                            zIndex: 0,
                          }}
                        />
                      )}
                      {resolvedObjs.map((obj) => {
                        const itemX = mmToPx(obj.x, printScale);
                        const itemY = mmToPx(obj.y, printScale);
                        const itemW = mmToPx(obj.width, printScale);
                        const itemH = mmToPx(obj.height, printScale);
                        const xPct = (obj.x / labelConfig.width) * 100;
                        const yPct = (obj.y / labelConfig.height) * 100;
                        const wPct = (obj.width / labelConfig.width) * 100;
                        const hPct = (obj.height / labelConfig.height) * 100;
                        const trans = obj.type === "text" ? getTextTransform(obj.textFlowOrigin) : "none";
                        const rotationStr = obj.angle ? `rotate(${obj.angle}deg)` : "";
                        const finalTransform = `${rotationStr} ${trans !== "none" ? trans : ""}`.trim() || "none";

                        return (
                          <div
                            key={obj.id}
                            className="object-print-class absolute flex flex-col items-stretch"
                            style={{
                              left: `${xPct}%`,
                              top: `${yPct}%`,
                              width: `${wPct}%`,
                              height: obj.type === "text" ? "auto" : `${hPct}%`,
                              minHeight: obj.type === "text" ? `${hPct}%` : undefined,
                              transform: finalTransform,
                              transformOrigin: obj.angle ? "center center" : "top left",
                              "--o-x": `${obj.x}mm`,
                              "--o-y": `${obj.y}mm`,
                              "--o-w": `${obj.width}mm`,
                              "--o-h": `${obj.height}mm`,
                              "--o-print-height": obj.type === "text" ? "auto" : `${obj.height}mm`,
                              "--o-print-min-height": obj.type === "text" ? `${obj.height}mm` : "0mm",
                              "--o-transform": finalTransform
                            } as React.CSSProperties}
                          >
                            <div className="w-full h-full p-0.5 select-none overflow-hidden relative">
                              {obj.type === "text" && renderTextElement(obj, printScale)}

                              {obj.type === "barcode" && (
                                <BarcodeRenderer
                                  content={obj.content}
                                  format={obj.barcodeFormat}
                                  displayValue={obj.displayValue}
                                  barcodeWidth={obj.barcodeWidth}
                                  barcodeHeight={obj.barcodeHeight}
                                  fontSize={obj.barcodeFontSize || 11}
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
                                    opacity: obj.imageOpacity !== undefined ? obj.imageOpacity : 1,
                                    display: "block"
                                  }}
                                  referrerPolicy="no-referrer"
                                />
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
                      style={{
                        width: `${pxCellW}px`,
                        height: `${pxCellH}px`,
                        boxSizing: "border-box",
                        "--cell-w": `${labelConfig.width}mm`,
                        "--cell-h": `${labelConfig.height}mm`,
                      } as React.CSSProperties}
                    >
                      <span className="text-[9px] text-gray-300 font-mono no-print">Trống</span>
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
              ⚡ Đang chỉ hiển thị trước 20 / {totalRows} hàng tem để đảm bảo trình duyệt cuộn mượt mà.
            </p>
            <p className="text-[10px] text-sky-900 leading-normal font-medium">
              Toàn bộ {totalRows} hàng ({totalItems} tem) sẽ tự động được gửi và xuất đầy đủ khi bạn in ấn (Print / Ctrl+P)!
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
      className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-150/50 border border-gray-200 shadow-inner overflow-auto relative select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectObject(null);
        }
      }}
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
            top: 0
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
          top: 0
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
                bottom: 0
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
          top: "24px"
        }}
      >
        {Array.from({ length: safeLength(leftTicksCount + 1) }).map((_, i) => {
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
                right: 0
              }}
            >
              {isMajor && (
                <span className="text-[9px] font-mono text-gray-500 pr-1 pb-1 leading-none absolute right-3 rotate-270 origin-right select-none">
                  {valueMm}
                </span>
              )}
            </div>
          );
        })}
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
              backgroundRepeat: labelConfig.bgImageSize === "repeat" ? "repeat" : "no-repeat",
              opacity: labelConfig.bgImageOpacity !== undefined ? labelConfig.bgImageOpacity : 0.3,
              zIndex: 0,
            }}
          />
        )}
        {/* Render individual items */}
        {objects.map((obj) => {
          const isSelected = obj.id === selectedId;
          const isDraggingThis = localDragCoords && localDragCoords.id === obj.id;
          const isResizingThis = localResizeDims && localResizeDims.id === obj.id;

          const activeX = isResizingThis ? localResizeDims.x : (isDraggingThis ? localDragCoords.x : obj.x);
          const activeY = isResizingThis ? localResizeDims.y : (isDraggingThis ? localDragCoords.y : obj.y);
          const activeW = isResizingThis ? localResizeDims.width : obj.width;
          const activeH = isResizingThis ? localResizeDims.height : obj.height;

          const itemX = mmToPx(activeX, printScale);
          const itemY = mmToPx(activeY, printScale);
          const itemW = mmToPx(activeW, printScale);
          const itemH = mmToPx(activeH, printScale);
          const xPct = (activeX / labelConfig.width) * 100;
          const yPct = (activeY / labelConfig.height) * 100;
          const wPct = (activeW / labelConfig.width) * 100;
          const hPct = (activeH / labelConfig.height) * 100;
          
          const isRotatingThis = localRotateAngle && localRotateAngle.id === obj.id;
          const activeAngle = isRotatingThis ? localRotateAngle!.angle : (obj.angle || 0);

          const rotationStr = activeAngle ? `rotate(${activeAngle}deg)` : "";
          const trans = obj.type === "text" ? getTextTransform(obj.textFlowOrigin) : "none";
          const finalTransform = `${rotationStr} ${trans !== "none" ? trans : ""}`.trim() || "none";

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
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                width: `${wPct}%`,
                height: obj.type === "text" ? "auto" : `${hPct}%`,
                minHeight: obj.type === "text" ? `${hPct}%` : undefined,
                transform: finalTransform,
                transformOrigin: activeAngle ? "center center" : "top left",
                // Standard inline properties as custom CSS variables for our print-stylesheet engine:
                "--o-x": `${activeX}mm`,
                "--o-y": `${activeY}mm`,
                "--o-w": `${activeW}mm`,
                "--o-h": `${activeH}mm`,
                "--o-print-height": obj.type === "text" ? "auto" : `${activeH}mm`,
                "--o-print-min-height": obj.type === "text" ? `${activeH}mm` : "0mm",
                "--o-transform": finalTransform
              } as React.CSSProperties}
            >
              {/* Dynamic Content Rendering */}
              <div className="w-full h-full p-0.5 select-none overflow-hidden relative">
                {obj.type === "text" && (
                  editingTextId === obj.id ? (
                    <textarea
                      autoFocus
                      defaultValue={obj.content}
                      onChange={(e) => {
                        if (onUpdateObject) {
                          onUpdateObject({
                            ...obj,
                            content: e.target.value
                          });
                        }
                      }}
                      onBlur={() => setEditingTextId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setEditingTextId(null);
                        }
                        e.stopPropagation();
                      }}
                      onKeyUp={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full h-full p-1 border-0 rounded-none bg-sky-50/90 text-slate-900 outline-none resize-none overflow-auto focus:ring-0 whitespace-pre-wrap select-text leading-normal z-50 text-[13px] font-semibold"
                      style={{
                        fontFamily: obj.fontFamily === "Arial" ? "Arial, Helvetica, sans-serif" :
                                    obj.fontFamily === "Times New Roman" ? "'Times New Roman', Times, serif" :
                                    obj.fontFamily === "Tahoma" ? "Tahoma, Geneva, sans-serif" :
                                    obj.fontFamily === "monospace" ? "var(--font-mono)" : "var(--font-sans)",
                        fontWeight: obj.fontWeight || "normal",
                        fontStyle: obj.fontStyle || "normal",
                        fontSize: `${(obj.fontSize || 11) * 0.352777 * printScale}px`,
                        textAlign: obj.textAlign || "left",
                        lineHeight: "1.25"
                      }}
                    />
                  ) : (
                    renderTextElement(obj, printScale)
                  )
                )}

                {obj.type === "barcode" && (
                  <BarcodeRenderer
                    content={obj.content}
                    format={obj.barcodeFormat}
                    displayValue={obj.displayValue}
                    barcodeWidth={obj.barcodeWidth}
                    barcodeHeight={obj.barcodeHeight}
                    fontSize={obj.barcodeFontSize || 11}
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
                          content: newVal
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
                      opacity: obj.imageOpacity !== undefined ? obj.imageOpacity : 1,
                      display: "block"
                    }}
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Selection Border handles for a premium feel */}
              {isSelected && (
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
                    style={{ cursor: getRotatedCursor("top-left", obj.angle) }}
                    className="absolute top-0 left-0 w-2.5 h-2.5 bg-kiot-cyan border border-white -translate-x-1/2 -translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-40 no-print" 
                    title="Kéo góc để thay đổi kích thước đồng thời"
                  />
                  {/* Top-Right */}
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, obj, "top-right")}
                    style={{ cursor: getRotatedCursor("top-right", obj.angle) }}
                    className="absolute top-0 right-0 w-2.5 h-2.5 bg-kiot-cyan border border-white translate-x-1/2 -translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-40 no-print" 
                    title="Kéo góc để thay đổi kích thước đồng thời"
                  />
                  {/* Bottom-Left */}
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, obj, "bottom-left")}
                    style={{ cursor: getRotatedCursor("bottom-left", obj.angle) }}
                    className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-kiot-cyan border border-white -translate-x-1/2 translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-40 no-print" 
                    title="Kéo góc để thay đổi kích thước đồng thời"
                  />
                  {/* Bottom-Right */}
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, obj, "bottom-right")}
                    style={{ cursor: getRotatedCursor("bottom-right", obj.angle) }}
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-kiot-cyan border border-white translate-x-1/2 translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-40 no-print" 
                    title="Kéo góc để thay đổi kích thước đồng thời"
                  />

                  {/* Middle Edge Handles */}
                  {/* Top-Center */}
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, obj, "top-center")}
                    style={{ cursor: getRotatedCursor("top-center", obj.angle) }}
                    className="absolute top-0 left-1/2 w-2 h-2 bg-kiot-cyan border border-white -translate-x-1/2 -translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-45 no-print" 
                    title="Kéo cạnh để thay đổi kích thước"
                  />
                  {/* Bottom-Center */}
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, obj, "bottom-center")}
                    style={{ cursor: getRotatedCursor("bottom-center", obj.angle) }}
                    className="absolute bottom-0 left-1/2 w-2 h-2 bg-kiot-cyan border border-white -translate-x-1/2 translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-45 no-print" 
                    title="Kéo cạnh để thay đổi kích thước"
                  />
                  {/* Left-Center */}
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, obj, "left-center")}
                    style={{ cursor: getRotatedCursor("left-center", obj.angle) }}
                    className="absolute top-1/2 left-0 w-2 h-2 bg-kiot-cyan border border-white -translate-x-1/2 -translate-y-1/2 hover:scale-150 active:scale-150 transition-all rounded-full shadow-md z-45 no-print" 
                    title="Kéo cạnh để thay đổi kích thước"
                  />
                  {/* Right-Center */}
                  <div 
                    onMouseDown={(e) => handleResizeStart(e, obj, "right-center")}
                    style={{ cursor: getRotatedCursor("right-center", obj.angle) }}
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
        <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm shadow border border-gray-100 py-1 px-2.5 rounded-full">
          <span className="flex items-center space-x-1">
            <LayoutGrid className="w-3.5 h-3.5 text-kiot-cyan" />
            <span>Phôi nhãn dán: <strong>{labelConfig.width} x {labelConfig.height}mm</strong></span>
          </span>
          <span>•</span>
          <span>Tỷ lệ hiển thị: 1mm = {pixelScale}px</span>
          {gridSnapSize > 0 && (
            <>
              <span>•</span>
              <span className="text-kiot-navy font-bold bg-sky-50 px-1.5 py-0.2 rounded-full whitespace-nowrap border border-kiot-cyan/20">Hút lưới (Snap): {gridSnapSize}mm</span>
            </>
          )}
        </div>
        
        <div className="flex items-center bg-white/90 backdrop-blur-sm shadow border border-gray-100 py-1 px-3 rounded-full space-x-2">
          <span>💡 <strong>Nút di chuyển:</strong> Sử dụng các phím mũi tên ⬅️ ➡️ ⬆️ ⬇️ để dịch nhãn, phím Delete để xoá nhanh.</span>
        </div>
      </div>
    </div>
  );
}
