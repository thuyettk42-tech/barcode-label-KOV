/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabelObject } from '../types';
import { formatLabelText } from '../components/LabelCanvas';

interface TSPLConfig {
  dpi: number;         // Usually 203 or 300
  labelWidthMm: number;
  labelHeightMm: number;
  gapMm?: number;      // Distance between labels, default 3mm
}

/**
 * High-fidelity TSPL compiler from standard label design objects
 * Matches physical dimensions exactly using DPI-to-Dots conversion.
 */
export function convertToTSPL(objects: LabelObject[], config: TSPLConfig): string {
  const { dpi, labelWidthMm, labelHeightMm, gapMm = 3 } = config;
  
  // Calculate mm to dots scale
  const mmToDots = dpi / 25.4;
  
  let tspl = "";
  
  // 1. Initialize label configuration, codepage UTF-8 and CLS
  tspl += `SIZE ${labelWidthMm} mm, ${labelHeightMm} mm\n`;
  tspl += `GAP ${gapMm} mm, 0 mm\n`;
  tspl += "DIRECTION 1\n";
  tspl += "OFFSET 0\n";
  tspl += "CODEPAGE UTF-8\n"; // Ensure correct Vietnamese rendering
  tspl += "CLS\n"; // Clear image buffer

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
        const textVal = formatLabelText(obj);
        const fullText = `${obj.prefixText || ""}${textVal}${obj.suffixText || ""}`;
        
        // Use auto scaling font metrics. In TSPL, "ROMAN.TTF" is a widely supported true type vector font.
        // Or "TSS24.BF2" for system bitmap.
        // We can use "ROMAN.TTF" and set appropriate size or use standard scalable TSPL text
        const fontSizePt = obj.fontSize || 10;
        
        // Since TSPL TEXT command uses either internal font or TrueType fonts,
        // we'll use "ROMAN.TTF" for high-fidelity rendering or "0" (auto) depending on availability.
        // For TrueType vector font: TEXT x, y, "ROMAN.TTF", rotation, x-multiplier, y-multiplier, "content"
        // Let's use "ROMAN.TTF" or "UTST.BF2" or font 3/4.
        // To be safe and compliant across various firmware, we can use "ROMAN.TTF" with x_multiplier and y_multiplier.
        // The multipliers can scale the base font size. Let's map fontSizePt appropriately.
        const scaleMultiplier = Math.max(1, Math.round(fontSizePt / 8)); 
        
        // Let's generate: TEXT x,y,"ROMAN.TTF",0,scaleMultiplier,scaleMultiplier,"text"
        // Wait! Let's escape quotes in fullText for TSPL syntax compliance
        const escapedText = fullText.replace(/"/g, '\\"');
        tspl += `TEXT ${posX},${posY},"ROMAN.TTF",0,${scaleMultiplier},${scaleMultiplier},"${escapedText}"\n`;
        break;
      }

      case 'barcode': {
        const barWidth = Math.max(1, Math.round(obj.barcodeWidth || 2));
        const barHeight = h;
        const showText = obj.displayValue ?? true ? 1 : 0;
        
        let formatCode = "128";
        if (obj.barcodeFormat === "EAN13") {
          formatCode = "EAN13";
        } else if (obj.barcodeFormat === "CODE39") {
          formatCode = "39";
        }
        
        // BARCODE X, Y, "code type", height, human-readable, rotation, narrow, wide, "content"
        tspl += `BARCODE ${posX},${posY},"${formatCode}",${barHeight},${showText},0,${barWidth},${barWidth * 2},"${obj.content}"\n`;
        break;
      }

      case 'qrcode': {
        // Module size (scale) for QR code (1 to 10)
        const qrSize = Math.max(2, Math.min(10, Math.round(w / 40)));
        
        // QRCODE X, Y, ECC level, cell width, mode, rotation, "content"
        // ECC Level: M (Medium) is a safe and high contrast level
        tspl += `QRCODE ${posX},${posY},M,${qrSize},A,0,"${obj.content}"\n`;
        break;
      }

      case 'shape': {
        const shapeType = obj.shapeType || "rect";
        const strokeWidth = Math.max(1, Math.round((obj.shapeStrokeWidth || 1) * mmToDots));
        
        if (shapeType === "line") {
          // TSPL has a BAR command: BAR x, y, width, height
          tspl += `BAR ${posX},${posY},${w},${strokeWidth}\n`;
        } else {
          // Rectangle or other shape
          const endX = posX + w;
          const endY = posY + h;
          // BOX x, y, x_end, y_end, line_thickness[, corner_radius]
          const rx = obj.shapeCornerRadius ? Math.round(obj.shapeCornerRadius * mmToDots) : 0;
          if (rx > 0) {
            tspl += `BOX ${posX},${posY},${endX},${endY},${strokeWidth},${rx}\n`;
          } else {
            tspl += `BOX ${posX},${posY},${endX},${endY},${strokeWidth}\n`;
          }
        }
        break;
      }

      default:
        // Other types like images are skipped with TSPL remarks
        tspl += `; Skipped unsupported object type: ${obj.type}\n`;
        break;
    }
  }

  // 3. Print command
  tspl += "PRINT 1,1\n";
  return tspl;
}
