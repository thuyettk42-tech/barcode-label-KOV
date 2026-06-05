/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { LabelObject, LabelConfig } from "../types";
import { 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic,
  Underline,
  Strikethrough,
  Move,
  Settings,
  ChevronDown,
  ChevronRight,
  Database,
  Link2,
  Unlink,
  ArrowUp
} from "lucide-react";

interface PropertiesPanelProps {
  selectedObject: LabelObject | null;
  labelConfig: LabelConfig;
  onChangeObject: (updated: LabelObject) => void;
  onDeleteObject: (id: string) => void;
  excelColumns?: string[];
  onSwitchToExcelTab?: () => void;
}

export function PropertiesPanel({
  selectedObject,
  labelConfig,
  onChangeObject,
  onDeleteObject,
  excelColumns = [],
  onSwitchToExcelTab
}: PropertiesPanelProps) {
  const [isPositionExpanded, setIsPositionExpanded] = useState(false);

  if (!selectedObject) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-3 text-center border border-dashed border-gray-250 rounded-lg bg-slate-50/50 my-1">
        <Settings className="w-8 h-8 text-slate-450 animate-pulse mb-2" />
        <p className="text-xs font-black text-kiot-navy">Chưa chọn đối tượng nào</p>
        <p className="text-[11px] text-slate-650 mt-1.5 max-w-[240px] leading-relaxed font-semibold">
          Vui lòng click chọn trực tiếp một đối tượng (văn bản, mã vạch hoặc mã QR) trên khung nhãn thiết kế bên phải để tùy chỉnh các thuộc tính chi tiết.
        </p>
      </div>
    );
  }

  const handlePositionChange = (key: 'x' | 'y' | 'width' | 'height', val: number) => {
    // Avoid returning negative sizes
    let cleanVal = Number(isNaN(val) ? 0 : val);
    if (cleanVal < 0) cleanVal = 0;

    // Boundary constraints for absolute values manually inputted
    if (key === 'x') {
      if (cleanVal > labelConfig.width) cleanVal = labelConfig.width - 2;
    } else if (key === 'y') {
      if (cleanVal > labelConfig.height) cleanVal = labelConfig.height - 2;
    } else if (key === 'width') {
      if (cleanVal + selectedObject.x > labelConfig.width) {
        cleanVal = Math.max(1, labelConfig.width - selectedObject.x);
      }
    } else if (key === 'height') {
      if (cleanVal + selectedObject.y > labelConfig.height) {
        cleanVal = Math.max(1, labelConfig.height - selectedObject.y);
      }
    }

    const updated = {
      ...selectedObject,
      [key]: Math.round(cleanVal * 10) / 10
    };

    // Keep QR codes square
    if (selectedObject.type === 'qrcode' && (key === 'width' || key === 'height')) {
      updated.width = Math.round(cleanVal * 10) / 10;
      updated.height = Math.round(cleanVal * 10) / 10;
    }

    onChangeObject(updated);
  };

  const handleAttributeChange = (key: keyof LabelObject, val: any) => {
    onChangeObject({
      ...selectedObject,
      [key]: val
    });
  };

  // Alignment Helper Triggers
  const alignLeft = () => handlePositionChange('x', 0);
  const alignTop = () => handlePositionChange('y', 0);
  const alignRight = () => handlePositionChange('x', labelConfig.width - selectedObject.width);
  const alignBottom = () => handlePositionChange('y', labelConfig.height - selectedObject.height);
  const alignCenterHoriz = () => handlePositionChange('x', (labelConfig.width - selectedObject.width) / 2);
  const alignCenterVerti = () => handlePositionChange('y', (labelConfig.height - selectedObject.height) / 2);

  // Modular component for linking elements to Excel data columns
  const renderExcelLinker = () => {
    if (excelColumns.length > 0) {
      return (
        <div id="excel-linker-module" className="space-y-1 w-full">
          <div className="flex items-center space-x-1">
            <span className="text-[11.5px] font-black text-blue-700 uppercase tracking-wide">Chọn:</span>
            <span className="text-[10.5px] text-blue-500 font-bold select-none italic">(Liên kết dữ liệu Excel)</span>
          </div>
          
          <div className="bg-blue-50/50 border border-blue-100 rounded-md p-2 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-black text-blue-900 select-none">
              <span className="flex items-center space-x-1">
                <Database className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                <span>Nối dữ liệu từ file Excel đã tải</span>
              </span>
              {selectedObject.excelColumn && (
                <span className="text-[9.5px] bg-green-100 text-green-800 border border-green-200/55 font-mono font-black px-1.5 py-0.5 rounded uppercase">
                  ✓ Đã nối
                </span>
              )}
            </div>

            <div className="space-y-1">
              {selectedObject.excelColumn ? (
                <div className="flex items-center justify-between bg-white px-2 py-1 border border-blue-200 rounded-md text-xs">
                  <span className="font-extrabold text-blue-800 font-mono truncate max-w-[170px]">
                    ✓ Cột: <span className="text-blue-650">{selectedObject.excelColumn}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAttributeChange("excelColumn", undefined)}
                    className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-700 rounded-md transition cursor-pointer flex items-center space-x-0.5 font-black text-[10px]"
                    title="Gỡ liên kết"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>Hủy</span>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedObject.excelColumn || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleAttributeChange("excelColumn", val === "" ? undefined : val);
                    }}
                    className="w-full pl-2 pr-7 py-1 text-xs border border-gray-300 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white cursor-pointer text-slate-800 font-bold"
                  >
                    <option value="">-- Chọn cột nhận giá trị --</option>
                    {excelColumns.map((col) => (
                      <option key={col} value={col}>
                        📄 Cột: {col}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Default: not linked yet with Up Arrow to scroll/redirect
    return (
      <div id="excel-linker-module" className="space-y-1 w-full">
        <div className="flex items-center space-x-1.5">
          <span className="text-[11.5px] font-black text-slate-500 uppercase tracking-wide">Chọn:</span>
          <span className="text-[10.5px] text-slate-400 font-bold select-none italic">(Chọn từ cột Excel)</span>
        </div>

        <div className="flex items-center justify-between bg-slate-50 border border-gray-200 rounded-md p-2 shadow-xs">
          <span className="text-[11.5px] text-slate-500 font-bold select-none italic flex items-center space-x-1">
            <Database className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span>Chưa liên kết dữ liệu excel</span>
          </span>
        </div>
      </div>
    );
  };

  // Collapsible Component for Positioning and Coordinates (Drag-and-drop handles this visual design already)
  const renderPositionPanel = () => {
    return (
      <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-50/80 mt-2">
        <button
          type="button"
          onClick={() => setIsPositionExpanded(!isPositionExpanded)}
          className="w-full flex items-center justify-between p-2 select-none text-left font-sans cursor-pointer hover:bg-slate-100/80 transition-colors"
        >
          <div className="flex items-center space-x-1.5 text-kiot-navy">
            <Move className="w-3.5 h-3.5 text-kiot-cyan shrink-0" />
            <span className="font-extrabold text-[11.5px]">Vị Trí &amp; Kích Thước (mm)</span>
          </div>
          <div className="text-slate-400 shrink-0">
            {isPositionExpanded ? <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" /> : <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />}
          </div>
        </button>

        {isPositionExpanded && (
          <div className="p-2 border-t border-slate-200 bg-white space-y-2.5 animate-fadeIn">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-0.5">X (mm)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={selectedObject.x}
                    onChange={(e) => handlePositionChange('x', parseFloat(e.target.value))}
                    className="w-full pl-2 pr-7 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-gray-400 font-mono">mm</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Y (mm)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={selectedObject.y}
                    onChange={(e) => handlePositionChange('y', parseFloat(e.target.value))}
                    className="w-full pl-2 pr-7 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-gray-400 font-mono">mm</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Rộng (mm)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={selectedObject.width}
                    disabled={selectedObject.type === 'qrcode'} // Square proportion constraint
                    onChange={(e) => handlePositionChange('width', parseFloat(e.target.value))}
                    className="w-full pl-2 pr-7 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-gray-400 font-mono">mm</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-0.5">Cao (mm)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={selectedObject.height}
                    onChange={(e) => handlePositionChange('height', parseFloat(e.target.value))}
                    className="w-full pl-2 pr-7 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-gray-400 font-mono">mm</span>
                </div>
              </div>
            </div>

            {/* Alignment Controls Mapping inside expanded details */}
            <div className="pt-2 border-t border-gray-200/60">
              <span className="block text-[10px] text-slate-400 font-black mb-1.5 text-center uppercase tracking-wide">Căn nhanh vào phôi nhãn</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={alignLeft}
                  className="py-1 px-1 text-[11px] border border-gray-200 bg-white hover:bg-sky-50 hover:border-kiot-cyan text-slate-700 hover:text-kiot-navy rounded-sm font-bold transition focus:outline-none cursor-pointer"
                  title="Căn trái"
                >
                  Căn Trái
                </button>
                <button
                  type="button"
                  onClick={alignCenterHoriz}
                  className="py-1 px-1 text-[11px] border border-gray-200 bg-white hover:bg-sky-50 hover:border-kiot-cyan text-slate-700 hover:text-kiot-navy rounded-sm font-bold transition focus:outline-none cursor-pointer"
                  title="Căn giữa ngang"
                >
                  Giữa Ngang
                </button>
                <button
                  type="button"
                  onClick={alignRight}
                  className="py-1 px-1 text-[11px] border border-gray-200 bg-white hover:bg-sky-50 hover:border-kiot-cyan text-slate-700 hover:text-kiot-navy rounded-sm font-bold transition focus:outline-none cursor-pointer"
                  title="Căn phải"
                >
                  Căn Phải
                </button>
                <button
                  type="button"
                  onClick={alignTop}
                  className="py-1 px-1 text-[11px] border border-gray-200 bg-white hover:bg-sky-50 hover:border-kiot-cyan text-slate-700 hover:text-kiot-navy rounded-sm font-bold transition focus:outline-none cursor-pointer"
                  title="Căn trên cùng"
                >
                  Căn Trên
                </button>
                <button
                  type="button"
                  onClick={alignCenterVerti}
                  className="py-1 px-1 text-[11px] border border-gray-200 bg-white hover:bg-sky-50 hover:border-kiot-cyan text-slate-700 hover:text-kiot-navy rounded-sm font-bold transition focus:outline-none cursor-pointer"
                  title="Căn giữa dọc"
                >
                  Giữa Dọc
                </button>
                <button
                  type="button"
                  onClick={alignBottom}
                  className="py-1 px-1 text-[11px] border border-gray-200 bg-white hover:bg-sky-50 hover:border-kiot-cyan text-slate-700 hover:text-kiot-navy rounded-sm font-bold transition focus:outline-none cursor-pointer"
                  title="Căn dưới cùng"
                >
                  Căn Dưới
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="properties-panel" className="space-y-2.5">
      <main className="space-y-2.5">
        {/* TEXT EXCLUSIVE ATTRIBUTES */}
        {selectedObject.type === "text" && (
          <div className="space-y-2.5">
            {/* Nội dung văn bản */}
            <div className="space-y-1.5">
              <label className="block text-[11.5px] font-black text-slate-705 uppercase tracking-wider mb-0.5">Nội dung văn bản</label>

              {/* Way 1: Nhập thủ công */}
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-black text-slate-550 uppercase tracking-wide">Nhập:</span>
                  <span className="text-[10.5px] text-slate-450 font-bold select-none italic">(Điền chữ hiển thị)</span>
                </div>
                <textarea
                  rows={2}
                  value={selectedObject.content}
                  disabled={!!selectedObject.excelColumn}
                  onChange={(e) => handleAttributeChange("content", e.target.value)}
                  className={`w-full p-2 text-xs border border-gray-200 rounded-md font-sans focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none ${
                    selectedObject.excelColumn ? "bg-gray-100 text-gray-500 select-none cursor-not-allowed font-bold italic" : "bg-white text-slate-800 font-extrabold"
                  }`}
                  placeholder={selectedObject.excelColumn ? `Lấy cột động: [${selectedObject.excelColumn}]` : "Nhập chữ hiển thị..."}
                />
                {selectedObject.excelColumn && (
                  <p className="text-[10.5px] text-amber-600 font-bold mt-0.5">
                    ⚠️ Đang nối Excel. Chữ cố định bị tắt.
                  </p>
                )}
              </div>

              {/* Separator: Hoặc */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-1.5 text-[10px] font-black text-gray-400 bg-white uppercase tracking-widest select-none px-1">Hoặc</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Way 2: renderExcelLinker */}
              {renderExcelLinker()}
            </div>

            {/* Font settings & formatting */}
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-250/60 font-sans">
              <div>
                <label className="block text-[11px] text-slate-650 font-bold mb-0.5">Cỡ chữ (pt)</label>
                <input
                  type="number"
                  min="4"
                  max="72"
                  value={selectedObject.fontSize || 11}
                  onChange={(e) => handleAttributeChange("fontSize", parseInt(e.target.value) || 11)}
                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-650 font-bold mb-0.5">Font Chữ</label>
                <div className="relative">
                  <select
                    value={selectedObject.fontFamily || "sans-serif"}
                    onChange={(e) => handleAttributeChange("fontFamily", e.target.value)}
                    className="w-full pl-2 pr-6 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white appearance-none text-slate-800 font-bold"
                  >
                    <option value="sans-serif">Chữ thường (Sans)</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="monospace">Mã máy (Mono)</option>
                    <option value="serif">Chữ Serif (Times)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="pt-1.5 border-t border-gray-200/50 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex-1">
                  <span className="block text-[11px] text-slate-650 font-bold mb-0.5">Căn lề chữ</span>
                  <div className="flex bg-gray-100 p-0.5 rounded-md">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => handleAttributeChange("textAlign", align)}
                        className={`flex-1 py-1 flex items-center justify-center rounded transition cursor-pointer ${
                          (selectedObject.textAlign || "left") === align
                             ? "bg-white text-kiot-navy font-bold shadow-sm"
                             : "text-gray-450 hover:text-gray-700"
                        }`}
                      >
                        {align === "left" && <AlignLeft className="w-3.5 h-3.5" />}
                        {align === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                        {align === "right" && <AlignRight className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] text-slate-650 font-bold mb-0.5">Chỉnh chỉ số</span>
                  <div className="flex bg-gray-100 p-0.5 rounded-md text-[11px] font-bold">
                    {(["normal", "superscript", "subscript"] as const).map((subSuper) => (
                      <button
                        key={subSuper}
                        type="button"
                        onClick={() => handleAttributeChange("textSuperSub", subSuper)}
                        className={`flex-1 py-1 flex items-center justify-center rounded transition cursor-pointer text-[10.5px] ${
                          (selectedObject.textSuperSub || "normal") === subSuper
                             ? "bg-white text-kiot-navy font-black shadow-sm"
                             : "text-gray-500 hover:text-gray-800 font-bold"
                        }`}
                        title={
                          subSuper === "normal" ? "Chữ bình thường" :
                          subSuper === "superscript" ? "Chỉ số trên" : "Chỉ số dưới"
                        }
                      >
                        {subSuper === "normal" && "Thường"}
                        {subSuper === "superscript" && "A²"}
                        {subSuper === "subscript" && "A₂"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-[11px] text-slate-600 font-bold mb-0.5">Định dạng chữ</span>
                <div className="flex bg-gray-100 p-0.5 rounded-md gap-1">
                  {/* Bold Button */}
                  <button
                    type="button"
                    onClick={() =>
                      handleAttributeChange(
                        "fontWeight",
                        selectedObject.fontWeight === "bold" ? "normal" : "bold"
                      )
                    }
                    className={`flex-1 py-1 flex items-center justify-center rounded transition cursor-pointer ${
                      selectedObject.fontWeight === "bold"
                        ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/40"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                    title="Chữ đậm"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>

                  {/* Italic Button */}
                  <button
                    type="button"
                    onClick={() =>
                      handleAttributeChange(
                        "fontStyle",
                        selectedObject.fontStyle === "italic" ? "normal" : "italic"
                      )
                    }
                    className={`flex-1 py-1 flex items-center justify-center rounded transition cursor-pointer ${
                      selectedObject.fontStyle === "italic"
                        ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/40"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                    title="Chữ nghiêng"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  {/* Underline Button */}
                  <button
                    type="button"
                    onClick={() =>
                      handleAttributeChange(
                        "textDecorationUnderline",
                        !selectedObject.textDecorationUnderline
                      )
                    }
                    className={`flex-1 py-1 flex items-center justify-center rounded transition cursor-pointer ${
                      selectedObject.textDecorationUnderline
                        ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/40"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                    title="Gạch chân"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>

                  {/* Strikethrough Button */}
                  <button
                    type="button"
                    onClick={() =>
                      handleAttributeChange(
                        "textDecorationLineThrough",
                        !selectedObject.textDecorationLineThrough
                      )
                    }
                    className={`flex-1 py-1 flex items-center justify-center rounded transition cursor-pointer ${
                      selectedObject.textDecorationLineThrough
                        ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/40"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                    title="Gạch ngang chữ"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* PHẦN TIỀN TỐ VÀ HẬU TỐ */}
              <div className="pt-2 border-t border-gray-250/60 pb-1.5 space-y-2.5">
                <span className="block text-[11px] uppercase tracking-wider font-extrabold text-kiot-navy">
                  Tiền tố &amp; Hậu tố
                </span>
                
                {/* 1. TIỀN TỐ (PREFIX) */}
                <div className="p-2 border border-sky-100 rounded-lg bg-sky-50/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-650">Tiền tố (Prefix)</label>
                    <span className="text-[9px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-mono">Trước content</span>
                  </div>
                  <input
                    type="text"
                    value={selectedObject.prefixText || ""}
                    placeholder="Mặc định thêm vào trước..."
                    onChange={(e) => handleAttributeChange("prefixText", e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-250 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-semibold text-slate-800"
                  />
                  {selectedObject.prefixText && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Font Size */}
                        <div>
                          <label className="block text-[9.5px] text-slate-500 font-bold mb-0.5">Cỡ chữ (pt)</label>
                          <input
                            type="number"
                            min={4}
                            max={72}
                            value={selectedObject.prefixFontSize || selectedObject.fontSize || 11}
                            onChange={(e) => handleAttributeChange("prefixFontSize", Number(e.target.value))}
                            className="w-full px-1.5 py-0.5 text-[11px] border border-gray-200 rounded-md focus:border-kiot-cyan focus:outline-none bg-white font-mono font-semibold"
                          />
                        </div>
                        {/* Font Family */}
                        <div>
                          <label className="block text-[9.5px] text-slate-500 font-bold mb-0.5">Font chữ</label>
                          <select
                            value={selectedObject.prefixFontFamily || "sans-serif"}
                            onChange={(e) => handleAttributeChange("prefixFontFamily", e.target.value)}
                            className="w-full pl-1.5 pr-4 py-0.5 text-[11px] border border-gray-200 rounded-md focus:border-kiot-cyan focus:outline-none bg-white font-bold text-slate-800 cursor-pointer"
                          >
                            <option value="sans-serif">Sans-serif</option>
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times Roman</option>
                            <option value="Tahoma">Tahoma</option>
                            <option value="monospace">Mono</option>
                          </select>
                        </div>
                      </div>

                      {/* Formatting bar: Bold, Italic, Underline, Strikethrough, Sub/Sup */}
                      <div className="flex gap-1 items-center bg-gray-50 border border-gray-200 p-0.5 rounded-md">
                        {/* Bold */}
                        <button
                          type="button"
                          onClick={() => handleAttributeChange("prefixFontWeight", selectedObject.prefixFontWeight === "bold" ? "normal" : "bold")}
                          className={`flex-1 py-0.5 flex items-center justify-center rounded text-xs ${selectedObject.prefixFontWeight === "bold" ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/20" : "text-gray-400 hover:text-gray-700"}`}
                        >
                          <Bold className="w-3 h-3" />
                        </button>
                        {/* Italic */}
                        <button
                          type="button"
                          onClick={() => handleAttributeChange("prefixFontStyle", selectedObject.prefixFontStyle === "italic" ? "normal" : "italic")}
                          className={`flex-1 py-0.5 flex items-center justify-center rounded text-xs ${selectedObject.prefixFontStyle === "italic" ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/20" : "text-gray-400 hover:text-gray-700"}`}
                        >
                          <Italic className="w-3 h-3" />
                        </button>
                        {/* Underline */}
                        <button
                          type="button"
                          onClick={() => handleAttributeChange("prefixTextDecorationUnderline", !selectedObject.prefixTextDecorationUnderline)}
                          className={`flex-1 py-0.5 flex items-center justify-center rounded text-xs ${selectedObject.prefixTextDecorationUnderline ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/20" : "text-gray-400 hover:text-gray-700"}`}
                        >
                          <Underline className="w-3 h-3" />
                        </button>
                        {/* Strikethrough */}
                        <button
                          type="button"
                          onClick={() => handleAttributeChange("prefixTextDecorationLineThrough", !selectedObject.prefixTextDecorationLineThrough)}
                          className={`flex-1 py-0.5 flex items-center justify-center rounded text-xs ${selectedObject.prefixTextDecorationLineThrough ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/20" : "text-gray-400 hover:text-gray-700"}`}
                        >
                          <Strikethrough className="w-3 h-3" />
                        </button>
                        <div className="w-px h-4 bg-gray-200 inline-block" />
                        {/* Sub/Sup indicator */}
                        <select
                          value={selectedObject.prefixTextSuperSub || "normal"}
                          onChange={(e) => handleAttributeChange("prefixTextSuperSub", e.target.value)}
                          className="text-[10px] bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer p-0 shrink-0"
                        >
                          <option value="normal">Thường</option>
                          <option value="superscript">A²</option>
                          <option value="subscript">A₂</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. HẬU TỐ (SUFFIX) */}
                <div className="p-2 border border-purple-100 rounded-lg bg-purple-50/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-650">Hậu tố (Suffix)</label>
                    <span className="text-[9px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-mono">Sau content</span>
                  </div>
                  <input
                    type="text"
                    value={selectedObject.suffixText || ""}
                    placeholder="Mặc định thêm vào sau..."
                    onChange={(e) => handleAttributeChange("suffixText", e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-250 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-semibold text-slate-800"
                  />
                  {selectedObject.suffixText && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Font Size */}
                        <div>
                          <label className="block text-[9.5px] text-slate-500 font-bold mb-0.5">Cỡ chữ (pt)</label>
                          <input
                            type="number"
                            min={4}
                            max={72}
                            value={selectedObject.suffixFontSize || selectedObject.fontSize || 11}
                            onChange={(e) => handleAttributeChange("suffixFontSize", Number(e.target.value))}
                            className="w-full px-1.5 py-0.5 text-[11px] border border-gray-200 rounded-md focus:border-kiot-cyan focus:outline-none bg-white font-mono font-semibold"
                          />
                        </div>
                        {/* Font Family */}
                        <div>
                          <label className="block text-[9.5px] text-slate-500 font-bold mb-0.5">Font chữ</label>
                          <select
                            value={selectedObject.suffixFontFamily || "sans-serif"}
                            onChange={(e) => handleAttributeChange("suffixFontFamily", e.target.value)}
                            className="w-full pl-1.5 pr-4 py-0.5 text-[11px] border border-gray-200 rounded-md focus:border-kiot-cyan focus:outline-none bg-white font-bold text-slate-800 cursor-pointer"
                          >
                            <option value="sans-serif">Sans-serif</option>
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times Roman</option>
                            <option value="Tahoma">Tahoma</option>
                            <option value="monospace">Mono</option>
                          </select>
                        </div>
                      </div>

                      {/* Formatting bar: Bold, Italic, Underline, Strikethrough, Sub/Sup */}
                      <div className="flex gap-1 items-center bg-gray-50 border border-gray-200 p-0.5 rounded-md">
                        {/* Bold */}
                        <button
                          type="button"
                          onClick={() => handleAttributeChange("suffixFontWeight", selectedObject.suffixFontWeight === "bold" ? "normal" : "bold")}
                          className={`flex-1 py-0.5 flex items-center justify-center rounded text-xs ${selectedObject.suffixFontWeight === "bold" ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/20" : "text-gray-400 hover:text-gray-700"}`}
                        >
                          <Bold className="w-3 h-3" />
                        </button>
                        {/* Italic */}
                        <button
                          type="button"
                          onClick={() => handleAttributeChange("suffixFontStyle", selectedObject.suffixFontStyle === "italic" ? "normal" : "italic")}
                          className={`flex-1 py-0.5 flex items-center justify-center rounded text-xs ${selectedObject.suffixFontStyle === "italic" ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/20" : "text-gray-400 hover:text-gray-700"}`}
                        >
                          <Italic className="w-3 h-3" />
                        </button>
                        {/* Underline */}
                        <button
                          type="button"
                          onClick={() => handleAttributeChange("suffixTextDecorationUnderline", !selectedObject.suffixTextDecorationUnderline)}
                          className={`flex-1 py-0.5 flex items-center justify-center rounded text-xs ${selectedObject.suffixTextDecorationUnderline ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/20" : "text-gray-400 hover:text-gray-700"}`}
                        >
                          <Underline className="w-3 h-3" />
                        </button>
                        {/* Strikethrough */}
                        <button
                          type="button"
                          onClick={() => handleAttributeChange("suffixTextDecorationLineThrough", !selectedObject.suffixTextDecorationLineThrough)}
                          className={`flex-1 py-0.5 flex items-center justify-center rounded text-xs ${selectedObject.suffixTextDecorationLineThrough ? "bg-white text-kiot-navy font-bold shadow-sm ring-1 ring-kiot-cyan/20" : "text-gray-400 hover:text-gray-700"}`}
                        >
                          <Strikethrough className="w-3 h-3" />
                        </button>
                        <div className="w-px h-4 bg-gray-200 inline-block" />
                        {/* Sub/Sup indicator */}
                        <select
                          value={selectedObject.suffixTextSuperSub || "normal"}
                          onChange={(e) => handleAttributeChange("suffixTextSuperSub", e.target.value)}
                          className="text-[10px] bg-transparent border-none outline-none font-bold text-slate-700 cursor-pointer p-0 shrink-0"
                        >
                          <option value="normal">Thường</option>
                          <option value="superscript">A²</option>
                          <option value="subscript">A₂</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hướng căn chỉnh và dòng chảy khi nhiều dòng */}
              <div className="pt-1.5 border-t border-gray-250/60 pb-0.5">
                <label className="block text-[11px] text-slate-650 font-bold mb-1 flex items-center space-x-1">
                  <span>Điểm neo / Dòng chảy văn bản</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedObject.textFlowOrigin || "top-left"}
                    onChange={(e) => {
                      const origin = e.target.value as any;
                      let align: 'left' | 'center' | 'right' = 'left';
                      if (origin.endsWith('center') || origin === 'center') align = 'center';
                      if (origin.endsWith('right')) align = 'right';
                      
                      handleAttributeChange("textFlowOrigin", origin);
                      handleAttributeChange("textAlign", align);
                    }}
                    className="w-full pl-2 pr-6 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-bold text-slate-800 cursor-pointer appearance-none"
                  >
                    <option value="top-left">Top Left (Trống trên góc Trái)</option>
                    <option value="top-center">Top Center (Căn trên ở Giữa)</option>
                    <option value="top-right">Top Right (Căn trên góc Phải)</option>
                    <option value="center-left">Center Left (Chính giữa bên Trái)</option>
                    <option value="center">Center (Chính giữa trung tâm)</option>
                    <option value="center-right">Center Right (Chính giữa bên Phải)</option>
                    <option value="bottom-left">Bottom Left (Căn dưới góc Trái)</option>
                    <option value="bottom-center">Bottom Center (Căn dưới ở Giữa)</option>
                    <option value="bottom-right">Bottom Right (Căn dưới góc Phải)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

            </div>

            {/* Vị trí & Kích thước (Collapsible) */}
            {renderPositionPanel()}
          </div>
        )}

        {/* BARCODE EXCLUSIVE ATTRIBUTES - STRICT USER INSTRUCTIONS SPECIFIED ORDER */}
        {selectedObject.type === "barcode" && (
          <div className="space-y-2.5">
            {/* 1. Phần Mã vạch (giá trị) */}
            <div className="space-y-1.5">
              <label className="block text-[11.5px] font-black text-slate-705 uppercase tracking-wider mb-0.5">Mã vạch (Giá trị)</label>

              {/* Way 1: Nhập thủ công */}
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-black text-slate-550 uppercase tracking-wide">Nhập:</span>
                  <span className="text-[10.5px] text-slate-450 font-bold select-none italic">(Điền giá trị cố định)</span>
                </div>
                <input
                  type="text"
                  value={selectedObject.content}
                  disabled={!!selectedObject.excelColumn}
                  onChange={(e) => handleAttributeChange("content", e.target.value)}
                  className={`w-full p-2 text-xs border border-gray-200 rounded-md font-mono focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none ${
                    selectedObject.excelColumn ? "bg-gray-100 text-gray-450 select-none cursor-not-allowed font-bold italic" : "bg-white text-slate-800 font-bold"
                  }`}
                  placeholder={selectedObject.excelColumn ? `Lấy mã vạch từ cột [${selectedObject.excelColumn}]` : "Ví dụ: CODE128, EAN13..."}
                />
                {selectedObject.excelColumn && (
                  <p className="text-[10.5px] text-amber-600 font-bold mt-0.5">
                    ⚠️ Đang nối Excel. Giá trị mã vạch bị ẩn.
                  </p>
                )}
              </div>

              {/* Separator: Hoặc */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-1.5 text-[10px] font-black text-gray-400 bg-white uppercase tracking-widest select-none px-1">Hoặc</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Way 2: renderExcelLinker */}
              {renderExcelLinker()}
            </div>

            {/* 3. Chuẩn mã vạch, Độ rộng, Chiều cao mã */}
            <div className="pt-1.5 border-t border-gray-100/50 space-y-2 font-sans">
              <div>
                <label className="block text-[11px] text-slate-650 font-bold mb-0.5 uppercase tracking-wider">Chuẩn mã vạch</label>
                <div className="relative">
                  <select
                    value={selectedObject.barcodeFormat || "CODE128"}
                    onChange={(e) => handleAttributeChange("barcodeFormat", e.target.value)}
                    className="w-full pl-2 pr-6 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white appearance-none text-slate-800 font-bold"
                  >
                    <option value="CODE128">CODE128 (Chữ &amp; số - Khuyên dùng)</option>
                    <option value="EAN13">EAN-13 (13 chữ số - Châu Âu/VN)</option>
                    <option value="CODE39">CODE39 (Chữ &amp; số cơ bản)</option>
                    <option value="UPCA">UPC-A (12 chữ số - Mỹ)</option>
                    <option value="ITF">ITF (Nhập hàng hóa)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2  w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-650 font-bold mb-0.5">Độ rộng vạch (1-4)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    step="0.5"
                    value={selectedObject.barcodeWidth || 2}
                    onChange={(e) => handleAttributeChange("barcodeWidth", parseFloat(e.target.value) || 2)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-650 font-bold mb-0.5">Cao mã (mm)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={selectedObject.barcodeHeight || 15}
                    onChange={(e) => handleAttributeChange("barcodeHeight", parseInt(e.target.value) || 15)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* 4. Cấu hình chữ nhãn */}
            <div className="pt-1.5 border-t border-gray-200/65 space-y-1 font-sans">
              <label className="block text-[11px] text-slate-705 font-black uppercase tracking-wider mb-0.5">Cấu hình chữ nhãn:</label>
              
              <div className="flex items-center space-x-2">
                <input
                  id="barcode-show-above-chk"
                  type="checkbox"
                  checked={!!selectedObject.barcodeShowTextAbove}
                  onChange={(e) => handleAttributeChange("barcodeShowTextAbove", e.target.checked)}
                  className="w-3.5 h-3.5 text-kiot-cyan border-gray-300 rounded focus:ring-kiot-cyan/50 cursor-pointer"
                />
                <label htmlFor="barcode-show-above-chk" className="text-[11.5px] text-slate-700 font-semibold select-none cursor-pointer">
                  Hiển thị số/chữ bên trên mã vạch
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="barcode-show-below-chk"
                  type="checkbox"
                  checked={selectedObject.barcodeShowTextBelow !== false && selectedObject.displayValue !== false}
                  onChange={(e) => {
                    handleAttributeChange("barcodeShowTextBelow", e.target.checked);
                    handleAttributeChange("displayValue", e.target.checked);
                  }}
                  className="w-3.5 h-3.5 text-kiot-cyan border-gray-300 rounded focus:ring-kiot-cyan/50 cursor-pointer"
                />
                <label htmlFor="barcode-show-below-chk" className="text-[11.5px] text-slate-700 font-semibold select-none cursor-pointer">
                  Hiển thị số/chữ bên dưới mã vạch
                </label>
              </div>
            </div>

            {/* BARCODE TEXT FORMATTING */}
            {((selectedObject.barcodeShowTextAbove) || (selectedObject.barcodeShowTextBelow !== false && selectedObject.displayValue !== false)) && (
              <div className="pt-2 border-t border-gray-150 space-y-2 bg-slate-50/50 p-2 rounded-md border border-gray-150 font-sans">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-650 font-bold mb-0.5">Cỡ chữ (pt)</label>
                    <input
                      type="number"
                      min="4"
                      max="72"
                      value={selectedObject.barcodeFontSize || 11}
                      onChange={(e) => handleAttributeChange("barcodeFontSize", parseInt(e.target.value) || 11)}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-650 font-bold mb-0.5">Font Chữ</label>
                    <div className="relative">
                      <select
                        value={selectedObject.barcodeFontFamily || "sans-serif"}
                        onChange={(e) => handleAttributeChange("barcodeFontFamily", e.target.value)}
                        className="w-full pl-2 pr-6 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white appearance-none text-slate-800 font-bold"
                      >
                        <option value="sans-serif">Chữ thường (Sans)</option>
                        <option value="Arial">Arial</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Tahoma">Tahoma</option>
                        <option value="monospace">Mã máy (Mono)</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-2  w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-650 font-bold mb-0.5">Khoảng cách tới mã vạch (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={selectedObject.barcodeTextMargin !== undefined ? selectedObject.barcodeTextMargin : 0.3}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleAttributeChange("barcodeTextMargin", !isNaN(val) ? val : 0.3);
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <div className="flex-1">
                    <span className="block text-[10.5px] text-slate-550 font-bold mb-0.5">Độ đậm</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleAttributeChange(
                          "barcodeFontWeight",
                          selectedObject.barcodeFontWeight === "bold" ? "normal" : "bold"
                        )
                      }
                      className={`w-full py-1.5 flex items-center justify-center border rounded-md transition cursor-pointer ${
                        selectedObject.barcodeFontWeight === "bold"
                          ? "bg-sky-50/50 border-kiot-cyan text-kiot-navy font-bold ring-1 ring-kiot-cyan shadow-sm"
                          : "bg-white border-gray-250 text-gray-550 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5 mr-0.5 text-kiot-navy" />
                      <span className="text-[11px] font-bold">Tô đậm</span>
                    </button>
                  </div>

                  <div className="flex-1">
                    <span className="block text-[10.5px] text-slate-550 font-bold mb-0.5">In nghiêng</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleAttributeChange(
                          "barcodeFontStyle",
                          selectedObject.barcodeFontStyle === "italic" ? "normal" : "italic"
                        )
                      }
                      className={`w-full py-1.5 flex items-center justify-center border rounded-md transition cursor-pointer ${
                        selectedObject.barcodeFontStyle === "italic"
                          ? "bg-sky-50/50 border-kiot-cyan text-kiot-navy italic font-bold ring-1 ring-kiot-cyan shadow-sm"
                          : "bg-white border-gray-250 text-gray-550 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Italic className="w-3.5 h-3.5 mr-0.5 text-kiot-navy" />
                      <span className="text-[11px] font-bold">Nghiêng</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Vị trí & Kích thước (Collapsible) at the end */}
            {renderPositionPanel()}
          </div>
        )}

        {/* QR CODE EXCLUSIVE ATTRIBUTES */}
        {selectedObject.type === "qrcode" && (
          <div className="space-y-2.5">
            {/* Nội dung QR Code */}
            <div className="space-y-1.5">
              <label className="block text-[11.5px] font-black text-slate-705 uppercase tracking-wider mb-0.5">Nội dung QR Code</label>

              {/* Way 1: Nhập thủ công */}
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-black text-slate-550 uppercase tracking-wide">Nhập:</span>
                  <span className="text-[10.5px] text-slate-450 font-bold select-none italic">(Điền nội dung cố định)</span>
                </div>
                <textarea
                  rows={2}
                  value={selectedObject.content}
                  disabled={!!selectedObject.excelColumn}
                  onChange={(e) => handleAttributeChange("content", e.target.value)}
                  className={`w-full p-2 text-xs border border-gray-200 rounded-md font-mono focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none ${
                    selectedObject.excelColumn ? "bg-gray-100 text-gray-450 select-none cursor-not-allowed font-semibold italic" : "bg-white text-slate-800 font-bold"
                  }`}
                  placeholder={selectedObject.excelColumn ? `Lấy dữ liệu QR từ cột [${selectedObject.excelColumn}]` : "Ví dụ: URL, số tài khoản, chuỗi mã hóa..."}
                />
                {selectedObject.excelColumn && (
                  <p className="text-[10.5px] text-amber-600 font-bold mt-0.5">
                    ⚠️ Đang nối Excel. Nội dung QR bị ẩn.
                  </p>
                )}
              </div>

              {/* Separator: Hoặc */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-1.5 text-[10px] font-black text-gray-400 bg-white uppercase tracking-widest select-none px-1">Hoặc</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Way 2: renderExcelLinker */}
              {renderExcelLinker()}
            </div>

            <div className="text-[11px] text-gray-600 font-bold leading-relaxed bg-slate-50 p-2 rounded-md border border-gray-200">
              💡 <strong>Mẹo:</strong> QR Code sẽ tự động tăng mật độ nén dựa trên độ dài dữ liệu để máy quét/camera nhận dạng nhanh nhất.
            </div>

            {/* Vị trí & Kích thước (Collapsible) */}
            {renderPositionPanel()}
          </div>
        )}

        {/* IMAGE EXCLUSIVE ATTRIBUTES */}
        {selectedObject.type === "image" && (
          <div className="space-y-2.5">
            {/* Nguồn hình ảnh */}
            <div className="space-y-1.5">
              <label className="block text-[11.5px] font-black text-slate-705 mb-0.5">Nguồn hình ảnh (URL hoặc Base64)</label>
              <textarea
                rows={2}
                value={selectedObject.content.startsWith("data:") ? "[Dữ liệu ảnh tải lên]" : selectedObject.content}
                disabled={selectedObject.content.startsWith("data:") || !!selectedObject.excelColumn}
                onChange={(e) => handleAttributeChange("content", e.target.value)}
                className={`w-full p-2 text-xs border border-gray-200 rounded-md font-mono focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white text-slate-800 disabled:bg-gray-100 disabled:text-gray-500`}
                placeholder="Dán đường dẫn ảnh hoặc kéo thả ảnh mới vào..."
              />
              {selectedObject.content.startsWith("data:") && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-green-600 font-bold">✓ Ảnh đã tải lên (Offline)</span>
                  <button
                     type="button"
                     onClick={() => {
                       const input = document.createElement("input");
                       input.type = "file";
                       input.accept = "image/*";
                       input.onchange = (e) => {
                         const file = (e.target as HTMLInputElement).files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.onload = (re) => {
                             if (re.target?.result) {
                               handleAttributeChange("content", re.target.result as string);
                             }
                           };
                           reader.readAsDataURL(file);
                         }
                       };
                       input.click();
                     }}
                     className="text-[11px] text-kiot-cyan hover:underline font-black cursor-pointer"
                  >
                     Thay đổi ảnh...
                   </button>
                </div>
              )}
            </div>

            {/* Configurations & Scaling controls */}
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-100/50">
              <div>
                <label className="block text-[11px] text-slate-650 font-bold mb-0.5">Tỷ lệ (Fit)</label>
                <div className="relative">
                  <select
                    value={selectedObject.imageFit || "contain"}
                    onChange={(e) => handleAttributeChange("imageFit", e.target.value as any)}
                    className="w-full pl-2 pr-6 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white appearance-none text-slate-800 font-bold"
                  >
                    <option value="contain">Thu vừa (Contain)</option>
                    <option value="cover">Phủ kín (Cover)</option>
                    <option value="fill">Kéo giãn (Fill)</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-2  w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-650 font-bold mb-0.5">Độ mờ (Opacity)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedObject.imageOpacity !== undefined ? selectedObject.imageOpacity : 1}
                  onChange={(e) => handleAttributeChange("imageOpacity", parseFloat(e.target.value) || 1)}
                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-kiot-cyan focus:ring-1 focus:ring-kiot-cyan focus:outline-none bg-white font-mono font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="text-[11px] text-gray-600 font-bold leading-relaxed bg-slate-50 p-2 rounded-md border border-gray-200">
              💡 <strong>Mẹo:</strong> Có thể trực tiếp kéo và thả một file hình ảnh (.png, .jpg...) từ máy tính thả vào khung thiết kế để làm logo nhãn động.
            </div>

            {/* Vị trí & Kích thước (Collapsible) */}
            {renderPositionPanel()}
          </div>
        )}
      </main>

      {/* DELETE OBJECT BUTTON */}
      <div className="pt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={() => onDeleteObject(selectedObject.id)}
          className="w-full py-1.5 px-3 border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-md flex items-center justify-center space-x-1.5 text-[11.5px] font-black uppercase transition duration-150 cursor-pointer shadow-sm animate-pulse-subtle"
        >
          <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
          <span>Xoá Đối Tượng</span>
        </button>
      </div>
    </div>
  );
}
