/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LABEL_TEMPLATES } from "../templates";
import { LabelConfig, LabelObject } from "../types";
import { Layers, FileText, Barcode, QrCode } from "lucide-react";

interface TemplateSelectorProps {
  onSelectTemplate: (config: LabelConfig, objects: LabelObject[]) => void;
}

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  return (
    <div id="template-selector" className="space-y-3">
      <div className="flex items-center space-x-2 text-gray-700 pb-1 border-b border-gray-100">
        <Layers className="w-5 h-5 text-kiot-cyan" />
        <h3 className="font-semibold text-sm">Mẫu Thiết Kế Sẵn Có</h3>
      </div>
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
              onClick={() => onSelectTemplate(template.config, template.objects)}
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
    </div>
  );
}
