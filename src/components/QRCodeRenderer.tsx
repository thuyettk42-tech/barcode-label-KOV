/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, memo } from "react";

interface QRCodeRendererProps {
  content: string;
  size?: number; // in pt
  textFlowOrigin?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export const QRCodeRenderer = memo(function QRCodeRenderer({ content, size = 120, textFlowOrigin = "center" }: QRCodeRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous elements
    containerRef.current.innerHTML = "";

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

    try {
      // Determine error correction level
      const qrcode = new QRCodeLib(containerRef.current, {
        text: cleanContent,
        width: size,
        height: size,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCodeLib.CorrectLevel ? QRCodeLib.CorrectLevel.H : 3, // H level
      });

      // Apply style for responsive scale inside parent container
      const imgs = containerRef.current.getElementsByTagName("img");
      const canvases = containerRef.current.getElementsByTagName("canvas");
      
      for (let img of Array.from(imgs) as HTMLImageElement[]) {
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        // To avoid iframe browser exceptions on some platforms
        img.referrerPolicy = "no-referrer";
      }
      
      for (let canvas of Array.from(canvases) as HTMLCanvasElement[]) {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.objectFit = "contain";
        canvas.style.display = "block";
      }
    } catch (err) {
      console.error("QR Code execution fail:", err);
      setError("Lỗi render QR Code");
    }
  }, [content, size]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-1 border-2 border-dashed border-red-300 bg-red-50 text-red-500 rounded text-center select-none overflow-hidden">
        <span className="font-bold text-[10px] select-none">⚠️ {error}</span>
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
    <div className={`w-full h-full flex ${justifyClass === "justify-start" ? "items-start" : justifyClass === "justify-end" ? "items-end" : "items-center"} ${alignClass === "items-start" ? "justify-start" : alignClass === "items-end" ? "justify-end" : "justify-center"} p-0.5 bg-white overflow-hidden`}>
      <div 
        ref={containerRef} 
        style={{
          width: size ? `${size}px` : '100%',
          height: size ? `${size}px` : '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: '1/1'
        }}
        className="flex items-center justify-center animate-none" 
      />
    </div>
  );
});
