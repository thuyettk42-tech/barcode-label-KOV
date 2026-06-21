/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, memo, useMemo } from "react";
import JsBarcode from "jsbarcode";
import { BASE_DPI_SCALE } from "../utils";

interface BarcodeRendererProps {
  content: string;
  format?: "CODE128" | "EAN13" | "CODE39";
  displayValue?: boolean;
  fontSize?: number;
  barcodeWidth?: number;
  barcodeHeight?: number;
  pixelScale?: number;

  barcodeShowTextAbove?: boolean;
  barcodeShowTextBelow?: boolean;
  barcodeFontFamily?: string;
  barcodeFontSize?: number;
  barcodeFontWeight?: "normal" | "bold";
  barcodeFontStyle?: "normal" | "italic";
  barcodeTextMargin?: number;
  textFlowOrigin?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "center-left"
    | "center"
    | "center-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  onUpdateContent?: (newVal: string) => void;
  color?: string;
  barcodeTextColor?: string;
}

interface ValidationResult {
  valid: boolean;
  error: string | null;
  encodedContent: string;
}

// EAN-13 checksum calculation (standard 12-digit base to find 13th digit)
function calculateEAN13Checksum(first12Digits: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12Digits[i] || "0", 10);
    // Even idx (odd positions) weight is 1. Odd idx (even positions) weight is 3.
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

// Shared dynamic formatter & corrector to safely handle any raw user input gracefully
function processBarcodeContent(
  content: string,
  format: string,
): ValidationResult {
  const raw = content.trim();
  if (!raw) {
    return { valid: false, error: "Dữ liệu trống", encodedContent: "" };
  }

  if (format === "EAN13") {
    // Keep only digits
    const digitsOnly = raw.replace(/\D/g, "");
    if (digitsOnly.length < 12) {
      return {
        valid: false,
        error: "EAN13 yêu cầu ít nhất 12 chữ số",
        encodedContent: "",
      };
    }
    const first12 = digitsOnly.substring(0, 12);
    const checksum = calculateEAN13Checksum(first12);
    const corrected = first12 + checksum;
    return { valid: true, error: null, encodedContent: corrected };
  }

  if (format === "CODE39") {
    // Convert to uppercase
    const upper = raw.toUpperCase();
    // Validate characters
    if (!/^[A-Z0-9\s\-\.\$\/\+\%]+$/.test(upper)) {
      return {
        valid: false,
        error:
          "CODE39 chỉ hỗ trợ ký tự chữ hoa, số và [-, ., $, /, +, %, khoảng trắng]",
        encodedContent: "",
      };
    }
    return { valid: true, error: null, encodedContent: upper };
  }

  // DEFAULT (CODE128)
  return { valid: true, error: null, encodedContent: raw };
}

