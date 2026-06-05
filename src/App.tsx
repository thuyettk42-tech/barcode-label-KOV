/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { LabelConfig, LabelObject, ObjectType, SheetLayoutConfig } from "./types";
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
  Laptop
} from "lucide-react";

export default function App() {
  // 1. Core state for current active label
  const [labelConfig, setLabelConfig] = useState<LabelConfig>({
    width: 70,
    height: 45,
    name: "Tem Kệ Siêu Thị Mặc Định"
  });

  // State to manage showing the quick instructions pop up
  const [showHowToUse, setShowHowToUse] = useState<boolean>(true);

  // 2. Active list of objects placed on the label canvas
  const [objects, setObjects] = useState<LabelObject[]>([
    {
      id: "init-text-1",
      type: "text",
      x: 3,
      y: 4,
      width: 64,
      height: 5,
      content: "CỬA HÀNG ĐIỆN TỬ VIỆT NAM",
      fontSize: 9,
      fontWeight: "bold",
      textAlign: "center"
    },
    {
      id: "init-barcode-1",
      type: "barcode",
      x: 3,
      y: 11,
      width: 42,
      height: 18,
      content: "VND-2026-06",
      barcodeFormat: "CODE128",
      displayValue: true,
      barcodeWidth: 1.4,
      barcodeHeight: 11
    },
    {
      id: "init-text-2",
      type: "text",
      x: 3,
      y: 34,
      width: 64,
      height: 5,
      content: "Hotline: 1900 1234 - Địa chỉ: Hà Nội",
      fontSize: 7.5,
      textAlign: "center"
    },
    {
      id: "init-qrcode-1",
      type: "qrcode",
      x: 48,
      y: 11,
      width: 19,
      height: 19,
      content: "https://create-barcode-label.vercel.app/"
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

  // 4. Utility display settings
  const [pixelScale, setPixelScale] = useState<number>(7.07625); // standard pixels per mm (8.325 * 0.85 = 7.07625)
  const [gridSnapSize, setGridSnapSize] = useState<number>(1); // 1mm snapping by default
  const [customSaveName, setCustomSaveName] = useState<string>("");
  const [savedDesigns, setSavedDesigns] = useState<Array<{ name: string; timestamp: string; config: LabelConfig; sheetConfig?: SheetLayoutConfig; objects: LabelObject[] }>>([]);
  const [showSavedList, setShowSavedList] = useState<boolean>(false);

  // States for the custom Save Dialog Modal
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [saveLocation, setSaveLocation] = useState<'local' | 'device' | null>(null);
  const [saveTemplateName, setSaveTemplateName] = useState<string>("");
  const [saveFileFormat, setSaveFileFormat] = useState<'ktl' | 'json'>('ktl');

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
    cols: 3,
    rowGap: 2,
    colGap: 2,
    showBorder: true,
    borderWidth: 1,
    borderRadius: 2
  });
  const [officePreviewMode, setOfficePreviewMode] = useState<'design' | 'sheet'>('design');
  const [wasDesignModeForPrint, setWasDesignModeForPrint] = useState<boolean>(false);
  const [isSystemPrinting, setIsSystemPrinting] = useState<boolean>(false);
  // Google auth configurations removed for offline usage

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

  const [desiredRollWidth, setDesiredRollWidth] = useState<number>(75);
  const [isQuickSizeOpen, setIsQuickSizeOpen] = useState<boolean>(false);
  const [printCopies, setPrintCopies] = useState<number>(24);
  const [printCopiesInput, setPrintCopiesInput] = useState<string>("24");
  const [printQuantityMode, setPrintQuantityMode] = useState<'constant' | 'excel_column'>('constant');
  const [printQuantityColumn, setPrintQuantityColumn] = useState<string>("");
  const [isBatchPrinting, setIsBatchPrinting] = useState<boolean>(false);
  const [colGapUnit, setColGapUnit] = useState<'mm' | 'inch'>('mm');
  const [rowGapUnit, setRowGapUnit] = useState<'mm' | 'inch'>('mm');
  const [colGapInput, setColGapInput] = useState<string>("");
  const [rowGapInput, setRowGapInput] = useState<string>("");

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

  // Parse Excel file upload with XLSX (SheetJS)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        
        if (rawData.length < 1) {
          alert("Tệp Excel rỗng hoặc không chứa bảng dữ liệu!");
          return;
        }

        // Header row (first row of Excel file)
        const headers = (rawData[0] as any[]).map(h => String(h || "").trim()).filter(h => h !== "");
        
        if (headers.length === 0) {
          alert("Không tìm thấy tiêu đề cột hợp lệ nào ở dòng thứ nhất!");
          return;
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
          return;
        }

        setExcelColumns(headers);
        setExcelData(items);
        setPrintCopies(1);
        setCurrentExcelRowIndex(0);
        setIsExcelExpanded(true);
        setTimeout(() => {
          document.getElementById("excel-section-header")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (err) {
        console.error("XLSX parse error: ", err);
        alert("Nạp tệp Excel thất bại. Vui lòng kiểm tra lại định dạng tệp .xlsx hoặc .xls.");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input target value so the same file can be structural re-uploaded
    e.target.value = "";
  };

  const handleClearExcel = () => {
    setExcelData([]);
    setExcelColumns([]);
    setCurrentExcelRowIndex(0);
    setExcelFileName("");
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
  const printManifest = useMemo(() => {
    if (!excelData || excelData.length === 0) {
      return [];
    }
    const manifest: number[] = [];
    if (printQuantityMode === "excel_column" && printQuantityColumn) {
      for (let idx = 0; idx < excelData.length; idx++) {
        const row = excelData[idx];
        const rawVal = row[printQuantityColumn];
        let qty = 1; // standard default is 1 if empty or invalid
        if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
          const cleaned = String(rawVal).trim().replace(/,/g, '');
          const parsed = parseInt(cleaned, 10);
          if (!isNaN(parsed) && parsed > 0) {
            qty = Math.min(parsed, 1000); // Safeguard: Cap single row quantity to 1000 to prevent crash
          } else {
            qty = 1;
          }
        } else {
          qty = 1;
        }
        for (let i = 0; i < qty; i++) {
          if (manifest.length >= 10000) {
            break; // Safeguard: limit total labels generated in a single manifest to 10000
          }
          manifest.push(idx);
        }
        if (manifest.length >= 10000) {
          break; // Stop completely if limit reached
        }
      }
    } else {
      const copies = Math.min(Math.max(1, printCopies), 1000); // Safeguard copies to max 1000
      for (let idx = 0; idx < excelData.length; idx++) {
        for (let i = 0; i < copies; i++) {
          if (manifest.length >= 10000) {
            break; // Safeguard: limit total labels generated in a single manifest to 10000
          }
          manifest.push(idx);
        }
        if (manifest.length >= 10000) {
          break;
        }
      }
    }
    return manifest;
  }, [excelData, printQuantityMode, printQuantityColumn, printCopies]);

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
        root.style.setProperty("--cell-border", `${sheetConfig.borderWidth}px solid rgba(156, 163, 175, 0.6)`);
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
    setSelectedId(null);
    
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

    // Centering calculations boundary-clipped
    const rawX = (labelConfig.width - w) / 2;
    const rawY = (labelConfig.height - h) / 2;
    const cleanX = Math.round(Math.max(2, rawX) * 10) / 10;
    const cleanY = Math.round(Math.max(2, rawY) * 10) / 10;

    if (type === "text") {
      newObject = {
        id: timestampId,
        type: "text",
        x: cleanX,
        y: cleanY,
        width: w,
        height: h,
        content: customContent || "NỘI DUNG VĂN BẢN MỚI",
        fontSize: 11, // Default font size is 11 pt
        fontWeight: "normal",
        textAlign: "center"
      };
    } else if (type === "barcode") {
      newObject = {
        id: timestampId,
        type: "barcode",
        x: cleanX,
        y: cleanY,
        width: w,
        height: h,
        content: customContent || "SP-2026-A1",
        barcodeFormat: "CODE128",
        displayValue: true,
        barcodeWidth: 1.5,
        barcodeHeight: 15
      };
    } else if (type === "qrcode") {
      newObject = {
        id: timestampId,
        type: "qrcode",
        x: cleanX,
        y: cleanY,
        width: w,
        height: h,
        content: customContent || "https://vi.wikipedia.org"
      };
    } else {
      // type === "image"
      newObject = {
        id: timestampId,
        type: "image",
        x: cleanX,
        y: cleanY,
        width: w,
        height: h,
        content: customContent || `data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="none" stroke="%234f46e5" stroke-dasharray="3 3" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
        imageFit: "contain",
        imageOpacity: 1
      };
    }

    setObjectsWithHistory([...objects, newObject]);
    setSelectedId(timestampId);
  };

  // Handle single object attribute updates in Properties Panel
  const handleUpdateObject = (updated: LabelObject) => {
    setObjectsWithHistory(objects.map((obj) => (obj.id === updated.id ? updated : obj)));
  };

  // Drag and update coordinates
  const handleUpdateCoordinates = (id: string, x: number, y: number) => {
    setObjectsWithHistory(
      objects.map((obj) => (obj.id === id ? { ...obj, x, y } : obj))
    );
  };

  // Update both position and dimensions (for resizing)
  const handleUpdateGeometry = (id: string, x: number, y: number, width: number, height: number) => {
    setObjectsWithHistory(
      objects.map((obj) => (obj.id === id ? { ...obj, x, y, width, height } : obj))
    );
  };

  // Delete specific object
  const handleDeleteObject = (id: string) => {
    setObjectsWithHistory(objects.filter((obj) => obj.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  // Clear everything (Start from blank, blank label canvas)
  const handleClearCanvas = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả các phần tử trên nhãn này?")) {
      setObjectsWithHistory([]);
      setSelectedId(null);
    }
  };

  // Co giãn và định vị lại tất cả các đối tượng thiết kế nằm vừa vặn với kích thước tem hiện tại
  const handleFitObjectsToLabel = () => {
    if (objects.length === 0) return;

    // 1. Calculate collective boundaries of all items in mm
    let minX = 999999;
    let minY = 999999;
    let maxX = -999999;
    let maxY = -999999;

    objects.forEach((obj) => {
      if (obj.x < minX) minX = obj.x;
      if (obj.y < minY) minY = obj.y;
      if (obj.x + obj.width > maxX) maxX = obj.x + obj.width;
      if (obj.y + obj.height > maxY) maxY = obj.y + obj.height;
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
      const relX = obj.x - minX;
      const relY = obj.y - minY;

      const newX = parseFloat((newMinX + relX * scale).toFixed(1));
      const newY = parseFloat((newMinY + relY * scale).toFixed(1));
      const newW = parseFloat((obj.width * scale).toFixed(1));
      const newH = parseFloat((obj.height * scale).toFixed(1));

      // Construct scaled object
      const updatedObj: LabelObject = {
        ...obj,
        x: newX,
        y: newY,
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

  // Save layout template in user local storage
  const handleSaveToLocalStorage = (customName?: string) => {
    const nameToSave = (customName || customSaveName).trim() || `Bản vẽ ${new Date().toLocaleDateString("vi-VN")}`;
    const newRecord = {
      name: nameToSave,
      timestamp: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
      config: labelConfig,
      sheetConfig,
      objects
    };

    const duplicateFiltered = savedDesigns.filter((d) => d.name !== nameToSave);
    const updated = [newRecord, ...duplicateFiltered].slice(0, 20); // Store up to 20 designs max

    localStorage.setItem("barcode_designer_saved_v1", JSON.stringify(updated));
    setSavedDesigns(updated);
    setCustomSaveName(nameToSave);
    alert(`Đã lưu thiết kế "${nameToSave}" thành công vào bộ nhớ trình duyệt!`);
  };

  // Load previous design from local storage
  const handleLoadSavedDesign = (saved: typeof savedDesigns[0] & { sheetConfig?: SheetLayoutConfig }) => {
    setLabelConfig(saved.config);
    setObjects(saved.objects);
    if (saved.sheetConfig) {
      setSheetConfig(saved.sheetConfig);
    }
    setSelectedId(null);
    setShowSavedList(false);
  };

  // Export current design to a lightweight offline file (.ktl or .json)
  const handleExportToFile = (customName?: string, format: 'ktl' | 'json' = 'ktl') => {
    const nameToSave = (customName || customSaveName).trim() || labelConfig.name || "tem_thiet_ke";
    const exportData = {
      version: "2.4",
      name: nameToSave,
      timestamp: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN"),
      labelConfig,
      sheetConfig,
      objects
    };

    try {
      const jsonStr = JSON.stringify(exportData);
      let fileContent = jsonStr;
      let filename = `${nameToSave.toLowerCase().replace(/[^a-z0-9_\-]/g, "_")}.json`;
      let mimeType = "application/json;charset=utf-8";

      if (format === 'ktl') {
        fileContent = btoa(unescape(encodeURIComponent(jsonStr)));
        filename = `${nameToSave.toLowerCase().replace(/[^a-z0-9_\-]/g, "_")}.ktl`;
        mimeType = "text/plain;charset=utf-8";
      }
      
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Lỗi khi kết xuất file: " + err.message);
    }
  };

  // Import design from file (.ktl or .json)
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
            throw new Error("Định dạng file không hợp lệ. Vui lòng nạp file .ktl (Base64) hoặc .json chính xác.");
          }
        }

        if (parsedData && parsedData.labelConfig && parsedData.objects) {
          setLabelConfig(parsedData.labelConfig);
          setObjects(parsedData.objects);
          if (parsedData.sheetConfig) {
            setSheetConfig(parsedData.sheetConfig);
          }
          setSelectedId(null);
          alert(`Đã nạp thành công thiết kế "${parsedData.name || "Mẫu nhập"}" gồm ${parsedData.objects.length} phần tử và toàn bộ cài đặt khổ giấy!`);
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

  // Load preset template
  const handleSelectTemplate = (config: LabelConfig, templateObjects: LabelObject[]) => {
    setLabelConfig(config);
    setObjects(templateObjects);
    setSelectedId(null);
  };

  // Synchronise global hotkey intercept for Ctrl+P / Cmd+P
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditingInput = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        activeEl.tagName === "SELECT"
      );

      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handlePrintLabel();
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
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [objects, labelConfig, selectedId, handleUndo, handleRedo]);

  // Print execution call triggers standard printer dialog
  const handlePrintLabel = () => {
    setSelectedId(null); // Deselect so focused outline does not print
    setIsSystemPrinting(true); // Temporarily bypass UI preview limits to paint the full grid in DOM
    
    const wasDesign = officePreviewMode === 'design';
    if (wasDesign) {
      setOfficePreviewMode('sheet');
      setWasDesignModeForPrint(true);
    }

    // Give browser/React robust time (350ms) to compile the full multi-page grid inside the DOM before layout rendering
    setTimeout(() => {
      // Check if running inside iframe
      const isInIframe = window.self !== window.top;
      if (isInIframe) {
        setShowPrintModal(true);
      } else {
        window.focus();
        window.print();
      }
    }, 350);
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
      <header id="app-header" className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-3 shrink-0 z-40 no-print text-kiot-navy shadow-sm">
        <div className="flex items-center space-x-3">
          <img 
            src="https://logo.kiotviet.vn/KiotViet-Logo-Horizontal.svg" 
            alt="KiotViet Logo" 
            className="h-8 object-contain" 
            referrerPolicy="no-referrer" 
          />
          <div className="h-7 w-px bg-gray-250" />
          <div>
            <h1 className="text-[17px] font-extrabold tracking-tight text-kiot-navy flex items-center space-x-1.5 leading-none">
              <span className="text-kiot-cyan">LabelPro</span>
              <span className="text-kiot-green">Designer</span>
              <span className="text-[10px] font-mono font-bold text-white bg-kiot-green px-1.5 py-0.5 rounded-full shadow-sm">V2.4</span>
            </h1>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Hệ thống tạo & in tem nhãn liên kết dữ liệu hàng loạt</p>
          </div>
        </div>

        {/* TOP QUICK DESIGNS BUTTONS */}
        <div className="flex items-center space-x-2">
          {/* Preset Template Selector */}
          <div className="relative group">
            <button
              className="h-7 px-2.5 rounded bg-white hover:bg-amber-50 text-[11px] font-bold text-amber-750 tracking-wide flex items-center space-x-1.5 border border-amber-200 hover:border-amber-450 transition cursor-pointer shadow-xs"
              title="Chọn mẫu thiết kế ứng dụng có sẵn"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-550 shrink-0" />
              <span>Chọn Mẫu có sẵn</span>
              <span className="text-[9px] bg-amber-50 text-amber-800 px-1 rounded font-mono">Preset</span>
            </button>
            <div className="absolute right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-2xl p-3 text-slate-800 hidden group-hover:block hover:block z-50 text-left">
              <TemplateSelector onSelectTemplate={handleSelectTemplate} />
            </div>
          </div>

          {/* Load layouts storage */}
          <div className="relative border-r border-gray-150 pr-2">
            <button
              onClick={() => setShowSavedList(!showSavedList)}
              className="h-7 px-2.5 rounded bg-white hover:bg-emerald-50 text-[11px] font-bold text-emerald-700 tracking-wide flex items-center space-x-1.5 border border-emerald-200 hover:border-emerald-400 transition cursor-pointer shadow-xs"
              title="Danh sách thiết kế của bạn đã lưu"
            >
              <FolderHeart className="w-3.5 h-3.5 text-rose-500" />
              <span>Mẫu đã lưu ({savedDesigns.length})</span>
            </button>
            
            {showSavedList && (
              <div className="absolute right-0 mt-2 w-76 bg-white text-slate-800 rounded-lg shadow-2xl border border-gray-200/80 p-2.5 z-50 text-left max-h-[300px] overflow-y-auto animate-fadeIn">
                <h4 className="font-extrabold text-[11px] pb-2 border-b border-gray-150 text-kiot-navy uppercase tracking-wider flex items-center space-x-1.5">
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
              onClick={() => {
                setSaveTemplateName(customSaveName || labelConfig.name || "");
                setSaveLocation(null);
                setShowSaveDialog(true);
              }}
              className="h-7 px-3 bg-kiot-green hover:bg-emerald-600 text-white transition rounded-md text-[11px] font-extrabold uppercase flex items-center space-x-1 cursor-pointer shadow-md shadow-kiot-green/10 shrink-0"
              title="Lưu trữ thiết kế này (Cục bộ hoặc Thiết bị)"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>Lưu thiết kế</span>
            </button>
          </div>

          {/* Offline Import File Group (Export button removed per request) */}
          <div className="flex items-center space-x-1 border-l border-gray-150 pl-2">
            <label
              className="h-7 px-2.5 rounded bg-white hover:bg-indigo-50 text-[11px] font-bold text-indigo-750 tracking-wide flex items-center space-x-1 border border-indigo-200 hover:border-indigo-400 transition cursor-pointer shadow-xs shrink-0"
              title="Nhập thiết kế và cấu hình khổ giấy từ tệp offline (.ktl hoặc .json)"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-550 shrink-0" />
              <span>Nhập File</span>
              <input
                type="file"
                accept=".ktl,.json,.labelpro"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Quick instructions toggle */}
          <div className="flex items-center space-x-1 border-l border-gray-150 pl-2 font-sans">
            <button
              type="button"
              onClick={() => setShowHowToUse(true)}
              className="h-7 px-2.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold tracking-wide flex items-center space-x-1 border border-amber-200 hover:border-amber-350 transition cursor-pointer shadow-xs shrink-0"
              title="Xem hướng dẫn các bước tạo mẫu tem"
            >
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Hướng dẫn</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT AREA (LEFT SIDEBAR & RIGHT WORKSPACE CANVAS) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* SIDEBAR ON THE LEFT - SLIMMER DESIGN TAB HEIGHT & WIDTH (Optimized for small screens) */}
        <aside id="sidebar-ui" className="w-[20%] min-w-[305px] max-w-[380px] bg-white border-r border-gray-200 flex flex-col shrink-0 no-print text-kiot-slate shadow-sm z-10 font-sans">
          
          {/* TAB BAR HEADER */}
          <div className="flex border-b border-gray-200 select-none bg-slate-50 shrink-0 tracking-wider">
            <button
              onClick={() => setActiveSidebarTab('layout')}
              className={`flex-1 py-1.5 text-center transition flex flex-col items-center justify-center space-y-0.5 border-b-[3px] cursor-pointer ${
                activeSidebarTab === 'layout'
                  ? 'border-kiot-cyan text-kiot-navy bg-sky-50/70 font-extrabold shadow-sm'
                  : 'border-transparent text-gray-400 hover:text-kiot-navy hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-black transition-all ${
                  activeSidebarTab === 'layout'
                    ? 'bg-kiot-cyan text-white ring-4 ring-cyan-100'
                    : 'bg-gray-200 text-gray-400'
                }`}>1</span>
                <span className={`text-[12px] font-black tracking-wide ${activeSidebarTab === 'layout' ? 'text-[#0F172A]' : 'text-gray-400'}`}>KHỔ GIẤY</span>
              </div>
              <span className="text-[9.5px] text-slate-400 font-semibold normal-case">Thiết lập khổ tem in</span>
            </button>
            <button
              onClick={() => setActiveSidebarTab('design')}
              className={`flex-1 py-1.5 text-center transition flex flex-col items-center justify-center space-y-0.5 border-b-[3px] cursor-pointer ${
                activeSidebarTab === 'design'
                  ? 'border-kiot-cyan text-kiot-navy bg-sky-50/70 font-extrabold shadow-sm'
                  : 'border-transparent text-gray-400 hover:text-kiot-navy hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-black transition-all ${
                  activeSidebarTab === 'design'
                    ? 'bg-kiot-cyan text-white ring-4 ring-cyan-100'
                    : 'bg-gray-200 text-gray-400'
                }`}>2</span>
                <span className={`text-[12px] font-black tracking-wide ${activeSidebarTab === 'design' ? 'text-[#0F172A]' : 'text-gray-400'}`}>THIẾT KẾ TEM</span>
              </div>
              <span className="text-[9.5px] text-slate-400 font-semibold normal-case">Vẽ &amp; chỉnh sửa chi tiết</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
            
            {/* TAB 1: PAPER & GRID LAYOUT */}
            {activeSidebarTab === 'layout' && (
              <div className="space-y-5 text-kiot-slate">
                {/* MODULE 1: CONTROL PANEL DIMENSIONS */}
                <section className="border-b border-gray-150 pb-4 space-y-2.5">
                  <h2 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center space-x-2 select-none">
                    <Compass className="w-3.5 h-3.5 text-blue-500" />
                    <span>Kích thước tem nhãn ( 1 tem )</span>
                  </h2>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Chiều rộng (mm)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          min="10"
                          max="300"
                          value={labelConfig.width}
                          onChange={(e) => {
                            const w = parseInt(e.target.value) || 10;
                            applyPresetDimensions(Math.min(w, 300), labelConfig.height, "Cấu hình tự chọn");
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
                          type="number"
                          step="1"
                          min="10"
                          max="300"
                          value={labelConfig.height}
                          onChange={(e) => {
                            const h = parseInt(e.target.value) || 10;
                            applyPresetDimensions(labelConfig.width, Math.min(h, 300), "Cấu hình tự chọn");
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
                        {labelConfig.width === 70 && labelConfig.height === 45 ? "70x45mm (Tem Kệ)" :
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
                              applyPresetDimensions(70, 45, "Tem Kệ Siêu Thị");
                              setIsQuickSizeOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left font-semibold transition cursor-pointer ${
                              labelConfig.width === 70 && labelConfig.height === 45 ? "text-kiot-navy bg-sky-50/35" : "text-slate-700"
                            }`}
                          >
                            <span>70x45mm (Tem Kệ - Nhãn Siêu Thị)</span>
                            {labelConfig.width === 70 && labelConfig.height === 45 && (
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

                {/* 1. PRINT MODE SELECTOR */}
                <section className="border-b border-gray-150 pb-4 space-y-2.5">
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
                              type="number"
                              min={50}
                              max={600}
                              value={sheetConfig.customWidth}
                              onChange={(e) => setSheetConfig(prev => ({ ...prev, customWidth: parseInt(e.target.value) || 210 }))}
                              className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-500 font-bold mb-1">Ch.cao giấy (mm)</label>
                            <input
                              type="number"
                              min={50}
                              max={600}
                              value={sheetConfig.customHeight}
                              onChange={(e) => setSheetConfig(prev => ({ ...prev, customHeight: parseInt(e.target.value) || 297 }))}
                              className="w-full bg-white border border-gray-300 rounded p-1 text-xs outline-none font-mono"
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
                            type="number"
                            min={1}
                            max={15}
                            value={sheetConfig.cols}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, cols: Math.max(1, parseInt(e.target.value) || 1) }))}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Số Hàng (Rows)</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={sheetConfig.rows}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, rows: Math.max(1, parseInt(e.target.value) || 1) }))}
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
                            type="number"
                            min={0}
                            max={50}
                            value={sheetConfig.marginLeft}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, marginLeft: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Lề phải (mm)</label>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={sheetConfig.marginRight}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, marginRight: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Lề trên (mm)</label>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={sheetConfig.marginTop}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, marginTop: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Lề dưới (mm)</label>
                          <input
                            type="number"
                            min={0}
                            max={55}
                            value={sheetConfig.marginBottom}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, marginBottom: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                      </div>
                    </section>

                    {/* 5. KHE HỞ GIỮA CÁC Ô */}
                    <section className="border-b border-gray-150 pb-4 space-y-3">
                      <h2 className="text-[12.5px] font-black text-[#475569] uppercase tracking-wider select-none">
                        Khoảng cách giữa các tem
                      </h2>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Khoảng cách cột (mm)</label>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={sheetConfig.colGap}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, colGap: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-full bg-white border border-gray-300 rounded mb-1 text-sm p-1.5 outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Khoảng cách hàng (mm)</label>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={sheetConfig.rowGap}
                            onChange={(e) => setSheetConfig(prev => ({ ...prev, rowGap: Math.max(0, parseInt(e.target.value) || 0) }))}
                            className="w-full bg-white border border-gray-300 rounded mb-1 text-sm p-1.5 outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold"
                          />
                        </div>
                      </div>
                    </section>

                    {/* 6. STYLE VIỀN NHÃN */}
                    <section className="border-b border-gray-150 pb-4 space-y-3.5">
                      <h2 className="text-[12.5px] font-black text-[#475569] uppercase tracking-wider select-none">
                        Viền tem &amp; Bo góc
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
                          In viền tem dán
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
                            <label className="block text-[11.5px] text-slate-500 font-bold mb-1">Độ bo góc ( Radius - mm)</label>
                            <input
                              type="number"
                              min={0}
                              max={15}
                              disabled={sheetConfig.borderRadius === 0}
                              value={sheetConfig.borderRadius}
                              onChange={(e) => setSheetConfig(prev => ({ ...prev, borderRadius: Math.max(0, parseInt(e.target.value) || 0) }))}
                              className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-sm outline-none font-mono focus:border-kiot-cyan text-slate-800 font-bold disabled:opacity-50"
                            />
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
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none">
                        Bề rộng cuộn tem
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={desiredRollWidth}
                        onChange={(e) => setDesiredRollWidth(Math.max(10, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs outline-none font-semibold font-mono text-slate-800 focus:ring-1 focus:ring-kiot-cyan focus:border-kiot-cyan"
                        placeholder="Ví dụ: 75, 110..."
                      />
                      <span className="block text-[9px] text-gray-400 select-none">
                        Tổng chiều rộng thực tế của cuộn giấy (bao gồm các cột tem và khoảng hở) để tự động căn chỉnh kích thước nhãn.
                      </span>
                    </div>

                    {/* SET COLS */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none">
                        Thiết lập số tem 1 hàng
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={sheetConfig.cols}
                        onChange={(e) => setSheetConfig(prev => ({ ...prev, cols: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs outline-none font-semibold font-mono text-slate-800 focus:ring-1 focus:ring-kiot-cyan focus:border-kiot-cyan"
                        placeholder="Nhập số tem ví dụ: 1, 2, 3, 4..."
                      />
                    </div>

                    {/* SET COL GAP */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none">
                        Khoảng cách giữa các tem 1 hàng
                      </label>
                      <div className="flex border border-gray-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-kiot-cyan focus-within:border-kiot-cyan">
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
                          className="flex-1 px-2.5 py-1.5 text-xs outline-none font-semibold font-mono text-slate-800 bg-white"
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
                          className="bg-gray-50 border-l border-gray-300 px-2 py-1.5 text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                        >
                          <option value="mm">mm</option>
                          <option value="inch">inch</option>
                        </select>
                      </div>
                      <span className="block text-[9px] text-gray-400 select-none">
                        Khoảng hở ngang giữa các tem cạnh nhau trên cùng một dòng.
                      </span>
                    </div>

                    {/* SET ROW GAP (GAP BETWEEN ROWS) */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none">
                        Khoảng cách giữa các hàng tem (gap)
                      </label>
                      <div className="flex border border-gray-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-kiot-cyan focus-within:border-kiot-cyan">
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
                          className="flex-1 px-2.5 py-1.5 text-xs outline-none font-semibold font-mono text-slate-800 bg-white"
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
                          className="bg-gray-50 border-l border-gray-300 px-2 py-1.5 text-xs font-semibold outline-none text-slate-700 cursor-pointer"
                        >
                          <option value="mm">mm</option>
                          <option value="inch">inch</option>
                        </select>
                      </div>
                      <span className="block text-[9px] text-gray-400 leading-normal select-none">
                        Khoảng trống phân cách hàng (Gap sensor). Giá trị mặc định phổ biến của cuộn decal nhãn thường là <strong>0.12 inch (~3.0 mm)</strong>.
                      </span>
                    </div>

                    {/* NÚT TỐI ƯU HÓA HOÀN HẢO CHO IN NHÃN CUỘN */}
                    <button
                      type="button"
                      onClick={() => {
                        const totalColGaps = (sheetConfig.cols - 1) * sheetConfig.colGap;
                        const optW = (desiredRollWidth - totalColGaps) / sheetConfig.cols;
                        
                        applyPresetDimensions(
                          Math.max(10, Math.floor(optW * 10) / 10),
                          labelConfig.height,
                          `Khớp Cuộn ${sheetConfig.cols} Tem`
                        );
                      }}
                      className="w-full py-1.5 bg-kiot-cyan hover:bg-sky-600 text-white rounded text-[11px] font-bold text-center select-none cursor-pointer transition border border-kiot-cyan flex items-center justify-center space-x-1 shadow-xs font-sans"
                      title="Tính toán kích thước Chiều rộng của tem nhãn dán tối ưu nhất dựa theo số cột tem và khoảng cách để khít với cuộn decal."
                    >
                      ⚡ <span>Khớp vừa nhãn vào khổ cuộn</span>
                    </button>
                  </div>
                )}
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
                        className="py-2 px-3.5 bg-white hover:bg-slate-50 border border-gray-200 hover:border-kiot-cyan text-kiot-charcoal hover:text-kiot-cyan text-[13px] font-extrabold rounded-lg transition duration-150 flex items-center justify-between cursor-pointer shadow-xs focus:ring-1 focus:ring-kiot-cyan focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400"
                        title="Thêm một đoạn dòng văn bản mới ở giữa nhãn"
                      >
                        <span className="flex items-center space-x-2">
                           <FileText className="w-4 h-4 text-kiot-cyan" />
                           <span>Thêm Văn Bản</span>
                        </span>
                        <Plus className="w-3.5 h-3.5 opacity-50 text-kiot-cyan" />
                      </button>

                      <button
                        onClick={() => handleAddObject("barcode")}
                        className="py-2 px-3.5 bg-white hover:bg-slate-50 border border-gray-200 hover:border-kiot-cyan text-kiot-charcoal hover:text-kiot-cyan text-[13px] font-extrabold rounded-lg transition duration-150 flex items-center justify-between cursor-pointer shadow-xs focus:ring-1 focus:ring-kiot-cyan focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400"
                        title="Thêm một hình vẽ mã vạch chuẩn 1D ở giữa nhãn"
                      >
                        <span className="flex items-center space-x-2">
                          <Barcode className="w-4 h-4 text-emerald-500" />
                          <span>Thêm Mã Vạch</span>
                        </span>
                        <Plus className="w-3.5 h-3.5 opacity-50 text-kiot-cyan" />
                      </button>

                      <button
                        onClick={() => handleAddObject("qrcode")}
                        className="py-2 px-3.5 bg-white hover:bg-slate-50 border border-gray-200 hover:border-kiot-cyan text-kiot-charcoal hover:text-kiot-cyan text-[13px] font-extrabold rounded-lg transition duration-150 flex items-center justify-between cursor-pointer shadow-xs focus:ring-1 focus:ring-kiot-cyan focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400"
                        title="Thêm một hình vẽ mã QR code ở giữa nhãn"
                      >
                        <span className="flex items-center space-x-2">
                          <QrCode className="w-4 h-4 text-blue-500" />
                          <span>Thêm Mã QR</span>
                        </span>
                        <Plus className="w-3.5 h-3.5 opacity-50 text-kiot-cyan" />
                      </button>

                      <button
                        onClick={() => setShowImageImportModal(true)}
                        className="py-2 px-3.5 bg-white hover:bg-slate-50 border border-gray-200 hover:border-kiot-cyan text-kiot-charcoal hover:text-kiot-cyan text-[13px] font-extrabold rounded-lg transition duration-150 flex items-center justify-between cursor-pointer shadow-xs focus:ring-1 focus:ring-kiot-cyan focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400"
                        title="Chèn logo, con dấu hoặc hình ảnh bất kỳ vào nhãn"
                      >
                        <span className="flex items-center space-x-2">
                          <Image className="w-4 h-4 text-rose-500" />
                          <span>Thêm Hình Ảnh</span>
                        </span>
                        <Plus className="w-3.5 h-3.5 opacity-50 text-kiot-cyan" />
                      </button>
                    </div>
                  </section>
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
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsExcelExpanded(true);
                            // Open file dialog directly
                            setTimeout(() => {
                              document.getElementById("excel-file-uploader-direct")?.click();
                            }, 50);
                          }}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11.5px] rounded-lg shadow-sm flex items-center space-x-1 cursor-pointer transition focus:outline-none"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload file</span>
                        </button>
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
                      Mẹo
                    </span>
                    <span className="leading-relaxed font-bold text-emerald-900">
                      Định dạng file sẽ lấy dữ liệu dòng 1 làm tiêu đề, dữ liệu in sẽ bắt đầu từ dòng 2.
                    </span>
                  </div>

                  {isExcelExpanded && (
                    <div className="space-y-4 text-sm bg-white border border-emerald-100 rounded-md p-3.5 mt-3 shadow-inner">
                      
                      {/* 1. EXCEL UPLOADER PORT */}
                      <section className="space-y-2.5">
                        {!excelFileName ? (
                          <div className="relative">
                            <label 
                              htmlFor="excel-file-uploader-direct"
                              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 bg-slate-50 cursor-pointer hover:bg-emerald-50/10 hover:border-emerald-300 transition text-center space-y-1.5"
                            >
                              <Upload className="w-7 h-7 text-emerald-500 animate-pulse" />
                              <div>
                                <span className="text-[12.5px] font-bold text-slate-700 block">Chọn tệp Excel từ máy (.xlsx, .xls)</span>
                                <span className="text-[11px] text-slate-450 mt-1 block font-semibold leading-relaxed select-none">
                                  Dòng 1: Tiêu đề cột để "Link Data"<br />Từ Dòng 2 trở đi: Dữ liệu tem
                                </span>
                              </div>
                            </label>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-emerald-850 truncate text-[12.5px] flex items-center">
                                  <span className="mr-1 text-emerald-650">✓</span> Đã liên kết thành công
                                </p>
                                <p className="text-[11px] text-emerald-700 truncate font-bold font-mono mt-0.5">{excelFileName}</p>
                                <p className="text-[11px] text-slate-600 font-bold mt-1">
                                  Sẵn sàng in hàng loạt: {excelData.length} dòng sản phẩm.
                                </p>
                              </div>
                              <button
                                onClick={handleClearExcel}
                                className="p-1 hover:bg-emerald-100 text-emerald-700 hover:text-red-650 rounded transition shrink-0 cursor-pointer"
                                title="Hủy kết nối file Excel hiện tại"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </section>

                      {/* Sections 2, 3, 4 for navigating rows and batch toggles removed as requested by user */}
                        
                      </div>
                    )}
                  </div>
              </>
            )}

          </div>

          {/* Sticky Bottom Actions inside sidebar */}
          {activeSidebarTab === 'design' && (
            <div className="p-4 bg-slate-50 border-t border-gray-200 shrink-0 space-y-3.5 shadow-sm">
              {/* Fit Objects to Label Button */}
              <button
                type="button"
                onClick={handleFitObjectsToLabel}
                disabled={objects.length === 0}
                className="w-full py-2 bg-kiot-cyan hover:bg-sky-600 border border-kiot-cyan text-white rounded-lg text-[11.5px] font-black text-center select-none cursor-pointer transition flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:border-slate-300"
                title="Tự động co giãn tất cả đối tượng vừa vặn vào khổ tem và giữ nguyên vị trí cân đối"
              >
                ⚡ <span>Khớp vừa nhãn vào khổ cuộn</span>
              </button>

              <div className="space-y-2 border-b border-gray-200/60 pb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11.5px] font-black text-[#475569] uppercase tracking-wider select-none">
                    SỐ LƯỢNG TEM NHÃN CẦN IN
                  </label>
                  <span className="text-[10px] text-kiot-navy font-mono font-black bg-sky-50 px-2 py-0.5 rounded border border-kiot-cyan/20">
                    Cấu hình
                  </span>
                </div>

                {/* Two options selection button layout */}
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/85">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintQuantityMode('constant');
                    }}
                    className={`px-1.5 py-1.5 text-[11px] font-black rounded transition-all cursor-pointer ${
                      printQuantityMode === 'constant'
                        ? "bg-white text-kiot-navy shadow-xs border border-gray-250"
                        : "text-slate-500 hover:text-slate-800"
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
                    className={`px-1.5 py-1.5 text-[11px] font-black rounded transition-all flex items-center justify-center space-x-0.5 ${
                      excelData.length === 0
                        ? "opacity-55 cursor-not-allowed text-slate-400"
                        : printQuantityMode === 'excel_column'
                        ? "bg-white text-emerald-700 shadow-xs border border-emerald-250"
                        : "text-slate-500 hover:text-slate-800 cursor-pointer"
                    }`}
                    title={excelData.length === 0 ? "Hãy tải dữ liệu Excel trước" : "Lấy số bản in theo cột Excel"}
                  >
                    <span>SL theo file</span>
                    {excelData.length === 0 && <span className="text-[8px] bg-slate-200 text-slate-500 px-1 rounded">Khóa</span>}
                  </button>
                </div>

                {/* Quantity configuration elements */}
                {printQuantityMode === 'constant' ? (
                  <div className="space-y-1.5 pt-1.5">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={printCopiesInput}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setPrintCopiesInput(val);
                        setPrintCopies(val);
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-250 rounded font-mono font-bold text-slate-800 bg-white"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1.5">
                    {excelData.length > 0 ? (
                      <>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase select-none mb-0.5">
                          Chọn cột số lượng từ Excel:
                        </label>
                        <select
                          value={printQuantityColumn || ""}
                          onChange={(e) => setPrintQuantityColumn(e.target.value || null)}
                          className="w-full text-xs font-bold font-mono py-1 px-1.5 bg-white border border-gray-250 rounded focus:outline-none"
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
                              : "Mỗi dòng trong Excel sẽ được in đúng 1 bản."}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="text-[10px] font-semibold text-yellow-850 bg-yellow-50 border border-yellow-250 p-1.5 rounded-md leading-normal">
                        Cần liên kết file dữ liệu trước trong tab <strong>"KHỔ GIẤY"</strong>.
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button
                onClick={handlePrintLabel}
                className="w-full py-3.5 bg-gradient-to-r from-kiot-cyan to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition-all duration-150 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] text-sm font-black border-b-[3px] border-sky-600"
                title="Gọi lệnh in nhãn dán tiêu chuẩn (Ctrl + P)"
              >
                <Printer className="w-5 h-5 stroke-[3]" />
                <span className="tracking-widest uppercase font-black font-sans">IN NHÃN (CTRL + P)</span>
              </button>
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
                  <span className="font-extrabold text-[11px] uppercase text-kiot-navy tracking-wider select-none">
                    THUỘC TÍNH
                  </span>
                  <span className="text-[9px] bg-sky-50 text-kiot-cyan border border-kiot-cyan/20 font-extrabold px-1.5 py-0.5 rounded-md uppercase shrink-0">
                    {selectedObject.type === 'text' ? 'Văn bản' : selectedObject.type === 'barcode' ? 'Mã vạch' : selectedObject.type === 'qrcode' ? 'QR Code' : 'Hình ảnh'}
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
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
                  onClick={() => setPixelScale(Math.max(1.41525, pixelScale - 0.707625))}
                  className="p-1 rounded hover:bg-white text-gray-500 hover:text-gray-700 transition cursor-pointer"
                  title="Thu nhỏ phôi dán"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[12px] font-mono text-center w-11 text-gray-700 font-bold">
                  {Math.round((pixelScale / 7.07625) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPixelScale(Math.min(21.22875, pixelScale + 0.707625))}
                  className="p-1 rounded hover:bg-white text-gray-500 hover:text-gray-700 transition cursor-pointer"
                  title="Phóng to phôi dán"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid Snapping Picker */}
              <div className="flex items-center bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 space-x-1.5 font-sans">
                <Grid3X3 className="w-4 h-4 text-blue-500" />
                <span className="text-[10.5px] text-gray-400 font-extrabold uppercase select-none tracking-wider">Hít lưới</span>
                <select
                  value={gridSnapSize}
                  onChange={(e) => setGridSnapSize(parseFloat(e.target.value))}
                  className="bg-white border border-gray-200 outline-none text-[11px] py-0.5 px-1 text-gray-700 cursor-pointer rounded font-medium"
                >
                  <option value={0}>Tắt</option>
                  <option value={0.5}>Mịn (0.5mm)</option>
                  <option value={1}>Mặc định (1mm)</option>
                  <option value={2}>Thô (2mm)</option>
                  <option value={5}>Lớn (5mm)</option>
                </select>
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
              <div className="max-w-[720px] w-full p-4 bg-white border border-slate-200 rounded-2xl shadow-md flex flex-col space-y-3 relative font-sans animate-fadeIn">
                <button 
                  type="button" 
                  onClick={() => setShowHowToUse(false)}
                  className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                  title="Đóng bảng hướng dẫn"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-center space-x-2 pb-0.5 border-b border-slate-100">
                  <span className="text-[12px] font-black text-slate-800 uppercase tracking-widest">📌 LỘ TRÌNH THIẾT KẾ & IN TEM CHUẨN</span>
                  <span className="text-[10px] bg-sky-50 text-kiot-cyan font-black px-2 py-0.5 rounded-lg uppercase border border-kiot-cyan/15">Tuần tự 4 bước</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Step 1 */}
                  <div className="bg-slate-50/55 p-2.5 rounded-xl border border-slate-100 flex items-start space-x-3 transition-all hover:bg-slate-100/40">
                    <span className="w-5.5 h-5.5 rounded-lg bg-sky-100 text-sky-700 font-black text-xs flex items-center justify-center shrink-0 shadow-xs border border-sky-200">1</span>
                    <div className="text-[11.5px] leading-relaxed">
                      <p className="font-extrabold text-[#0F172A] mb-0.5">Bước 1: Xác định khổ tem</p>
                      <p className="text-slate-500 font-medium text-[11px] leading-snug">Cấu hình kích thước nhãn thực tế (Chiều rộng x Chiều cao) ở cột bên trái.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-slate-50/55 p-2.5 rounded-xl border border-slate-100 flex items-start space-x-3 transition-all hover:bg-slate-100/40">
                    <span className="w-5.5 h-5.5 rounded-lg bg-indigo-100 text-[#4338CA] font-black text-xs flex items-center justify-center shrink-0 shadow-xs border border-indigo-200">2</span>
                    <div className="text-[11.5px] leading-relaxed">
                      <p className="font-extrabold text-[#0F172A] mb-0.5">Bước 2: Thiết lập máy/khổ giấy</p>
                      <p className="text-slate-500 font-medium text-[11px] leading-snug">Chọn máy in (đơn cuộn hoặc nhiều tem/A4/A5), số hàng/cột và căn lề giấy phù hợp.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-slate-50/55 p-2.5 rounded-xl border border-slate-100 flex items-start space-x-3 transition-all hover:bg-slate-100/40">
                    <span className="w-5.5 h-5.5 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0 shadow-xs border border-emerald-200">3</span>
                    <div className="text-[11.5px] leading-relaxed">
                      <p className="font-extrabold text-[#0F172A] mb-0.5">Bước 3: Thiết kế mẫu tem</p>
                      <p className="text-slate-500 font-medium text-[11px] leading-snug">Thêm văn bản (tên, giá), mã vạch, mã QR. Nhấp chọn đối tượng để căn chỉnh chi tiết.</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-slate-50/55 p-2.5 rounded-xl border border-slate-100 flex items-start space-x-3 transition-all hover:bg-slate-100/40">
                    <span className="w-5.5 h-5.5 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0 shadow-xs border border-amber-200">4</span>
                    <div className="text-[11.5px] leading-relaxed">
                      <p className="font-extrabold text-[#0F172A] mb-0.5">Bước 4: Chọn số lượng & In</p>
                      <p className="text-slate-500 font-medium text-[11px] leading-snug">Nhập số bản in và click nút <strong className="text-slate-700">IN NHÃN (Ctrl+P)</strong> ở góc dưới bên trái màn hình.</p>
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
            pixelScale={pixelScale}
            gridSnapSize={gridSnapSize}
            onSelectObject={setSelectedId}
            onUpdateObjectCoordinates={handleUpdateCoordinates}
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
                onClick={() => {
                  setShowPrintModal(false);
                  setTimeout(() => {
                    window.focus();
                    window.print();
                  }, 200);
                }}
                className="w-full py-2 border border-gray-300 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <span>Xem trước & In trực tiếp tại đây</span>
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
                    <p className="text-[9.5px] text-slate-450 font-medium leading-normal mt-0.5">Lưu trữ cục bộ, an toàn trên trình duyệt máy bạn</p>
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
                    <p className="text-[9.5px] text-slate-450 font-medium leading-normal mt-0.5">Tải file cấu hình offline (.ktl) về ổ cứng</p>
                  </div>
                </button>
              </div>
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

                {/* Format selection (ONLY when saving for device/offline download) */}
                {saveLocation === 'device' && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Chọn định dạng file:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSaveFileFormat('ktl')}
                        className={`py-1.5 px-2 border rounded-lg text-center text-[10.5px] font-bold cursor-pointer transition-all ${
                          saveFileFormat === 'ktl'
                            ? 'border-kiot-green bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        File .ktl (Khuyên dùng)
                        <span className="block text-[8px] text-slate-400 font-normal">Base64 nhẹ & an toàn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveFileFormat('json')}
                        className={`py-1.5 px-2 border rounded-lg text-center text-[10.5px] font-bold cursor-pointer transition-all ${
                          saveFileFormat === 'json'
                            ? 'border-kiot-green bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        File .json (Mã nguồn)
                        <span className="block text-[8px] text-slate-400 font-normal">Định dạng JSON gốc</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer confirm/save action */}
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveDialog(false);
                      setSaveLocation(null);
                    }}
                    className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-bold text-slate-500 transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const finalName = saveTemplateName.trim() || `Bản vẽ ${new Date().toLocaleDateString("vi-VN")}`;
                      if (saveLocation === 'local') {
                        handleSaveToLocalStorage(finalName);
                      } else if (saveLocation === 'device') {
                        handleExportToFile(finalName, saveFileFormat);
                      }
                      setCustomSaveName(finalName); // update state in header
                      setShowSaveDialog(false);
                      setSaveLocation(null);
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
