/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { LabelConfig, LabelObject, ObjectType, SheetLayoutConfig } from "./types";
import { convertToZPL } from "./zplConverter";
import { LabelCanvas } from "./components/LabelCanvas";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { TemplateSelector } from "./components/TemplateSelector";
import * as XLSX from "xlsx";
import { 
  Printer, 
  Plus, 
  Trash2, 
  FileText, 
  Barcode, 
  QrCode, 
  FolderHeart, 
  Save, 
  RefreshCw, 
  ZoomIn, 
  Maximize, 
  ZoomOut, 
  Compass, 
  Grid3X3,
  Undo2,
  Redo2,
  BookOpen,
  Info,
  ExternalLink,
  AlertCircle,
  Database,
  Upload,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  FileSpreadsheet,
  Image,
  Link,
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  Lock,
  Settings,
  Laptop,
  Palette,
  CheckSquare,
  Minus,
  Square,
  Circle,
  Shapes,
  Terminal
} from "lucide-react";

interface TomyTemplate {
  name: string;
  paperSize: 'A4' | 'A5';
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  cols: number;
  rows: number;
  colGap: number;
  rowGap: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
}

const TOMY_TEMPLATES_DATA: TomyTemplate[] = [
  { name: "A5 - Tomy 99 - 96 tem 7 x 31 mm", paperSize: "A5", orientation: "portrait", width: 31, height: 7, cols: 4, rows: 24, colGap: 2, rowGap: 1.2, marginLeft: 9, marginRight: 9, marginTop: 7.2, marginBottom: 7.2 },
  { name: "A5 - Tomy 100 - 8 tem 37 x 96 mm", paperSize: "A5", orientation: "landscape", width: 96, height: 37, cols: 2, rows: 4, colGap: 2, rowGap: 0, marginLeft: 8, marginRight: 8, marginTop: 0, marginBottom: 0 },
  { name: "A5 - Tomy 101 - 6 tem 50 x 96 mm", paperSize: "A5", orientation: "landscape", width: 96, height: 50, cols: 2, rows: 3, colGap: 2, rowGap: 0, marginLeft: 8, marginRight: 8, marginTop: 0, marginBottom: 0 },
  { name: "A5 - Tomy 102 - 12 tem 52 x 47 mm", paperSize: "A5", orientation: "portrait", width: 47, height: 52, cols: 3, rows: 4, colGap: 2.5, rowGap: 2.5, marginLeft: 3, marginRight: 3, marginTop: 1, marginBottom: 1 },
  { name: "A5 - Tomy 103 - 12 tem 36 x 62 mm", paperSize: "A5", orientation: "portrait", width: 62, height: 36, cols: 2, rows: 6, colGap: 3, rowGap: 2, marginLeft: 10, marginRight: 10, marginTop: 1, marginBottom: 1 },
  { name: "A5 - Tomy 104 - 14 tem 25 x 78 mm", paperSize: "A5", orientation: "portrait", width: 78, height: 25, cols: 2, rows: 7, colGap: 3, rowGap: 2, marginLeft: 10, marginRight: 10, marginTop: 11, marginBottom: 11 },
  { name: "A5 - Tomy 105 - 30 tem 25 x 37 mm", paperSize: "A5", orientation: "portrait", width: 37, height: 25, cols: 3, rows: 10, colGap: 2, rowGap: 1.5, marginLeft: 10, marginRight: 10, marginTop: 2, marginBottom: 2 },
  { name: "A5 - Tomy 106 - 42 tem 25 x 25 mm", paperSize: "A5", orientation: "portrait", width: 25, height: 25, cols: 5, rows: 8, colGap: 2, rowGap: 1.5, marginLeft: 10, marginRight: 10, marginTop: 4, marginBottom: 4 },
  { name: "A5 - Tomy 107 - 30 tem 17 x 50 mm", paperSize: "A5", orientation: "portrait", width: 50, height: 17, cols: 2, rows: 15, colGap: 3, rowGap: 1.5, marginLeft: 10, marginRight: 10, marginTop: 3, marginBottom: 3 },
  { name: "A5 - Tomy 108 - 40 tem 19 x 36 mm", paperSize: "A5", orientation: "portrait", width: 36, height: 19, cols: 4, rows: 10, colGap: 2, rowGap: 1.5, marginLeft: 10, marginRight: 10, marginTop: 1, marginBottom: 1 },
  { name: "A5 - Tomy 109 - 55 tem 12 x 37 mm", paperSize: "A5", orientation: "portrait", width: 37, height: 12, cols: 3, rows: 18, colGap: 2, rowGap: 1.2, marginLeft: 10, marginRight: 10, marginTop: 1, marginBottom: 1 },
  { name: "A5 - Tomy 110 - 72 tem 16 x 22 mm", paperSize: "A5", orientation: "portrait", width: 22, height: 16, cols: 6, rows: 12, colGap: 1.5, rowGap: 1.2, marginLeft: 10, marginRight: 10, marginTop: 1, marginBottom: 1 },
  { name: "A5 - Tomy 112 - 144 tem 8 x 20 mm", paperSize: "A5", orientation: "portrait", width: 20, height: 8, cols: 6, rows: 24, colGap: 1.5, rowGap: 1.0, marginLeft: 10, marginRight: 10, marginTop: 1, marginBottom: 1 },
  { name: "A4 - Tomy 125 - 2 tem 206 x 145 mm", paperSize: "A4", orientation: "portrait", width: 206, height: 145, cols: 1, rows: 2, colGap: 0, rowGap: 3, marginLeft: 2, marginRight: 2, marginTop: 2, marginBottom: 2 },
  { name: "A4 - Tomy 126 - 4 tem 102 x 143 mm", paperSize: "A4", orientation: "portrait", width: 102, height: 143, cols: 2, rows: 2, colGap: 3, rowGap: 3, marginLeft: 2, marginRight: 2, marginTop: 4, marginBottom: 4 },
  { name: "A4 - Tomy 127 - 6 tem 100 x 94 mm", paperSize: "A4", orientation: "portrait", width: 100, height: 94, cols: 2, rows: 3, colGap: 3, rowGap: 3, marginLeft: 3, marginRight: 3, marginTop: 4.5, marginBottom: 4.5 },
  { name: "A4 - Tomy 128 - 8 tem 100 x 72 mm", paperSize: "A4", orientation: "portrait", width: 100, height: 72, cols: 2, rows: 4, colGap: 3, rowGap: 2.5, marginLeft: 3, marginRight: 3, marginTop: 1.5, marginBottom: 1.5 },
  { name: "A4 - Tomy 129 - 10 tem 98 x 56 mm", paperSize: "A4", orientation: "portrait", width: 98, height: 56, cols: 2, rows: 5, colGap: 3, rowGap: 2.5, marginLeft: 4, marginRight: 4, marginTop: 3.5, marginBottom: 3.5 },
  { name: "A4 - Tomy 130 - 12 tem 101 x 47 mm", paperSize: "A4", orientation: "portrait", width: 101, height: 47, cols: 2, rows: 6, colGap: 3, rowGap: 2, marginLeft: 2, marginRight: 2, marginTop: 2.5, marginBottom: 2.5 },
  { name: "A4 - Tomy 131 - 14 tem 98 x 40 mm", paperSize: "A4", orientation: "portrait", width: 98, height: 40, cols: 2, rows: 7, colGap: 3, rowGap: 2, marginLeft: 4, marginRight: 4, marginTop: 4, marginBottom: 4 },
  { name: "A4 - Tomy 132 - 48 tem 45.7 x 21.2 mm", paperSize: "A4", orientation: "portrait", width: 45.7, height: 21.2, cols: 4, rows: 12, colGap: 2.5, rowGap: 1.5, marginLeft: 9.8, marginRight: 9.8, marginTop: 13, marginBottom: 13 },
  { name: "A4 - Tomy 133 - 16 tem 101 x 36 mm", paperSize: "A4", orientation: "portrait", width: 101, height: 36, cols: 2, rows: 8, colGap: 3, rowGap: 1.5, marginLeft: 2, marginRight: 2, marginTop: 1, marginBottom: 1 },
  { name: "A4 - Tomy 134 - 18 tem 98 x 32 mm", paperSize: "A4", orientation: "portrait", width: 98, height: 32, cols: 2, rows: 9, colGap: 3, rowGap: 1.5, marginLeft: 4, marginRight: 4, marginTop: 0.5, marginBottom: 0.5 },
  { name: "A4 - Tomy 135 - 21 tem 66 x 40 mm", paperSize: "A4", orientation: "portrait", width: 66, height: 40, cols: 3, rows: 7, colGap: 2.5, rowGap: 1.5, marginLeft: 3, marginRight: 3, marginTop: 4, marginBottom: 4 },
  { name: "A4 - Tomy 136 - 24 tem 70 x 35 mm", paperSize: "A4", orientation: "portrait", width: 70, height: 35, cols: 3, rows: 8, colGap: 2.5, rowGap: 1.5, marginLeft: 2, marginRight: 2, marginTop: 4, marginBottom: 4 },
  { name: "A4 - Tomy 137 - 27 tem 50 x 37 mm", paperSize: "A4", orientation: "portrait", width: 50, height: 37, cols: 4, rows: 8, colGap: 2.5, rowGap: 1.5, marginLeft: 2, marginRight: 2, marginTop: 0.5, marginBottom: 0.5 },
  { name: "A4 - Tomy 138 - 30 tem 40 x 30 mm", paperSize: "A4", orientation: "portrait", width: 40, height: 30, cols: 5, rows: 6, colGap: 2, rowGap: 1.5, marginLeft: 1, marginRight: 1, marginTop: 53.5, marginBottom: 53.5 },
  { name: "A4 - Tomy 139 - 40 tem 70 x 20 mm", paperSize: "A4", orientation: "portrait", width: 70, height: 20, cols: 2, rows: 20, colGap: 3, rowGap: 1, marginLeft: 30, marginRight: 30, marginTop: 4.5, marginBottom: 4.5 },
  { name: "A4 - Tomy 140 - 80 tem 38 x 17 mm", paperSize: "A4", orientation: "portrait", width: 38, height: 17, cols: 5, rows: 16, colGap: 2, rowGap: 1, marginLeft: 5, marginRight: 5, marginTop: 5, marginBottom: 5 },
  { name: "A4 - Tomy 141 - 44 tem 46 x 25 mm", paperSize: "A4", orientation: "portrait", width: 46, height: 25, cols: 4, rows: 11, colGap: 2, rowGap: 1.5, marginLeft: 5, marginRight: 5, marginTop: 6, marginBottom: 6 },
  { name: "A4 - Tomy 143 - 45 tem 38 x 21 mm", paperSize: "A4", orientation: "portrait", width: 38, height: 21, cols: 5, rows: 9, colGap: 2, rowGap: 1.5, marginLeft: 5, marginRight: 5, marginTop: 46, marginBottom: 46 },
  { name: "A4 - Tomy 144 - 30 tem 67 x 47 mm", paperSize: "A4", orientation: "portrait", width: 67, height: 47, cols: 3, rows: 6, colGap: 2.5, rowGap: 2, marginLeft: 2, marginRight: 2, marginTop: 3.7, marginBottom: 3.8 },
  { name: "A4 - Tomy 145 - 65 tem 38 x 21 mm", paperSize: "A4", orientation: "portrait", width: 38, height: 21, cols: 5, rows: 13, colGap: 2, rowGap: 1.5, marginLeft: 5, marginRight: 5, marginTop: 6, marginBottom: 6 },
  { name: "A4 - Tomy 146 - 180 tem 20 x 15 mm", paperSize: "A4", orientation: "portrait", width: 20, height: 15, cols: 10, rows: 18, colGap: 1.5, rowGap: 1, marginLeft: 5, marginRight: 5, marginTop: 5, marginBottom: 5 },
  { name: "A4 - Tomy 147 - 32 tem 48 x 34 mm", paperSize: "A4", orientation: "portrait", width: 48, height: 34, cols: 4, rows: 8, colGap: 2.5, rowGap: 2, marginLeft: 4.5, marginRight: 4.5, marginTop: 7.2, marginBottom: 7.3 },
  { name: "A4 - Tomy 148 - 33 tem 66 x 25 mm", paperSize: "A4", orientation: "portrait", width: 66, height: 25, cols: 3, rows: 11, colGap: 2.5, rowGap: 1.5, marginLeft: 3, marginRight: 3, marginTop: 6, marginBottom: 6 },
  { name: "A4 - Tomy 149 - 18 tem 68 x 42 mm", paperSize: "A4", orientation: "portrait", width: 68, height: 42, cols: 3, rows: 6, colGap: 2.5, rowGap: 2, marginLeft: 2, marginRight: 2, marginTop: 17.5, marginBottom: 17.5 }
];

const InfoTooltip = ({ content }: { content: React.ReactNode }) => (
  <span className="group relative inline-flex items-center ml-1.5 cursor-help select-none align-middle">
    <Info className="w-3.5 h-3.5 text-sky-500 hover:text-sky-600 transition-colors duration-150" />
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 p-2.5 text-[10.5px] font-normal leading-relaxed text-slate-100 opacity-0 shadow-xl transition-all duration-150 scale-95 origin-bottom group-hover:pointer-events-auto group-hover:opacity-100 group-hover:scale-100 font-sans normal-case tracking-normal text-left">
      {content}
      <span className="absolute top-full left-1/2 -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
    </span>
  </span>
);

