/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, memo } from "react";

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

    const QRCodeLib = (window as any).QRCode;
    if (!QRCodeLib) {
      setError("Thư viện QRCode chưa được tải từ CDN.");
      return;
    }

    setError(null);

    // Make sure size is valid and reasonable (at least 60px for scannability, max 1000px)
    const renderSize = Math.max(60, Math.min(1000, Math.round(size)));

    // Create an off-screen container to isolate the rendering process
    const tempDiv = document.createElement("div");
    tempDiv.style.width = `${renderSize}px`;
    tempDiv.style.height = `${renderSize}px`;
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "-9999px";
    tempDiv.style.visibility = "hidden";
    tempDiv.style.pointerEvents = "none";
    document.body.appendChild(tempDiv);

    try {
      new QRCodeLib(tempDiv, {
        text: cleanContent,
        width: renderSize,
        height: renderSize,
        colorDark: color || "#000000",
        colorLight: "#ffffff", // Pure white light background for flawless scan/print contrast
        correctLevel: QRCodeLib.CorrectLevel ? QRCodeLib.CorrectLevel.H : 3, // High error correction
      });

      const checkForImage = () => {
        const imgs = tempDiv.getElementsByTagName("img");
        const canvases = tempDiv.getElementsByTagName("canvas");

        if (imgs.length > 0 && imgs[0].src && imgs[0].src.startsWith("data:image")) {
          setQrDataUrl(imgs[0].src);
          cleanup();
          return true;
        } else if (canvases.length > 0) {
          const canvas = canvases[0] as HTMLCanvasElement;
          try {
            const dataUrl = canvas.toDataURL("image/png");
            if (dataUrl && dataUrl.startsWith("data:image")) {
              setQrDataUrl(dataUrl);
              cleanup();
              return true;
            }
          } catch (canvasErr) {
            console.error("Canvas conversion error:", canvasErr);
          }
        }
        return false;
      };

      const cleanup = () => {
        try {
          if (tempDiv.parentNode) {
            document.body.removeChild(tempDiv);
          }
        } catch (e) {
          // Ignore
        }
      };

      // Try immediately since standard qrcode.js rendering is fully synchronous
      if (!checkForImage()) {
        // Fallback polling just in case of any loading delays in some runtime environments
        let attempts = 0;
        const intervalId = setInterval(() => {
          attempts++;
          if (checkForImage() || attempts > 15) {
            clearInterval(intervalId);
            if (attempts > 15) {
              cleanup();
              setError("Lỗi trích xuất hình ảnh QR Code");
            }
          }
        }, 20);
        return () => {
          clearInterval(intervalId);
          cleanup();
        };
      }
    } catch (err) {
      console.error("QR Code execution failed:", err);
      setError("Lỗi render QR Code");
      try {
        if (tempDiv.parentNode) {
          document.body.removeChild(tempDiv);
        }
      } catch (e) {}
    }
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
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
});
