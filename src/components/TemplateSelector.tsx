/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LABEL_TEMPLATES } from "../templates";
import { LabelConfig, LabelObject, SheetLayoutConfig } from "../types";
import { Layers, FileText, Barcode, QrCode } from "lucide-react";

interface TemplateSelectorProps {
  onSelectTemplate: (
    config: LabelConfig,
    objects: LabelObject[],
    sheetConfig?: Partial<SheetLayoutConfig>
  ) => void;
}

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  return (
    <div id="template-selector" className="space-y-3">
      <div className="flex items-center space-x-2 text-gray-700 pb-1 border-b border-gray-100">
        <Layers className="w-5 h-5 text-kiot-cyan" />
        <h3 className="font-semibold text-sm">Mẫu Thiết Kế Sẵn Có</h3>
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
          <p className="text-xs text-gray-500">
            Chọn một mẫu nhãn bên dưới để nạp nhanh cấu hình chuẩn:
          </p>
          
          <div className="grid grid-cols-1 gap-2.5 max-h-[350px] overflow-y-auto pr-1">
            {LABEL_TEMPLATES.map((template, idx) => {
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
                    <span className="font-medium text-xs text-slate-800 group-hover:text-kiot-navy transition-colors">
                      {template.name}
                    </span>
                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 shrink-0">
                      {template.config.width}x{template.config.height}mm
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-2">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center space-x-3 text-[10px] text-gray-400">
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
        </>
      )}
    </div>
  );
}
