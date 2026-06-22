/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabelConfig, LabelObject } from "./types";

/**
 * Convert KiotLabel Design components to Zebra Programming Language (ZPL II) code.
 * Target printer resolution: 203 DPI (8 dots per mm), standard for desktop label printers.
 */
export function convertToZPL(
  config: LabelConfig,
  objects: LabelObject[],
  copies: number = 1
): string {
  const dotsPerMm = 8; // 203 DPI
  const labelWidthDots = Math.round(config.width * dotsPerMm);
  const labelHeightDots = Math.round(config.height * dotsPerMm);

  // ZPL command array
  const zpl: string[] = [];

  // Start Label
  zpl.push("^XA");
  // Set Printer Encoding to UTF-8
  zpl.push("^CI28");
  // Set Print Width
  zpl.push(`^PW${labelWidthDots}`);
  // Set Label Length
  zpl.push(`^LL${labelHeightDots}`);
  // Set Label Home (Origin)
  zpl.push("^LH0,0");

  for (const obj of objects) {
    // 1. Calculate top-left absolute coordinates in mm relative to the label card
    // The design canvas stores coordinates relative to the center of the card.
    const stdX = (config.width / 2) + obj.x;
    const stdY = (config.height / 2) + obj.y;

    // Convert coordinates in mm to dots on the printer
    const xDots = Math.max(0, Math.round(stdX * dotsPerMm));
    const yDots = Math.max(0, Math.round(stdY * dotsPerMm));
    const wDots = Math.max(1, Math.round(obj.width * dotsPerMm));
    const hDots = Math.max(1, Math.round(obj.height * dotsPerMm));

    // Construct the text content or string value
    let textVal = obj.content || "";
    if (obj.prefixText) textVal = obj.prefixText + textVal;
    if (obj.suffixText) textVal = textVal + obj.suffixText;

    // Remove any newlines or characters that could break single-line ZPL instructions
    // if not using a formatted block.
    const sanitizedVal = textVal.replace(/[\r\n]+/g, " ");

    if (obj.type === "text") {
      // Font sizing relative mapping
      // Standard PT size converted roughly to ZPL dots: 1 pt = ~2.8 dots (approx)
      const ptFontSize = obj.fontSize || 10;
      const fontHeight = Math.round(ptFontSize * 2.8);
      const fontWidth = Math.round(ptFontSize * 2.4);

      // Map alignments: left (L), center (C), right (R)
      let alignCode = "L";
      if (obj.textAlign === "center") alignCode = "C";
      else if (obj.textAlign === "right") alignCode = "R";

      // We use ^FB (Field Block) to support word-wrap and visual centering of texts
      // Format: ^FB<width>,<maxLines>,<lineSpacing>,<alignment>,<indent>
      // Width is bounding box width of the object.
      zpl.push(`^FO${xDots},${yDots}`);
      zpl.push(`^FB${wDots},3,0,${alignCode},0`);
      
      // Use standard scalable font ^A0N (Zebra Gothic)
      // Height, Width
      const weightCode = obj.fontWeight === "bold" ? "B" : "N";
      // Note: Boldness in scalable font can sometimes be approximated, but standard scalable Zebra font is elegant.
      zpl.push(`^A0N,${fontHeight},${fontWidth}`);
      zpl.push(`^FD${textVal}^FS`);

    } else if (obj.type === "barcode") {
      // Narrow bar width (1-10 dots)
      const barWidth = obj.barcodeWidth || 2;
      // Barcode height in dots
      const barHeight = Math.round((obj.barcodeHeight || obj.height) * dotsPerMm);

      zpl.push(`^FO${xDots},${yDots}`);
      // Set Narrow bar width, ratio (default is 3.0), and height
      zpl.push(`^BY${barWidth},3,${barHeight}`);

      // Parse barcode type: CODE128 (BC), CODE39 (B3), EANS13 (BE)
      const format = obj.barcodeFormat || "CODE128";
      if (format === "CODE128") {
        // Command: ^BCorientation,height,printInterpretationLine,printInterpretationAbove,checkDigit
        const showText = obj.displayValue !== false ? "Y" : "N";
        zpl.push(`^BCN,${barHeight},${showText},N,N`);
      } else if (format === "CODE39") {
        const showText = obj.displayValue !== false ? "Y" : "N";
        zpl.push(`^B3N,N,${barHeight},${showText},N`);
      } else if (format === "EAN13") {
        const showText = obj.displayValue !== false ? "Y" : "N";
        zpl.push(`^BEN,${barHeight},${showText},N`);
      }
      
      zpl.push(`^FD${sanitizedVal}^FS`);

    } else if (obj.type === "qrcode") {
      // QR code command: ^BQ,orientation,magnificationFactor,errorCorrection
      // Magnification factor (1 to 10): let's scale it based on width
      // 1 dot = 203 DPI, magnification of 4 means 4 dots per module is ~25mm width, which is perfect for most tags.
      const magnFactor = Math.max(2, Math.min(10, Math.round(obj.width / 8)));
      const errorCorr = obj.qrErrorCorrection || "Q";

      zpl.push(`^FO${xDots},${yDots}`);
      zpl.push(`^BQN,2,${magnFactor},${errorCorr}`);
      // ZPL QR content must have QA, prefix for normal data
      zpl.push(`^FDQA,${sanitizedVal}^FS`);

    } else if (obj.type === "shape") {
      const strokeWidth = Math.max(1, Math.round((obj.shapeStrokeWidth || 1) * dotsPerMm / 4));
      const borderRadiusMm = obj.shapeCornerRadius || 0;
      const bRadiusDots = Math.round(borderRadiusMm * dotsPerMm);

      // Graphic Box command: ^GB<width>,<height>,<borderThickness>,<boxColor>,<roundingDimension>
      zpl.push(`^FO${xDots},${yDots}`);
      
      // Box Color: "B" for black, "W" for white
      const colorCode = "B"; 
      
      zpl.push(`^GB${wDots},${hDots},${strokeWidth},${colorCode},${bRadiusDots}^FS`);
    }
  }

  // Set quantity of printed labels
  if (copies > 1) {
    zpl.push(`^PQ${copies},0,1,Y`);
  } else {
    zpl.push("^PQ1,0,1,Y");
  }

  // End Label
  zpl.push("^XZ");

  return zpl.join("\n");
}
