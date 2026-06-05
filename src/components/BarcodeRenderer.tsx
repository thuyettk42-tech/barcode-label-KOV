/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, memo } from "react";

interface BarcodeRendererProps {
  content: string;
  format?: 'CODE128' | 'EAN13' | 'CODE39' | 'UPCA' | 'ITF';
  displayValue?: boolean;
  fontSize?: number;
  barcodeWidth?: number;
  barcodeHeight?: number;
  pixelScale?: number;

  barcodeShowTextAbove?: boolean;
  barcodeShowTextBelow?: boolean;
  barcodeFontFamily?: string;
  barcodeFontSize?: number;
  barcodeFontWeight?: 'normal' | 'bold';
  barcodeFontStyle?: 'normal' | 'italic';
  barcodeTextMargin?: number;
}

export const BarcodeRenderer = memo(function BarcodeRenderer({
  content,
  format = "CODE128",
  displayValue = true,
  fontSize = 11,
  barcodeWidth = 2,
  barcodeHeight = 15,
  pixelScale,
  barcodeShowTextAbove = false,
  barcodeShowTextBelow,
  barcodeFontFamily = "sans",
  barcodeFontSize,
  barcodeFontWeight = "normal",
  barcodeFontStyle = "normal",
  barcodeTextMargin,
}: BarcodeRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showAbove = barcodeShowTextAbove;
  const showBelow = barcodeShowTextBelow ?? displayValue;
  const finalFontSizePt = barcodeFontSize ?? fontSize;

  useEffect(() => {
    if (!svgRef.current) return;

    const JsBarcode = (window as any).JsBarcode;
    if (!JsBarcode) {
      setError("JsBarcode library not loaded from CDN.");
      return;
    }

    // Input validations based on barcode standards
    const cleanContent = content.trim();
    if (!cleanContent) {
      setError("Dữ liệu trống");
      return;
    }

    if (format === "EAN13") {
      if (!/^\d{12,13}$/.test(cleanContent)) {
        setError("EAN13 yêu cầu 12 hoặc 13 chữ số");
        return;
      }
    } else if (format === "UPCA") {
      if (!/^\d{11,12}$/.test(cleanContent)) {
        setError("UPCA yêu cầu 11 hoặc 12 chữ số");
        return;
      }
    } else if (format === "ITF") {
      if (!/^\d+$/.test(cleanContent) || cleanContent.length % 2 !== 0) {
        setError("ITF yêu cầu chữ số và độ dài chẵn");
        return;
      }
    }

    setError(null);

    const finalPixelScale = pixelScale ?? 3.7795;
    const actualHeight = Math.max(5, Math.round(barcodeHeight * finalPixelScale));

    try {
      JsBarcode(svgRef.current, cleanContent, {
        format: format,
        width: barcodeWidth,
        height: actualHeight,
        displayValue: false, // We render the text ourselves in React DOM for super tight padding & advanced styling!
        margin: 0,
        background: "transparent",
        lineColor: "#000000",
        // Avoid rendering crashing the React life cycle
        valid: (valid: boolean) => {
          if (!valid) {
            setError("Mã vạch không hợp lệ với chuẩn " + format);
          }
        }
      });
    } catch (err) {
      console.error("Barcode execution fail:", err);
      setError("Lỗi render mã vạch");
    }
  }, [content, format, barcodeWidth, barcodeHeight, pixelScale]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-1 border-2 border-dashed border-red-300 bg-red-50 text-red-600 rounded text-center select-none overflow-hidden">
        <span className="font-bold text-[10px] leading-tight select-none">⚠️ {error}</span>
        <span className="text-[9px] text-red-500 truncate w-full select-none">{content}</span>
      </div>
    );
  }

  const finalPixelScale = pixelScale ?? 3.7795;
  
  // Resolve family font mapping
  let resolvedFontFamily = "var(--font-sans)";
  if (barcodeFontFamily === "Arial") {
    resolvedFontFamily = "Arial, Helvetica, sans-serif";
  } else if (barcodeFontFamily === "Times New Roman") {
    resolvedFontFamily = "'Times New Roman', Times, serif";
  } else if (barcodeFontFamily === "Tahoma") {
    resolvedFontFamily = "Tahoma, Geneva, sans-serif";
  } else if (barcodeFontFamily === "monospace") {
    resolvedFontFamily = "var(--font-mono)";
  }

  const textStyle = {
    fontFamily: resolvedFontFamily,
    fontSize: `${finalFontSizePt * 0.352777 * finalPixelScale}px`,
    fontWeight: barcodeFontWeight,
    fontStyle: barcodeFontStyle,
  };

  const marginMm = barcodeTextMargin !== undefined ? barcodeTextMargin : 0.3;
  const marginPx = marginMm * finalPixelScale;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden select-none">
      {showAbove && (
        <div 
          style={{ ...textStyle, marginBottom: `${marginPx}px` }} 
          className="leading-tight select-none truncate text-center max-w-full"
        >
          {content}
        </div>
      )}
      <div className="flex items-center justify-center overflow-hidden">
        <svg ref={svgRef} className="max-w-full max-h-full block" />
      </div>
      {showBelow && (
        <div 
          style={{ ...textStyle, marginTop: `${marginPx}px` }} 
          className="leading-tight select-none truncate text-center max-w-full"
        >
          {content}
        </div>
      )}
    </div>
  );
});
