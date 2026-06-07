/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, memo } from "react";
import QRCode from "qrcode";

interface QRCodeRendererProps {
  content: string;
  size?: number; // in pt/px
  textFlowOrigin?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  color?: string;
}

export const QRCodeRenderer = memo(function QRCodeRenderer({ 
  content, 
  size = 120, 
  textFlowOrigin = "center", 
  color 
}: QRCodeRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    const cleanContent = content.trim();
    if (!cleanContent) {
      setError("Nội dung trống");
      return;
    }

    setError(null);

    // Make sure we have high definition rendering for print. High DPI printing requires a large source image
    // to prevent pixelation, distortion, or blurred lines in the print output/PDF export.
    // Any size from 600px to 1200px provides ultra-high resolution without slowing down the DOM.
    const renderSize = Math.max(800, Math.min(1500, Math.round(size * 6)));

    QRCode.toDataURL(cleanContent, {
      width: renderSize,
      margin: 0,
      color: {
        dark: color || "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: 'H'
    })
    .then((url) => {
      setQrDataUrl(url);
    })
    .catch((err) => {
      console.error("QR Code execution failed:", err);
      setError("Lỗi render QR Code");
    });
  }, [content, size, color]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-1 border border-dashed border-red-300 bg-red-50 text-red-500 rounded text-center select-none overflow-hidden">
        <span className="font-bold text-[10px] select-none">⚠️ {error}</span>
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center p-0.5 bg-transparent overflow-hidden">
        <div className="w-4/5 h-4/5 bg-gray-100/50 border border-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  const origin = textFlowOrigin || "center";
  
  let justifyClass = "justify-start";
  if (origin.startsWith("top")) {
    justifyClass = "justify-start";
  } else if (origin.startsWith("center") || origin === "center") {
    justifyClass = "justify-center";
  } else if (origin.startsWith("bottom")) {
    justifyClass = "justify-end";
  }

  let alignClass = "items-start";
  if (origin.endsWith("left")) {
    alignClass = "items-start";
  } else if (origin === "center" || origin.endsWith("center")) {
    alignClass = "items-center";
  } else if (origin.endsWith("right")) {
    alignClass = "items-end";
  }

  return (
    <div className={`w-full h-full flex ${justifyClass === "justify-start" ? "items-start" : justifyClass === "justify-end" ? "items-end" : "items-center"} ${alignClass === "items-start" ? "justify-start" : alignClass === "items-end" ? "justify-end" : "justify-center"} p-0.5 bg-transparent overflow-hidden`}>
      <img
        src={qrDataUrl}
        alt="QR Code"
        className="w-full h-full pointer-events-none select-none max-w-full max-h-full"
        style={{
          boxSizing: 'border-box',
          objectFit: 'contain',
          display: 'block',
          imageRendering: 'auto',
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
});
