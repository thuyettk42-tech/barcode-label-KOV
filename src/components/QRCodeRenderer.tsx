/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, memo } from "react";

interface QRCodeRendererProps {
  content: string;
  size?: number; // in pt
}

export const QRCodeRenderer = memo(function QRCodeRenderer({ content, size = 120 }: QRCodeRendererProps) {
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

  return (
    <div className="w-full h-full flex items-center justify-center p-0.5 bg-white overflow-hidden">
      <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
    </div>
  );
});