export const BarcodeRenderer = memo(function BarcodeRenderer({
  content,
  format = "CODE128",
  displayValue = true,
  fontSize = 7,
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
  textFlowOrigin = "center",
  onUpdateContent,
  color,
  barcodeTextColor,
}: BarcodeRendererProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(content);
  const contentBeforeEdit = useRef(content);

  // Synchronize temp value with actual prop updates
  useEffect(() => {
    setTempValue(content);
  }, [content]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    contentBeforeEdit.current = content;
    setIsEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTempValue(val);
    if (onUpdateContent) {
      onUpdateContent(val);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
    } else if (e.key === "Escape") {
      if (onUpdateContent) {
        onUpdateContent(contentBeforeEdit.current);
      }
      setIsEditing(false);
    }
    e.stopPropagation();
  };

  // Process input dynamically during the render cycle
  const validation = processBarcodeContent(content, format);
  const effectiveContent = validation.valid ? validation.encodedContent : "";

  // Purely synchronous SVG rendering to prevent blank printing components
  const { svgHtml, viewBox, isBarcodeValid } = useMemo(() => {
    let outHtml = "";
    let outViewBox = "0 0 100 100";
    let isValid = true;

    if (validation.valid && effectiveContent && typeof document !== "undefined") {
      try {
        const baseScale = BASE_DPI_SCALE;
        const actualHeight = Math.max(5, Math.round(barcodeHeight * baseScale));
        const svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        JsBarcode(svgContainer, effectiveContent, {
          format: format,
          width: barcodeWidth,
          height: actualHeight,
          displayValue: false, // Custom structured text elements are outputted below for high-precision formatting
          margin: 0,
          background: "transparent",
          lineColor: color || "#000000",
          valid: (validStatus: boolean) => {
            isValid = validStatus;
          },
        });

        if (isValid) {
          const rawWidth = svgContainer.getAttribute("width");
          const rawHeight = svgContainer.getAttribute("height");
          if (rawWidth && rawHeight) {
            outViewBox = `0 0 ${rawWidth} ${rawHeight}`;
          }
          outHtml = svgContainer.innerHTML;
        }
      } catch (err) {
        console.error("Barcode generation failed in render phase:", err);
        isValid = false;
      }
    }
    return { svgHtml: outHtml, viewBox: outViewBox, isBarcodeValid: isValid };
  }, [effectiveContent, format, barcodeWidth, barcodeHeight, color]);

  const effectiveError = validation.error || (!isBarcodeValid ? "Không thể mã hóa giá trị này theo chuẩn " + format : null);

  const showAbove = barcodeShowTextAbove;
  const showBelow = barcodeShowTextBelow ?? displayValue;
  const finalFontSizePt = barcodeFontSize ?? fontSize;

  const finalPixelScale = pixelScale ?? BASE_DPI_SCALE;

  // Font styling resolution
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
    fontSize: `${finalFontSizePt * 0.3528 * finalPixelScale}px`,
    fontWeight: barcodeFontWeight,
    fontStyle: barcodeFontStyle,
    color: barcodeTextColor || color || "#000000",
  };

  const marginMm = barcodeTextMargin !== undefined ? barcodeTextMargin : 0.5;
  const marginPx = marginMm * finalPixelScale;

  const origin = textFlowOrigin || "center";

  let alignClass = "items-start";
  let textalign = "left";
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

  return (
    <div className="relative w-full h-full flex flex-col justify-between items-stretch overflow-hidden select-none">
      {/* Absolute overlay for error state */}
      {effectiveError && !isEditing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-1 border-2 border-dashed border-red-300 bg-red-50 text-red-600 rounded text-center select-none overflow-hidden z-10">
          <span className="font-bold text-[10px] leading-tight select-none">
            ⚠️ {effectiveError}
          </span>
          <span className="text-[9px] text-red-500 truncate w-full select-none mt-0.5">
            {content}
          </span>
        </div>
      )}

      {/* Main Barcode Display */}
      <div
        className={`w-full h-full flex flex-col justify-center items-center overflow-hidden ${effectiveError && !isEditing ? "invisible" : ""}`}
      >
        <div
          className={`flex flex-col ${alignClass} justify-between items-center w-full h-full py-[1.5px]`}
        >
          {showAbove &&
            (isEditing ? (
              <input
                type="text"
                autoFocus
                value={tempValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                style={{
                  fontFamily: resolvedFontFamily,
                  fontSize: `${finalFontSizePt * 0.3528 * finalPixelScale}px`,
                  fontWeight: barcodeFontWeight,
                  fontStyle: barcodeFontStyle,
                  marginBottom: `${marginPx}px`,
                  textAlign: textalign as any,
                }}
                className={`leading-tight select-text outline-none px-1 py-0.5 w-full bg-white text-slate-900 border ${
                  effectiveError
                    ? "border-red-500 ring-2 ring-red-100"
                    : "border-kiot-cyan ring-2 ring-cyan-100"
                } rounded-sm shadow-sm z-50`}
              />
            ) : (
              <div
                style={{
                  ...textStyle,
                  marginBottom: `${marginPx}px`,
                  textAlign: textalign as any,
                }}
                className="leading-tight select-none truncate max-w-full w-full cursor-text hover:bg-black/5 rounded px-0.5 transition-colors duration-150"
                onDoubleClick={handleStartEdit}
                title="Nhấp đúp để sửa nhãn"
              >
                {effectiveContent || content}
              </div>
            ))}
          <div className="flex-grow flex items-center justify-center w-full min-h-0 overflow-hidden">
            <svg
              style={{
                width: "100%",
                height: "100%",
                display: "block",
              }}
              viewBox={viewBox}
              preserveAspectRatio="none"
              className="block w-full h-full"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          </div>
          {showBelow &&
            (isEditing ? (
              <input
                type="text"
                autoFocus
                value={tempValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onMouseDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                style={{
                  fontFamily: resolvedFontFamily,
                  fontSize: `${finalFontSizePt * 0.3528 * finalPixelScale}px`,
                  fontWeight: barcodeFontWeight,
                  fontStyle: barcodeFontStyle,
                  marginTop: `${marginPx}px`,
                  textAlign: textalign as any,
                }}
                className={`leading-tight select-text outline-none px-1 py-0.5 w-full bg-white text-slate-900 border ${
                  effectiveError
                    ? "border-red-500 ring-2 ring-red-100"
                    : "border-kiot-cyan ring-2 ring-cyan-100"
                } rounded-sm shadow-sm z-50`}
              />
            ) : (
              <div
                style={{
                  ...textStyle,
                  marginTop: `${marginPx}px`,
                  textAlign: textalign as any,
                }}
                className="leading-tight select-none truncate max-w-full w-full cursor-text hover:bg-black/5 rounded px-0.5 transition-colors duration-150"
                onDoubleClick={handleStartEdit}
                title="Nhấp đúp để sửa nhãn"
              >
                {effectiveContent || content}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
});