export default function App() {
  // 1. Core state for current active label
  const [labelConfig, setLabelConfig] = useState<LabelConfig>({
    width: 65,
    height: 45,
    name: "Tem Kệ Siêu Thị Mặc Định"
  });

  // State to manage showing the quick instructions pop up
  const [showHowToUse, setShowHowToUse] = useState<boolean>(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState<boolean>(false);

  // Electron API State integration
  const [electronPrinters, setElectronPrinters] = useState<any[]>([]);
  const [selectedElectronPrinter, setSelectedElectronPrinter] = useState<string>("");
  const [thermalPort, setThermalPort] = useState<string>("USB001");
  const [useElectronDirectPrint, setUseElectronDirectPrint] = useState<boolean>(true);

  // Fetch registered printers from OS in desktop offline mode
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api && api.getPrinters) {
      api.getPrinters()
        .then((printersList: any[]) => {
          setElectronPrinters(printersList || []);
          const defaultP = printersList?.find((p: any) => p.isDefault);
          if (defaultP) {
            setSelectedElectronPrinter(defaultP.name);
          } else if (printersList && printersList.length > 0) {
            setSelectedElectronPrinter(printersList[0].name);
          }
        })
        .catch((err: any) => {
          console.error("Lỗi đồng bộ danh sách máy in từ Electron:", err);
        });
    }
  }, []);

  // 2. Active list of objects placed on the label canvas
  const [objects, setObjects] = useState<LabelObject[]>([
    {
      id: "init-text-1",
      type: "text",
      x: 0,
      y: -16.0,
      width: 59,
      height: 5,
      content: "CỬA HÀNG ĐIỆN TỬ VIỆT NAM",
      fontSize: 9,
      fontWeight: "bold",
      textFlowOrigin: "center",
      textAlign: "center"
    },
    {
      id: "init-barcode-1",
      type: "barcode",
      x: -29.5,
      y: -11.5,
      width: 38,
      height: 18,
      content: "VND-2026-06",
      barcodeFormat: "CODE128",
      displayValue: true,
      barcodeWidth: 1.4,
      barcodeHeight: 11,
      textFlowOrigin: "center"
    },
    {
      id: "init-text-2",
      type: "text",
      x: 0,
      y: 14.0,
      width: 59,
      height: 5,
      content: "Hotline: 1900 1234 - Địa chỉ: Hà Nội",
      fontSize: 7.5,
      textFlowOrigin: "center",
      textAlign: "center"
    },
    {
      id: "init-qrcode-1",
      type: "qrcode",
      x: 11.5,
      y: -11.5,
      width: 18,
      height: 18,
      content: "https://create-barcode-label.vercel.app/",
      textFlowOrigin: "center"
    }
  ]);

  // Undo/Redo action logs (max 10 previous operations)
  const [past, setPast] = useState<LabelObject[][]>([]);
  const [future, setFuture] = useState<LabelObject[][]>([]);

  // Wrapper function to update objects while recording historical actions
  const setObjectsWithHistory = useCallback((newObjects: LabelObject[] | ((prev: LabelObject[]) => LabelObject[])) => {
    setObjects((current) => {
      const next = typeof newObjects === "function" ? newObjects(current) : newObjects;
      if (JSON.stringify(current) === JSON.stringify(next)) {
        return current;
      }
      setPast((prevPast) => {
        const updated = [...prevPast, current];
        if (updated.length > 10) {
          updated.shift(); // Keep max 10 states
        }
        return updated;
      });
      setFuture([]); // Clear redo stack on manual changes
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [objects, ...prev]);
    setObjects(previous);
  }, [past, objects]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => {
      const updated = [...prev, objects];
      if (updated.length > 10) {
        updated.shift();
      }
      return updated;
    });
    setObjects(next);
  }, [future, objects]);

  // 3. Selection state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Clipboard state for copy & paste
  const [clipboard, setClipboard] = useState<LabelObject[]>([]);

  // Function to copy selected objects
  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0) return;
    const itemsToCopy = objects.filter((obj) => selectedIds.includes(obj.id));
    if (itemsToCopy.length > 0) {
      // Deep clone the objects so they are independent
      setClipboard(JSON.parse(JSON.stringify(itemsToCopy)));
    }
  }, [objects, selectedIds]);

  // Function to paste copied objects
  const handlePaste = useCallback(() => {
    if (clipboard.length === 0) return;

    // Generate unique new IDs, shifting coordinates slightly
    const pastedItems: LabelObject[] = clipboard.map((original, index) => {
      const uniqueSuffix = Date.now() + "-" + Math.floor(Math.random() * 1000);
      const newId = `${original.type}-pasted-${uniqueSuffix}-${index}`;
      
      const offset = 3; // 3mm offset
      
      let newX = original.x + offset;
      let newY = original.y + offset;
      
      // If the shifted coordinate overflows, clamp or wrap-around
      if (newX + original.width > labelConfig.width) {
        newX = Math.max(0, labelConfig.width - original.width - 2);
      }
      if (newY + original.height > labelConfig.height) {
        newY = Math.max(0, labelConfig.height - original.height - 2);
      }

      return {
        ...original,
        id: newId,
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10
      };
    });

    // Update canvas with new cloned objects
    setObjectsWithHistory((prev) => [...prev, ...pastedItems]);

    // Automatically select the new pasted items for a smooth UX
    if (pastedItems.length > 0) {
      const lastPastedId = pastedItems[pastedItems.length - 1].id;
      setSelectedId(lastPastedId);
      setSelectedIds(pastedItems.map(item => item.id));
    }

    // Update the clipboard coordinates so that if the user pastes again immediately, 
    // the next paste shifts from the newly pasted position!
    setClipboard(pastedItems);
  }, [clipboard, labelConfig.width, labelConfig.height, setObjectsWithHistory]);

  // Function to scale selected objects proportionally (e.g. for zoom/shortcut resize)
  const handleScaleSelectedObjects = useCallback((factor: number) => {
    if (selectedIds.length === 0) return;
    setObjectsWithHistory((prevObjects) =>
      prevObjects.map((obj) => {
        if (!selectedIds.includes(obj.id)) return obj;

        // Apply scale factor to coordinates if multiple, but scaling dimensions & content layout is essential
        let newWidth = Math.max(1, Math.round(obj.width * factor * 10) / 10);
        let newHeight = Math.max(1, Math.round(obj.height * factor * 10) / 10);

        // Constrain so they don't grow past the label's dimensions
        newWidth = Math.min(newWidth, labelConfig.width);
        newHeight = Math.min(newHeight, labelConfig.height);

        const updated: LabelObject = {
          ...obj,
          width: newWidth,
          height: newHeight,
        };

        if (obj.fontSize !== undefined) {
          updated.fontSize = Math.max(4, Math.round(obj.fontSize * factor * 10) / 10);
        }
        if (obj.prefixFontSize !== undefined) {
          updated.prefixFontSize = Math.max(4, Math.round(obj.prefixFontSize * factor * 10) / 10);
        }
        if (obj.suffixFontSize !== undefined) {
          updated.suffixFontSize = Math.max(4, Math.round(obj.suffixFontSize * factor * 10) / 10);
        }
        if (obj.letterSpacing !== undefined) {
          updated.letterSpacing = Math.round(obj.letterSpacing * factor * 100) / 100;
        }

        return updated;
      })
    );
  }, [selectedIds, labelConfig.width, labelConfig.height, setObjectsWithHistory]);

  // Function to toggle formatting properties on selected text objects
  const handleToggleTextFormat = useCallback((formatType: 'bold' | 'italic' | 'underline' | 'lineThrough') => {
    if (selectedIds.length === 0) return;
    setObjectsWithHistory((prevObjects) =>
      prevObjects.map((obj) => {
        if (!selectedIds.includes(obj.id) || obj.type !== "text") return obj;

        const updated = { ...obj };
        switch (formatType) {
          case 'bold':
            updated.fontWeight = obj.fontWeight === 'bold' ? 'normal' : 'bold';
            break;
          case 'italic':
            updated.fontStyle = obj.fontStyle === 'italic' ? 'normal' : 'italic';
            break;
          case 'underline':
            updated.textDecorationUnderline = !obj.textDecorationUnderline;
            break;
          case 'lineThrough':
            updated.textDecorationLineThrough = !obj.textDecorationLineThrough;
            break;
        }
        return updated;
      })
    );
  }, [selectedIds, setObjectsWithHistory]);

  const handleSelectObject = (id: string | null, isMultiSelect = false) => {
    if (id === null) {
      setSelectedId(null);
      setSelectedIds([]);
    } else {
      if (isMultiSelect) {
        setSelectedIds((prev) => {
          if (prev.includes(id)) {
            const filtered = prev.filter((item) => item !== id);
            const nextSelectedId = selectedId === id
              ? (filtered.length > 0 ? filtered[filtered.length - 1] : null)
              : selectedId;
            setSelectedId(nextSelectedId);
            return filtered;
          } else {
            setSelectedId(id);
            return [...prev, id];
          }
        });
      } else {
        setSelectedId(id);
        setSelectedIds([id]);
      }
    }
  };

  // 4. Utility display settings
  // The user requested that the old 120% zoom (1.2 * 7.07625 = 8.4915) be the new 100% default scale.
  // Standard pixels per mm is now 8.4915.
  const [pixelScale, setPixelScale] = useState<number>(8.4915);
  const [gridSnapSize, setGridSnapSize] = useState<number>(1); // 1mm snapping by default
  const [customSaveName, setCustomSaveName] = useState<string>("");
  const [savedDesigns, setSavedDesigns] = useState<Array<{ name: string; timestamp: string; config: LabelConfig; sheetConfig?: SheetLayoutConfig; objects: LabelObject[] }>>([]);
  const [showSavedList, setShowSavedList] = useState<boolean>(false);
  const [showPresetDropdown, setShowPresetDropdown] = useState<boolean>(false);
  const [isPresetDropdownPinned, setIsPresetDropdownPinned] = useState<boolean>(false);
  const presetContainerRef = React.useRef<HTMLDivElement>(null);
  const [usePopularTomy, setUsePopularTomy] = useState<boolean>(false);
  const [tomySearchQuery, setTomySearchQuery] = useState<string>("");
  const [isTomyDropdownOpen, setIsTomyDropdownOpen] = useState<boolean>(false);
  const tomyContainerRef = React.useRef<HTMLDivElement>(null);

  // States for the custom Save Dialog Modal
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [saveLocation, setSaveLocation] = useState<'local' | 'device' | null>(null);
  const [saveTemplateName, setSaveTemplateName] = useState<string>("");
  const [saveFileFormat, setSaveFileFormat] = useState<'kvl' | 'json'>('kvl');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [currentLocalStorageKey, setCurrentLocalStorageKey] = useState<string | null>(null);
  const [activeFileHandle, setActiveFileHandle] = useState<any>(null);
  const [saveLogs, setSaveLogs] = useState<Array<{ time: string; path: string; type: 'save' | 'import' | 'quick-save' }>>([]);

  // Google Drive integration states removed for lightweight offline operations
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showImageImportModal, setShowImageImportModal] = useState<boolean>(false);
  const [driveUrlInput, setDriveUrlInput] = useState<string>("");
  const [webUrlInput, setWebUrlInput] = useState<string>("");
  const [importError, setImportError] = useState<string>("");

  // Excel Integration state
  const [excelData, setExcelData] = useState<any[]>([]); // Array of spreadsheet row objects
  const [excelColumns, setExcelColumns] = useState<string[]>([]); // Headers of spreadsheet
  const [currentExcelRowIndex, setCurrentExcelRowIndex] = useState<number>(0);
  const [excelFileName, setExcelFileName] = useState<string>("");
  const [excelFileBase64, setExcelFileBase64] = useState<string>("");
  const [excelFilePath, setExcelFilePath] = useState<string | null>(null);
  const [excelFileHandle, setExcelFileHandle] = useState<any | null>(null);
  const [excelUploadMode, setExcelUploadMode] = useState<'sync' | 'new'>('new');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'layout' | 'design'>('layout');
  const [isExcelExpanded, setIsExcelExpanded] = useState<boolean>(false);
  const [sheetConfig, setSheetConfig] = useState<SheetLayoutConfig>({
    mode: 'thermal',
    paperSize: 'A4',
    customWidth: 210,
    customHeight: 297,
    orientation: 'portrait',
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    rows: 8,
    cols: 1,
    rowGap: 3,
    colGap: 0,
    showBorder: false,
    borderWidth: 1,
    borderRadius: 2,
    borderColor: '#9ca3af',
    rollSideMargin: 1
  });
  const [officePreviewMode, setOfficePreviewMode] = useState<'design' | 'sheet'>('design');
  const [wasDesignModeForPrint, setWasDesignModeForPrint] = useState<boolean>(false);
  const [isSystemPrinting, setIsSystemPrinting] = useState<boolean>(false);
  // Google auth configurations removed for offline usage

  // Báo cáo ứng dụng đã tải đầy đủ thành công cho pywebview để xác nhận không lỗi khi khởi động
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 60; // 60 lần thử * 300ms = 18 giây dò tìm tối đa
    const interval = setInterval(() => {
      attempts++;
      const pw = (window as any).pywebview;
      if (pw && pw.api && typeof pw.api.mark_app_loaded === "function") {
        pw.api.mark_app_loaded()
          .then((res: any) => {
            console.log("[DESKTOP] Đã báo cáo tải ứng dụng React thành công.", res);
            clearInterval(interval);
          })
          .catch((err: any) => {
            console.error("[DESKTOP] Lỗi gọi API báo cáo tải:", err);
            clearInterval(interval);
          });
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 300);

    const reportReady = () => {
      const pw = (window as any).pywebview;
      if (pw && pw.api && typeof pw.api.mark_app_loaded === "function") {
        pw.api.mark_app_loaded()
          .then(() => clearInterval(interval))
          .catch(() => {});
      }
    };

    window.addEventListener("pywebviewready", reportReady);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pywebviewready", reportReady);
    };
  }, []);

  // Temporary string states for numeric inputs to allow easy deletion/re-typing
  const [widthInput, setWidthInput] = useState<string>("65");
  const [heightInput, setHeightInput] = useState<string>("45");
  const [colsInput, setColsInput] = useState<string>("1");
  const [rowsInput, setRowsInput] = useState<string>("8");
  const [marginLeftInput, setMarginLeftInput] = useState<string>("10");
  const [marginRightInput, setMarginRightInput] = useState<string>("10");
  const [marginTopInput, setMarginTopInput] = useState<string>( "10");
  const [marginBottomInput, setMarginBottomInput] = useState<string>("10");
  const [colGapOfficeInput, setColGapOfficeInput] = useState<string>("0");
  const [rowGapOfficeInput, setRowGapOfficeInput] = useState<string>("3");
  const [desiredRollWidthInput, setDesiredRollWidthInput] = useState<string>("67");
  const [customWidthInput, setCustomWidthInput] = useState<string>("210");
  const [customHeightInput, setCustomHeightInput] = useState<string>("297");
  const [borderRadiusInput, setBorderRadiusInput] = useState<string>("2");
  const [rollSideMarginInput, setRollSideMarginInput] = useState<string>("1");

  // Keep temporary inputs synchronized with main configurations from external updates
  useEffect(() => {
    if (document.activeElement?.id !== "roll-side-margin-input") {
      setRollSideMarginInput(String(sheetConfig.rollSideMargin !== undefined ? sheetConfig.rollSideMargin : 1));
    }
  }, [sheetConfig.rollSideMargin]);

  useEffect(() => {
    if (document.activeElement?.id !== "custom-width-input") {
      setCustomWidthInput(String(sheetConfig.customWidth || 210));
    }
  }, [sheetConfig.customWidth]);

  useEffect(() => {
    if (document.activeElement?.id !== "custom-height-input") {
      setCustomHeightInput(String(sheetConfig.customHeight || 297));
    }
  }, [sheetConfig.customHeight]);

  useEffect(() => {
    if (document.activeElement?.id !== "border-radius-input") {
      setBorderRadiusInput(String(sheetConfig.borderRadius !== undefined ? sheetConfig.borderRadius : 2));
    }
  }, [sheetConfig.borderRadius]);
  useEffect(() => {
    if (document.activeElement?.id !== "width-input") {
      setWidthInput(String(labelConfig.width));
    }
  }, [labelConfig.width]);

  useEffect(() => {
    if (document.activeElement?.id !== "height-input") {
      setHeightInput(String(labelConfig.height));
    }
  }, [labelConfig.height]);

  useEffect(() => {
    if (document.activeElement?.id !== "cols-input" && document.activeElement?.id !== "cols-roll-input") {
      setColsInput(String(sheetConfig.cols));
    }
  }, [sheetConfig.cols]);

  useEffect(() => {
    if (document.activeElement?.id !== "rows-input") {
      setRowsInput(String(sheetConfig.rows));
    }
  }, [sheetConfig.rows]);

  useEffect(() => {
    if (document.activeElement?.id !== "margin-left-input") {
      setMarginLeftInput(String(sheetConfig.marginLeft));
    }
  }, [sheetConfig.marginLeft]);

  useEffect(() => {
    if (document.activeElement?.id !== "margin-right-input") {
      setMarginRightInput(String(sheetConfig.marginRight));
    }
  }, [sheetConfig.marginRight]);

  useEffect(() => {
    if (document.activeElement?.id !== "margin-top-input") {
      setMarginTopInput(String(sheetConfig.marginTop));
    }
  }, [sheetConfig.marginTop]);

  useEffect(() => {
    if (document.activeElement?.id !== "margin-bottom-input") {
      setMarginBottomInput(String(sheetConfig.marginBottom));
    }
  }, [sheetConfig.marginBottom]);

  useEffect(() => {
    if (document.activeElement?.id !== "col-gap-office-input") {
      setColGapOfficeInput(String(sheetConfig.colGap));
    }
  }, [sheetConfig.colGap]);

  useEffect(() => {
    if (document.activeElement?.id !== "row-gap-office-input") {
      setRowGapOfficeInput(String(sheetConfig.rowGap));
    }
  }, [sheetConfig.rowGap]);

  // Restore preview mode & print state after printing dialogues or window focusing
  useEffect(() => {
    if (!isSystemPrinting && !wasDesignModeForPrint) return;

    const handleRestore = () => {
      setTimeout(() => {
        setIsSystemPrinting(false);
        if (wasDesignModeForPrint) {
          setOfficePreviewMode('design');
          setWasDesignModeForPrint(false);
        }
      }, 600); // 600ms buffer to allow print threads to completely close
    };

    window.addEventListener('afterprint', handleRestore);
    window.addEventListener('focus', handleRestore);

    return () => {
      window.removeEventListener('afterprint', handleRestore);
      window.removeEventListener('focus', handleRestore);
    };
  }, [isSystemPrinting, wasDesignModeForPrint]);

  const [desiredRollWidth, setDesiredRollWidth] = useState<number>(67);
  const [isQuickSizeOpen, setIsQuickSizeOpen] = useState<boolean>(false);
  const [printCopies, setPrintCopies] = useState<number>(24);
  const [printCopiesInput, setPrintCopiesInput] = useState<string>("24");
  const [printQuantityMode, setPrintQuantityMode] = useState<'constant' | 'excel_column'>('constant');
  const [printQuantityColumn, setPrintQuantityColumn] = useState<string>("");
  const [isBatchPrinting, setIsBatchPrinting] = useState<boolean>(false);
  const [isPrintExpanded, setIsPrintExpanded] = useState<boolean>(false);
  const [isStep1Expanded, setIsStep1Expanded] = useState<boolean>(true);
  const [isStep2Expanded, setIsStep2Expanded] = useState<boolean>(false);
  const [isStep3Expanded, setIsStep3Expanded] = useState<boolean>(true);
  const [colGapUnit, setColGapUnit] = useState<'mm' | 'inch'>('mm');
  const [rowGapUnit, setRowGapUnit] = useState<'mm' | 'inch'>('mm');
  const [colGapInput, setColGapInput] = useState<string>("");
  const [rowGapInput, setRowGapInput] = useState<string>("");

  useEffect(() => {
    if (document.activeElement?.id !== "roll-width-input") {
      setDesiredRollWidthInput(String(desiredRollWidth));
    }
  }, [desiredRollWidth]);

  // Forward computed roll width synchronization hook
  useEffect(() => {
    if (document.activeElement?.id !== "roll-width-input") {
      const colGaps = (sheetConfig.cols - 1) * (sheetConfig.colGap || 0);
      const sideMargin = sheetConfig.rollSideMargin !== undefined ? sheetConfig.rollSideMargin : 1;
      const computedW = (labelConfig.width * sheetConfig.cols) + colGaps + sideMargin * 2;
      const roundedW = Math.round(computedW * 10) / 10;
      if (desiredRollWidth !== roundedW) {
        setDesiredRollWidth(roundedW);
      }
    }
  }, [labelConfig.width, sheetConfig.cols, sheetConfig.colGap, sheetConfig.rollSideMargin]);

  useEffect(() => {
    if (document.activeElement?.id !== "col-gap-input") {
      const val = sheetConfig.colGap || 0;
      if (colGapUnit === 'inch') {
        setColGapInput(String(parseFloat((val / 25.4).toFixed(4))));
      } else {
        setColGapInput(String(val));
      }
    }
  }, [sheetConfig.colGap, colGapUnit]);

  useEffect(() => {
    if (document.activeElement?.id !== "row-gap-input") {
      const val = sheetConfig.rowGap !== undefined ? sheetConfig.rowGap : 3.0;
      if (rowGapUnit === 'inch') {
        setRowGapInput(String(parseFloat((val / 25.4).toFixed(4))));
      } else {
        setRowGapInput(String(val));
      }
    }
  }, [sheetConfig.rowGap, rowGapUnit]);

  // Synchronize printCopiesInput text field string whenever printCopies is updated from outside
  useEffect(() => {
    setPrintCopiesInput(String(printCopies));
  }, [printCopies]);

  // Debounce the actual printCopies state updates to prevent browser layout slowdowns when typing quantities
  useEffect(() => {
    const val = parseInt(printCopiesInput, 10);
    if (!isNaN(val) && val > 0) {
      const timer = setTimeout(() => {
        setPrintCopies(val);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [printCopiesInput]);

  // Keep isBatchPrinting in sync with excelData availability
  useEffect(() => {
    setIsBatchPrinting(excelData.length > 0);
  }, [excelData]);

  // Handle click outside for Preset dropdown and Tomy dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!target || !document.body.contains(target)) {
        return; // Ignore detached elements (e.g. elements removed or re-rendered instantly) to avoid closing on tab switches
      }
      if (presetContainerRef.current && !presetContainerRef.current.contains(target)) {
        setShowPresetDropdown(false);
        setIsPresetDropdownPinned(false);
      }
      if (tomyContainerRef.current && !tomyContainerRef.current.contains(target)) {
        setIsTomyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helper to convert ArrayBuffer to Base64 using a memory-safe and performance-optimized chunked reader
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const len = bytes.byteLength;
    const chunkSize = 0xffff; // 64k chunks to prevent call-stack overflows and massive memory allocations
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunkSize) as any
      );
    }
    return btoa(binary);
  };

  // Central processor to import & parse Excel data from binary array buffer
  const processExcelBinary = (dataArrayBuffer: ArrayBuffer, fileName: string, isNewFile: boolean): boolean => {
    try {
      const data = new Uint8Array(dataArrayBuffer);
      const workbook = XLSX.read(data, { type: "array", cellDates: true, cellNF: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });
      
      if (rawData.length < 1) {
        alert("Tệp Excel rỗng hoặc không chứa bảng dữ liệu!");
        return false;
      }

      // Header row (first row of Excel file)
      const headers = (rawData[0] as any[]).map(h => String(h || "").trim()).filter(h => h !== "");
      
      if (headers.length === 0) {
        alert("Không tìm thấy tiêu đề cột hợp lệ nào ở dòng thứ nhất!");
        return false;
      }

      // Mappings items by header
      const items: any[] = [];
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i] as any[];
        if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === "")) {
          continue; // Skip blank lines
        }
        const itemObj: any = {};
        headers.forEach((header, colIdx) => {
          itemObj[header] = row[colIdx] !== undefined ? String(row[colIdx]) : "";
        });
        items.push(itemObj);
      }

      if (items.length === 0) {
        alert("Nhập tệp Excel thành công nhưng không có các dòng dữ liệu từ dòng số 2 để liên kết.");
        return false;
      }

      setExcelFileName(fileName);
      setExcelColumns(headers);
      setExcelData(items);
      setPrintCopies(1);
      setCurrentExcelRowIndex(0);
      setIsExcelExpanded(true);

      if (isNewFile) {
        // If a new different file is selected, clear all associations/mappings
        setObjects(prevObjects => prevObjects.map(obj => {
          const copy = { ...obj };
          delete copy.excelColumn;
          return copy;
        }));
      }

      setTimeout(() => {
        document.getElementById("excel-section-header")?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      return true;
    } catch (err: any) {
      console.error("XLSX parse error: ", err);
      alert("Nạp tệp Excel thất bại. Vui lòng kiểm tra lại định dạng tệp .xlsx hoặc .xls.");
      return false;
    }
  };

  // Standard manual <input type="file"> event handler (Fallback source)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for design storage (.kvl mapping retention)
    const b64Reader = new FileReader();
    b64Reader.onload = (b64Evt) => {
      try {
        const b64Result = b64Evt.target?.result as string;
        const base64Content = b64Result.split(",")[1] || b64Result;
        setExcelFileBase64(base64Content);
      } catch (errB64) {
        console.error("FileReader base64 error:", errB64);
      }
    };
    b64Reader.readAsDataURL(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        processExcelBinary(evt.target.result as ArrayBuffer, file.name, excelUploadMode === 'new');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Combined trigger to launch native file selectors across all target runtime frames
  const triggerExcelLoadDialog = async (modeOverride?: 'new' | 'sync') => {
    const activeMode = modeOverride || excelUploadMode;
    // @ts-ignore
    if (window.pywebview && window.pywebview.api && window.pywebview.api.load_excel_native) {
      try {
        // @ts-ignore
        const response = await window.pywebview.api.load_excel_native();
        if (response && response.status === "success" && response.base64) {
          setExcelFilePath(response.file_path);
          
          // Match array bounds
          const binaryStr = atob(response.base64);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          
          const ok = processExcelBinary(bytes.buffer, response.filename, activeMode === 'new');
          if (ok) {
            setExcelFileBase64(response.base64);
          }
        } else if (response && response.status === "error") {
          alert("Lỗi mở file thông qua hệ điều hành: " + response.message);
        }
      } catch (err: any) {
        alert("Lỗi khởi tạo hộp thoại chọn file hệ thống: " + err.message);
      }
    } else if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        // @ts-ignore
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Tệp Excel (*.xlsx, *.xls)',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                'application/vnd.ms-excel': ['.xls']
              }
            }
          ],
          multiple: false
        });
        
        const file = await handle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const ok = processExcelBinary(arrayBuffer, file.name, activeMode === 'new');
        if (ok) {
          setExcelFileHandle(handle);
          const base64Str = arrayBufferToBase64(arrayBuffer);
          setExcelFileBase64(base64Str);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          alert("Lỗi nạp Excel: " + err.message);
        }
      }
    } else {
      // Standard local <input> tag fallback
      setExcelUploadMode(activeMode);
      setTimeout(() => {
        document.getElementById("excel-file-uploader-direct")?.click();
      }, 50);
    }
  };

  // COMPLETELY SYSTEM-HIDDEN BACKGROUND EXCEL HOT UPDATE Worker
  const handleDirectExcelSync = async () => {
    // 1. Pywebview native background update path (completely silent!)
    // @ts-ignore
    if (window.pywebview && window.pywebview.api && window.pywebview.api.read_file_base64_direct && excelFilePath) {
      try {
        // @ts-ignore
        const response = await window.pywebview.api.read_file_base64_direct(excelFilePath);
        if (response && response.status === "success" && response.base64) {
          // Convert base64 back to ArrayBuffer
          const binaryStr = atob(response.base64);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const ok = processExcelBinary(bytes.buffer, response.filename, false); // Always sync mode (preserve mappings)
          if (ok) {
            setExcelFileBase64(response.base64);
            alert(`[ĐỒNG BỘ CHẠY NGẦM THÀNH CÔNG]\nHệ thống đã tự động quét và làm mới dữ liệu từ đường dẫn:\n"${excelFilePath}"\n\n✓ Giữ nguyên 100% tất cả các liên kết trường dữ liệu.`);
          }
        } else if (response && response.status === "error") {
          // If the file was moved or is inaccessible, offer standard re-picking fallback
          alert(`Không thể tự động đồng bộ ẩn: ${response.message}\n\nHệ thống sẽ hiển thị hộp thoại chọn lại file để khôi phục.`);
          triggerExcelLoadDialog('sync');
        }
      } catch (err: any) {
        alert("Lỗi đồng bộ chạy ngầm: " + err.message);
        triggerExcelLoadDialog('sync');
      }
    }
    // 2. Modern browser File Access handle updates (completely silent if permission still granted!)
    else if (excelFileHandle) {
      try {
        const opt = { mode: 'read' as const };
        let permissionGranted = false;
        
        const currentPermission = await excelFileHandle.queryPermission(opt);
        if (currentPermission === 'granted') {
          permissionGranted = true;
        } else {
          const requestPermission = await excelFileHandle.requestPermission(opt);
          if (requestPermission === 'granted') {
            permissionGranted = true;
          }
        }
        
        if (permissionGranted) {
          const file = await excelFileHandle.getFile();
          const arrayBuffer = await file.arrayBuffer();
          const ok = processExcelBinary(arrayBuffer, file.name, false); // Always sync mode (preserve mappings)
          if (ok) {
            const base64Str = arrayBufferToBase64(arrayBuffer);
            setExcelFileBase64(base64Str);
            alert(`[ĐỒNG BỘ CHẠY NGẦM THÀNH CÔNG]\nĐã cập nhật dữ liệu tự động từ file: "${file.name}"\n\n✓ Giữ nguyên 100% tất cả các liên kết trường dữ liệu.`);
          }
        } else {
          // If permission is denied, fall back transparently
          triggerExcelLoadDialog('sync');
        }
      } catch (err: any) {
        console.warn("Silent file handle refresh failed, promoting to dialog:", err);
        triggerExcelLoadDialog('sync');
      }
    }
    // 3. Fallback path: standard web upload dialog
    else {
      triggerExcelLoadDialog('sync');
    }
  };

  const handleClearExcel = () => {
    setExcelData([]);
    setExcelColumns([]);
    setCurrentExcelRowIndex(0);
    setExcelFileName("");
    setExcelFileBase64(""); // Clear base64 as well
    setExcelFilePath(null);
    setExcelFileHandle(null);
    setPrintQuantityMode('constant');
    setPrintQuantityColumn("");
    setPrintCopies(24);
    // Safely strip excelColumn linkage from active objects
    setObjects(objects.map(obj => {
      const copy = { ...obj };
      delete copy.excelColumn;
      return copy;
    }));
  };

  // Helper resolver that swaps object content dynamically based on Excel column linking and indices
  const resolveDynamicObjects = (objs: LabelObject[], rowIndex: number) => {
    if (excelData && excelData.length > 0) {
      const activeRow = excelData[rowIndex];
      if (activeRow) {
        return objs.map(obj => {
          if (obj.excelColumn && activeRow[obj.excelColumn] !== undefined) {
            return {
              ...obj,
              content: String(activeRow[obj.excelColumn] ?? "")
            };
          }
          return obj;
        });
      }
    }
    return objs;
  };

  // Generate print manifest of indices with strict safeguards to avoid crashing browser heaps
  const printManifestData = useMemo(() => {
    if (!excelData || excelData.length === 0) {
      return { manifest: [], warning: null, hasExceeded: false };
    }

    const manifest: number[] = [];
    let hasExceeded = false;
    let lastSafeRow: number | null = null;
    let warningMessage: string | null = null;

    if (printQuantityMode === "excel_column" && printQuantityColumn) {
      let accumulatedSum = 0;
      for (let idx = 0; idx < excelData.length; idx++) {
        const row = excelData[idx];
        const rawVal = row[printQuantityColumn];
        let qty = 1; // standard default is 1 if empty or invalid
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
          const cleaned = String(rawVal).trim().replace(/,/g, '');
          const parsedFloat = parseFloat(cleaned);
          if (!isNaN(parsedFloat)) {
            const integerPart = Math.floor(parsedFloat);
            if (integerPart <= 0) {
              qty = 1;
            } else {
              qty = Math.min(integerPart, 1000); // Safeguard: Cap single row quantity to 1000 to prevent crash
            }
          } else {
            qty = 1;
          }
        } else {
          qty = 1;
        }

        // Check if adding this row's copies exceeds the limit of 1000
        if (accumulatedSum + qty > 1000) {
          hasExceeded = true;
          lastSafeRow = idx; // first index that fails
          break;
        }

        for (let i = 0; i < qty; i++) {
          manifest.push(idx);
        }
        accumulatedSum += qty;
      }

      if (hasExceeded && lastSafeRow !== null) {
        // Find the index of the last row successfully included = lastSafeRow (since we processed lastSafeRow items, index starts at 0, so last successfully included data row is rows 1..lastSafeRow)
        const lastSafeRowNumber = lastSafeRow; // 5th row of values (since idx is 0-indexed, if it breaks at idx=5, we successfully added index 0,1,2,3,4. There are 5 rows total, so 5th data row)
        const lastSafeExcelLine = lastSafeRow + 1; // equivalent Excel row line number (including header)
        
        warningMessage = lastSafeRowNumber > 0 
          ? `Vượt quá số lượng in cho phép, hệ thống chỉ có thể in tới hàng thứ ${lastSafeRowNumber} (dòng ${lastSafeExcelLine} trong tệp Excel), vui lòng xóa các dòng đã in để tiếp tục phần còn lại.`
          : `Cảnh báo: Dòng đầu tiên trong Excel đã có số lượng vượt hạn mức 1.000 bản in cho phép!`;
      }
    } else if (printQuantityMode === "excel_column") {
      // excel mode but no column selected (each row prints exactly 1 copy)
      let accumulatedSum = 0;
      for (let idx = 0; idx < excelData.length; idx++) {
        if (accumulatedSum + 1 > 1000) {
          hasExceeded = true;
          lastSafeRow = idx;
          break;
        }
        manifest.push(idx);
        accumulatedSum += 1;
      }
      if (hasExceeded && lastSafeRow !== null) {
        warningMessage = `Vượt quá số lượng in cho phép, hệ thống chỉ có thể in tới hàng thứ ${lastSafeRow} (dòng ${lastSafeRow + 1} trong tệp Excel), vui lòng xóa các dòng đã in để tiếp tục phần còn lại.`;
      }
    } else {
      // printQuantityMode === "constant"
      const copies = Math.min(Math.max(1, printCopies), 1000); // Safeguard copies to max 1000
      let accumulatedSum = 0;
      for (let idx = 0; idx < excelData.length; idx++) {
        if (accumulatedSum + copies > 1000) {
          hasExceeded = true;
          lastSafeRow = idx;
          break;
        }
        for (let i = 0; i < copies; i++) {
          manifest.push(idx);
        }
        accumulatedSum += copies;
      }
      if (hasExceeded && lastSafeRow !== null) {
        warningMessage = `Vượt quá số lượng in cho phép, hệ thống chỉ có thể in tới hàng thứ ${lastSafeRow} (dòng ${lastSafeRow + 1} trong tệp Excel), vui lòng xóa các dòng đã in để tiếp tục phần còn lại.`;
      }
    }

    return {
      manifest,
      warning: warningMessage,
      hasExceeded,
    };
  }, [excelData, printQuantityMode, printQuantityColumn, printCopies]);

  const printManifest = useMemo(() => printManifestData.manifest, [printManifestData]);
  const printLimitWarning = useMemo(() => printManifestData.warning, [printManifestData]);

  // Wrapper for cell level dynamic object resolver that respects the repeating print count
  const resolveDynamicObjectsForCell = (objs: LabelObject[], globalCellIndex: number) => {
    if (excelData && excelData.length > 0) {
      let rowIndex = globalCellIndex;
      if (printManifest.length > 0) {
        rowIndex = printManifest[globalCellIndex] !== undefined ? printManifest[globalCellIndex] : 0;
      }
      return resolveDynamicObjects(objs, rowIndex);
    }
    return objs;
  };

  // Identify headers in excelColumns matching 2 strict conditions:
  // 1. Header label matches keywords (SL, Số lượng, Tồn kho, Kho, v.v.)
  // 2. Values starting from row 2 downward (excelData entries) must be numeric
  const numericExcelColumns = useMemo(() => {
    if (!excelData || excelData.length === 0) return [];
    return excelColumns.filter((col) => {
      // Điều kiện 1: Kiểm tra tên tiêu đề cột hỗ trợ đa dạng từ khóa Việt/Anh và loại bỏ dấu tiếng Việt hoàn toàn để đối chiếu
      const title = String(col).toLowerCase().normalize("NFC").trim();
      
      const stripAccents = (str: string) => {
        return str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d");
      };
      const titleCleaned = stripAccents(title);
      
      const isQuantityHeader = 
        title === "sl" ||
        title === "sl." ||
        title === "s.l" ||
        title.startsWith("sl ") ||
        title.endsWith(" sl") ||
        titleCleaned.includes("so luong") ||
        titleCleaned.includes("sl ton") ||
        titleCleaned.includes("ton kho") ||
        titleCleaned.includes("ton") ||
        titleCleaned.includes("kho") ||
        titleCleaned.includes("inventory") ||
        titleCleaned.includes("stock") ||
        titleCleaned.includes("qty") ||
        titleCleaned.includes("quantity");

      if (!isQuantityHeader) {
        return false;
      }

      // Điều kiện 2: Kiểm tra dữ liệu từ dòng 2 trở xuống (toàn bộ excelData) có là Number không
      let numericCount = 0;
      let totalChecked = 0;
      for (let i = 0; i < excelData.length; i++) {
        const val = excelData[i][col];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          totalChecked++;
          const cleaned = String(val).trim().replace(/,/g, '');
          const num = Number(cleaned);
          if (!isNaN(num) && isFinite(num)) {
            numericCount++;
          }
        }
      }
      // Đảm bảo tối thiểu 95% dòng dữ liệu không trống là số để tránh nhận diện sai
      return totalChecked > 0 && (numericCount / totalChecked) >= 0.95;
    });
  }, [excelData, excelColumns]);

  // Proactive column selector for numeric print count
  useEffect(() => {
    if (printQuantityMode === "excel_column" && numericExcelColumns.length > 0) {
      if (!printQuantityColumn || !numericExcelColumns.includes(printQuantityColumn)) {
        setPrintQuantityColumn(numericExcelColumns[0]);
      }
    }
  }, [printQuantityMode, numericExcelColumns, printQuantityColumn]);

  // Load saved designs on mount (100% Offline Local Storage)
  useEffect(() => {
    try {
      const loaded = localStorage.getItem("barcode_designer_saved_v1");
      if (loaded) {
        setSavedDesigns(JSON.parse(loaded));
      }
    } catch (err) {
      console.error("Failed to load local saved designs:", err);
    }
  }, []);

  const getSheetDimensions = (config: SheetLayoutConfig) => {
    let baseWidth = 210;
    let baseHeight = 297;
    if (config.paperSize === 'A5') {
      baseWidth = 148;
      baseHeight = 210;
    } else if (config.paperSize === 'custom') {
      baseWidth = config.customWidth || 210;
      baseHeight = config.customHeight || 297;
    }
    if (config.orientation === 'landscape') {
      return { width: baseHeight, height: baseWidth };
    }
    return { width: baseWidth, height: baseHeight };
  };

  // Sync variables to CSS before print dialog is prompted
  useEffect(() => {
    const root = document.documentElement;
    if (sheetConfig.mode === 'office') {
      const { width: sWidth, height: sHeight } = getSheetDimensions(sheetConfig);
      root.style.setProperty("--print-width", `${sWidth}mm`);
      root.style.setProperty("--print-height", `${sHeight}mm`);
      
      root.style.setProperty("--sheet-m-top", `${sheetConfig.marginTop}mm`);
      root.style.setProperty("--sheet-m-bottom", `${sheetConfig.marginBottom}mm`);
      root.style.setProperty("--sheet-m-left", `${sheetConfig.marginLeft}mm`);
      root.style.setProperty("--sheet-m-right", `${sheetConfig.marginRight}mm`);
      
      root.style.setProperty("--sheet-grid-cols", `repeat(${sheetConfig.cols}, ${labelConfig.width}mm)`);
      root.style.setProperty("--sheet-grid-rows", `repeat(${sheetConfig.rows}, ${labelConfig.height}mm)`);
      root.style.setProperty("--sheet-col-gap", `${sheetConfig.colGap}mm`);
      root.style.setProperty("--sheet-row-gap", `${sheetConfig.rowGap}mm`);
      
      root.style.setProperty("--cell-w", `${labelConfig.width}mm`);
      root.style.setProperty("--cell-h", `${labelConfig.height}mm`);
      
      if (sheetConfig.showBorder) {
        root.style.setProperty("--cell-border", `${sheetConfig.borderWidth}px solid ${sheetConfig.borderColor || '#9ca3af'}`);
      } else {
        root.style.setProperty("--cell-border", "none");
      }
      root.style.setProperty("--cell-radius", `${sheetConfig.borderRadius}mm`);
    } else if (sheetConfig.mode === 'thermal' && (officePreviewMode === 'sheet' || isBatchPrinting)) {
      const cols = sheetConfig.cols || 1;
      const colGap = sheetConfig.colGap || 0;
      const backingWidth = cols * labelConfig.width + (cols - 1) * colGap;
      root.style.setProperty("--print-width", `${backingWidth}mm`);
      root.style.setProperty("--print-height", `${labelConfig.height}mm`);
    } else {
      root.style.setProperty("--print-width", `${labelConfig.width}mm`);
      root.style.setProperty("--print-height", `${labelConfig.height}mm`);
    }
  }, [labelConfig.width, labelConfig.height, sheetConfig, officePreviewMode, isBatchPrinting]);

  // Apply dimensions presets
  const applyPresetDimensions = (w: number, h: number, name: string) => {
    setLabelConfig({ width: w, height: h, name });
    handleSelectObject(null);
    
    // Bounds check elements during resizing so they never fall outside boundaries
    setObjects(objects.map(obj => {
      let finalX = obj.x;
      let finalY = obj.y;
      
      if (finalX + obj.width > w) {
        finalX = Math.max(0, w - obj.width);
      }
      if (finalY + obj.height > h) {
        finalY = Math.max(0, h - obj.height);
      }
      
      return {
        ...obj,
        x: Math.round(finalX * 10) / 10,
        y: Math.round(finalY * 10) / 10
      };
    }));
  };

  // Add a new element to the workspace, positioned smartly near the center of the active canvas width
  const handleAddObject = (type: ObjectType, customContent?: string) => {
    const timestampId = `${type}-${Date.now()}`;
    let newObject: LabelObject;

    // Approximate size in mm
    let w = 40;
    let h = 7.4; // 11pt font size + 5pt top padding + 5pt bottom padding (~ 7.4mm)
    if (type === "barcode") {
      w = 50;
      h = 19; // 15mm barcode height + 2mm padding top + 2mm padding bottom
    } else if (type === "qrcode") {
      w = 25;
      h = 25;
    } else if (type === "image") {
      w = 30;
      h = 30;
    }

    // Centering positions calculated relative to the label's center (0, 0 position)
    // - For elements with center anchors (barcode, qrcode, image, shapes): x = 0, y = 0
    if (type === "text") {
      newObject = {
        id: timestampId,
        type: "text",
        x: 0,
        y: 0,
        width: w,
        height: h,
        content: customContent || "NỘI DUNG VĂN BẢN MỚI",
        fontSize: 10, // Default font size is 10 pt
        fontWeight: "normal",
        textAlign: "center",
        textFlowOrigin: "center"
      };
    } else if (type === "barcode") {
      newObject = {
        id: timestampId,
        type: "barcode",
        x: 0,
        y: 0,
        width: w,
        height: h,
        content: customContent || "SP-2026-A1",
        barcodeFormat: "CODE128",
        displayValue: true,
        barcodeWidth: 1.5,
        barcodeHeight: 15,
        textFlowOrigin: "center",
        barcodeFontSize: 6
      };
    } else if (type === "qrcode") {
      newObject = {
        id: timestampId,
        type: "qrcode",
        x: 0,
        y: 0,
        width: w,
        height: h,
        content: customContent || "https://vi.wikipedia.org",
        textFlowOrigin: "center"
      };
    } else if (type === "image") {
      newObject = {
        id: timestampId,
        type: "image",
        x: 0,
        y: 0,
        width: w,
        height: h,
        content: customContent || `data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="none" stroke="%234f46e5" stroke-dasharray="3 3" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
        imageFit: "contain",
        imageOpacity: 1,
        textFlowOrigin: "center"
      };
    } else {
      // type === "shape"
      const sType = (customContent as any) || "rect";
      let shapeW = 30;
      let shapeH = 15;
      if (sType === "line") {
        shapeW = 30;
        shapeH = 2; // thin box for line
      } else if (sType === "circle") {
        shapeW = 15;
        shapeH = 15;
      } else if (sType === "oval") {
        shapeW = 25;
        shapeH = 15;
      }

      newObject = {
        id: timestampId,
        type: "shape",
        x: 0,
        y: 0,
        width: shapeW,
        height: shapeH,
        content: sType === "line" ? "Đường kẻ" : sType === "rect" ? "Hình chữ nhật" : sType === "circle" ? "Hình tròn" : "Hình oval",
        shapeType: sType,
        shapeStrokeWidth: sType === "line" ? 0.8 : 0.8,
        shapeStrokeColor: "#000000",
        shapeFillColor: "transparent",
        shapeCornerRadius: sType === "rect" ? 1.5 : 0,
        shapeStrokeStyle: "solid",
        textFlowOrigin: "center"
      };
    }

    setObjectsWithHistory([...objects, newObject]);
    handleSelectObject(timestampId);
  };

  // Handle single object attribute updates in Properties Panel with batch propagation
  const handleUpdateObject = (updated: LabelObject) => {
    const original = objects.find((obj) => obj.id === updated.id);
    if (!original) {
      setObjectsWithHistory(objects.map((obj) => (obj.id === updated.id ? updated : obj)));
      return;
    }

    // Detect keys that changed
    const changedKeys: any = {};
    (Object.keys(updated) as Array<keyof LabelObject>).forEach((key) => {
      if (updated[key] !== original[key]) {
        changedKeys[key] = updated[key];
      }
    });

    // Keys deleted
    const deletedKeys: string[] = [];
    Object.keys(original).forEach((key) => {
      if (!(key in updated)) {
        deletedKeys.push(key);
      }
    });

    // Exclude position/coordinate attributes from bulk updates
    const excludedKeys = ["id", "x", "y"];
    excludedKeys.forEach((k) => {
      delete (changedKeys as any)[k];
    });

    if (selectedIds.length > 1 && selectedIds.includes(updated.id)) {
      setObjectsWithHistory(
        objects.map((obj) => {
          if (selectedIds.includes(obj.id)) {
            // Apply modifications
            const copy = { ...obj, ...changedKeys };
            deletedKeys.forEach((k) => {
              if (!excludedKeys.includes(k)) {
                delete (copy as any)[k];
              }
            });
            return copy;
          }
          return obj;
        })
      );
    } else {
      setObjectsWithHistory(objects.map((obj) => (obj.id === updated.id ? updated : obj)));
    }
  };

  // Drag and update coordinates
  const handleUpdateCoordinates = (id: string, x: number, y: number) => {
    setObjectsWithHistory(
      objects.map((obj) => (obj.id === id ? { ...obj, x, y } : obj))
    );
  };

  // Batch update coordinate positions (for multi-dragging)
  const handleUpdateMultipleObjectsCoordinates = (coordsList: Array<{ id: string; x: number; y: number }>) => {
    const coordsMap = new Map(coordsList.map((c) => [c.id, c]));
    setObjectsWithHistory(
      objects.map((obj) => {
        const match = coordsMap.get(obj.id);
        return match ? { ...obj, x: match.x, y: match.y } : obj;
      })
    );
  };

  // Update both position and dimensions (for resizing)
  const handleUpdateGeometry = (id: string, x: number, y: number, width: number, height: number) => {
    setObjectsWithHistory(
      objects.map((obj) => (obj.id === id ? { ...obj, x, y, width, height } : obj))
    );
  };

  // Delete specific object or multiple selected objects
  const handleDeleteObject = (id: string) => {
    const listToDelete = selectedIds.length > 1 && selectedIds.includes(id) ? selectedIds : [id];
    setObjectsWithHistory(objects.filter((obj) => !listToDelete.includes(obj.id)));
    if (listToDelete.includes(selectedId)) {
      setSelectedId(null);
    }
    setSelectedIds((prev) => prev.filter((prevId) => !listToDelete.includes(prevId)));
  };

  // Clear everything (Start from blank, blank label canvas)
  const handleClearCanvas = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả các phần tử trên nhãn này?")) {
      setObjectsWithHistory([]);
      handleSelectObject(null);
    }
  };

  // Co giãn và định vị lại tất cả các đối tượng thiết kế nằm vừa vặn với kích thước tem hiện tại
  const handleFitObjectsToLabel = () => {
    if (objects.length === 0) return;

    const centerX = labelConfig.width / 2;
    const centerY = labelConfig.height / 2;

    // 1. Calculate collective boundaries of all items in standard mm space
    let minX = 999999;
    let minY = 999999;
    let maxX = -999999;
    let maxY = -999999;

    objects.forEach((obj) => {
      const absX = centerX + obj.x;
      const absY = centerY + obj.y;
      if (absX < minX) minX = absX;
      if (absY < minY) minY = absY;
      if (absX + obj.width > maxX) maxX = absX + obj.width;
      if (absY + obj.height > maxY) maxY = absY + obj.height;
    });

    const gW = maxX - minX;
    const gH = maxY - minY;

    if (gW <= 0 || gH <= 0) return;

    // 2. Identify the target footprint size of current label configuration
    const targetW = labelConfig.width;
    const targetH = labelConfig.height;

    // Safe margin index (padding) around the label boundary
    const margin = 2; // mm padding from outer limits
    const fitW = targetW - margin * 2;
    const fitH = targetH - margin * 2;

    if (fitW <= 1 || fitH <= 1) return; // safety boundary

    // Unified scaling ratio using uniform scaling factor (maintains exact aspect ratio of whole collage)
    const scale = Math.min(fitW / gW, fitH / gH);

    // Calculate centering displacements within safe margin boundaries
    const newGroupW = gW * scale;
    const newGroupH = gH * scale;
    const newMinX = margin + (fitW - newGroupW) / 2;
    const newMinY = margin + (fitH - newGroupH) / 2;

    // Recompute dimension mapping of every individual item
    const scaledObjects = objects.map((obj) => {
      const absX = centerX + obj.x;
      const absY = centerY + obj.y;
      const relX = absX - minX;
      const relY = absY - minY;

      const newAbsX = parseFloat((newMinX + relX * scale).toFixed(1));
      const newAbsY = parseFloat((newMinY + relY * scale).toFixed(1));
      const newW = parseFloat((obj.width * scale).toFixed(1));
      const newH = parseFloat((obj.height * scale).toFixed(1));

      // Standard new positions converted back to center-relative positions
      const newCentX = parseFloat((newAbsX - centerX).toFixed(1));
      const newCentY = parseFloat((newAbsY - centerY).toFixed(1));

      // Construct scaled object
      const updatedObj: LabelObject = {
        ...obj,
        x: newCentX,
        y: newCentY,
        width: newW,
        height: newH,
      };

      // Proportionately rescale inner font sizes if applicable to keep matching balance
      if (obj.fontSize) {
        updatedObj.fontSize = parseFloat((obj.fontSize * scale).toFixed(1));
      }
      if (obj.barcodeFontSize) {
        updatedObj.barcodeFontSize = parseFloat((obj.barcodeFontSize * scale).toFixed(1));
      }

      return updatedObj;
    });

    setObjectsWithHistory(scaledObjects);
  };

  // Restores both label layout and packed compact spreadsheet rows securely
  const restoreDesignAndExcel = (parsedData: any) => {
    if (parsedData && parsedData.labelConfig && parsedData.objects) {
      setLabelConfig(parsedData.labelConfig);
      
      const converted = migrateObjectsToCenterRelative(
        parsedData.objects,
        parsedData.labelConfig.width,
        parsedData.labelConfig.height
      );
      setObjects(converted);

      if (parsedData.sheetConfig) {
        setSheetConfig(parsedData.sheetConfig);
      }
      
      // Restore linked Excel spreadsheet if exists
      if (parsedData.excelColumns && parsedData.excelColumns.length > 0) {
        const cols = parsedData.excelColumns;
        setExcelColumns(cols);
        
        let restoredData: any[] = [];
        if (parsedData.excelRowsCompact && Array.isArray(parsedData.excelRowsCompact)) {
          restoredData = parsedData.excelRowsCompact.map((rowArr: any[]) => {
            const itemObj: any = {};
            cols.forEach((colName: string, colIdx: number) => {
              itemObj[colName] = rowArr[colIdx] !== undefined ? String(rowArr[colIdx]) : "";
            });
            return itemObj;
          });
        } else if (parsedData.excelData && Array.isArray(parsedData.excelData)) {
          restoredData = parsedData.excelData;
        }
        
        setExcelData(restoredData);
        setExcelFileName(parsedData.excelFileName || "xlsx_linked_file.xlsx");
        setExcelFileBase64(parsedData.excelOriginalBase64 || "");
        setExcelFilePath(parsedData.excelFilePath || null);
        
        if (parsedData.printQuantityMode) {
          setPrintQuantityMode(parsedData.printQuantityMode);
        }
        if (parsedData.printQuantityColumn) {
          setPrintQuantityColumn(parsedData.printQuantityColumn);
        }
        setCurrentExcelRowIndex(0);
        setIsExcelExpanded(true);
      } else {
        setExcelData([]);
        setExcelColumns([]);
        setExcelFileName("");
        setExcelFileBase64("");
      }

      handleSelectObject(null);
      
      let alertMsg = `Đã nạp thành công thiết kế "${parsedData.name || "Mẫu nhập"}" gồm ${parsedData.objects.length} phần tử và toàn bộ cài đặt khổ giấy!`;
      if (parsedData.excelColumns && parsedData.excelColumns.length > 0) {
        const rowCount = parsedData.excelRowsCompact?.length || parsedData.excelData?.length || 0;
        alertMsg += `\n\n[Excel Linked] Đã tự động khôi phục dữ liệu Excel: "${parsedData.excelFileName || "xlsx_linked_file.xlsx"}" (${rowCount} dòng sản phẩm), sẵn sàng in hàng loạt ngay lập tức! Bạn có thể tải lại file này bất kỳ lúc nào để chỉnh sửa/làm mẫu.`;
      }
      alert(alertMsg);
      return true;
    }
    return false;
  };

  // Generates or downloads the original linked Excel sheet
  const handleDownloadExcelTemplate = () => {
    try {
      // Scenario 1: Original spreadsheet base64 is present
      if (excelFileBase64) {
        const byteCharacters = atob(excelFileBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = excelFileName || "excel_mau_lien_ket.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // Scenario 2/3: Fallback rebuilding or default sample file generation
      const exportCols = excelColumns.length > 0 ? excelColumns : ["Mã vạch", "Tên sản phẩm", "Giá bán", "Đơn vị tính", "Số lượng in"];
      let exportRows: any[] = [];
      
      if (excelData.length > 0) {
        exportRows = excelData;
      } else {
        exportRows = [
          {
            "Mã vạch": "VND-2026-06",
            "Tên sản phẩm": "Mẫu Sản Phẩm Điện Tử A",
            "Giá bán": "1500000",
            "Đơn vị tính": "Cái",
            "Số lượng in": "3"
          },
          {
            "Mã vạch": "893000111222",
            "Tên sản phẩm": "Mẫu Sản Phẩm Linh Kiện B",
            "Giá bán": "450000",
            "Đơn vị tính": "Hộp",
            "Số lượng in": "2"
          }
        ];
      }

      // Build spreadsheet workbook safely
      const ws = XLSX.utils.json_to_sheet(exportRows, { header: exportCols });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = excelFileName || "excel_mau_nhan_tem.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Lỗi khi tải tệp Excel: " + err.message);
    }
  };

  // Save layout template in user local storage
  const handleSaveToLocalStorage = (customName?: string) => {
    const nameToSave = (customName || customSaveName).trim() || `Bản vẽ ${new Date().toLocaleDateString("vi-VN")}`;
    
    // Compress spreadsheet rows using a compact index array rather than repeating column names
    const compactExcelRows = excelData.map((row) => {
      return excelColumns.map((col) => row[col] !== undefined ? row[col] : "");
    });

    const newRecord = {
      name: nameToSave,
      timestamp: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
      config: labelConfig,
      sheetConfig,
      objects,
      // Lightweight optimized spreadsheet persistence block (no heavy base64 to protect 5MB local quota)
      excelFileName,
      excelFilePath,
      excelColumns,
      excelRowsCompact: compactExcelRows,
      printQuantityMode,
      printQuantityColumn,
    };

    const duplicateFiltered = savedDesigns.filter((d) => d.name !== nameToSave);
    const updated = [newRecord, ...duplicateFiltered].slice(0, 20); // Store up to 20 designs max

    localStorage.setItem("barcode_designer_saved_v1", JSON.stringify(updated));
    setSavedDesigns(updated);
    setCustomSaveName(nameToSave);
    setCurrentLocalStorageKey(nameToSave);
    setCurrentFilePath(null);
    setSaveLogs(prev => [
      { time: new Date().toLocaleTimeString("vi-VN"), path: `Local Storage: ${nameToSave}`, type: 'save' },
      ...prev
    ]);
    alert(`Đã lưu thiết kế "${nameToSave}" thành công vào bộ nhớ trình duyệt!`);
  };

  // Load previous design from local storage
  const handleLoadSavedDesign = (saved: any) => {
    restoreDesignAndExcel({
      name: saved.name,
      labelConfig: saved.config,
      sheetConfig: saved.sheetConfig,
      objects: saved.objects,
      excelFileName: saved.excelFileName,
      excelFilePath: saved.excelFilePath,
      excelColumns: saved.excelColumns,
      excelRowsCompact: saved.excelRowsCompact,
      excelData: saved.excelData, // Handle legacy format backward compatibility
      printQuantityMode: saved.printQuantityMode,
      printQuantityColumn: saved.printQuantityColumn,
      excelOriginalBase64: "", // Rebuilt on demand dynamically to save quota space
    });
    setCustomSaveName(saved.name);
    setCurrentLocalStorageKey(saved.name);
    setCurrentFilePath(null);
    setActiveFileHandle(null);
    setSaveLogs(prev => [
      { time: new Date().toLocaleTimeString("vi-VN"), path: `Loaded filter: ${saved.name}`, type: 'import' },
      ...prev
    ]);
    setShowSavedList(false);
  };

  // Export current design to a lightweight offline file (.kvl or .json)
  const handleExportToFile = (customName?: string, format: 'kvl' | 'json' = 'kvl', onSuccess?: () => void) => {
    const nameToSave = (customName || customSaveName).trim() || labelConfig.name || "tem_thiet_ke";
    
    // Strip redundant object names/keys to minimize plaintext weight dynamically matching spreadsheet rows
    // This reduces file size structure by compressing excelData using index arrays instead of repeating JSON keys.
    const compactExcelRows = excelData.map((row) => {
      return excelColumns.map((col) => row[col] !== undefined ? row[col] : "");
    });

    const exportData: any = {
      version: "2.5", // Upgraded version for complete nested excel linkage
      name: nameToSave,
      timestamp: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
      labelConfig,
      sheetConfig,
      objects,
      // Lightweight, hyper-optimized spreadsheet persistence blocks 
      excelFileName,
      excelFilePath,
      excelColumns,
      excelRowsCompact: compactExcelRows,
      excelOriginalBase64: excelFileBase64 || "", // High-fidelity original binary excel fallback backing
      printQuantityMode,
      printQuantityColumn,
    };

    const triggerBlobDownload = (
      content: string, 
      fname: string, 
      mtype: string, 
      savedName: string, 
      callback?: () => void
    ) => {
      try {
        const blob = new Blob([content], { type: mtype });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fname;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setCurrentFilePath(fname);
        setCurrentLocalStorageKey(null);
        setCustomSaveName(savedName);
        setSaveLogs(prev => [
          { time: new Date().toLocaleTimeString("vi-VN"), path: `Browser Download: ${fname}`, type: 'save' },
          ...prev
        ]);
        callback?.();
      } catch (err: any) {
        alert("Lỗi kết xuất file tải xuống: " + err.message);
      }
    };

    try {
      const jsonStr = JSON.stringify(exportData);
      let fileContent = jsonStr;
      let filename = `${nameToSave.toLowerCase().replace(/[^a-z0-9_\-]/g, "_")}.json`;
      let mimeType = "application/json;charset=utf-8";

      if (format === 'kvl') {
        fileContent = btoa(unescape(encodeURIComponent(jsonStr)));
        filename = `${nameToSave.toLowerCase().replace(/[^a-z0-9_\-]/g, "_")}.kvl`;
        mimeType = "text/plain;charset=utf-8";
      }
      
      // Check if running in Python pywebview desktop container to prompt native saving
      // @ts-ignore
      if (window.pywebview && window.pywebview.api && window.pywebview.api.save_file_native) {
        // @ts-ignore
        window.pywebview.api.save_file_native(filename, fileContent)
          .then((result: any) => {
            let success = false;
            let pathSaved: string | null = null;
            let filenameSaved: string | null = null;

            if (result === "success" || result === true) {
              success = true;
            } else if (result && typeof result === "object") {
              if (result.status === "success") {
                success = true;
                pathSaved = result.file_path || null;
                filenameSaved = result.filename || null;
              } else if (result.status === "error") {
                alert(`Lỗi lưu tệp tin thông qua ứng dụng offline: ${result.message}`);
                return;
              }
            }

            if (success) {
              if (pathSaved) {
                setCurrentFilePath(pathSaved);
                setCurrentLocalStorageKey(null);
                if (filenameSaved) {
                  setCustomSaveName(filenameSaved.replace(/\.(kvl|json)$/i, ""));
                }
                setSaveLogs(prev => [
                  { time: new Date().toLocaleTimeString("vi-VN"), path: pathSaved!, type: 'save' },
                  ...prev
                ]);
              }
              alert(`Đã lưu thành công tệp tin thiết kế (.kvl) vào máy tính của bạn!`);
              onSuccess?.();
            }
          })
          .catch((err: any) => {
            alert("Lỗi gọi API lưu tệp tin Python: " + err.message);
          });
        return;
      }
      
      // If running in browser and supports showSaveFilePicker, use it to get a real local file handle!
      // @ts-ignore
      else if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        // @ts-ignore
        const opts = {
          suggestedName: filename,
          types: [{
            description: format === 'kvl' ? 'Bộ mẫu KVL (*.kvl)' : 'Tệp cấu hình JSON (*.json)',
            accept: format === 'kvl' ? { 'text/plain': ['.kvl'] } : { 'application/json': ['.json'] }
          }]
        };
        
        let pickerPromise;
        try {
          // @ts-ignore
          pickerPromise = window.showSaveFilePicker(opts);
        } catch (syncErr: any) {
          console.warn("Synchronous error calling showSaveFilePicker, falling back to standard download:", syncErr);
          triggerBlobDownload(fileContent, filename, mimeType, nameToSave, onSuccess);
          return;
        }

        pickerPromise
          .then(async (handle: any) => {
            const writable = await handle.createWritable();
            await writable.write(fileContent);
            await writable.close();
            
            setActiveFileHandle(handle);
            setCurrentFilePath(handle.name);
            setCurrentLocalStorageKey(null);
            setCustomSaveName(handle.name.replace(/\.(kvl|json)$/i, ""));
            setSaveLogs(prev => [
              { time: new Date().toLocaleTimeString("vi-VN"), path: handle.name, type: 'save' },
              ...prev
            ]);
            alert(`Đã lưu thành công tệp thiết kế "${handle.name}" vào máy tính của bạn! Từ bây giờ bạn có thể sửa và bấm Ctrl + S để tự động cập nhật trực tiếp không cần chọn đường dẫn.`);
            onSuccess?.();
          })
          .catch((err: any) => {
            if (err.name === 'AbortError') {
              // User deliberate cancellation, let modal stay open so they can click Save again
              return;
            }
            console.warn("showSaveFilePicker promise rejected, falling back to standard download:", err);
            triggerBlobDownload(fileContent, filename, mimeType, nameToSave, onSuccess);
          });
        return;
      }
      
      triggerBlobDownload(fileContent, filename, mimeType, nameToSave, onSuccess);
    } catch (err: any) {
      alert("Lỗi khi kết xuất file: " + err.message);
    }
  };

  // Quick In-place save for offline mode
  const handleQuickSave = () => {
    // If we have an active file path in PyWebView offline mode, save directly
    // @ts-ignore
    if (currentFilePath && window.pywebview && window.pywebview.api && window.pywebview.api.save_file_direct) {
      const compactExcelRows = excelData.map((row) => {
        return excelColumns.map((col) => row[col] !== undefined ? row[col] : "");
      });

      const exportData: any = {
        version: "2.5",
        name: customSaveName || labelConfig.name || "tem_thiet_ke",
        timestamp: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
        labelConfig,
        sheetConfig,
        objects,
        excelFileName,
        excelFilePath,
        excelColumns,
        excelRowsCompact: compactExcelRows,
        excelOriginalBase64: excelFileBase64 || "",
        printQuantityMode,
        printQuantityColumn,
      };

      try {
        const jsonStr = JSON.stringify(exportData);
        let fileContent = jsonStr;
        if (currentFilePath.endsWith('.kvl')) {
          fileContent = btoa(unescape(encodeURIComponent(jsonStr)));
        }

        // @ts-ignore
        window.pywebview.api.save_file_direct(currentFilePath, fileContent)
          .then((result: any) => {
            if (result && result.status === "success") {
              setSaveLogs(prev => [
                { time: new Date().toLocaleTimeString("vi-VN"), path: currentFilePath, type: 'quick-save' },
                ...prev
              ]);
              alert(`Đã tự động lưu đè và cập nhật thành công vào file:\n${result.filename}`);
            } else if (result && result.status === "error") {
              alert(`Lỗi khi lưu đè tệp tin: ${result.message}`);
            } else {
              alert("Lưu tệp tin thất bại!");
            }
          })
          .catch((err: any) => {
            alert("Lỗi kết nối lưu đè trực tiếp Python: " + err.message);
          });
      } catch (err: any) {
        alert("Lỗi mã hóa dữ liệu: " + err.message);
      }
    } 
    // If we have an active file handle in Web File System Access API (Google Chrome / Edge)
    else if (activeFileHandle) {
      const compactExcelRows = excelData.map((row) => {
        return excelColumns.map((col) => row[col] !== undefined ? row[col] : "");
      });

      const exportData: any = {
        version: "2.5",
        name: customSaveName || labelConfig.name || "tem_thiet_ke",
        timestamp: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
        labelConfig,
        sheetConfig,
        objects,
        excelFileName,
        excelFilePath,
        excelColumns,
        excelRowsCompact: compactExcelRows,
        excelOriginalBase64: excelFileBase64 || "",
        printQuantityMode,
        printQuantityColumn,
      };

      try {
        const jsonStr = JSON.stringify(exportData);
        let fileContent = jsonStr;
        if (activeFileHandle.name.endsWith('.kvl')) {
          fileContent = btoa(unescape(encodeURIComponent(jsonStr)));
        }

        activeFileHandle.createWritable()
          .then(async (writable: any) => {
            await writable.write(fileContent);
            await writable.close();
            setSaveLogs(prev => [
              { time: new Date().toLocaleTimeString("vi-VN"), path: activeFileHandle.name, type: 'quick-save' },
              ...prev
            ]);
            alert(`Đã tự động lưu đè và cập nhật trực tiếp thành công vào file:\n"${activeFileHandle.name}"`);
          })
          .catch((err: any) => {
            alert("Lỗi khi ghi đè trực tiếp lên tệp: " + err.message);
          });
      } catch (err: any) {
        alert("Lỗi mã hóa dữ liệu: " + err.message);
      }
    }
    // If we have an active file in browser (currentFilePath is set but window.pywebview is not available), let's save directly by downloading!
    // @ts-ignore
    else if (currentFilePath && (!window.pywebview || !window.pywebview.api)) {
      handleExportToFile(customSaveName || labelConfig.name || "tem_thiet_ke", currentFilePath.endsWith('.json') ? 'json' : 'kvl');
    }
    // If we have a connected browser local storage design template, save directly to local storage
    else if (currentLocalStorageKey) {
      const compactExcelRows = excelData.map((row) => {
        return excelColumns.map((col) => row[col] !== undefined ? row[col] : "");
      });

      const newRecord = {
        name: currentLocalStorageKey,
        timestamp: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
        config: labelConfig,
        sheetConfig,
        objects,
        excelFileName,
        excelColumns,
        excelRowsCompact: compactExcelRows,
        printQuantityMode,
        printQuantityColumn,
      };

      const duplicateFiltered = savedDesigns.filter((d) => d.name !== currentLocalStorageKey);
      const updated = [newRecord, ...duplicateFiltered].slice(0, 20);

      localStorage.setItem("barcode_designer_saved_v1", JSON.stringify(updated));
      setSavedDesigns(updated);
      setCustomSaveName(currentLocalStorageKey);
      setSaveLogs(prev => [
        { time: new Date().toLocaleTimeString("vi-VN"), path: `Local Storage: ${currentLocalStorageKey}`, type: 'quick-save' },
        ...prev
      ]);
      alert(`Đã tự động lưu đè và cập nhật trực tiếp thành công vào Bộ nhớ duyệt web:\n"${currentLocalStorageKey}"`);
    }
    // Standard unlinked state -> Open Save Dialog (Save As)
    else {
      // Prompt standard Save Dialog
      setSaveTemplateName(customSaveName || labelConfig.name || "");
      setSaveLocation(null);
      setShowSaveDialog(true);
    }
  };

  // Open native system file selector in PyWebView
  const triggerImportFile = () => {
    // @ts-ignore
    if (window.pywebview && window.pywebview.api && window.pywebview.api.load_file_native) {
      // @ts-ignore
      window.pywebview.api.load_file_native()
        .then((response: any) => {
          if (response && (response.status === "success" || response.status === "warning_locked") && response.content) {
            try {
              if (response.status === "warning_locked") {
                const confirmOpen = window.confirm(response.message);
                if (!confirmOpen) {
                  return;
                } else {
                  // User chose to "open anyway". Let's lock it explicitly under our session
                  // @ts-ignore
                  if (window.pywebview && window.pywebview.api && window.pywebview.api.create_lock_direct) {
                    // @ts-ignore
                    window.pywebview.api.create_lock_direct(response.file_path);
                  }
                }
              }

              let parsedData: any = null;
              try {
                parsedData = JSON.parse(response.content);
              } catch (jsonErr) {
                const decodedStr = decodeURIComponent(escape(atob(response.content.trim())));
                parsedData = JSON.parse(decodedStr);
              }
              
              const restored = restoreDesignAndExcel(parsedData);
              if (restored) {
                setCurrentFilePath(response.file_path);
                setCurrentLocalStorageKey(null);
                setActiveFileHandle(null);
                setCustomSaveName(response.filename.replace(/\.(kvl|json)$/i, ""));
                setSaveLogs(prev => [
                  { time: new Date().toLocaleTimeString("vi-VN"), path: response.file_path, type: 'import' },
                  ...prev
                ]);
              } else {
                alert("Nội dung tệp thiếu thông số cấu trúc (labelConfig/objects).");
              }
            } catch (err: any) {
              alert("Lỗi phân tích tệp KVL/JSON: " + err.message);
            }
          } else if (response && response.status === "error") {
            alert("Lỗi mở tệp tin: " + response.message);
          }
        })
        .catch((err: any) => {
          alert("Lỗi nạp tệp qua Python: " + err.message);
        });
    } else if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      // @ts-ignore
      window.showOpenFilePicker({
        types: [
          {
            description: 'Bộ mẫu KVL hoặc JSON (*.kvl, *.json)',
            accept: {
              'application/json': ['.json', '.kvl'],
              'text/plain': ['.kvl']
            }
          }
        ],
        multiple: false
      })
      .then(async ([handle]: any) => {
        try {
          const file = await handle.getFile();
          const rawContent = await file.text();
          let parsedData: any = null;

          try {
            parsedData = JSON.parse(rawContent);
          } catch (jsonErr) {
            try {
              const decodedStr = decodeURIComponent(escape(atob(rawContent.trim())));
              parsedData = JSON.parse(decodedStr);
            } catch (b64Err) {
              throw new Error("Định dạng file không hợp lệ. Vui lòng nạp file .kvl hoặc .json chính xác.");
            }
          }

          const restored = restoreDesignAndExcel(parsedData);
          if (restored) {
            setCustomSaveName(file.name.replace(/\.(kvl|json)$/i, ""));
            setCurrentFilePath(file.name);
            setCurrentLocalStorageKey(null);
            setActiveFileHandle(handle);
            setSaveLogs(prev => [
              { time: new Date().toLocaleTimeString("vi-VN"), path: file.name, type: 'import' },
              ...prev
            ]);
            alert(`Đã liên kết tệp "${file.name}" thành công! Từ bây giờ bạn có thể sửa và bấm Ctrl + S để tự động cập nhật trực tiếp lên tệp.`);
          } else {
            alert("Nội dung tệp thiếu các thông số cấu trúc (labelConfig/objects). Vui lòng kiểm tra lại.");
          }
        } catch (err: any) {
          alert("Lỗi khi đọc tệp tin: " + err.message);
        }
      })
      .catch((err: any) => {
        if (err.name !== 'AbortError') {
          document.getElementById("file-import-input")?.click();
        }
      });
    } else {
      document.getElementById("file-import-input")?.click();
    }
  };

  // Import design from file (.kvl or .json)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawContent = (event.target?.result as string) || "";
        let parsedData: any = null;

        // 1. Try parsing as Standard JSON text first (highly robust)
        try {
          parsedData = JSON.parse(rawContent);
        } catch (jsonErr) {
          // 2. If it is Base64 encoded, decode it
          try {
            const decodedStr = decodeURIComponent(escape(atob(rawContent.trim())));
            parsedData = JSON.parse(decodedStr);
          } catch (b64Err) {
            throw new Error("Định dạng file không hợp lệ. Vui lòng nạp file .kvl hoặc .json chính xác.");
          }
        }

        const restored = restoreDesignAndExcel(parsedData);
        if (restored) {
          setCustomSaveName(file.name.replace(/\.(kvl|json)$/i, ""));
          setCurrentFilePath(file.name);
          setCurrentLocalStorageKey(null);
          setActiveFileHandle(null);
        } else {
          alert("Nội dung tệp thiếu các thông số cấu trúc (labelConfig/objects). Vui lòng kiểm tra lại.");
        }
      } catch (err: any) {
        alert("Không thể đọc tệp này: " + err.message);
      }
      
      // Reset the file input value so same file can be selected again
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  // Delete saved design from database
  const handleDeleteSavedDesign = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (window.confirm("Bạn muốn xóa mẫu thiết kế đã lưu này?")) {
      const updated = savedDesigns.filter((_, idx) => idx !== index);
      localStorage.setItem("barcode_designer_saved_v1", JSON.stringify(updated));
      setSavedDesigns(updated);
    }
  };

  const migrateObjectsToCenterRelative = (objs: LabelObject[], labelW: number, labelH: number): LabelObject[] => {
    return objs.map(obj => {
      const alreadyCenterRelative = (obj as any).isCenterRelative;
      const centerX = labelW / 2;
      const centerY = labelH / 2;
      
      let updatedX = obj.x;
      let updatedY = obj.y;
      if (!alreadyCenterRelative) {
        updatedX = Math.round((obj.x - centerX) * 10) / 10;
        updatedY = Math.round((obj.y - centerY) * 10) / 10;
      }
      
      return {
        ...obj,
        x: updatedX,
        y: updatedY,
        isCenterRelative: true,
        textFlowOrigin: obj.textFlowOrigin || "center",
        textAlign: obj.type === "text" ? (obj.textAlign || "center") : obj.textAlign
      };
    });
  };

  // Load preset template
  const handleSelectTemplate = (
    config: LabelConfig, 
    templateObjects: LabelObject[],
    templateSheetConfig?: Partial<SheetLayoutConfig>
  ) => {
    setLabelConfig(config);
    const converted = migrateObjectsToCenterRelative(templateObjects, config.width, config.height);
    setObjects(converted);
    if (templateSheetConfig) {
      setSheetConfig((prev) => ({
        ...prev,
        ...templateSheetConfig,
      }));
    }
    handleSelectObject(null);
    setCurrentFilePath(null);
    setCurrentLocalStorageKey(null);
    setActiveFileHandle(null);
    setShowPresetDropdown(false);
    setIsPresetDropdownPinned(false);
  };
  
  // Load popular Tomy template with custom centered margins calculation
  const handleSelectTomyTemplate = (item: TomyTemplate) => {
    applyPresetDimensions(item.width, item.height, item.name);
    
    // Khi chọn mẫu Tomy, mặc định dọn sạch toàn bộ đối tượng để tạo tem trống không có dữ liệu mẫu
    setObjects([]);
    setSelectedId(null);
    setSelectedIds([]);
    
    setSheetConfig((prev) => ({
      ...prev,
      mode: 'office',
      paperSize: item.paperSize,
      orientation: item.orientation,
      cols: item.cols,
      rows: item.rows,
      colGap: item.colGap,
      rowGap: item.rowGap,
      marginLeft: item.marginLeft,
      marginRight: item.marginRight,
      marginTop: item.marginTop,
      marginBottom: item.marginBottom,
    }));
    
    setIsTomyDropdownOpen(false);
  };

  // Synchronise global hotkey intercept for Ctrl+P, Ctrl+S, Ctrl+O, etc.
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Bắt phím mở DevTools (F12 hoặc Ctrl+Shift+I) cho ứng dụng Desktop chạy Offline
      if (
        e.key === "F12" || 
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "i")
      ) {
        const pw = (window as any).pywebview;
        if (pw && pw.api && typeof pw.api.show_devtools === "function") {
          e.preventDefault();
          pw.api.show_devtools();
          return;
        }
      }

      const activeEl = document.activeElement;
      const isEditingInput = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.tagName === "SELECT"
      );

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrintLabel();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleQuickSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        triggerImportFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (!isEditingInput) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (!isEditingInput) {
          e.preventDefault();
          handleRedo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (!isEditingInput) {
          e.preventDefault();
          handleCopy();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (!isEditingInput) {
          e.preventDefault();
          handlePaste();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        if (!isEditingInput && selectedIds.length > 0) {
          e.preventDefault();
          handleScaleSelectedObjects(1.05);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        if (!isEditingInput && selectedIds.length > 0) {
          e.preventDefault();
          handleScaleSelectedObjects(0.95);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        if (!isEditingInput && selectedIds.length > 0) {
          e.preventDefault();
          handleToggleTextFormat("bold");
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        if (!isEditingInput && selectedIds.length > 0) {
          e.preventDefault();
          handleToggleTextFormat("italic");
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        if (!isEditingInput && selectedIds.length > 0) {
          e.preventDefault();
          handleToggleTextFormat("underline");
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        if (!isEditingInput && selectedIds.length > 0) {
          e.preventDefault();
          handleToggleTextFormat("lineThrough");
        }
      }
    };

    // Global wheel listener for Ctrl + Scroll mouse wheel resize selected objects
    const handleGlobalWheel = (e: WheelEvent) => {
      if (e.ctrlKey && selectedIds.length > 0) {
        // Prevent browser viewport from zoom-in and zoom-out
        e.preventDefault();
        const isEnlarge = e.deltaY < 0; // scrolling up (deltaY < 0) means larger
        const factor = isEnlarge ? 1.05 : 0.95;
        handleScaleSelectedObjects(factor);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    // Use { passive: false } to allow e.preventDefault() in Chrome & other browsers for wheel event
    window.addEventListener("wheel", handleGlobalWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("wheel", handleGlobalWheel);
    };
  }, [
    objects,
    labelConfig,
    sheetConfig,
    excelFileName,
    excelColumns,
    excelData,
    excelFileBase64,
    printQuantityMode,
    printQuantityColumn,
    selectedId,
    selectedIds,
    customSaveName,
    currentFilePath,
    currentLocalStorageKey,
    savedDesigns,
    handleUndo,
    handleRedo,
    handleCopy,
    handlePaste,
    handleScaleSelectedObjects,
    handleToggleTextFormat,
    clipboard
  ]);

  // Print execution call triggers standard printer dialog
  const handlePrintLabel = () => {
    if (isPreparingPrint) return; // Chống spam click (double-click/flood prevention)

    // --- STANDARD CHROMIUM POPUP DIALOG FLOW ---
    setIsPreparingPrint(true);
    handleSelectObject(null); // Deselect so focused outline does not print
    setIsSystemPrinting(true); // Temporarily bypass UI preview limits to paint the full grid in DOM
    
    const wasDesign = officePreviewMode === 'design';
    if (wasDesign) {
      setOfficePreviewMode('sheet');
      setWasDesignModeForPrint(true);
    }

    // Cơ chế "Await Render": Sắp xếp luồng vẽ thẻ <svg> của GPU & React render xong bằng requestAnimationFrame kép và microtasks
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          const api = (window as any).electronAPI;
          if (api && api.printOffice) {
            // Chạy trong môi trường Electron: Sử dụng Print API với các thông số kích cỡ chính xác và Loại Bỏ lề tuyệt đối
            let printLandscape = false;
            let isCustomPage = false;
            let customPageW = labelConfig.width;
            let customPageH = labelConfig.height;
            let printPageSize: any = "A4";

            const isThermal = sheetConfig && sheetConfig.mode === 'thermal';
            const isOffice = sheetConfig && sheetConfig.mode === 'office';
            const showOfficeSheet = isOffice && officePreviewMode === 'sheet';
            const showThermalSheetGrid = isThermal && officePreviewMode === 'sheet';

            if (showOfficeSheet && sheetConfig) {
              printPageSize = sheetConfig.paperSize === "A5" ? "A5" : (sheetConfig.paperSize === "custom" ? "custom" : "A4");
              printLandscape = sheetConfig.orientation === "landscape";
              if (printPageSize === "custom") {
                isCustomPage = true;
                customPageW = sheetConfig.customWidth || 210;
                customPageH = sheetConfig.customHeight || 297;
              }
            } else if (showThermalSheetGrid && sheetConfig) {
              const cols = sheetConfig.cols || 1;
              const colGap = sheetConfig.colGap || 0;
              const rollSideMargin = sheetConfig.rollSideMargin !== undefined ? sheetConfig.rollSideMargin : 1;
              const backingWidth = cols * labelConfig.width + (cols - 1) * colGap + rollSideMargin * 2;
              printLandscape = backingWidth > labelConfig.height;
              isCustomPage = true;
              customPageW = backingWidth;
              customPageH = labelConfig.height;
            } else {
              // In nhãn đơn lẻ chế độ Bàn Thiết Kế
              printLandscape = labelConfig.width > labelConfig.height;
              isCustomPage = true;
              customPageW = labelConfig.width;
              customPageH = labelConfig.height;
            }

            api.printOffice({
              copies: printCopies || 1,
              landscape: printLandscape,
              isCustomPage,
              customPageW,
              customPageH,
              pageSize: printPageSize,
              margins: { marginType: "none" }, // Khóa lề 0mm trực tiếp bằng Electron
              color: true
            }).then(() => {
              setTimeout(() => {
                setIsPreparingPrint(false);
              }, 400);
            }).catch((err: any) => {
              console.error("Lỗi khi gọi hộp thoại in Electron:", err);
              setTimeout(() => {
                setIsPreparingPrint(false);
              }, 400);
            });
          } else {
            // Check if running inside iframe (standard browser fallback)
            const isInIframe = window.self !== window.top;
            if (isInIframe) {
              setShowPrintModal(true);
              setIsPreparingPrint(false); // Reset nhanh để tương tác modal
            } else {
              window.focus();
              window.print();
              // Đóng hộp thoại in xong hoàn tất chuẩn bị
              setTimeout(() => {
                setIsPreparingPrint(false);
              }, 800);
            }
          }
        }, 500); // 500ms hoàn hảo để đảm bảo 100% các linh kiện / JsBarcode SVG đã render xong
      });
    });
  };

  const selectedObject = objects.find((obj) => obj.id === selectedId) || null;
  const displayObjects = excelData.length > 0 ? resolveDynamicObjects(objects, currentExcelRowIndex) : objects;
  const [excelSearchQuery, setExcelSearchQuery] = useState<string>("");

  const filteredExcelData = excelData.filter(row => {
    if (!excelSearchQuery.trim()) return true;
    const query = excelSearchQuery.toLowerCase();
    return Object.values(row).some(val => {
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(query);
    });
  });

  // Proxy gate router removed for offline performance

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans select-none bg-kiot-bg text-kiot-slate app-scale-wrapper">
      
      {/* 1. TOP APPLICATION NAVIGATION BAR */}
      <header id="app-header" className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-40 no-print text-kiot-navy shadow-md">
        <div className="flex items-center space-x-4">
          <svg viewBox="0 0 326 92" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-11 w-auto shrink-0 select-none transition-transform hover:scale-105" id="kiotviet-svg-logo">
            {/* Background barcode pattern inside logo wrapper on header */}
            <g opacity="0.12">
              <rect x="2" y="8" width="3" height="76" fill="#000000"/>
              <rect x="8" y="8" width="5" height="76" fill="#000000"/>
              <rect x="16" y="8" width="2" height="76" fill="#000000"/>
              <rect x="21" y="8" width="4" height="76" fill="#000000"/>
              <rect x="28" y="8" width="2" height="76" fill="#000000"/>
              <rect x="33" y="8" width="5" height="76" fill="#000000"/>
              <rect x="41" y="8" width="2" height="76" fill="#000000"/>
              <rect x="46" y="8" width="4" height="76" fill="#000000"/>
              <rect x="53" y="8" width="3" height="76" fill="#000000"/>
              <rect x="59" y="8" width="5" height="76" fill="#000000"/>
              <rect x="67" y="8" width="2" height="76" fill="#000000"/>
              <rect x="72" y="8" width="4" height="76" fill="#000000"/>
              <rect x="79" y="8" width="3" height="76" fill="#000000"/>
              <rect x="85" y="8" width="5" height="76" fill="#000000"/>
            </g>
            <path fillRule="evenodd" clipRule="evenodd" d="M28.2727 2.98791C11.8294 10.3389 0.371094 26.8343 0.371094 46.003C0.371094 65.1691 11.8294 81.6619 28.2727 89.0142C32.3642 90.8114 34.8979 91.2578 37.0608 91.2578C45.2554 91.2578 49.0083 65.0212 49.0083 46.0017C49.0083 26.9797 45.2567 0.741699 37.0608 0.741699C34.8979 0.741699 32.3642 1.19068 28.2727 2.98533V2.98791Z" fill="url(#paint0_radial_1960_1122)"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M76.5424 20.3537L55.1653 41.7134C53.7733 43.1044 52.8599 44.462 52.8599 46.0564C52.8599 47.6523 53.7733 49.0068 55.1653 50.3978L76.5424 71.7576C77.8777 73.0962 79.0747 73.6689 80.698 73.6689C86.4346 73.6689 92.3952 59.4251 92.3952 46.0564C92.3952 32.6862 86.4361 18.4453 80.698 18.4453C79.0733 18.4453 77.8777 19.018 76.5424 20.3552V20.3537Z" fill="url(#paint1_radial_1960_1122)"/>
            
            {/* Elegant "KiotLabel" Text replaces original "KiotViet" text path */}
            <text x="106" y="62" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" fontWeight="900" fontSize="42" fill="#002248" letterSpacing="-1">KiotLabel</text>
            
            <defs>
              <radialGradient id="paint0_radial_1960_1122" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(-11.3026 46.014) scale(66.031 95.596)">
                <stop stopColor="#3AE3FF"/>
                <stop offset="1" stopColor="#0070F4"/>
              </radialGradient>
              <radialGradient id="paint1_radial_1960_1122" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(51.3029 45.7941) scale(41.2594 67.9409)">
                <stop stopColor="#5BE92A"/>
                <stop offset="0.39166" stopColor="#2DCF34"/>
                <stop offset="1" stopColor="#00B63E"/>
              </radialGradient>
            </defs>
          </svg>
          <div className="h-9 w-px bg-gray-200" />
          <div>
            <h1 className="text-[21px] font-black tracking-tight text-kiot-navy flex items-center space-x-2 leading-none">
              <span className="text-kiot-cyan">LabelPro</span>
              <span className="text-kiot-green">Designer</span>
              <span className="text-[11px] font-mono font-black text-white bg-kiot-green px-2 py-0.5 rounded-full shadow-md">V2.5</span>
            </h1>
            <p className="text-[13px] text-zinc-500 font-bold mt-1">Hệ thống thiết kế & in tem nhãn liên kết dữ liệu hàng loạt chuyên nghiệp</p>
          </div>
        </div>

        {/* TOP QUICK DESIGNS BUTTONS */}
        <div className="flex items-center space-x-2 bg-slate-50/50 p-1 rounded-xl border border-slate-100/60 shadow-3xs">
          {/* Preset Template Selector */}
          <div 
            ref={presetContainerRef}
            className="relative"
            onMouseEnter={() => setShowPresetDropdown(true)}
            onMouseLeave={() => {
              if (!isPresetDropdownPinned) {
                setShowPresetDropdown(false);
              }
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isPresetDropdownPinned) {
                  setIsPresetDropdownPinned(false);
                  setShowPresetDropdown(false);
                } else {
                  setIsPresetDropdownPinned(true);
                  setShowPresetDropdown(true);
                }
              }}
              className={`h-7 px-2 rounded-lg text-[11px] font-black tracking-wide flex items-center space-x-1.5 border transition cursor-pointer shadow-xs active:scale-[0.98] ${
                isPresetDropdownPinned 
                  ? "bg-amber-100 text-amber-950 border-amber-500 ring-1 ring-amber-500/20" 
                  : "bg-white hover:bg-amber-50 text-amber-850 border-amber-300 hover:border-amber-500"
              }`}
              title="Chọn mẫu thiết kế ứng dụng có sẵn (Click để ghim hiển thị)"
            >
              <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isPresetDropdownPinned ? "text-amber-800 animate-pulse" : "text-amber-600"}`} />
              <span>Chọn Mẫu có sẵn</span>
              <span className={`text-[8.5px] px-1 py-0.5 rounded font-mono font-black ${isPresetDropdownPinned ? "bg-amber-200 text-amber-950" : "bg-amber-100 text-amber-900"}`}>
                {isPresetDropdownPinned ? "Ghim" : "Preset"}
              </span>
            </button>
            {showPresetDropdown && (
              <div id="preset-selector-dropdown-wrapper" className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl text-slate-800 z-50 text-left transition-all duration-300 ease-in-out animate-fadeIn">
                <TemplateSelector onSelectTemplate={handleSelectTemplate} />
              </div>
            )}
          </div>

          {/* Load layouts storage */}
          <div className="relative border-r border-gray-150 pr-2">
            <button
              onClick={() => setShowSavedList(!showSavedList)}
              className="h-7 px-2 rounded-lg bg-white hover:bg-emerald-50 text-[11px] font-black text-emerald-850 tracking-wide flex items-center space-x-1.5 border border-emerald-300 hover:border-emerald-500 transition cursor-pointer shadow-xs active:scale-[0.98]"
              title="Danh sách thiết kế của bạn đã lưu"
            >
              <FolderHeart className="w-3.5 h-3.5 text-rose-500" />
              <span>Mẫu đã lưu ({savedDesigns.length})</span>
            </button>
            
            {showSavedList && (
              <div className="absolute right-0 mt-2 w-76 bg-white text-slate-800 rounded-lg shadow-2xl border border-gray-200/85 p-3 z-50 text-left max-h-[300px] overflow-y-auto animate-fadeIn">
                <h4 className="font-extrabold text-xs pb-2 border-b border-gray-150 text-kiot-navy uppercase tracking-wider flex items-center space-x-1.5">
                  <FolderHeart className="w-4 h-4 text-rose-500" />
                  <span>Bộ sưu tập mẫu đã lưu</span>
                </h4>
                {savedDesigns.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center italic">Chưa có bản ghi lưu nào trên máy này!</p>
                ) : (
                  <div className="divide-y divide-gray-100 mt-1.5">
                    {savedDesigns.map((sd, i) => (
                      <div
                        key={i}
                        onClick={() => handleLoadSavedDesign(sd)}
                        className="p-2 hover:bg-slate-50 rounded-md cursor-pointer transition flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                           <p className="font-bold text-xs text-slate-800 truncate">{sd.name}</p>
                           <p className="text-[10px] text-gray-450 font-mono mt-0.5">{sd.config.width}x{sd.config.height}mm • {sd.timestamp}</p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSavedDesign(e, i)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition shrink-0"
                          title="Xóa mẫu lưu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Simplified save trigger and file import */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSaveTemplateName(customSaveName || labelConfig.name || "");
                setSaveLocation(null);
                setShowSaveDialog(true);
              }}
              className="h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white transition rounded-lg text-[11px] font-black uppercase flex items-center space-x-1 cursor-pointer shadow-md shadow-indigo-600/20 shrink-0 hover:scale-[1.02] active:scale-[0.98]"
              title="Lưu bản thiết kế này sang loại khác hoặc tên mới hoàn toàn (Save As)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save As...</span>
            </button>
          </div>

          {/* Offline Import File Group (Export button removed per request) */}
          <div className="flex items-center space-x-1.5 border-l border-gray-150 pl-2">
            <label
              className="h-7 px-2 rounded-lg bg-white hover:bg-emerald-50 text-[11px] font-black text-emerald-900 tracking-wide flex items-center space-x-1.5 border border-emerald-300 hover:border-emerald-450 transition cursor-pointer shadow-sm shrink-0 hover:scale-[1.02] active:scale-[0.98]"
              title="Chọn file thiết kế .kvl để khôi phục lại mẫu tem, khổ tem, khổ giấy và dữ liệu Excel đã lưu"
              onClick={(e) => {
                // @ts-ignore
                if (window.pywebview && window.pywebview.api && window.pywebview.api.load_file_native) {
                  e.preventDefault();
                  triggerImportFile();
                }
              }}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Open File</span>
              <input
                id="file-import-input"
                type="file"
                accept=".kvl,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT AREA (LEFT SIDEBAR & RIGHT WORKSPACE CANVAS) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* SIDEBAR ON THE LEFT - SLIMMER DESIGN TAB HEIGHT & WIDTH (Optimized for small screens) */}
        <aside id="sidebar-ui" className="w-[25%] min-w-[330px] max-w-[420px] bg-white border-r border-gray-200 flex flex-col shrink-0 no-print text-kiot-slate shadow-sm z-10 font-sans">
          
          {/* TAB BAR HEADER */}
          <div className="flex select-none bg-slate-100 p-2 gap-2 shrink-0 tracking-wider border-b border-gray-200">
            <button
              onClick={() => setActiveSidebarTab('layout')}
              className={`flex-1 py-2.5 md:py-3.5 text-center transition-all duration-150 flex flex-col items-center justify-center space-y-1.5 rounded-xl cursor-pointer ${
                activeSidebarTab === 'layout'
                  ? 'text-white bg-[#0070F4] font-black shadow-md shadow-blue-500/20'
                  : 'text-slate-700 bg-[#ecf2fa]/90 hover:bg-[#dfeaf7] hover:text-[#0070F4]'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11.5px] font-black transition-all ${
                  activeSidebarTab === 'layout'
                    ? 'bg-white text-[#0070F4] ring-4 ring-white/10 scale-105'
                    : 'bg-sky-200 text-sky-850 font-black'
                }`}>1</span>
                <span className={`text-[13.5px] md:text-[14.5px] font-black tracking-wide leading-none ${activeSidebarTab === 'layout' ? 'text-white' : 'text-slate-750 font-black'}`}>KHỔ TEM & GIẤY</span>
              </div>
              <span className={`text-[10.5px] font-extrabold normal-case leading-none mt-0.5 ${activeSidebarTab === 'layout' ? 'text-sky-100' : 'text-slate-500'}`}>Thiết lập khổ tem in</span>
            </button>
            <button
              onClick={() => setActiveSidebarTab('design')}
              className={`flex-1 py-2.5 md:py-3.5 text-center transition-all duration-150 flex flex-col items-center justify-center space-y-1.5 rounded-xl cursor-pointer ${
                activeSidebarTab === 'design'
                  ? 'text-white bg-[#00B63E] font-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-700 bg-[#edf6ee]/90 hover:bg-[#e0efe2] hover:text-[#00B63E]'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[11.5px] font-black transition-all ${
                  activeSidebarTab === 'design'
                    ? 'bg-white text-[#00B63E] ring-4 ring-white/10 scale-105'
                    : 'bg-emerald-200 text-emerald-850 font-black'
                }`}>2</span>
                <span className={`text-[13.5px] md:text-[14.5px] font-black tracking-wide leading-none ${activeSidebarTab === 'design' ? 'text-white' : 'text-slate-750 font-black'}`}>THIẾT KẾ TEM</span>
              </div>
              <span className={`text-[10.5px] font-extrabold normal-case leading-none mt-0.5 ${activeSidebarTab === 'design' ? 'text-emerald-100' : 'text-slate-500'}`}>Vẽ &amp; chỉnh sửa chi tiết</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
            
            {/* TAB 1: PAPER & GRID LAYOUT */}
            {activeSidebarTab === 'layout' && (
              <div className="space-y-4 text-kiot-slate">
                
                {/* BƯỚC 1 ACCORDION */}
                <div className="space-y-1.5 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => setIsStep1Expanded(!isStep1Expanded)}
                    className={`w-full px-4 py-3 flex items-center justify-between cursor-pointer select-none group rounded-xl border transition-all duration-150 outline-none transform active:scale-[0.98] ${
                      isStep1Expanded
                        ? "bg-sky-100 text-sky-950 border-sky-300 shadow-sm"
                        : "bg-sky-50/90 text-sky-900 border-sky-200 hover:bg-sky-100/60 hover:border-sky-300 shadow-3xs"
                    }`}
                    title="Cấu hình kích thước của tem nhãn dán, độ bo góc, đường viền"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] tracking-wide shrink-0 transition-colors border ${
                        isStep1Expanded ? "bg-sky-600 text-white border-sky-700" : "bg-sky-100 text-sky-800 border-sky-200"
                      }`}>
                        BƯỚC 1
                      </span>
                      <span className={`font-extrabold text-[12.5px] uppercase tracking-wider transition-colors font-sans ${
                        isStep1Expanded ? "text-sky-950" : "text-sky-900 group-hover:text-sky-950"
                      }`}>
                        Xác định khổ tem
                      </span>
                    </div>
                    <div className={`transition-transform duration-150 ${isStep1Expanded ? "rotate-180 text-sky-600" : "text-sky-500 group-hover:text-sky-650"}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isStep1Expanded && (
                    <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-4 shadow-3xs">
                      {/* MODULE 1: CONTROL PANEL DIMENSIONS */}
                      <section className="pb-1 space-y-2.5">
                        <h2 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-2 select-none">
                          <Compass className="w-3.5 h-3.5 text-blue-500" />
                          <span>Kích thước tem nhãn ( 1 tem )</span>
                        </h2>

                      {/* POPULAR TOMY LABELS PICKER PANEL */}
                      <div ref={tomyContainerRef} className="space-y-2.5 pb-2.5 border-b border-gray-150/80 no-print">
                        <div className="flex items-center space-x-2 select-none no-print">
                          <label className="relative flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={usePopularTomy}
                              onChange={(e) => {
                                setUsePopularTomy(e.target.checked);
                                setIsTomyDropdownOpen(e.target.checked);
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 hover:bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#00B63E]"></div>
                            <span className="ml-2.5 text-[12px] font-black text-slate-700">Sử dụng tem Tomy phổ biến</span>
                          </label>
                        </div>

                        {usePopularTomy && (
                          <div className="relative space-y-1 pt-0.5 select-none no-print">
                            <label className="block text-[11px] text-slate-500 font-bold mb-0.5">Chọn dòng tem Tomy:</label>
                            <div className="relative col-span-2">
                              <button
                                type="button"
                                onClick={() => setIsTomyDropdownOpen(!isTomyDropdownOpen)}
                                className="w-full flex items-center justify-between pl-3 pr-2 py-1.5 text-[12px] bg-slate-50 border border-slate-250 hover:border-[#00B63E] rounded-lg text-slate-800 font-bold transition shadow-3xs cursor-pointer focus:ring-1 focus:ring-[#00B63E] text-left"
                              >
                                <span className="truncate">
                                  {TOMY_TEMPLATES_DATA.find(item => item.name === labelConfig.name)?.name || "Bấm chọn dòng tem..."}
                                </span>
                                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
                              </button>

                              {isTomyDropdownOpen && (
                                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-[290px] flex flex-col overflow-hidden animate-slideDown">
                                  {/* Search box container */}
                                  <div className="p-2 border-b border-slate-100 flex items-center space-x-2 bg-slate-50 shrink-0">
                                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <input
                                      type="text"
                                      placeholder="Nhập mã Tomy (ví dụ: 138, 105, A4...)"
                                      value={tomySearchQuery}
                                      onChange={(e) => setTomySearchQuery(e.target.value)}
                                      className="w-full bg-transparent border-0 text-xs focus:ring-0 focus:outline-none font-bold text-slate-700"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {tomySearchQuery && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTomySearchQuery("");
                                        }}
                                        className="p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-md"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Item options */}
                                  <div className="overflow-y-auto flex-1 divide-y divide-slate-50/50">
                                    {(() => {
                                      const query = tomySearchQuery.trim().toLowerCase();
                                      const filtered = TOMY_TEMPLATES_DATA.filter(item => 
                                        item.name.toLowerCase().includes(query)
                                      );

                                      if (filtered.length === 0) {
                                        return (
                                          <div className="py-4 px-3 text-xs text-slate-450 font-semibold text-center italic">
                                            Không tìm thấy dòng tem nào
                                          </div>
                                        );
                                      }

                                      return filtered.map((item) => {
                                        const isSelected = labelConfig.name === item.name;
                                        return (
                                          <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => handleSelectTomyTemplate(item)}
                                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                              isSelected 
                                                ? "bg-slate-100 text-[#00B63E] font-black" 
                                                : "hover:bg-slate-50 text-slate-700 font-semibold"
                                            }`}
                                          >
                                            <div className="flex flex-col">
                                              <span className="font-extrabold">{item.name}</span>
                                              <span className="text-[10px] text-slate-400 font-medium">
                                                Giấy {item.paperSize} • {item.rows} hàng x {item.cols} cột ({item.width}x{item.height} mm)
                                              </span>
                                            </div>
                                            {isSelected && <span className="text-[10px] bg-[#00B63E] text-white px-1 py-0.5 rounded font-black shrink-0 ml-1.5">Đã chọn</span>}
                                          </button>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Chiều rộng (mm)</label>
                      <div className="relative">
                        <input
                          id="width-input"
                          type="text"
                          value={widthInput}
                          onChange={(e) => {
                            const s = e.target.value;
                            setWidthInput(s);
                            const w = parseInt(s);
                            if (!isNaN(w) && w >= 10) {
                              applyPresetDimensions(Math.min(w, 300), labelConfig.height, "Cấu hình tự chọn");
                            }
                          }}
                          onBlur={() => {
                            const w = parseInt(widthInput);
                            if (isNaN(w) || w < 10) {
                              applyPresetDimensions(10, labelConfig.height, "Cấu hình tự chọn");
                              setWidthInput("10");
                            } else if (w > 300) {
                              applyPresetDimensions(300, labelConfig.height, "Cấu hình tự chọn");
                              setWidthInput("300");
                            }
                          }}
                          className="w-full pl-2 pr-7 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-800 font-bold font-mono focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan outline-none"
                        />
                        <span className="absolute right-2 top-2 text-[11px] text-gray-400 font-extrabold select-none">mm</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Chiều cao (mm)</label>
                      <div className="relative">
                        <input
                          id="height-input"
                          type="text"
                          value={heightInput}
                          onChange={(e) => {
                            const s = e.target.value;
                            setHeightInput(s);
                            const h = parseInt(s);
                            if (!isNaN(h) && h >= 10) {
                              applyPresetDimensions(labelConfig.width, Math.min(h, 300), "Cấu hình tự chọn");
                            }
                          }}
                          onBlur={() => {
                            const h = parseInt(heightInput);
                            if (isNaN(h) || h < 10) {
                              applyPresetDimensions(labelConfig.width, 10, "Cấu hình tự chọn");
                              setHeightInput("10");
                            } else if (h > 300) {
                              applyPresetDimensions(labelConfig.width, 300, "Cấu hình tự chọn");
                              setHeightInput("300");
                            }
                          }}
                          className="w-full pl-2 pr-7 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-800 font-bold font-mono focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan outline-none"
                        />
                        <span className="absolute right-2 top-2 text-[11px] text-gray-400 font-extrabold select-none">mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Dropdown List with Checkmark indicators */}
                  <div className="space-y-1.5 pt-1 relative">
                    <span className="block text-[11.5px] text-gray-400 font-bold select-none">Thay đổi nhanh khổ tem</span>
                    
                    <button
                      type="button"
                      onClick={() => setIsQuickSizeOpen(!isQuickSizeOpen)}
                      className="w-full flex items-center justify-between bg-white border border-gray-300 hover:border-kiot-cyan rounded-lg px-2.5 py-2 text-sm font-bold text-slate-800 focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan outline-none text-left cursor-pointer transition shadow-xs"
                    >
                      <span className="truncate">
                        {labelConfig.width === 65 && labelConfig.height === 45 ? "65x45mm (Tem Kệ)" :
                         labelConfig.width === 75 && labelConfig.height === 100 ? "75x100mm (Shipping)" :
                         labelConfig.width === 100 && labelConfig.height === 150 ? "100x150mm (Shipping)" :
                         labelConfig.width === 40 && labelConfig.height === 30 ? "40x30mm (Nhãn Giá)" :
                         labelConfig.width === 50 && labelConfig.height === 30 ? "50x30mm (Tài Sản)" :
                         labelConfig.width === 50 && labelConfig.height === 50 ? "50x50mm (Mã QR)" :
                         `Khổ tự chọn (${labelConfig.width}x${labelConfig.height}mm)`}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
                    </button>

                    {/* Dropdown presets options block overlay */}
                    {isQuickSizeOpen && (
                      <>
                        {/* Backdrop overlay to dismiss dropdown */}
                        <div 
                          className="fixed inset-0 z-35 bg-transparent" 
                          onClick={() => setIsQuickSizeOpen(false)} 
                        />
                        
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-40 text-sm max-h-60 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              applyPresetDimensions(65, 45, "Tem Kệ Siêu Thị");
                              setIsQuickSizeOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left font-semibold transition cursor-pointer ${
                              labelConfig.width === 65 && labelConfig.height === 45 ? "text-kiot-navy bg-sky-50/35" : "text-slate-700"
                            }`}
                          >
                            <span>65x45mm (Tem Kệ - Nhãn Siêu Thị)</span>
                            {labelConfig.width === 65 && labelConfig.height === 45 && (
                              <span className="text-kiot-cyan font-bold text-sm">✓</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              applyPresetDimensions(75, 100, "Nhãn Giao hàng 75x100");
                              setIsQuickSizeOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left font-semibold transition cursor-pointer ${
                              labelConfig.width === 75 && labelConfig.height === 100 ? "text-kiot-navy bg-sky-50/35" : "text-slate-700"
                            }`}
                          >
                            <span>75x100mm (Shipping Trung)</span>
                            {labelConfig.width === 75 && labelConfig.height === 100 && (
                              <span className="text-kiot-cyan font-bold text-sm">✓</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              applyPresetDimensions(100, 150, "Nhãn Giao hàng 100x150");
                              setIsQuickSizeOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left font-semibold transition cursor-pointer ${
                              labelConfig.width === 100 && labelConfig.height === 150 ? "text-kiot-navy bg-sky-50/35" : "text-slate-700"
                            }`}
                          >
                            <span>100x150mm (Shipping Lớn - TMĐT)</span>
                            {labelConfig.width === 100 && labelConfig.height === 150 && (
                              <span className="text-kiot-cyan font-bold text-sm">✓</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              applyPresetDimensions(40, 30, "Mã giá lẻ");
                              setIsQuickSizeOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left font-semibold transition cursor-pointer ${
                              labelConfig.width === 40 && labelConfig.height === 30 ? "text-kiot-navy bg-sky-50/35" : "text-slate-700"
                            }`}
                          >
                            <span>40x30mm (Nhãn Giá Bán)</span>
                            {labelConfig.width === 40 && labelConfig.height === 30 && (
                              <span className="text-kiot-cyan font-bold text-sm">✓</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              applyPresetDimensions(50, 30, "Mẫu TSCĐ");
                              setIsQuickSizeOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left font-semibold transition cursor-pointer ${
                              labelConfig.width === 50 && labelConfig.height === 30 ? "text-kiot-navy bg-sky-50/35" : "text-slate-700"
                            }`}
                          >
                            <span>50x30mm (Mã Tài Sản)</span>
                            {labelConfig.width === 50 && labelConfig.height === 30 && (
                              <span className="text-kiot-cyan font-bold text-sm">✓</span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              applyPresetDimensions(50, 50, "QR Thanh toán");
                              setIsQuickSizeOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left font-semibold transition cursor-pointer ${
                              labelConfig.width === 50 && labelConfig.height === 50 ? "text-kiot-navy bg-sky-50/35" : "text-slate-700"
                            }`}
                          >
                            <span>50x50mm (Mã QR Thanh Toán)</span>
                            {labelConfig.width === 50 && labelConfig.height === 50 && (
                              <span className="text-kiot-cyan font-bold text-sm">✓</span>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                {/* VIỀN TEM & BO GÓC */}
                <section className="space-y-3.5">
                  <h2 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-2 select-none">
                    <CheckSquare className="w-3.5 h-3.5 text-kiot-cyan" />
                    <span>Viền tem &amp; Bo góc</span>
                  </h2>
                  
                  <div className="flex items-center space-x-2 text-xs">
                    <input
                      id="showBorderCheckbox"
                      type="checkbox"
                      checked={sheetConfig.showBorder}
                      onChange={(e) => setSheetConfig(prev => ({ ...prev, showBorder: e.target.checked }))}
                      className="w-4.5 h-4.5 text-kiot-cyan focus:ring-kiot-cyan/50 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="showBorderCheckbox" className="font-bold text-[12.5px] text-slate-700 cursor-pointer select-none">
                      Viền tem nhãn
                    </label>
                  </div>

                  {sheetConfig.showBorder && (
                    <div className="grid grid-cols-2 gap-3 text-xs pl-6 transition-all duration-150">
                      <div>
                        <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Hình dáng viền</label>
                        <select
                          value={sheetConfig.borderRadius === 0 ? "square" : "rounded"}
                          onChange={(e) => setSheetConfig(prev => ({ ...prev, borderRadius: e.target.value === "square" ? 0 : 2 }))}
                          className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none cursor-pointer text-slate-800 font-bold focus:border-kiot-cyan"
                        >
                          <option value="square">Vuông góc</option>
                          <option value="rounded">Bo tròn</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Độ bo góc (Radius)</label>
                        <input
                          id="border-radius-input"
                          type="text"
                          disabled={sheetConfig.borderRadius === 0}
                          value={borderRadiusInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setBorderRadiusInput(raw);
                            const parsed = parseInt(raw, 10);
                            if (!isNaN(parsed) && parsed >= 0 && parsed <= 15) {
                              setSheetConfig(prev => ({ ...prev, borderRadius: parsed }));
                            }
                          }}
                          onBlur={() => {
                            const parsed = parseInt(borderRadiusInput, 10);
                            if (isNaN(parsed) || parsed < 0 || parsed > 15) {
                              setSheetConfig(prev => ({ ...prev, borderRadius: 0 }));
                              setBorderRadiusInput("0");
                            } else {
                              setSheetConfig(prev => ({ ...prev, borderRadius: parsed }));
                              setBorderRadiusInput(String(parsed));
                            }
                          }}
                          className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold disabled:opacity-50"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Màu đường viền</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={sheetConfig.borderColor || "#9ca3af"}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, borderColor: e.target.value }))}
                            className="w-10 h-8 p-0 border border-gray-300 cursor-pointer rounded-md outline-none bg-transparent"
                          />
                          <input
                            type="text"
                            value={sheetConfig.borderColor || "#9ca3af"}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, borderColor: e.target.value }))}
                            className="w-28 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono text-slate-800 font-bold"
                            placeholder="#9ca3af"
                          />
                          <div className="flex space-x-1">
                            {[
                              "#9ca3af",
                              "#000000",
                              "#ff0000",
                              "#008000",
                              "#0000ff"
                            ].map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                onClick={() => setSheetConfig(prev => ({ ...prev, borderColor: hex }))}
                                className="w-5 h-5 rounded-full border border-gray-350 cursor-pointer transition-transform hover:scale-110 shadow-sm"
                                style={{ backgroundColor: hex }}
                                title={hex}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Độ dày nét kẻ viền (px)</label>
                        <input
                          type="range"
                          min={1}
                          max={4}
                          step={1}
                          value={sheetConfig.borderWidth}
                          onChange={(e) => setSheetConfig(prev => ({ ...prev, borderWidth: parseInt(e.target.value) || 1 }))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-1"
                        />
                        <div className="flex justify-between text-[10.5px] text-gray-500 font-bold mt-1 select-none">
                          <span>Mỏng (1px)</span>
                          <span>Dày ({sheetConfig.borderWidth}px)</span>
                          <span>Dày nhất (4px)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
                
                    </div>
                  )}
                </div>

                {/* BƯỚC 2 ACCORDION */}
                <div className="space-y-1.5 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => setIsStep2Expanded(!isStep2Expanded)}
                    className={`w-full px-4 py-3 flex items-center justify-between cursor-pointer select-none group rounded-xl border transition-all duration-150 outline-none transform active:scale-[0.98] ${
                      isStep2Expanded
                        ? "bg-indigo-100 text-indigo-950 border-indigo-300 shadow-sm"
                        : "bg-indigo-50/90 text-indigo-900 border-indigo-200 hover:bg-indigo-100/60 hover:border-indigo-300 shadow-3xs"
                    }`}
                    title="Cấu hình kích thước khổ giấy văn phòng (A4/A5) hoặc thiết lập cuộn tem nhiệt"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] tracking-wide shrink-0 transition-colors border ${
                        isStep2Expanded ? "bg-indigo-600 text-white border-indigo-700" : "bg-indigo-100 text-indigo-800 border-indigo-200"
                      }`}>
                        BƯỚC 2
                      </span>
                      <span className={`font-extrabold text-[12.5px] uppercase tracking-wider transition-colors font-sans ${
                        isStep2Expanded ? "text-indigo-950" : "text-indigo-900 group-hover:text-indigo-950"
                      }`}>
                        Thiết lập khổ giấy và máy in
                      </span>
                    </div>
                    <div className={`transition-transform duration-150 ${isStep2Expanded ? "rotate-180 text-indigo-600" : "text-indigo-500 group-hover:text-indigo-600"}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                   {isStep2Expanded && (
                    <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-4 shadow-3xs">
                      {labelConfig.name && labelConfig.name.includes("Tomy") && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] rounded-lg font-semibold flex items-start space-x-1.5 shadow-3xs animate-fadeIn no-print">
                          <span className="text-sm mt-0.5">⚡</span>
                          <div className="flex-1">
                            <span className="text-emerald-950 font-extrabold block text-xs">Đã đồng bộ mẫu Tomy mặc định!</span>
                            <span className="text-emerald-700 text-[10.5px] leading-tight block mt-0.5">Hệ thống đã tự động áp dụng khổ giấy <strong>{TOMY_TEMPLATES_DATA.find(t => t.name === labelConfig.name)?.paperSize || "A4/A5"}</strong> ({TOMY_TEMPLATES_DATA.find(t => t.name === labelConfig.name)?.orientation === "landscape" ? "Khổ ngang" : "Khổ dọc"}), các lề giấy chuẩn, số ô lưới và khe hở chính xác cho <strong className="text-emerald-950 font-bold">{labelConfig.name}</strong>.</span>
                          </div>
                        </div>
                      )}
                      
                      {/* 1. PRINT MODE SELECTOR */}
                      <section className="space-y-2.5">
                        <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center space-x-1.5 select-none mb-1">
                          <Grid3X3 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Khổ giấy và máy in</span>
                        </h2>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <button
                      type="button"
                      onClick={() => setSheetConfig(prev => ({ ...prev, mode: 'thermal' }))}
                      className={`p-3 border rounded-xl text-left transition flex items-center space-x-2 cursor-pointer focus:outline-none ${
                        sheetConfig.mode === 'thermal'
                          ? 'bg-sky-50/50 border-kiot-cyan text-kiot-navy ring-1 ring-kiot-cyan/50 shadow-xs'
                          : 'bg-white border-gray-200 hover:bg-slate-50 text-slate-550'
                      }`}
                      title="Sử dụng máy in nhãn chuyên dụng / máy in chuyển nhiệt in 1 nhãn liên tiếp trên cuộn giấy dán."
                    >
                      <span className="text-base shrink-0">📠</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-[12.5px] leading-tight text-slate-800">In nhãn cuộn</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-1">Xprinter/Zebra...</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSheetConfig(prev => ({ ...prev, mode: 'office' }))}
                      className={`p-3 border rounded-xl text-left transition flex items-center space-x-2 cursor-pointer focus:outline-none ${
                        sheetConfig.mode === 'office'
                          ? 'bg-sky-50/50 border-kiot-cyan text-kiot-navy ring-1 ring-kiot-cyan/50 shadow-xs'
                          : 'bg-white border-gray-200 hover:bg-slate-50 text-slate-550'
                      }`}
                      title="Sử dụng máy in văn phòng tiêu chuẩn (A4/A5...). Nhãn được sắp xếp thành mạng lưới cột/hàng trên tờ giấy dán."
                    >
                      <span className="text-base shrink-0">🖨️</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-[12.5px] leading-tight text-slate-800">In văn phòng</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-1">Giấy Decal A4/A5</p>
                      </div>
                    </button>
                  </div>
                </section>

                {sheetConfig.mode === 'office' ? (
                  <>
                    <section className="border-b border-gray-150 pb-4 space-y-3.5">
                      <h2 className="text-[12.5px] font-black text-[#475569] uppercase tracking-wider select-none">
                        Khổ giấy văn phòng
                      </h2>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Khổ giấy</label>
                          <select
                            value={sheetConfig.paperSize}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, paperSize: e.target.value as any }))}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none cursor-pointer text-slate-800 font-bold focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan"
                          >
                            <option value="A4">A4 (210x297mm)</option>
                            <option value="A5">A5 (148x210mm)</option>
                            <option value="custom">Kích thước riêng</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Chiều giấy</label>
                          <select
                            value={sheetConfig.orientation}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, orientation: e.target.value as any }))}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none cursor-pointer text-slate-800 font-bold focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan"
                          >
                            <option value="portrait">Khổ dọc</option>
                            <option value="landscape">Khổ ngang</option>
                          </select>
                        </div>
                      </div>

                      {sheetConfig.paperSize === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] text-slate-500 font-bold mb-1">Ch.rộng giấy (mm)</label>
                            <input
                              id="custom-width-input"
                              type="text"
                              value={customWidthInput}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setCustomWidthInput(raw);
                                const parsed = parseInt(raw, 10);
                                if (!isNaN(parsed) && parsed >= 50 && parsed <= 600) {
                                  setSheetConfig(prev => ({ ...prev, customWidth: parsed }));
                                }
                              }}
                              onBlur={() => {
                                const parsed = parseInt(customWidthInput, 10);
                                if (isNaN(parsed) || parsed < 50 || parsed > 600) {
                                  setSheetConfig(prev => ({ ...prev, customWidth: 210 }));
                                  setCustomWidthInput("210");
                                } else {
                                  setSheetConfig(prev => ({ ...prev, customWidth: parsed }));
                                  setCustomWidthInput(String(parsed));
                                }
                              }}
                              className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-500 font-bold mb-1">Ch.cao giấy (mm)</label>
                            <input
                              id="custom-height-input"
                              type="text"
                              value={customHeightInput}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setCustomHeightInput(raw);
                                const parsed = parseInt(raw, 10);
                                if (!isNaN(parsed) && parsed >= 50 && parsed <= 600) {
                                  setSheetConfig(prev => ({ ...prev, customHeight: parsed }));
                                }
                              }}
                              onBlur={() => {
                                const parsed = parseInt(customHeightInput, 10);
                                if (isNaN(parsed) || parsed < 50 || parsed > 600) {
                                  setSheetConfig(prev => ({ ...prev, customHeight: 297 }));
                                  setCustomHeightInput("297");
                                } else {
                                  setSheetConfig(prev => ({ ...prev, customHeight: parsed }));
                                  setCustomHeightInput(String(parsed));
                                }
                              }}
                              className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </section>

                    {/* 3. BỐ CỤC LƯỚI */}
                    <section className="border-b border-gray-150 pb-4 space-y-3.5">
                      <h2 className="text-[12.5px] font-black text-[#475569] uppercase tracking-wider select-none">
                        Bố cục tem nhãn
                      </h2>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Số Cột (Cols)</label>
                          <input
                            id="cols-input"
                            type="text"
                            value={colsInput}
                            onChange={(e) => {
                              const s = e.target.value;
                              setColsInput(s);
                              const c = parseInt(s);
                              if (!isNaN(c) && c >= 1) {
                                setSheetConfig(prev => ({ ...prev, cols: Math.min(c, 15) }));
                              }
                            }}
                            onBlur={() => {
                              const c = parseInt(colsInput);
                              if (isNaN(c) || c < 1) {
                                setSheetConfig(prev => ({ ...prev, cols: 1 }));
                                setColsInput("1");
                              } else if (c > 15) {
                                setSheetConfig(prev => ({ ...prev, cols: 15 }));
                                setColsInput("15");
                              }
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Số Hàng (Rows)</label>
                          <input
                            id="rows-input"
                            type="text"
                            value={rowsInput}
                            onChange={(e) => {
                              const s = e.target.value;
                              setRowsInput(s);
                              const r = parseInt(s);
                              if (!isNaN(r) && r >= 1) {
                                setSheetConfig(prev => ({ ...prev, rows: Math.min(r, 30) }));
                              }
                            }}
                            onBlur={() => {
                              const r = parseInt(rowsInput);
                              if (isNaN(r) || r < 1) {
                                setSheetConfig(prev => ({ ...prev, rows: 1 }));
                                setRowsInput("1");
                              } else if (r > 30) {
                                setSheetConfig(prev => ({ ...prev, rows: 30 }));
                                setRowsInput("30");
                              }
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                      </div>

                      <div className="p-3 border border-blue-100 bg-blue-50/25 text-[12px] text-blue-900 rounded-lg font-bold flex items-center justify-between shadow-2xs">
                        <span>Số lượng tem tối đa trên trang: <strong className="text-blue-600 font-black">{sheetConfig.cols * sheetConfig.rows} tem</strong></span>
                      </div>

                      {/* NÚT TỐI ƯU HÓA HOÀN HẢO */}
                      <button
                        type="button"
                        onClick={() => {
                          const { width: sW, height: sH } = getSheetDimensions(sheetConfig);
                          const netW = sW - sheetConfig.marginLeft - sheetConfig.marginRight;
                          const netH = sH - sheetConfig.marginTop - sheetConfig.marginBottom;
                          const totalColGaps = (sheetConfig.cols - 1) * sheetConfig.colGap;
                          const totalRowGaps = (sheetConfig.rows - 1) * sheetConfig.rowGap;
                          const optW = (netW - totalColGaps) / sheetConfig.cols;
                          const optH = (netH - totalRowGaps) / sheetConfig.rows;
                          
                          applyPresetDimensions(
                            Math.max(10, Math.floor(optW * 10) / 10),
                            Math.max(10, Math.floor(optH * 10) / 10),
                            `Khớp Lưới ${sheetConfig.cols}x${sheetConfig.rows}`
                          );
                        }}
                        className="w-full py-2 bg-kiot-cyan hover:bg-sky-600 text-white rounded-lg text-[11.5px] font-black text-center select-none cursor-pointer transition border border-kiot-cyan flex items-center justify-center space-x-1.5 shadow-sm"
                        title="Tính toán kích thước Chiều rộng và Chiều cao của tem nhãn dán tối ưu nhất dựa theo lề giấy và khe hở, giúp nhãn khít khịt với tờ đề can in ấn sẵn."
                      >
                        ⚡ <span>Khớp vừa nhãn vào lưới giấy</span>
                      </button>
                    </section>

                    {/* 4. KHOẢNG CÁCH LỀ GIẤY */}
                    <section className="border-b border-gray-150 pb-4 space-y-3">
                      <h2 className="text-[12.5px] font-black text-[#475569] uppercase tracking-wider select-none">
                        Lề trang
                      </h2>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Lề trái (mm)</label>
                          <input
                            id="margin-left-input"
                            type="text"
                            value={marginLeftInput}
                            onChange={(e) => {
                              const s = e.target.value;
                              setMarginLeftInput(s);
                              const m = parseInt(s);
                              if (!isNaN(m) && m >= 0) {
                                setSheetConfig(prev => ({ ...prev, marginLeft: Math.min(m, 50) }));
                              }
                            }}
                            onBlur={() => {
                              const m = parseInt(marginLeftInput);
                              if (isNaN(m) || m < 0) {
                                setSheetConfig(prev => ({ ...prev, marginLeft: 0 }));
                                setMarginLeftInput("0");
                              } else if (m > 50) {
                                setSheetConfig(prev => ({ ...prev, marginLeft: 50 }));
                                setMarginLeftInput("50");
                              }
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Lề phải (mm)</label>
                          <input
                            id="margin-right-input"
                            type="text"
                            value={marginRightInput}
                            onChange={(e) => {
                              const s = e.target.value;
                              setMarginRightInput(s);
                              const m = parseInt(s);
                              if (!isNaN(m) && m >= 0) {
                                setSheetConfig(prev => ({ ...prev, marginRight: Math.min(m, 50) }));
                              }
                            }}
                            onBlur={() => {
                              const m = parseInt(marginRightInput);
                              if (isNaN(m) || m < 0) {
                                setSheetConfig(prev => ({ ...prev, marginRight: 0 }));
                                setMarginRightInput("0");
                              } else if (m > 50) {
                                setSheetConfig(prev => ({ ...prev, marginRight: 50 }));
                                setMarginRightInput("50");
                              }
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Lề trên (mm)</label>
                          <input
                            id="margin-top-input"
                            type="text"
                            value={marginTopInput}
                            onChange={(e) => {
                              const s = e.target.value;
                              setMarginTopInput(s);
                              const m = parseInt(s);
                              if (!isNaN(m) && m >= 0) {
                                setSheetConfig(prev => ({ ...prev, marginTop: Math.min(m, 50) }));
                              }
                            }}
                            onBlur={() => {
                              const m = parseInt(marginTopInput);
                              if (isNaN(m) || m < 0) {
                                setSheetConfig(prev => ({ ...prev, marginTop: 0 }));
                                setMarginTopInput("0");
                              } else if (m > 50) {
                                setSheetConfig(prev => ({ ...prev, marginTop: 50 }));
                                setMarginTopInput("50");
                              }
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Lề dưới (mm)</label>
                          <input
                            id="margin-bottom-input"
                            type="text"
                            value={marginBottomInput}
                            onChange={(e) => {
                              const s = e.target.value;
                              setMarginBottomInput(s);
                              const m = parseInt(s);
                              if (!isNaN(m) && m >= 0) {
                                setSheetConfig(prev => ({ ...prev, marginBottom: Math.min(m, 55) }));
                              }
                            }}
                            onBlur={() => {
                              const m = parseInt(marginBottomInput);
                              if (isNaN(m) || m < 0) {
                                setSheetConfig(prev => ({ ...prev, marginBottom: 0 }));
                                setMarginBottomInput("0");
                              } else if (m > 55) {
                                setSheetConfig(prev => ({ ...prev, marginBottom: 55 }));
                                setMarginBottomInput("55");
                              }
                            }}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                      </div>
                    </section>

                    {/* 5. KHE HỞ GIỮA CÁC Ô */}
                    <section className="space-y-3">
                      <h2 className="text-[12.5px] font-black text-[#475569] uppercase tracking-wider select-none">
                        Khoảng cách giữa các tem
                      </h2>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Khoảng cách cột (mm)</label>
                          <input
                            id="col-gap-office-input"
                            type="text"
                            value={colGapOfficeInput}
                            onChange={(e) => {
                              const s = e.target.value;
                              setColGapOfficeInput(s);
                              const g = parseInt(s);
                              if (!isNaN(g) && g >= 0) {
                                setSheetConfig(prev => ({ ...prev, colGap: Math.min(g, 20) }));
                              }
                            }}
                            onBlur={() => {
                              const g = parseInt(colGapOfficeInput);
                              if (isNaN(g) || g < 0) {
                                setSheetConfig(prev => ({ ...prev, colGap: 0 }));
                                setColGapOfficeInput("0");
                              } else if (g > 20) {
                                setSheetConfig(prev => ({ ...prev, colGap: 20 }));
                                setColGapOfficeInput("20");
                              }
                            }}
                            className="w-full bg-white border border-gray-300 rounded mb-1 text-sm p-1.5 outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Khoảng cách hàng (mm)</label>
                          <input
                            id="row-gap-office-input"
                            type="text"
                            value={rowGapOfficeInput}
                            onChange={(e) => {
                              const s = e.target.value;
                              setRowGapOfficeInput(s);
                              const g = parseInt(s);
                              if (!isNaN(g) && g >= 0) {
                                setSheetConfig(prev => ({ ...prev, rowGap: Math.min(g, 20) }));
                              }
                            }}
                            onBlur={() => {
                              const g = parseInt(rowGapOfficeInput);
                              if (isNaN(g) || g < 0) {
                                setSheetConfig(prev => ({ ...prev, rowGap: 0 }));
                                setRowGapOfficeInput("0");
                              } else if (g > 20) {
                                setSheetConfig(prev => ({ ...prev, rowGap: 20 }));
                                setRowGapOfficeInput("20");
                              }
                            }}
                            className="w-full bg-white border border-gray-300 rounded mb-1 text-sm p-1.5 outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                      </div>
                    </section>

                  </>
                ) : (
                  <div className="space-y-4">
                    {/* INFO BOX */}
                    <div className="p-3 bg-sky-50/50 border border-kiot-cyan/25 rounded-lg text-kiot-navy text-[12px] leading-relaxed shadow-xs">
                      <p className="font-bold text-kiot-navy flex items-center mb-1 text-[12.5px]">
                        <span className="mr-1.5 text-base">📠</span> Thiết lập khổ tem nhãn cuộn
                      </p>
                      <p className="text-[10.5px]">
                        Dùng cho máy in mã vạch chuyên dụng in cuộn chuyển nhiệt. Hỗ trợ chia cột tem tự do và khoảng trống gap đứt dòng.
                      </p>
                    </div>

                    {/* SET TARGET ROLL WIDTH */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          Bề rộng cuộn tem (mm)
                          <InfoTooltip content="Tổng chiều rộng của cuộn giấy. Khi nhập số này, lề 2 bên sẽ tự động tính toán ngược lại." />
                        </span>
                        <span className="text-kiot-cyan select-none capitalize">Tính ngược lề</span>
                      </label>
                      <div className="relative">
                        <input
                          id="roll-width-input"
                          type="text"
                          value={desiredRollWidthInput}
                          onChange={(e) => {
                            const s = e.target.value;
                            setDesiredRollWidthInput(s);
                            const w = parseFloat(s);
                            if (!isNaN(w) && w >= 10) {
                              const val = Math.min(w, 500);
                              setDesiredRollWidth(val);
                              // Reverse calculation: Lề 2 bên = (Bề rộng cuộn - dán tem - khoảng hở) / 2
                              const colGaps = (sheetConfig.cols - 1) * (sheetConfig.colGap || 0);
                              let computedSideMargin = (val - (labelConfig.width * sheetConfig.cols) - colGaps) / 2;
                              computedSideMargin = Math.max(0, Math.round(computedSideMargin * 10) / 10);
                              setSheetConfig(prev => ({ ...prev, rollSideMargin: computedSideMargin }));
                            }
                          }}
                          onBlur={() => {
                            let w = parseFloat(desiredRollWidthInput);
                            if (isNaN(w) || w < 10) {
                              w = 10;
                            } else if (w > 500) {
                              w = 500;
                            }
                             setDesiredRollWidth(w);
                             setDesiredRollWidthInput(String(w));
                             const colGaps = (sheetConfig.cols - 1) * (sheetConfig.colGap || 0);
                             let computedSideMargin = (w - (labelConfig.width * sheetConfig.cols) - colGaps) / 2;
                             computedSideMargin = Math.max(0, Math.round(computedSideMargin * 10) / 10);
                             setSheetConfig(prev => ({ ...prev, rollSideMargin: computedSideMargin }));
                          }}
                          className="w-full pl-2 pr-7 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-800 font-bold font-mono focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan outline-none"
                          placeholder="Ví dụ: 75, 110..."
                        />
                        <span className="absolute right-2 top-2 text-[11px] text-gray-400 font-extrabold select-none">mm</span>
                      </div>
                    </div>

                    {/* SET ROLL SIDE MARGIN */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1">
                        <span>Lề 2 bên (mm)</span>
                        <InfoTooltip content="Khoảng trống lề từ hai viền mép ngoài của phôi cuộn giấy đến viền ngoài của tem dán." />
                      </label>
                      <div className="relative">
                        <input
                          id="roll-side-margin-input"
                          type="text"
                          value={rollSideMarginInput}
                          onChange={(e) => {
                            const s = e.target.value;
                            setRollSideMarginInput(s);
                            const m = parseFloat(s);
                            if (!isNaN(m) && m >= 0) {
                              setSheetConfig(prev => ({ ...prev, rollSideMargin: Math.min(m, 50) }));
                            }
                          }}
                          onBlur={() => {
                            const m = parseFloat(rollSideMarginInput);
                            if (isNaN(m) || m < 0) {
                              setSheetConfig(prev => ({ ...prev, rollSideMargin: 0 }));
                              setRollSideMarginInput("0");
                            } else if (m > 50) {
                              setSheetConfig(prev => ({ ...prev, rollSideMargin: 50 }));
                              setRollSideMarginInput("50");
                            } else {
                              const rounded = Math.round(m * 10) / 10;
                              setSheetConfig(prev => ({ ...prev, rollSideMargin: rounded }));
                              setRollSideMarginInput(String(rounded));
                            }
                          }}
                          className="w-full pl-2 pr-7 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-800 font-bold font-mono focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan outline-none"
                          placeholder="Ví dụ: 1.5, 2, 5..."
                        />
                        <span className="absolute right-2 top-2 text-[11px] text-gray-400 font-extrabold select-none">mm</span>
                      </div>


                      {/* WARNING BADGE IF ROLL WIDTH IS SMALLER THAN LABELS */}
                      {(() => {
                        const colCount = sheetConfig.cols || 1;
                        const actualGaps = (colCount - 1) * (sheetConfig.colGap || 0);
                        const totalLabelWidth = Math.round((colCount * labelConfig.width + actualGaps) * 10) / 10;
                        if (sheetConfig.mode === "thermal" && desiredRollWidth < totalLabelWidth) {
                          return (
                            <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] leading-relaxed">
                              <p className="flex items-center text-amber-955 font-black mb-1 select-none">
                                <span className="mr-1.5 text-xs text-amber-600">⚠️</span> Cảnh báo kích thước
                              </p>
                              <span>
                                Bề rộng cuộn tem (<strong>{desiredRollWidth}mm</strong>) đang nhỏ hơn tổng chiều rộng hàng tem dán (<strong>{totalLabelWidth}mm</strong>).
                                Vui lòng điều chỉnh lại bề rộng cuộn tem lớn hơn!
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* SET COLS */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none">
                        Thiết lập số tem 1 hàng
                      </label>
                      <div className="relative">
                        <input
                          id="cols-roll-input"
                          type="text"
                          value={colsInput}
                          onChange={(e) => {
                            const s = e.target.value;
                            setColsInput(s);
                            const c = parseInt(s);
                            if (!isNaN(c) && c >= 1) {
                              setSheetConfig(prev => ({ ...prev, cols: Math.min(c, 20) }));
                            }
                          }}
                          onBlur={() => {
                            const c = parseInt(colsInput);
                            if (isNaN(c) || c < 1) {
                              setSheetConfig(prev => ({ ...prev, cols: 1 }));
                              setColsInput("1");
                            } else if (c > 20) {
                              setSheetConfig(prev => ({ ...prev, cols: 20 }));
                              setColsInput("20");
                            }
                          }}
                          className="w-full pl-2 pr-7 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-800 font-bold font-mono focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan outline-none"
                          placeholder="Nhập số tem ví dụ: 1, 2, 3, 4..."
                        />
                        <span className="absolute right-2 top-2 text-[11px] text-gray-400 font-extrabold select-none">tem</span>
                      </div>
                    </div>

                    {/* SET COL GAP */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1">
                        <span>Khoảng cách giữa các tem 1 hàng</span>
                        <InfoTooltip content="Khoảng hở ngang giữa các tem cạnh nhau trên cùng một dòng." />
                      </label>
                      <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-kiot-cyan focus-within:ring-offset-0 focus-within:border-kiot-cyan">
                        <input
                          id="col-gap-input"
                          type="text"
                          value={colGapInput}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            setColGapInput(valStr);
                            const valNum = parseFloat(valStr) || 0;
                            const valMm = colGapUnit === 'inch' ? valNum * 25.4 : valNum;
                            setSheetConfig(prev => ({ ...prev, colGap: valMm }));
                          }}
                          onBlur={() => {
                            if (!colGapInput.trim()) {
                              setColGapInput("0");
                              setSheetConfig(prev => ({ ...prev, colGap: 0 }));
                            }
                          }}
                          className="flex-1 pl-2 pr-2 py-1.5 text-sm font-bold font-mono text-slate-800 bg-white outline-none"
                          placeholder="0.0"
                        />
                        <select
                          value={colGapUnit}
                          onChange={(e) => {
                            const newUnit = e.target.value as 'mm' | 'inch';
                            setColGapUnit(newUnit);
                            const val = sheetConfig.colGap || 0;
                            if (newUnit === 'inch') {
                              setColGapInput(String(parseFloat((val / 25.4).toFixed(4))));
                            } else {
                              setColGapInput(String(val));
                            }
                          }}
                          className="bg-gray-50 border-l border-gray-300 px-2.5 py-1.5 text-xs font-extrabold outline-none text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          <option value="mm">mm</option>
                          <option value="inch">inch</option>
                        </select>
                      </div>

                    </div>

                    {/* SET ROW GAP (GAP BETWEEN ROWS) */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none flex items-center gap-1">
                        <span>Khoảng cách giữa các hàng tem (gap)</span>
                        <InfoTooltip content={<>Khoảng trống phân cách hàng (Gap sensor). Giá trị mặc định phổ biến của cuộn decal nhãn thường là <strong>3.0 mm</strong>.</>} />
                      </label>
                      <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-kiot-cyan focus-within:ring-offset-0 focus-within:border-kiot-cyan">
                        <input
                          id="row-gap-input"
                          type="text"
                          value={rowGapInput}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            setRowGapInput(valStr);
                            const valNum = parseFloat(valStr) || 0;
                            const valMm = rowGapUnit === 'inch' ? valNum * 25.4 : valNum;
                            setSheetConfig(prev => ({ ...prev, rowGap: valMm }));
                          }}
                          onBlur={() => {
                            if (!rowGapInput.trim()) {
                              setRowGapInput("3");
                              setSheetConfig(prev => ({ ...prev, rowGap: 3 }));
                            }
                          }}
                          className="flex-1 pl-2 pr-2 py-1.5 text-sm font-bold font-mono text-slate-800 bg-white outline-none"
                          placeholder="3.0"
                        />
                        <select
                          value={rowGapUnit}
                          onChange={(e) => {
                            const newUnit = e.target.value as 'mm' | 'inch';
                            setRowGapUnit(newUnit);
                            const val = sheetConfig.rowGap !== undefined ? sheetConfig.rowGap : 3.0;
                            if (newUnit === 'inch') {
                              setRowGapInput(String(parseFloat((val / 25.4).toFixed(4))));
                            } else {
                              setRowGapInput(String(val));
                            }
                          }}
                          className="bg-gray-50 border-l border-gray-300 px-2.5 py-1.5 text-xs font-extrabold outline-none text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          <option value="mm">mm</option>
                          <option value="inch">inch</option>
                        </select>
                      </div>

                    </div>

                    {/* NÚT TỐI ƯU HÓA HOÀN HẢO CHO IN NHÃN CUỘN */}
                    <button
                      type="button"
                      onClick={() => {
                        const colGaps = (sheetConfig.cols - 1) * sheetConfig.colGap;
                        const sideMargin = sheetConfig.rollSideMargin !== undefined ? sheetConfig.rollSideMargin : 1;
                        const optW = (desiredRollWidth - colGaps - (sideMargin * 2)) / sheetConfig.cols;
                        
                        applyPresetDimensions(
                          Math.max(10, Math.floor(optW * 10) / 10),
                          labelConfig.height,
                          `Khớp Cuộn ${sheetConfig.cols} Tem`
                        );
                      }}
                      className="w-full py-1.5 bg-kiot-cyan hover:bg-sky-600 text-white rounded text-[11px] font-bold text-center select-none cursor-pointer transition border border-kiot-cyan flex items-center justify-center space-x-1 shadow-xs font-sans"
                      title="Tính toán kích thước Chiều rộng của tem nhãn dán tối ưu nhất dựa theo số cột tem và khoảng cách để khít với cuộn decal."
                    >
                      ⚡ <span>Khớp vừa khổ giấy</span>
                    </button>
                  </div>
                )}

                    {/* ELECTRON ACTIVE DEKTOP SETTING GAUGE */}
                    {typeof window !== 'undefined' && (window as any).electronAPI && (
                      <div className="mt-4 pt-4 border-t border-indigo-200/50 space-y-3.5 bg-indigo-50/40 p-3 rounded-xl border border-indigo-150 shadow-3xs animate-fadeIn">
                        <div className="flex items-center space-x-2">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-[11px] font-black text-indigo-950 uppercase tracking-widest leading-none">
                            Kết nối Electron (Ngoại Tuyến)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] select-none">
                          <span className="text-slate-600 font-bold">In trực tiếp bỏ qua hộp thoại</span>
                          <input
                            type="checkbox"
                            checked={useElectronDirectPrint}
                            onChange={(e) => setUseElectronDirectPrint(e.target.checked)}
                            className="w-4 h-4 text-kiot-cyan bg-gray-105 border-gray-300 rounded focus:ring-kiot-cyan"
                          />
                        </div>

                        {useElectronDirectPrint && (
                          <div className="space-y-3 text-xs">
                            {sheetConfig.mode === 'office' ? (
                              <div className="space-y-1.5">
                                <label className="block text-[10.5px] text-slate-500 font-bold">Máy in văn phòng (Silent)</label>
                                <select
                                  value={selectedElectronPrinter}
                                  onChange={(e) => setSelectedElectronPrinter(e.target.value)}
                                  className="w-full bg-white border border-gray-300 rounded-lg p-1.5 outline-none font-bold text-slate-800 focus:border-kiot-cyan text-xs"
                                >
                                  <option value="">-- Máy in mặc định OS --</option>
                                  {electronPrinters.map((p, pIdx) => (
                                    <option key={pIdx} value={p.name}>
                                      {p.name} {p.isDefault ? " (Mặc định)" : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10.5px]">
                                  <label className="block text-slate-500 font-bold">Cổng in nhiệt (Port/Share)</label>
                                  <span className="text-slate-400 font-bold">LPT1 / USB001</span>
                                </div>
                                <input
                                  type="text"
                                  value={thermalPort}
                                  onChange={(e) => setThermalPort(e.target.value)}
                                  placeholder="Ví dụ: USB001 hoặc \\localhost\Xprinter"
                                  className="w-full bg-white border border-gray-300 rounded-lg p-1.5 outline-none font-bold font-mono text-slate-800 text-xs focus:border-kiot-cyan"
                                />
                                <p className="text-[9.5px] text-slate-400 font-medium leading-normal">
                                  * Nhập <strong className="text-slate-500 font-semibold">USB001</strong> hoặc đường dẫn mạng dạng <strong className="text-slate-500 font-semibold">\\localhost\Xprinter</strong> để nạp mã ZPL offline trực tiếp.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: DESIGN & CONFIGURATION */}
            {activeSidebarTab === 'design' && (
              <>
                <div className="relative">
                  {officePreviewMode === 'sheet' && (
                    <div className="absolute -inset-1.5 bg-slate-50/75 backdrop-blur-[1px] z-30 rounded-xl cursor-not-allowed flex flex-col items-center justify-center p-4 border border-amber-200/60 shadow-md animate-fadeIn select-none">
                      <div className="bg-amber-100 text-amber-800 p-2.5 rounded-full border border-amber-200/65 shadow-xs mb-2">
                        <Lock className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="font-extrabold text-[11px] text-amber-950 uppercase tracking-widest text-center">Bàn thiết kế tạm khóa</p>
                      <p className="text-[10px] text-amber-900 text-center max-w-[210px] mt-1.5 font-medium leading-relaxed">
                        Vui lòng chuyển sang chế độ <strong>"Bàn Thiết Kế (1 Tem)"</strong> phía trên để chỉnh sửa nội dung hoặc thêm đối tượng mới!
                      </p>
                    </div>
                  )}

                  {/* BƯỚC 3 ACCORDION */}
                  <div className="space-y-1.5 animate-fadeIn mb-4">
                    <button
                      type="button"
                      onClick={() => setIsStep3Expanded(!isStep3Expanded)}
                      className={`w-full px-4 py-3 flex items-center justify-between cursor-pointer select-none group rounded-xl border transition-all duration-150 outline-none transform active:scale-[0.98] ${
                        isStep3Expanded
                          ? "bg-emerald-100 text-emerald-950 border-emerald-300 shadow-sm"
                          : "bg-emerald-50/90 text-emerald-900 border-emerald-200 hover:bg-emerald-100/60 hover:border-emerald-300 shadow-3xs"
                      }`}
                      title="Cấu hình nội dung thiết kế, thêm văn bản, mã vạch, QR, ảnh nền, watermark"
                    >
                      <div className="flex items-center space-x-2.5 font-sans">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] tracking-wide shrink-0 transition-colors border ${
                          isStep3Expanded ? "bg-emerald-600 text-white border-emerald-700" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                        }`}>
                          BƯỚC 3
                        </span>
                        <span className={`font-extrabold text-[12.5px] uppercase tracking-wider transition-colors leading-none ${
                          isStep3Expanded ? "text-emerald-950" : "text-emerald-900 group-hover:text-emerald-950"
                        }`}>
                          Thiết kế mẫu tem
                        </span>
                      </div>
                      <div className={`transition-transform duration-150 ${isStep3Expanded ? "rotate-180 text-emerald-650" : "text-emerald-500 group-hover:text-emerald-600"}`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    {isStep3Expanded && (
                      <div className="p-3 bg-white border border-slate-150 rounded-xl space-y-4 shadow-3xs">
                        {/* MODULE 2: DESIGN TOOLBOX (Add text, barcode, and QR code) */}
                        <section className="border-b border-gray-150 pt-5 pb-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h2 className="text-[12.5px] font-black text-kiot-navy uppercase tracking-wider flex items-center space-x-2 select-none">
                              <Plus className="w-3.5 h-3.5 text-kiot-cyan" />
                              <span>Thêm thông tin vào tem</span>
                            </h2>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={() => handleAddObject("text")}
                              className="group py-2 px-3.5 bg-white hover:bg-slate-50 border border-gray-200 hover:border-kiot-cyan text-kiot-charcoal hover:text-kiot-cyan text-[13px] font-extrabold rounded-lg transition duration-150 flex items-center justify-between cursor-pointer shadow-xs focus:ring-1 focus:ring-kiot-cyan focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400"
                              title="Thêm một đoạn dòng văn bản mới ở giữa nhãn"
                            >
                              <span className="flex items-center space-x-2">
                                 <FileText className="w-4 h-4 text-kiot-cyan" />
                                 <span>Văn bản</span>
                              </span>
                              <span className="p-0.5 rounded-full bg-sky-50 text-kiot-cyan border border-kiot-cyan/30 group-hover:bg-kiot-cyan group-hover:text-white transition-colors duration-150 shadow-2xs">
                                 <Plus className="w-3.5 h-3.5" strokeWidth={3.5} />
                              </span>
                            </button>

                            <button
                              onClick={() => handleAddObject("barcode")}
                              className="group py-2 px-3.5 bg-white hover:bg-slate-50 border border-gray-200 hover:border-kiot-cyan text-kiot-charcoal hover:text-kiot-cyan text-[13px] font-extrabold rounded-lg transition duration-150 flex items-center justify-between cursor-pointer shadow-xs focus:ring-1 focus:ring-kiot-cyan focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400"
                              title="Thêm một hình vẽ mã vạch chuẩn 1D ở giữa nhãn"
                            >
                              <span className="flex items-center space-x-2">
                                <Barcode className="w-4 h-4 text-emerald-500" />
                                <span>Mã vạch</span>
                              </span>
                              <span className="p-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-150 shadow-2xs">
                                <Plus className="w-3.5 h-3.5" strokeWidth={3.5} />
                              </span>
                            </button>

                            <button
                              onClick={() => handleAddObject("qrcode")}
                              className="group py-2 px-3.5 bg-white hover:bg-slate-50 border border-gray-200 hover:border-kiot-cyan text-kiot-charcoal hover:text-kiot-cyan text-[13px] font-extrabold rounded-lg transition duration-150 flex items-center justify-between cursor-pointer shadow-xs focus:ring-1 focus:ring-kiot-cyan focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400"
                              title="Thêm một hình vẽ mã QR code ở giữa nhãn"
                            >
                              <span className="flex items-center space-x-2">
                                <QrCode className="w-4 h-4 text-blue-500" />
                                <span>Mã QR</span>
                              </span>
                              <span className="p-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-500/30 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-150 shadow-2xs">
                                <Plus className="w-3.5 h-3.5" strokeWidth={3.5} />
                              </span>
                            </button>

                            <button
                              onClick={() => setShowImageImportModal(true)}
                              className="group py-2 px-3.5 bg-white hover:bg-slate-50 border border-gray-200 hover:border-kiot-cyan text-kiot-charcoal hover:text-kiot-cyan text-[13px] font-extrabold rounded-lg transition duration-150 flex items-center justify-between cursor-pointer shadow-xs focus:ring-1 focus:ring-kiot-cyan focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400"
                              title="Chèn logo, con dấu hoặc hình ảnh bất kỳ vào nhãn"
                            >
                              <span className="flex items-center space-x-2">
                                <Image className="w-4 h-4 text-rose-500" />
                                <span>Hình ảnh</span>
                              </span>
                              <span className="p-0.5 rounded-full bg-rose-50 text-rose-650 border border-rose-500/30 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-150 shadow-2xs">
                                <Plus className="w-3.5 h-3.5" strokeWidth={3.5} />
                              </span>
                            </button>

                            <button
                              onClick={() => handleAddObject("shape", "line")}
                              className="group py-2 px-3.5 bg-white hover:bg-slate-50 border border-gray-200 hover:border-kiot-cyan text-kiot-charcoal hover:text-kiot-cyan text-[13px] font-extrabold rounded-lg transition duration-150 flex items-center justify-between cursor-pointer shadow-xs focus:ring-1 focus:ring-kiot-cyan focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400"
                              title="Thêm nét kẻ ngang / dọc hoặc hình khối bất kỳ vào nhãn"
                            >
                              <span className="flex items-center space-x-2">
                                <Shapes className="w-4 h-4 text-indigo-500" />
                                <span>Đường kẻ &amp; Hình khối</span>
                              </span>
                              <span className="p-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-500/30 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-150 shadow-2xs">
                                <Plus className="w-3.5 h-3.5" strokeWidth={3.5} />
                              </span>
                            </button>
                          </div>
                        </section>

                  {/* CHẾ ĐỘ NỀN & WATERMARK */}
                  <div id="bg-config-section" className="bg-slate-50/50 rounded-xl p-3.5 transition-all duration-150 shadow-3xs space-y-3 animate-fadeIn">
                    <div className="flex items-center space-x-2">
                      <Palette className="w-4 h-4 text-kiot-cyan" />
                      <span className="font-extrabold text-[12px] text-[#1E293B] uppercase tracking-wider font-sans select-none">
                        🎨 Chế độ nền &amp; Watermark
                      </span>
                    </div>

                    <div className="space-y-3 pt-2 text-[13px] border-t border-slate-200/80">
                      {/* 1. Background Color selector */}
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-[#475569] select-none">Màu nền tem nhãn:</label>
                        <div className="flex items-center space-x-2 font-sans">
                          {/* Nút 1: Chọn màu (Mặc định là Màu trắng #ffffff) */}
                          <div className={`relative w-8 h-8 rounded-md border flex items-center justify-center transition duration-150 cursor-pointer shrink-0 ${
                            labelConfig.bgColor !== "transparent"
                              ? "border-kiot-cyan bg-kiot-cyan/5 ring-1 ring-kiot-cyan font-semibold"
                              : "border-slate-250 bg-white hover:bg-slate-100/80"
                          }`}>
                            <input
                              type="color"
                              id="bg-color-picker"
                              value={(labelConfig.bgColor && labelConfig.bgColor !== "transparent") ? labelConfig.bgColor : "#ffffff"}
                              onChange={(e) => {
                                setLabelConfig({
                                  ...labelConfig,
                                  bgColor: e.target.value
                                });
                              }}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
                              title="Chọn mã màu nền tùy ý"
                            />
                            <span 
                              className="w-5 h-5 rounded-full border border-slate-350 shrink-0 shadow-sm z-10 transition-transform duration-100 hover:scale-110"
                              style={{ backgroundColor: (labelConfig.bgColor && labelConfig.bgColor !== "transparent") ? labelConfig.bgColor : "#ffffff" }}
                            />
                          </div>

                          {/* Nút 2: Trong suốt */}
                          <button
                            type="button"
                            onClick={() => {
                              setLabelConfig({
                                ...labelConfig,
                                bgColor: "transparent"
                              });
                            }}
                            className={`w-8 h-8 rounded-md border flex items-center justify-center transition duration-150 cursor-pointer relative overflow-hidden shrink-0 ${
                              labelConfig.bgColor === "transparent"
                                ? "border-kiot-cyan bg-kiot-cyan/5 ring-1 ring-kiot-cyan"
                                : "border-slate-250 bg-white hover:bg-slate-50"
                            }`}
                            title="Nền trong suốt"
                          >
                            {/* Caro mô phỏng trong suốt */}
                            <div className="absolute inset-1.5 opacity-30 grid grid-cols-2 grid-rows-2">
                              <div className="bg-slate-400"></div>
                              <div className="bg-white"></div>
                              <div className="bg-white"></div>
                              <div className="bg-slate-400"></div>
                            </div>
                            {/* Đường gạch chéo đỏ biểu hiệu trong suốt */}
                            <div className="absolute w-[140%] h-[1.5px] bg-red-500 rotate-45 transform origin-center z-10 opacity-80" />
                          </button>
                        </div>
                      </div>

                      {/* 2. Watermark / Background Image Upload */}
                      <div className="space-y-1.5">
                        <label className="block font-bold text-[#475569] select-none">Ảnh nền hoặc Watermark:</label>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="file"
                            accept="image/*"
                            id="bg-image-uploader"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setLabelConfig({
                                      ...labelConfig,
                                      bgImage: event.target.result as string,
                                      bgImageOpacity: labelConfig.bgImageOpacity !== undefined ? labelConfig.bgImageOpacity : 0.3,
                                      bgImageSize: labelConfig.bgImageSize || "contain"
                                    });
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById("bg-image-uploader")?.click()}
                            className="flex-1 py-1.5 px-2.5 border border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-kiot-cyan rounded font-bold text-center transition flex items-center justify-center space-x-1 cursor-pointer select-none text-[12.5px]"
                          >
                            <Upload className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{labelConfig.bgImage ? "Thay ảnh nền" : "Tải ảnh nền/Watermark"}</span>
                          </button>
                          {labelConfig.bgImage && (
                            <button
                              type="button"
                              onClick={() => {
                                setLabelConfig({
                                  ...labelConfig,
                                  bgImage: undefined,
                                  bgImageOpacity: undefined,
                                  bgImageSize: undefined
                                });
                                const inp = document.getElementById("bg-image-uploader") as HTMLInputElement;
                                if (inp) inp.value = "";
                              }}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition border border-red-200 cursor-pointer animate-scaleIn"
                              title="Xóa ảnh nền/watermark"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {labelConfig.bgImage && (
                        <>
                          {/* 3. Watermark Opacity Slider */}
                          <div className="space-y-1 bg-slate-50 p-2 rounded border border-slate-100 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-500">Độ mờ ảnh (Watermark):</span>
                              <span className="font-mono text-[10px] font-bold text-slate-750 bg-slate-200 px-1.5 py-0.5 rounded leading-tight select-none">
                                {Math.round((labelConfig.bgImageOpacity !== undefined ? labelConfig.bgImageOpacity : 0.3) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0.05}
                              max={1.0}
                              step={0.05}
                              value={labelConfig.bgImageOpacity !== undefined ? labelConfig.bgImageOpacity : 0.3}
                              onChange={(e) => {
                                setLabelConfig({
                                  ...labelConfig,
                                  bgImageOpacity: parseFloat(e.target.value)
                                });
                              }}
                              className="w-full accent-kiot-cyan cursor-pointer h-1.5"
                            />
                          </div>

                          {/* 4. Background Image Fitting */}
                          <div className="flex items-center justify-between animate-fadeIn">
                            <span className="font-bold text-slate-500">Tỷ lệ tương thích:</span>
                            <div className="relative">
                              <select
                                value={labelConfig.bgImageSize || "contain"}
                                onChange={(e) => {
                                  setLabelConfig({
                                    ...labelConfig,
                                    bgImageSize: e.target.value as any
                                  });
                                }}
                                className="appearance-none pl-2.5 pr-7 py-1 bg-white border border-slate-250 rounded text-[11.5px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                              >
                                <option value="contain">Co giãn vừa (Contain)</option>
                                <option value="cover">Lấp đầy (Cover)</option>
                                <option value="repeat">Lặp lại (Repeat)</option>
                                <option value="auto">Kích thước gốc (Auto)</option>
                              </select>
                              <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PERSISTENT / COLLAPSIBLE DATA FILE INTEGRATION ("LIÊN KẾT FILE DATA") */}
                <div id="excel-section-header" className="bg-gradient-to-r from-emerald-50/80 via-emerald-50/50 to-teal-50/60 border border-emerald-200/80 rounded-lg p-3.5 transition-all duration-150 shadow-xs mb-4">
                  {/* Permanent Hidden file input to be triggered easily from both locations */}
                  <input
                    id="excel-file-uploader-direct"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />

                  <div className="flex items-center justify-between w-full">
                    {/* Collapsible toggle */}
                    <button
                      type="button"
                      onClick={() => setIsExcelExpanded(!isExcelExpanded)}
                      className="flex items-center space-x-2.5 text-left select-none group cursor-pointer flex-1 min-w-0"
                    >
                      <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-[12.5px] text-emerald-800 uppercase tracking-wider group-hover:text-emerald-950 transition-colors font-sans truncate">
                          🔗 LIÊN KẾT FILE DATA
                        </span>
                        <span className="text-[11px] text-emerald-650 font-bold select-none leading-none mt-0.5 w-max">
                          In hàng loạt (Lựa chọn)
                        </span>
                      </div>
                    </button>

                    {/* Direct Upload button or clean row count badge inside the header bar */}
                    <div className="flex items-center space-x-2 ml-2 shrink-0">
                      {!excelFileName ? (
                        <span className="text-[10.5px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded select-none">
                          Chưa liên kết
                        </span>
                      ) : (
                        <div className="flex items-center space-x-1.5 bg-emerald-650 text-white px-2 py-1 rounded shadow-inner text-[11px] font-mono font-bold select-none">
                          <span>✓ {excelData.length} dòng</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Format Notice block */}
                  <div className="mt-3 pt-3 border-t border-emerald-250/20 text-[11.5px] text-emerald-800 flex items-start space-x-1.5 shadow-2xs select-none">
                    <span className="shrink-0 bg-emerald-600 text-white font-extrabold text-[9.5px] px-1.5 py-0.5 rounded uppercase tracking-wide">
                      NOTE
                    </span>
                    <span className="leading-relaxed font-bold text-emerald-950">
                      Định dạng .xlsx, .xls. Dòng 1 chứa tiêu đề cột, dòng 2 trở đi chứa dữ liệu tem
                    </span>
                  </div>

                  {isExcelExpanded && (
                    <div className="space-y-4 text-sm bg-white border border-emerald-100 rounded-md p-3.5 mt-3 shadow-inner">
                      
                      {/* 1. EXCEL UPLOADER PORT */}
                      <section className="space-y-2.5">
                        {!excelFileName ? (
                          <div className="relative space-y-2">
                            <label 
                              htmlFor="excel-file-uploader-direct"
                              onClick={(e) => {
                                e.preventDefault();
                                triggerExcelLoadDialog('new');
                              }}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                  const fname = file.name.toLowerCase();
                                  if (fname.endsWith(".xlsx") || fname.endsWith(".xls")) {
                                    const b64Reader = new FileReader();
                                    b64Reader.onload = (b64Evt) => {
                                      try {
                                        const b64Result = b64Evt.target?.result as string;
                                        setExcelFileBase64(b64Result.split(",")[1] || b64Result);
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    };
                                    b64Reader.readAsDataURL(file);

                                    const reader = new FileReader();
                                    reader.onload = (evt) => {
                                      if (evt.target?.result) {
                                        processExcelBinary(evt.target.result as ArrayBuffer, file.name, true);
                                      }
                                    };
                                    reader.readAsArrayBuffer(file);
                                  } else {
                                    alert("Định dạng tệp không được hỗ trợ! Vui lòng chỉ kéo thả tệp Excel (.xlsx, .xls).");
                                  }
                                }
                              }}
                              className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-250/70 rounded-xl p-5 bg-slate-50/50 cursor-pointer hover:bg-emerald-50/25 hover:border-emerald-400 transition-all text-center space-y-3"
                            >
                              <div className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[12px] rounded-lg shadow-md flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] select-none active:scale-[0.98]">
                                <Upload className="w-4 h-4 text-white" />
                                <span>Upload file</span>
                              </div>
                              <div className="space-y-1 pb-1">
                                <span className="text-[13px] font-extrabold text-slate-850 block">Chọn tệp Excel từ máy</span>
                                <span className="text-[11.5px] text-slate-500 font-extrabold block">Hoặc kéo thả file vào vùng upload</span>
                              </div>
                            </label>
                            
                            {/* Download static generic sample template so they don't start empty */}
                            <div className="text-center pt-0.5">
                              <button
                                type="button"
                                onClick={handleDownloadExcelTemplate}
                                className="text-[11.5px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer transition select-none"
                              >
                                📥 Tải File Excel Mẫu để Điền Dữ Liệu
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-emerald-50 border border-emerald-250/70 rounded-lg space-y-3 shadow-2xs">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 pr-2 flex-1">
                                <p className="font-extrabold text-emerald-950 truncate text-[13px] flex items-center gap-1.5 leading-tight">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                  <span>Đã liên kết dữ liệu Excel</span>
                                </p>
                                <p className="text-[11px] text-emerald-850 truncate font-black font-mono mt-1 border-b border-emerald-200/50 pb-1.5" title={excelFileName}>{excelFileName}</p>
                                <p className="text-[11px] text-zinc-650 font-bold mt-2">
                                  Sẵn sàng in hàng loạt: <span className="text-emerald-700 font-extrabold font-mono">{excelData.length} dòng dữ liệu</span>.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleClearExcel}
                                className="p-1 hover:bg-emerald-100 text-emerald-700 hover:text-red-650 rounded transition shrink-0 cursor-pointer ml-1 animate-fadeIn"
                                title="Hủy kết nối file Excel hiện tại"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="space-y-3 pt-2.5 border-t border-emerald-150/85">
                              {/* 1. Nút Đồng bộ */}
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={handleDirectExcelSync}
                                  className="w-full text-[10.5px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-1.5 px-2.5 rounded-md inline-flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer select-none border border-emerald-700"
                                  title="Tự động đồng bộ / làm mới tất cả thông tin trực tiếp từ tệp tin mà không hiển thị lại hộp thoại thoại"
                                >
                                  <RefreshCw className="w-3 h-3 text-white animate-[spin_10s_linear_infinite]" />
                                  <span>Đồng bộ dữ liệu</span>
                                </button>
                                <p className="text-[9.5px] text-zinc-500 font-bold leading-normal pl-1.5 border-l border-emerald-400">
                                  Hệ thống tự động phát hiện, cập nhật dữ liệu ngầm và giữ nguyên liên kết.
                                </p>
                              </div>

                              {/* 2. Nút Cập nhật File mới */}
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => triggerExcelLoadDialog('new')}
                                  className="w-full text-[10.5px] bg-white hover:bg-slate-50 text-slate-800 font-bold py-1.5 px-2.5 rounded-md inline-flex items-center justify-center gap-1.5 transition-all shadow-3xs active:scale-[0.98] border border-slate-300 cursor-pointer select-none"
                                  title="Thay đổi bằng file Excel hoàn toàn mới"
                                >
                                  <Upload className="w-3 h-3 text-zinc-650" />
                                  <span>Cập nhật File mới</span>
                                </button>
                                <p className="text-[9.5px] text-zinc-500 font-bold leading-normal pl-1.5 border-l border-slate-300">
                                  Nếu chọn file khác, các liên kết tem với cột cũ sẽ bị xóa hết.
                                </p>
                              </div>

                              {/* 3. Nút Tải tệp đang liên kết */}
                              <div className="pt-2 border-t border-emerald-200/40">
                                <button
                                  type="button"
                                  onClick={handleDownloadExcelTemplate}
                                  className="w-full text-[10px] bg-emerald-100/60 hover:bg-emerald-100 text-emerald-800 font-extrabold py-1 px-2 rounded inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none border border-emerald-200/50"
                                  title="Tải tệp Excel đang chạy trong mẫu thiết kế này"
                                >
                                  <Download className="w-2.5 h-2.5 text-emerald-700" />
                                  <span>Tải tệp đang liên kết</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  )}
                </div>

                {isStep3Expanded && (
                  <div className="space-y-4">
                    {/* NÚT KHỚP VỪA VỚI NHÃN - KHÔNG TIÊU ĐỀ, KHÔNG MÔ TẢ THEO YÊU CẦU */}
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={handleFitObjectsToLabel}
                        disabled={objects.length === 0}
                        className="w-full py-2.5 bg-gradient-to-r from-kiot-cyan to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white rounded-lg text-xs font-black text-center select-none cursor-pointer transition flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        title="Tự động co giãn tất cả đối tượng vừa vặn vào khổ tem và giữ nguyên vị trí cân đối"
                      >
                        ⚡ <span>Khớp vừa với nhãn</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Sticky Bottom Actions inside sidebar */}
          {activeSidebarTab === 'design' && (
            <div className="bg-slate-50 border-t border-gray-200 shrink-0 shadow-sm flex flex-col no-print">
              {/* Accordion Toggle Header */}
              <button
                type="button"
                onClick={() => setIsPrintExpanded(!isPrintExpanded)}
                className="mx-3 mt-3 mb-2 px-4 py-3 flex items-center justify-between cursor-pointer select-none group rounded-xl shadow-md transition-all duration-150 bg-gradient-to-r from-kiot-cyan to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white scale-[1.01] hover:scale-[1.02] active:scale-[0.99] border border-sky-600/30 border-b-[3px] border-b-sky-700/80"
                title="Nhấn để thiết lập số lượng bản in và thực hiện in nhãn"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="px-2 py-0.5 rounded font-extrabold text-[10px] tracking-wide shrink-0 border bg-white/20 text-white border-white/30 group-hover:bg-white/30 transition-colors">
                    BƯỚC 4
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <Printer className="w-4 h-4 animate-pulse select-none shrink-0 text-white" />
                    <span className="font-extrabold text-[12.5px] uppercase tracking-wider font-sans text-white leading-none">
                      IN TEM
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-black border font-mono transition-colors duration-150 bg-white/20 text-white border-white/30">
                    {printQuantityMode === "constant" ? `${printCopies} bản` : 'Theo Excel'}
                  </span>
                  <div className={`transition-transform duration-150 text-white ${isPrintExpanded ? "rotate-180" : ""}`}>
                    <ChevronDown className="w-4 h-4 text-white" />
                  </div>
                </div>
              </button>

              {/* Collapsed/Expanded Content */}
              {isPrintExpanded && (
                <div className="mx-3 mb-3 p-4 space-y-3.5 bg-white border border-gray-200 rounded-xl shadow-sm animate-fadeIn">
                  <div className="space-y-2 pb-1.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider select-none">
                        CHẾ ĐỘ SỐ LƯỢNG IN
                      </label>
                    </div>

                    {/* Two options selection button layout */}
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/85">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintQuantityMode('constant');
                        }}
                        className={`px-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          printQuantityMode === 'constant'
                            ? "bg-white text-kiot-navy shadow-xs border border-gray-250 font-extrabold"
                            : "text-slate-500 hover:text-slate-800 font-semibold"
                        }`}
                      >
                        Số lượng cố định
                      </button>
                      <button
                        type="button"
                        disabled={excelData.length === 0}
                        onClick={() => {
                          setPrintQuantityMode('excel_column');
                        }}
                        className={`px-1.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-0.5 ${
                          excelData.length === 0
                            ? "opacity-55 cursor-not-allowed text-slate-400 font-semibold"
                            : printQuantityMode === 'excel_column'
                            ? "bg-white text-emerald-700 shadow-xs border border-emerald-250 font-extrabold"
                            : "text-slate-500 hover:text-slate-800 cursor-pointer font-semibold"
                        }`}
                        title={excelData.length === 0 ? "Hãy tải dữ liệu Excel trước" : "Lấy số bản in theo cột Excel"}
                      >
                        <span>SL theo file</span>
                        {excelData.length === 0 && <span className="text-[8px] bg-slate-200 text-slate-500 px-1 rounded font-bold">Khóa</span>}
                      </button>
                    </div>

                    {/* Quantity configuration elements */}
                    {printQuantityMode === 'constant' ? (
                      <div className="space-y-1 pt-1">
                        <label className="block text-[10px] text-slate-500 font-bold uppercase select-none mb-0.5">
                          Nhập số bản sao cần in:
                        </label>
                        <div className="relative">
                          <input
                            id="print-copies-input"
                            type="text"
                            value={printCopiesInput}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              setPrintCopiesInput(raw);
                            }}
                            onBlur={() => {
                              const val = parseInt(printCopiesInput, 10);
                              if (isNaN(val) || val < 1) {
                                setPrintCopies(1);
                                setPrintCopiesInput("1");
                              } else if (val > 1000) {
                                setPrintCopies(1000);
                                setPrintCopiesInput("1000");
                              } else {
                                setPrintCopies(val);
                                setPrintCopiesInput(String(val));
                              }
                            }}
                            className="w-full pl-2 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded-lg text-slate-800 font-bold font-mono focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan outline-none"
                          />
                          <span className="absolute right-2 top-2 text-[11px] text-gray-400 font-extrabold select-none">bản</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        {excelData.length > 0 ? (
                          <>
                            <label className="block text-[10px] text-slate-500 font-bold uppercase select-none mb-0.5">
                              Chọn cột số lượng từ Excel:
                            </label>
                            <select
                              value={printQuantityColumn || ""}
                              onChange={(e) => setPrintQuantityColumn(e.target.value || null)}
                              className="w-full text-xs font-extrabold font-mono py-1.5 px-2 bg-white border border-gray-300 rounded-lg text-slate-800 focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan outline-none cursor-pointer"
                            >
                              <option value="">-- Tự động in mỗi dòng 1 tem --</option>
                              {numericExcelColumns.map((col) => (
                                <option key={col} value={col}>
                                  Cột: [{col}]
                                </option>
                              ))}
                            </select>
                            {numericExcelColumns.length === 0 ? (
                              <span className="block text-[10px] text-amber-950 font-semibold leading-normal bg-amber-50 p-1.5 rounded-md border border-amber-200 mt-1">
                                ⚠️ Không tìm thấy cột số lượng phù hợp. Đảm bảo Excel chứa cột SL / Số lượng dạng số.
                              </span>
                            ) : (
                              <span className="block text-[10px] text-emerald-700 font-semibold leading-relaxed bg-emerald-50 p-1 rounded-md border border-emerald-150 mt-1">
                                {printQuantityColumn
                                  ? `In dựa vào cột: ${printQuantityColumn}. Tổng in: ${printManifest.length} bản.`
                                  : `Mỗi dòng trong Excel sẽ được in đúng 1 bản. Tổng in: ${printManifest.length} bản.`}
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="text-[10px] font-semibold text-yellow-850 bg-yellow-50 border border-yellow-250 p-1.5 rounded-md leading-normal">
                            Cần liên kết file dữ liệu trước trong tab <strong>"KHỔ TEM & GIẤY"</strong>.
                          </div>
                        )}
                      </div>
                    )}

                    {printLimitWarning && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg leading-relaxed font-semibold animate-pulse shadow-xs max-h-[140px] overflow-y-auto select-text font-sans">
                        ⚠️ <span className="font-bold">Cảnh báo an toàn:</span> {printLimitWarning}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handlePrintLabel}
                    disabled={isPreparingPrint}
                    className={`w-full py-3 rounded-xl flex items-center justify-center space-x-2 transition-all duration-150 text-xs font-black border-b-[3px] ${
                      isPreparingPrint
                        ? "bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed opacity-75 shadow-none scale-100"
                        : "bg-gradient-to-r from-kiot-cyan to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] border-sky-600"
                    }`}
                    title={isPreparingPrint ? "Đang chuẩn bị vẽ nhãn & mã vạch..." : "Gọi lệnh in nhãn dán tiêu chuẩn (Ctrl + P)"}
                  >
                    {isPreparingPrint ? (
                      <>
                        <RefreshCw className="w-4.5 h-4.5 stroke-[3] animate-spin" />
                        <span className="tracking-widest uppercase font-black font-sans">ĐANG CHUẨN BỊ IN...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4.5 h-4.5 stroke-[3]" />
                        <span className="tracking-widest uppercase font-black font-sans">IN NHÃN (CTRL + P)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick instructions in Sidebar bottom */}
          <footer className="p-2 bg-gray-50 border-t border-gray-200 text-[9.5px] text-gray-500 leading-normal flex items-start space-x-1 shrink-0">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            {activeSidebarTab === 'design' ? (
              <p className="leading-relaxed">
                Chọn đối tượng văn bản, QR, hoặc mã vạch bất kỳ. Trong Panel Thuộc Tính hiện lên bên dưới cấu hình diện tích sẽ có nút <strong>Liên kết dữ liệu Excel</strong> để lấy thông tin tự động theo cột hàng!
              </p>
            ) : (
              <p className="leading-relaxed">
                Nạp tệp Excel bán hàng, vật tư. Sau khi tải lên, tiêu đề cột (dòng 1) sẽ dùng để ánh xạ tự động vào cấu hình tem nhãn vô cùng dễ dàng.
              </p>
            )}
          </footer>
        </aside>

        {/* WORKSPACE AREA ON THE RIGHT - STRETCHABLE SPACE bg-slate-200 (Canvas wrapper is bg-gray-100) */}
        <main className="flex-1 flex flex-col bg-[#E5E7EB] relative">

          {/* EXTRA INSIDE FLOOR COLUMN FOR OBJECT PROPERTIES - FLOATING ABSOLUTE BENEATH "CHẾ ĐỘ XEM" AND CAN DESELECT WITHOUT PUSHING DESIGN STAGE */}
          {activeSidebarTab === 'design' && selectedObject && (
            <aside
              id="properties-sidebar"
              className="absolute left-0 top-[48px] bottom-0 w-[390px] bg-white border-r border-gray-200 flex flex-col no-print text-kiot-slate shadow-2xl z-20 overflow-hidden animate-fadeIn"
            >
              {/* Header Taskbar of the properties sidebar column */}
              <div className="h-[36px] border-b border-gray-200 bg-slate-50 px-3 flex items-center justify-between select-none shrink-0">
                <div className="flex items-center space-x-1.5 text-kiot-navy">
                  <span className="font-extrabold text-[11px] uppercase text-kiot-navy tracking-wider select-none shrink-0">
                    THUỘC TÍNH
                  </span>
                  {selectedIds.length > 1 ? (
                    <span className="text-[9.5px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded-md uppercase shrink-0 animate-pulse">
                      Đã chọn {selectedIds.length} phần tử (Ctrl+Click)
                    </span>
                  ) : (
                    <span className="text-[9px] bg-sky-50 text-kiot-cyan border border-kiot-cyan/20 font-extrabold px-1.5 py-0.5 rounded-md uppercase shrink-0">
                      {selectedObject.type === 'text' ? 'Văn bản' : selectedObject.type === 'barcode' ? 'Mã vạch' : selectedObject.type === 'qrcode' ? 'QR Code' : 'Hình ảnh'}
                    </span>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => handleSelectObject(null)}
                  className="p-0.5 px-2 bg-white hover:bg-slate-100 border border-gray-200 hover:border-red-300 text-slate-500 hover:text-red-600 font-extrabold text-[10px] rounded-md transition duration-150 flex items-center justify-center space-x-1 cursor-pointer shadow-xs focus:outline-none"
                  title="Đóng thuộc tính"
                >
                  <X className="w-3 h-3 stroke-[2.5]" />
                  <span>ĐÓNG</span>
                </button>
              </div>

              {/* Scrollable container for PropertiesPanel with zero-overlap padding */}
              <div className="flex-1 overflow-y-auto p-2.5 bg-white">
                <PropertiesPanel
                  selectedObject={selectedObject}
                  labelConfig={labelConfig}
                  onChangeObject={handleUpdateObject}
                  onDeleteObject={handleDeleteObject}
                  excelColumns={excelColumns}
                  onSwitchToExcelTab={() => {
                    setIsExcelExpanded(true);
                    setTimeout(() => {
                      document.getElementById("excel-section-header")?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                />
              </div>
            </aside>
          )}
          
          {/* HORIZONTAL WORKSPACE TOOLBAR - Height set to h-[48px] to perfectly match the sidebar tab headers height */}
          <section id="workspace-toolbar" className="h-[48px] bg-white border-b border-gray-200 flex items-center justify-between px-3 shrink-0 no-print shadow-xs">
            <div className="flex items-center space-x-2.5">
              
              {(sheetConfig.mode === 'office' || sheetConfig.mode === 'thermal') && (
                <div className="flex items-center bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 space-x-2 shrink-0 select-none">
                  <span className="text-[10.5px] text-gray-400 font-extrabold uppercase select-none tracking-wider">Chế độ xem</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-md border border-gray-250">
                    <button
                      type="button"
                      onClick={() => setOfficePreviewMode('design')}
                      className={`px-2 py-1 text-[11px] rounded transition-all font-black cursor-pointer ${
                        officePreviewMode === 'design'
                          ? 'bg-kiot-cyan text-white shadow-xs'
                          : 'text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      Bàn Thiết Kế (1 Tem)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfficePreviewMode('sheet')}
                      className={`px-2 py-1 text-[11px] rounded transition-all font-black cursor-pointer ${
                        officePreviewMode === 'sheet'
                          ? 'bg-kiot-cyan text-white shadow-xs'
                          : 'text-slate-550 hover:text-slate-800'
                      }`}
                    >
                      {sheetConfig.mode === 'office' 
                        ? `Xem Trang In Lưới (${sheetConfig.paperSize})` 
                        : `Xem Cuộn Tem (${sheetConfig.cols} Tem)`}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Display Zoom controls */}
              <div className="flex items-center bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 space-x-1.5 font-sans">
                <span className="text-[10.5px] text-gray-400 font-extrabold uppercase select-none tracking-wider">Zoom</span>
                <button
                  type="button"
                  onClick={() => setPixelScale(Math.max(1.6983, pixelScale - 0.84915))}
                  className="p-1 rounded hover:bg-white text-gray-500 hover:text-gray-700 transition cursor-pointer"
                  title="Thu nhỏ phôi dán"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[12px] font-mono text-center w-11 text-gray-700 font-bold">
                  {Math.round((pixelScale / 8.4915) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPixelScale(Math.min(25.4745, pixelScale + 0.84915))}
                  className="p-1 rounded hover:bg-white text-gray-500 hover:text-gray-700 transition cursor-pointer"
                  title="Phóng to phôi dán"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
            <div className="flex items-center space-x-3.5">
              {/* Undo Button */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={past.length === 0}
                className={`px-4 py-2 transition-all duration-150 rounded-lg text-[13.5px] font-bold flex items-center space-x-2 leading-none shadow-xs border ${
                  past.length === 0
                    ? "bg-gray-55 border-gray-150 text-gray-300 cursor-not-allowed font-sans"
                    : "bg-white hover:bg-slate-50 border-gray-200 hover:border-gray-300 text-slate-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] font-sans"
                }`}
                title="Hoàn tác thao tác trước (Ctrl + Z)"
              >
                <Undo2 className="w-4.5 h-4.5" />
                <span className="hidden sm:inline">Hoàn tác</span>
              </button>

              {/* Redo Button */}
              <button
                type="button"
                onClick={handleRedo}
                disabled={future.length === 0}
                className={`px-4 py-2 transition-all duration-150 rounded-lg text-[13.5px] font-bold flex items-center space-x-2 leading-none shadow-xs border ${
                  future.length === 0
                    ? "bg-gray-55 border-gray-150 text-gray-300 cursor-not-allowed font-sans"
                    : "bg-white hover:bg-slate-50 border-gray-200 hover:border-gray-300 text-slate-700 cursor-pointer hover:scale-[1.02] active:scale-[0.98] font-sans"
                }`}
                title="Làm lại thao tác vừa hoàn tác (Ctrl + Y)"
              >
                <Redo2 className="w-4.5 h-4.5" />
                <span className="hidden sm:inline">Làm lại</span>
              </button>

              {/* Blank restart canvas button */}
              <button
                onClick={handleClearCanvas}
                className="px-4 py-2 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 text-red-600 transition-all duration-150 rounded-lg text-[13.5px] font-bold flex items-center space-x-2 leading-none cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] font-sans"
                title="Xóa toàn bộ các đối tượng hiện tại để bắt đầu thiết kế mới"
              >
                <Trash2 className="w-4.5 h-4.5" />
                <span>Xóa hết</span>
              </button>
            </div>
          </section>

          {/* 3. INTERACTIVE CANVAS GRID PORTAL */}
          {showHowToUse && (
            <div className="w-full flex justify-center px-4 mt-3 select-none no-print animate-fadeIn">
              <div className="max-w-[924px] w-full p-3.5 bg-white border border-slate-200 rounded-2xl shadow-md flex flex-col space-y-2 relative font-sans animate-fadeIn">
                <button 
                  type="button" 
                  onClick={() => setShowHowToUse(false)}
                  className="absolute top-2.5 right-2.5 p-1 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                  title="Đóng bảng hướng dẫn"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                  <span className="text-[12.3px] font-black text-slate-800 uppercase tracking-widest">📌 HƯỚNG DẪN THIẾT KẾ VÀ IN TEM</span>
                  <span className="text-[10.8px] bg-sky-50 text-kiot-cyan font-black px-1.5 py-0.5 rounded uppercase border border-kiot-cyan/15">Tuần tự 4 bước</span>
                </div>

                <div className="space-y-1.5">
                  {/* DÒNG HÀNG 1: KHỔ TEM & GIẤY IN (LIÊN KẾT BƯỚC 1 & BƯỚC 2) */}
                  <div className="flex flex-col md:flex-row items-stretch border border-blue-200/90 rounded-xl bg-white overflow-hidden shadow-xs hover:shadow-sm transition-all duration-200">
                    {/* Nút KHỔ GIẤY IN - Solid Blue Left Anchor */}
                    <button
                      type="button"
                      onClick={() => setActiveSidebarTab('layout')}
                      className="w-full md:w-[130px] text-white bg-[#0070F4] hover:bg-[#0062d6] font-black py-2.5 px-2.5 flex items-center justify-center md:flex-col md:justify-center text-left md:text-center cursor-pointer transition-all active:scale-[0.99] border-0 outline-none shrink-0 rounded-t-xl md:rounded-tr-none md:rounded-l-xl rounded-b-none"
                      title="Chuyển sang tab Thiết lập Khổ tem & Giấy"
                    >
                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[#0070F4] font-black text-[10.3px] shadow-sm shrink-0 mr-2 md:mr-0 md:mb-1 ring-2 ring-white/10">1</div>
                      <div className="flex flex-col md:items-center">
                        <span className="text-[11.8px] font-black tracking-wider uppercase font-sans leading-none">KHỔ GIẤY IN</span>
                        <span className="text-[9.3px] text-sky-100 font-bold normal-case leading-none mt-0.5 md:mt-1">Thiết lập khổ</span>
                      </div>
                    </button>

                    {/* Bước 1 & Bước 2 (Không còn viền lùi vào trong, sát lề cạnh) */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 items-stretch bg-white rounded-b-xl md:rounded-bl-none md:rounded-r-xl">
                      {/* Bước 1 */}
                      <div className="py-2 px-3 flex items-start space-x-2 transition-all hover:bg-slate-50/50">
                        <span className="px-1.5 py-[1px] mt-0.5 rounded bg-sky-100 text-sky-700 font-extrabold text-[11.3px] tracking-wide shrink-0 border border-sky-200">BƯỚC 1</span>
                        <div className="text-[13.8px] leading-snug flex-1">
                          <p className="font-extrabold text-[#0F172A] mb-0.5">Thiết lập kích thước khổ tem</p>
                          <p className="text-slate-500 font-semibold text-[12.8px] leading-tight">Cấu hình cỡ nhãn thực tế (Rộng x Cao) ở cột bên trái.</p>
                        </div>
                      </div>

                      {/* Bước 2 */}
                      <div className="py-2 px-3 flex items-start space-x-2 transition-all hover:bg-slate-50/50 border-t md:border-t-0 md:border-l border-blue-100/60">
                        <span className="px-1.5 py-[1px] mt-0.5 rounded bg-indigo-100 text-[#4338CA] font-extrabold text-[11.3px] tracking-wide shrink-0 border border-indigo-200">BƯỚC 2</span>
                        <div className="text-[13.8px] leading-snug flex-1">
                          <p className="font-extrabold text-[#0F172A] mb-0.5">Thiết lập khổ giấy và máy in</p>
                          <p className="text-slate-500 font-semibold text-[12.8px] leading-tight">Chọn loại giấy lẻ hoặc A4/A5 và căn lề giấy phù hợp.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DÒNG HÀNG 2: THIẾT KẾ & IN TEM (LIÊN KẾT BƯỚC 3 & BƯỚC 4) */}
                  <div className="flex flex-col md:flex-row items-stretch border border-emerald-200/90 rounded-xl bg-white overflow-hidden shadow-xs hover:shadow-sm transition-all duration-200">
                    {/* Nút THIẾT KẾ TEM - Solid Emerald Left Anchor */}
                    <button
                      type="button"
                      onClick={() => setActiveSidebarTab('design')}
                      className="w-full md:w-[130px] text-white bg-[#00B63E] hover:bg-[#009e35] font-black py-2 px-2.5 flex items-center justify-center md:flex-col md:justify-center text-left md:text-center cursor-pointer transition-all active:scale-[0.99] border-0 outline-none shrink-0 rounded-t-xl md:rounded-tr-none md:rounded-l-xl rounded-b-none"
                      title="Chuyển sang tab Thiết kế tem"
                    >
                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[#00B63E] font-black text-[10.3px] shadow-sm shrink-0 mr-2 md:mr-0 md:mb-1 ring-2 ring-white/10">2</div>
                      <div className="flex flex-col md:items-center">
                        <span className="text-[11.8px] font-black tracking-wider uppercase font-sans leading-none">THIẾT KẾ TEM</span>
                        <span className="text-[9.3px] text-emerald-100 font-bold normal-case leading-none mt-0.5 md:mt-1 font-sans">Vẽ & chỉnh sửa</span>
                      </div>
                    </button>

                    {/* Bước 3 & Bước 4 (Không còn viền lùi vào trong, sát lề cạnh) */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 items-stretch bg-white rounded-b-xl md:rounded-bl-none md:rounded-r-xl">
                      {/* Bước 3 */}
                      <div className="py-2 px-3 flex items-start space-x-2 transition-all hover:bg-slate-50/50">
                        <span className="px-1.5 py-[1px] mt-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[11.3px] tracking-wide shrink-0 border border-emerald-200">BƯỚC 3</span>
                        <div className="text-[13.8px] leading-snug flex-1">
                          <p className="font-extrabold text-[#0F172A] mb-0.5">Thiết kế mẫu tem</p>
                          <p className="text-slate-500 font-semibold text-[12.8px] leading-tight">Thêm nội dung, mã vạch, QR. Nhấp chọn để chỉnh tọa độ.</p>
                        </div>
                      </div>

                      {/* Bước 4 */}
                      <div className="py-2 px-3 flex items-start space-x-2 transition-all hover:bg-slate-50/50 border-t md:border-t-0 md:border-l border-emerald-100/60">
                        <span className="px-1.5 py-[1px] mt-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[11.3px] tracking-wide shrink-0 border border-amber-200">BƯỚC 4</span>
                        <div className="text-[13.8px] leading-snug flex-1">
                          <p className="font-extrabold text-[#0F172A] mb-0.5">In nhãn tem</p>
                          <p className="text-slate-500 font-semibold text-[12.8px] leading-tight font-sans">Chọn số lượng in và bấm <strong className="text-slate-700">IN TEM</strong> hoặc <strong className="text-slate-700">Ctrl+P</strong> ở góc trái.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <LabelCanvas
            labelConfig={labelConfig}
            objects={displayObjects}
            selectedId={selectedId}
            selectedIds={selectedIds}
            pixelScale={pixelScale}
            gridSnapSize={gridSnapSize}
            onSelectObject={(id) => handleSelectObject(id, false)}
            onSelectObjectWithModifier={handleSelectObject}
            onSelectMultipleObjects={(ids) => {
              setSelectedIds(ids);
              if (ids.length > 0) {
                setSelectedId(ids[ids.length - 1]);
              } else {
                setSelectedId(null);
              }
            }}
            onUpdateObjectCoordinates={handleUpdateCoordinates}
            onUpdateMultipleObjectsCoordinates={handleUpdateMultipleObjectsCoordinates}
            onUpdateObjectGeometry={handleUpdateGeometry}
            onDeleteObject={handleDeleteObject}
            isBatchPrinting={isBatchPrinting}
            excelData={excelData}
            resolveDynamicObjects={resolveDynamicObjectsForCell}
            sheetConfig={sheetConfig}
            officePreviewMode={officePreviewMode}
            printCopies={printCopies}
            printManifestLength={printManifest.length}
            isSystemPrinting={isSystemPrinting}
            onAddImageObject={(base64) => handleAddObject("image", base64)}
            onUpdateObject={handleUpdateObject}
            currentFilePath={currentFilePath}
            currentLocalStorageKey={currentLocalStorageKey}
            saveLogs={saveLogs}
            onUpdateGridSnapSize={setGridSnapSize}
            showHowToUse={showHowToUse}
            onToggleHowToUse={() => setShowHowToUse(!showHowToUse)}
            onQuickPrint={() => {
              setActiveSidebarTab('design');
              setIsPrintExpanded(true);
              // Wait a split second to transition tabs and open accordion, then focus/scroll to the accordion component
              setTimeout(() => {
                const step4Btn = document.querySelector('[title*="bản in và thực hiện in nhãn"]');
                if (step4Btn) {
                  step4Btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 150);
            }}
            printQuantityMode={printQuantityMode}
            onUpdatePrintQuantityMode={setPrintQuantityMode}
            printQuantityColumn={printQuantityColumn}
            onUpdatePrintQuantityColumn={setPrintQuantityColumn}
            numericExcelColumns={numericExcelColumns}
            onUpdatePrintCopies={setPrintCopies}
            onPrintLabel={handlePrintLabel}
            isPreparingPrint={isPreparingPrint}
          />

        </main>
      </div>

      {/* 4. IFRAME PRINT PROTECTOR AND ASSISTANT MODAL (High Density Aesthetics) */}
      {showPrintModal && (
        <div id="print-guide-backdrop" className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print animate-fade-in">
          <div 
            id="print-guide-modal" 
            className="bg-white border border-gray-200 shadow-2xl rounded-xl max-w-md w-full overflow-hidden text-slate-800 p-6 flex flex-col space-y-5 animate-scale-up"
          >
            {/* Modal Header */}
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900 leading-tight">Hướng Dẫn In Nhãn Nhiệt Chính Xác</h3>
                <p className="text-xs text-slate-500">Mở ứng dụng rộng để được liên kết trực tiếp tới trình duyệt ẩn.</p>
              </div>
            </div>

            {/* Modal Body / Explanation */}
            <div className="bg-amber-50/70 border border-amber-200/50 rounded-lg p-3 text-xs text-amber-900 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Hạn Chế Của Trình Duyệt Web (Sandbox Iframe)</p>
                <p className="leading-normal text-[11px] text-amber-950">
                  Bạn đang chạy ứng dụng trong màn hình Xem trước (Iframe) của Google AI Studio. Trình duyệt Chrome/Edge chặn lệnh in từ bên trong khung con này để bảo mật.
                </p>
              </div>
            </div>

            <div className="text-xs text-gray-650 leading-relaxed font-normal space-y-2">
              <p>
                Để khởi chạy hộp thoại **Print Preview** của hệ điều hành Windows/macOS và in nhiệt trực tiếp ra máy in Brother/Xprinter/Zebra:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] font-medium text-slate-700">
                <li>Bấm vào nút **Mở Tab Mới** bên dưới</li>
                <li>Ứng dụng sẽ hoạt động tại 1 tab độc lập đầy đủ chức năng</li>
                <li>Trình duyệt hỗ trợ gọi hộp thoại in dán ngay lập tức!</li>
              </ol>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-1 border-t border-gray-150">
              {/* RECOMMENDED ACT: Open direct tab */}
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPrintModal(false)}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm hover:shadow-md transition text-center text-xs tracking-wider uppercase cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Trong Tab Mới Để In (Khuyên Dùng)</span>
              </a>

              {/* Best effort try now */}
              <button
                type="button"
                disabled={isPreparingPrint}
                onClick={() => {
                  setShowPrintModal(false);
                  setIsPreparingPrint(true);
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      setTimeout(() => {
                        window.focus();
                        window.print();
                        setTimeout(() => {
                          setIsPreparingPrint(false);
                        }, 800);
                      }, 500);
                    });
                  });
                }}
                className={`w-full py-2 border rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  isPreparingPrint
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : "border-gray-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                }`}
              >
                {isPreparingPrint ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang chuẩn bị vẽ nhãn...</span>
                  </>
                ) : (
                  <span>Xem trước & In trực tiếp tại đây</span>
                )}
              </button>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="py-1 px-3 border border-transparent rounded hover:bg-slate-100 text-slate-500 text-[11px] font-semibold transition cursor-pointer"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {showImageImportModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print animate-fade-in">
          <div className="bg-white border border-gray-200 shadow-2xl rounded-xl max-w-lg w-full overflow-hidden text-slate-800 p-6 flex flex-col space-y-4 animate-scale-up">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                  <Image className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">Chèn Hình Ảnh Vào Nhãn Dán</h3>
                  <p className="text-[10.5px] text-slate-500 font-medium">Hỗ trợ tải lên logo, con dấu tròn, ký hiệu, ảnh sản phẩm...</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowImageImportModal(false);
                  setImportError("");
                }}
                className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-[11px] rounded-lg font-medium flex items-center space-x-2 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Drag & Drop Zone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">Cách 1: Tải lên từ máy tính (Khuyên dùng - Hoạt động Offline)</label>
              <div 
                className="border-2 border-dashed border-gray-200 hover:border-kiot-cyan bg-gray-50/50 hover:bg-sky-50/5 rounded-xl p-5 text-center transition duration-150 cursor-pointer relative"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          handleAddObject("image", event.target.result as string);
                          setShowImageImportModal(false);
                          setImportError("");
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        handleAddObject("image", event.target.result as string);
                        setShowImageImportModal(false);
                        setImportError("");
                      }
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setImportError("Tệp tin thả vào không đúng định dạng hình ảnh!");
                  }
                }}
              >
                <div className="flex flex-col items-center justify-center space-y-2 select-none">
                  <Upload className="w-7 h-7 text-gray-400 active:text-kiot-cyan inline-block shrink-0" />
                  <p className="text-xs font-bold text-gray-700">Kéo thả file hình ảnh vào đây hoặc click để chọn</p>
                  <p className="text-[10px] text-gray-405">Hỗ trợ các tệp: JPEG, PNG, JPG, SVG, WebP, GIF...</p>
                </div>
              </div>
            </div>

            {/* Google Drive Link Option */}
            <div className="space-y-2 border-t border-gray-150 pt-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">Cách 2: Chèn ảnh từ Google Drive</label>
              
              <div className="flex items-center space-x-1.5">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={driveUrlInput}
                    onChange={(e) => setDriveUrlInput(e.target.value)}
                    placeholder="Dán link chia sẻ Google Drive (Bất kỳ ai có liên kết...)"
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan/50 bg-white"
                  />
                  <Link className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!driveUrlInput.trim()) {
                      setImportError("Vui lòng nhập đường dẫn chia sẻ từ Google Drive!");
                      return;
                    }
                    // Extract ID and convert 
                    let match = driveUrlInput.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                    let fileId = "";
                    if (match && match[1]) {
                      fileId = match[1];
                    } else {
                      match = driveUrlInput.match(/id=([a-zA-Z0-9_-]+)/);
                      if (match && match[1]) {
                        fileId = match[1];
                      }
                    }

                    if (!fileId) {
                      setImportError("Đường dẫn Google Drive không hợp lệ hoặc thiếu File ID!");
                      return;
                    }

                    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
                    handleAddObject("image", directUrl);
                    setDriveUrlInput("");
                    setShowImageImportModal(false);
                    setImportError("");
                  }}
                  className="px-4 py-1.5 bg-kiot-cyan hover:bg-sky-600 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
              <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2.5 text-[10px] text-blue-900 leading-relaxed select-none">
                <strong>📝 Hướng dẫn:</strong> Trên Google Drive của bạn, click chuột phải vào ảnh ➡️ Chọn <strong>Chia sẻ (Share)</strong> ➡️ Chuyển quyền truy cập chung thành <strong>Bất kỳ ai có liên kết (Anyone with link)</strong> ➡️ Nhấp <strong>Sao chép liên kết</strong> rồi dán vào ô trên.
              </div>
            </div>

            {/* Custom Web Image Link */}
            <div className="space-y-2 border-t border-gray-150 pt-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">Cách 3: Chèn đường dẫn ảnh trực tuyến công khai (Web URL)</label>
              <div className="flex items-center space-x-1.5">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={webUrlInput}
                    onChange={(e) => setWebUrlInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan/50 bg-white"
                  />
                  <Link className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!webUrlInput.trim()) {
                      setImportError("Vui lòng nhập đường dẫn hình ảnh!");
                      return;
                    }
                    if (!webUrlInput.startsWith("http://") && !webUrlInput.startsWith("https://")) {
                      setImportError("Đường dẫn ảnh trực tuyến phải bắt đầu bằng http:// hoặc https://");
                      return;
                    }
                    handleAddObject("image", webUrlInput);
                    setWebUrlInput("");
                    setShowImageImportModal(false);
                    setImportError("");
                  }}
                  className="px-4 py-1.5 bg-kiot-cyan hover:bg-sky-600 text-white text-xs font-bold rounded-lg transition shrink-0 cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 no-print animate-fadeIn text-slate-800">
          <div className="bg-white border border-slate-100 shadow-2xl rounded-2xl max-w-sm w-full p-5 flex flex-col space-y-4 animate-scaleUp">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[14px] text-slate-800 leading-tight">Lưu mẫu thiết kế</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Chọn phương thức và đặt tên để lưu trữ</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveLocation(null);
                }}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Destination Selection */}
            <div className="space-y-2">
              <label className="block text-[10.5px] font-extrabold text-slate-450 uppercase tracking-wider">
                1. Chọn nơi lưu trữ thiết kế:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Local Storage Option */}
                <button
                  type="button"
                  onClick={() => setSaveLocation('local')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-start space-y-2 group ${
                    saveLocation === 'local'
                      ? 'border-kiot-green bg-emerald-50/50 ring-2 ring-kiot-green/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${saveLocation === 'local' ? 'bg-kiot-green text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'} transition-colors`}>
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11.5px] font-extrabold text-slate-800">Bộ nhớ duyệt web</h4>
                    <p className="text-[9.5px] text-slate-455 font-medium leading-normal mt-0.5">Lưu trữ cục bộ, an toàn trên trình duyệt máy bạn</p>
                  </div>
                </button>

                {/* Device Option */}
                <button
                  type="button"
                  onClick={() => setSaveLocation('device')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-start space-y-2 group ${
                    saveLocation === 'device'
                      ? 'border-kiot-green bg-emerald-50/50 ring-2 ring-kiot-green/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${saveLocation === 'device' ? 'bg-kiot-green text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'} transition-colors`}>
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[11.5px] font-extrabold text-slate-800">Bộ nhớ thiết bị</h4>
                    <p className="text-[9.5px] text-slate-455 font-medium leading-normal mt-0.5">Tải file cấu hình offline (.kvl) về ổ cứng</p>
                  </div>
                </button>
              </div>

              {saveLocation === 'device' && typeof window !== 'undefined' && window.self !== window.top && (
                <div className="mt-3 p-2.5 bg-amber-50 rounded-lg text-[10px] text-amber-800 leading-relaxed border border-amber-200/50 animate-fadeIn">
                  💡 <strong>Giới hạn của Iframe:</strong> Trình duyệt chặn quyền ghi đè trực tiếp file khi trang web nằm trong khung xem thử của AI Studio. Hệ thống sẽ tự động tải file xuống qua trình duyệt. Để mở khóa tính năng <strong>tự động lưu đè trực tiếp (Ctrl + S)</strong>, bạn chỉ cần click nút <strong>"Mở tab mới"</strong> ở góc trên bên phải màn hình để chạy ứng dụng độc lập.
                </div>
              )}
            </div>

            {/* Step 2: Form Settings (Visible only when a destination is chosen) */}
            {saveLocation && (
              <div className="space-y-3.5 pt-3.5 border-t border-dashed border-slate-150 animate-fadeIn">
                {/* Section title */}
                <span className="block text-[10.5px] font-extrabold text-slate-450 uppercase tracking-wider">
                  2. Cấu hình chi tiết:
                </span>

                {/* Name Input */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Tên mẫu nhãn dán:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Tem Giá Rẻ, Nhãn Vận Đơn..."
                    value={saveTemplateName}
                    onChange={(e) => setSaveTemplateName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:border-kiot-green focus:ring-1 focus:ring-kiot-green focus:outline-none font-bold text-slate-800 text-xs"
                  />
                </div>

                {/* Footer confirm/save action */}
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveDialog(false);
                      setSaveLocation(null);
                    }}
                    className="flex-1 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-500 transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const finalName = saveTemplateName.trim() || `Bản vẽ ${new Date().toLocaleDateString("vi-VN")}`;
                      if (saveLocation === 'local') {
                        handleSaveToLocalStorage(finalName);
                        setCustomSaveName(finalName); // update state in header
                        setShowSaveDialog(false);
                        setSaveLocation(null);
                      } else if (saveLocation === 'device') {
                        // Pass onSuccess callback to close only when the file select action actually finishes
                        setCustomSaveName(finalName); // update state in header first
                        handleExportToFile(finalName, 'kvl', () => {
                          setShowSaveDialog(false);
                          setSaveLocation(null);
                        });
                      }
                    }}
                    className="flex-1 py-1.5 bg-kiot-green hover:bg-emerald-600 text-white rounded-lg text-xs font-extrabold uppercase transition cursor-pointer shadow-md flex items-center justify-center space-x-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Xác nhận Lưu</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
