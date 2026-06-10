/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { LABEL_TEMPLATES } from "../templates";
import { LabelConfig, LabelObject, SheetLayoutConfig } from "../types";
import { Layers, FileText, Barcode, QrCode, Tag, ShoppingCart, Eye, Sparkles, Inbox } from "lucide-react";

interface TemplateSelectorProps {
  onSelectTemplate: (
    config: LabelConfig,
    objects: LabelObject[],
    sheetConfig?: Partial<SheetLayoutConfig>
  ) => void;
}

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>("common");

  // Helper to categorize template names
  const getCategoryOfTemplate = (name: string): string => {
    const norm = name.toLowerCase();
    if (norm.includes("kệ") || norm.includes("siêu thị")) {
      return "supermarket";
    }
    if (norm.includes("mắt kính") || norm.includes("kính")) {
      return "glasses";
    }
    return "common"; // Default or common tag price
  };

  const getCountForCategory = (catId: string): number => {
    if (catId === "jewelry") return 0;
    return LABEL_TEMPLATES.filter((t) => getCategoryOfTemplate(t.name) === catId).length;
  };

  const categories = [
    { id: "common", name: "Tem giá phổ biến", icon: Tag, colorClass: "text-emerald-500 bg-emerald-50" },
    { id: "supermarket", name: "Tem kệ siêu thị", icon: ShoppingCart, colorClass: "text-amber-500 bg-amber-50" },
    { id: "glasses", name: "Tem mắt kính", icon: Eye, colorClass: "text-indigo-500 bg-indigo-50" },
    { id: "jewelry", name: "Tem trang sức", icon: Sparkles, colorClass: "text-pink-500 bg-pink-50" },
  ];

  const filteredTemplates = LABEL_TEMPLATES.filter(
    (t) => getCategoryOfTemplate(t.name) === activeCategory
  );

  return (
    <div id="template-selector" className="space-y-4">
      {/* Selector Header */}
      <div className="flex items-center space-x-2 text-gray-700 pb-1 border-b border-gray-100">
        <Layers className="w-5 h-5 text-kiot-cyan" />
        <h3 className="font-semibold text-sm text-kiot-navy">Mẫu Thiết Kế Sẵn Có</h3>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-col gap-1.5 no-print" id="template-category-tabs">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isActive = activeCategory === cat.id;
          const count = getCountForCategory(cat.id);

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? "border-kiot-cyan bg-sky-50/50 text-kiot-navy shadow-xs font-bold ring-1 ring-kiot-cyan/20"
                  : "border-slate-200 hover:border-slate-350 bg-white text-slate-600 hover:bg-slate-50 font-medium"
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-md shrink-0 ${cat.colorClass}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="text-[12.5px]">{cat.name}</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive
                    ? "bg-kiot-cyan text-white shadow-2xs"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {LABEL_TEMPLATES.length === 0 ? (
        <div className="space-y-3 pt-1">
          <p className="text-[11.5px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg font-medium leading-relaxed">
            ✨ Đã làm sạch các mẫu cũ mặc định thành công! Bây giờ bạn có thể dễ dàng gửi mô tả hoặc ảnh chụp mẫu nhãn dán cho tôi để thiết kế bổ sung.
          </p>
          
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs space-y-2 text-slate-700">
            <span className="font-extrabold text-kiot-navy block text-[13px] border-b border-slate-200 pb-1.5">📝 Cách thức gửi mẫu cho trợ lý:</span>
            <p className="leading-relaxed font-bold">Bạn có thể gửi bằng 2 cách:</p>
            <ol className="list-decimal pl-4.5 space-y-1.5 font-semibold text-slate-650 leading-relaxed text-[11px]">
              <li><strong className="text-slate-800">Cách 1: Gửi ảnh chụp thực tế</strong> (Kèm kích thước rộng x cao, tôi sẽ tự phân tích và vẽ lại chuẩn xác bố cục tem).</li>
              <li><strong className="text-slate-800">Cách 2: Gửi theo mẫu mô tả bằng chữ</strong> theo form dưới đây.</li>
            </ol>
            
            <div className="mt-3 bg-white border border-slate-200 p-2.5 rounded-md font-mono text-[10.5px] text-slate-600 select-text overflow-x-auto whitespace-pre leading-normal shadow-xs">
{`---- PHORM GỬI MẪU NHÃN ----
1. Kích thước tem rộng x cao (mm): e.g. 65mm x 45mm
2. Loại giấy in: Cuộn/A4/A5
3. Mục đích sử dụng / Tên mẫu: e.g. Tem giá, Tem phụ...
4. Các phần tử trên tem nhãn:
   - Chữ 1: "TÊN CỬA HÀNG" (Vị trí, kích thước chữ...)
   - Chữ 2: "Tên mặt hàng: {Tên sản phẩm}"
   - Chữ 3: "Giá bán: {Giá bán}"
   - Barcode / Mã vạch: Mã từ cột nào (e.g. Mã hàng)
   - QR Code: Giá trị chứa gì (e.g. Link thanh toán, mã tài sản)
5. Nội dung mặc định mẫu hiển thị.`}
            </div>
            
            <div className="text-[10px] text-slate-400 font-bold leading-relaxed pt-1">
              💡 Hãy gửi ảnh hoặc các thông tin trên tại ô chat bên dưới bất cứ lúc nào!
            </div>
          </div>
        </div>
      ) : (
        <>
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-250 bg-slate-50/50 rounded-xl text-center space-y-2">
              <div className="p-2 bg-slate-100 rounded-full text-slate-400">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="text-[11.5px] text-slate-600 font-semibold">Chưa có thiết kế mẫu trong nhóm này</p>
              <p className="text-[10px] text-slate-400 leading-normal max-w-[210px] font-medium">
                Bạn có thể tự thiết kế bằng bảng vẽ, hoặc gửi hình ảnh/mô tả mẫu qua chat để trợ lý thiết kế bổ sung cho bạn!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 max-h-[350px] overflow-y-auto pr-1">
              {filteredTemplates.map((template, idx) => {
                const textCount = template.objects.filter((o) => o.type === "text").length;
                const barcodeCount = template.objects.filter((o) => o.type === "barcode").length;
                const qrCount = template.objects.filter((o) => o.type === "qrcode").length;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectTemplate(template.config, template.objects, template.sheetConfig)}
                    className="text-left p-3 rounded-lg border border-gray-200 hover:border-kiot-cyan hover:bg-sky-50/30 active:bg-sky-100/50 transition-all duration-200 group relative block cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-xs text-slate-800 group-hover:text-kiot-navy transition-colors">
                        {template.name}
                      </span>
                      <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-650 shrink-0 font-bold">
                        {template.config.width}x{template.config.height}mm
                      </span>
                    </div>
                    <p className="text-[11.5px] text-gray-500 line-clamp-2 leading-relaxed mb-2 font-medium">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center space-x-3 text-[10px] text-gray-400 font-semibold">
                      {textCount > 0 && (
                        <span className="flex items-center space-x-1">
                          <FileText className="w-3 h-3 text-sky-400" />
                          <span>{textCount} Chữ</span>
                        </span>
                      )}
                      {barcodeCount > 0 && (
                        <span className="flex items-center space-x-1">
                          <Barcode className="w-3 h-3 text-emerald-400" />
                          <span>{barcodeCount} Barcode</span>
                        </span>
                      )}
                      {qrCount > 0 && (
                        <span className="flex items-center space-x-1">
                          <QrCode className="w-3 h-3 text-blue-400" />
                          <span>{qrCount} QR</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

