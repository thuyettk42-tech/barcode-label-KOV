/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabelObject, LabelConfig } from '../types';
import { formatLabelText } from '../components/LabelCanvas';

interface ZPLConfig {
  dpi: number;         // Usually 203 or 300
  labelWidthMm: number;
  labelHeightMm: number;
}

/**
 * High-fidelity ZPL compiler from standard label design objects
 * Matches physical dimensions exactly using DPI-to-Dots conversion.
 */
export function convertToZPL(objects: LabelObject[], config: ZPLConfig): string {
  const { dpi, labelWidthMm, labelHeightMm } = config;
  
  // Calculate mm to dots scale
  const mmToDots = dpi / 25.4;
  
  const widthDots = Math.round(labelWidthMm * mmToDots);
  const heightDots = Math.round(labelHeightMm * mmToDots);
  
  let zpl = "";
  
  // 1. Initialize label, print width, label length, and UTF-8 encoding
  zpl += "^XA\n";
  zpl += `^PW${widthDots}\n`;
  zpl += `^LL${heightDots}\n`;
  zpl += "^CI28\n"; // Enable UTF-8 encoding for Vietnamese characters

  // 2. Compile each object
  for (const obj of objects) {
    // Coordinates are stored relative to center in state (obj.x, obj.y are from center)
    // Convert them to absolute left-top coordinates
    const stdX = (labelWidthMm / 2) + obj.x;
    const stdY = (labelHeightMm / 2) + obj.y;

    const x = Math.round(stdX * mmToDots);
    const y = Math.round(stdY * mmToDots);
    const w = Math.round(obj.width * mmToDots);
    const h = Math.round(obj.height * mmToDots);

    // Keep positions inside non-negative bounds
    const posX = Math.max(0, x);
    const posY = Math.max(0, y);

    switch (obj.type) {
      case 'text': {
        // Calculate font size in dots (ZPL scalable font ^A0)
        const fontSizeDots = Math.round((obj.fontSize || 10) * (dpi / 72) * 1.3);
        
        let alignChar = "L"; // Left
        if (obj.textAlign === "center") alignChar = "C";
        if (obj.textAlign === "right") alignChar = "R";
        
        // FO (Field Origin) or FT (Field Typeset)
        zpl += `^FO${posX},${posY}\n`;
        zpl += `^A0N,${fontSizeDots},${fontSizeDots}\n`;
        
        // Define block size and wrapping ^FB
        zpl += `^FB${w},5,0,${alignChar},0\n`;
        
        const textVal = formatLabelText(obj);
        const fullText = `${obj.prefixText || ""}${textVal}${obj.suffixText || ""}`;
        
        zpl += `^FD${fullText}^FS\n`;
        break;
      }

      case 'barcode': {
        const barWidth = Math.max(1, Math.round(obj.barcodeWidth || 2));
        const barHeight = h;
        const showText = obj.displayValue ?? true ? "Y" : "N";
        
        zpl += `^FO${posX},${posY}\n`;
        zpl += `^BY${barWidth}\n`;
        
        if (obj.barcodeFormat === "EAN13") {
          zpl += `^BEN,${barHeight},${showText},N\n`;
        } else if (obj.barcodeFormat === "CODE39") {
          zpl += `^B3N,N,${barHeight},${showText},N\n`;
        } else {
          // CODE128 (Default)
          zpl += `^BCN,${barHeight},${showText},N,N\n`;
        }
        
        zpl += `^FD${obj.content}^FS\n`;
        break;
      }

      case 'qrcode': {
        // Calculate module size (scale) for QR code (1 to 10)
        const qrSize = Math.max(2, Math.min(10, Math.round(w / 40)));
        
        zpl += `^FO${posX},${posY}\n`;
        zpl += `^BQN,2,${qrSize}\n`;
        zpl += `^FDQA,${obj.content}^FS\n`;
        break;
      }

      case 'shape': {
        const shapeType = obj.shapeType || "rect";
        const strokeWidth = Math.max(1, Math.round((obj.shapeStrokeWidth || 1) * mmToDots));
        
        zpl += `^FO${posX},${posY}\n`;
        
        if (shapeType === "line") {
          zpl += `^GB${w},0,${strokeWidth},B^FS\n`;
        } else {
          // Rectangle or other shape (render as bounding box in ZPL)
          const rx = obj.shapeCornerRadius ? Math.round(obj.shapeCornerRadius * mmToDots) : 0;
          zpl += `^GB${w},${h},${strokeWidth},B,${rx}^FS\n`;
        }
        break;
      }

      default:
        // Other types like images are skipped or rendered as comments
        zpl += `^FX Skipped unsupported object type: ${obj.type} ^FS\n`;
        break;
    }
  }

  zpl += "^XZ";
  return zpl;
}
