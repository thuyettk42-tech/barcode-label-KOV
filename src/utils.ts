/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Sizing conversion helpers
// 1 inch = 25.4 millimeters
// 1 px = 0.264583 mm => 1 mm = 1 / 0.264583 px = 3.779532169... px (3.779532 px)
export const BASE_DPI_SCALE = 3.779532;
export const PX_TO_MM_FACTOR = 0.264583;
export const PT_TO_MM_FACTOR = 0.3528;

/**
 * Convert millimeters to pixels with a adjustable zoom factor
 */
export function mmToPx(mm: number, scale: number): number {
  return mm * scale;
}

/**
 * Convert pixels to millimeters with adjustable scale, rounded to nearest 0.000001mm
 */
export function pxToMm(px: number, scale: number): number {
  return Math.round((px / scale) * 1000000) / 1000000;
}

/**
 * Guarantee the object stays within the physical label boundaries
 */
export function constrainCoordinates(
  x: number,
  y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number,
  snapSize: number = 0, // 0 means no snapping
  angle: number = 0
): { x: number; y: number } {
  let finalX = x;
  let finalY = y;

  // Grid Snapping
  if (snapSize > 0) {
    finalX = Math.round(finalX / snapSize) * snapSize;
    finalY = Math.round(finalY / snapSize) * snapSize;
  }

  // Rotated Bounding Box support
  if (angle && angle !== 0) {
    const rad = (angle * Math.PI) / 180;
    const cosVal = Math.abs(Math.cos(rad));
    const sinVal = Math.abs(Math.sin(rad));

    // Dynamic dimensions of the rotated rectangle bounding box
    const rotatedW = width * cosVal + height * sinVal;
    const rotatedH = width * sinVal + height * cosVal;

    // Minimum and maximum allowable coordinates for the base unrotated origin
    // to keep the rotated box strictly inside the label canvas
    const minX = (rotatedW - width) / 2;
    const maxX = canvasWidth - (rotatedW + width) / 2;

    const minY = (rotatedH - height) / 2;
    const maxY = canvasHeight - (rotatedH + height) / 2;

    if (finalX < minX) finalX = minX;
    if (finalX > maxX) finalX = maxX;

    if (finalY < minY) finalY = minY;
    if (finalY > maxY) finalY = maxY;
  } else {
    // Bound limits for unrotated object
    if (finalX < 0) finalX = 0;
    if (finalX + width > canvasWidth) {
      finalX = canvasWidth - width;
    }
    if (finalX < 0) finalX = 0; // Check again in case width is wider than canvas

    if (finalY < 0) finalY = 0;
    if (finalY + height > canvasHeight) {
      finalY = canvasHeight - height;
    }
    if (finalY < 0) finalY = 0;
  }

  return { 
    x: Math.round(finalX * 10) / 10, 
    y: Math.round(finalY * 10) / 10 
  };
}

/**
 * Compresses and resizes a base64 image or image URL to have a maximum dimension,
 * returning a compressed JPEG base64 data URL.
 * This reduces payload size by 10x-100x and drastically speeds up Gemini API analysis.
 */
export function resizeImage(src: string, maxDimension: number = 1024): Promise<string> {
  return new Promise((resolve) => {
    // If the src is not a data URL and not a valid URL, resolve immediately
    if (!src || (!src.startsWith("data:") && !src.startsWith("http://") && !src.startsWith("https://"))) {
      resolve(src);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only resize if one of the dimensions exceeds the maximum
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      } else {
        // If it's already smaller, but we want to compress it as a JPEG to reduce size anyway, we can proceed
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with 0.8 quality (highly compressed but visually almost identical for text/labels)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve(dataUrl);
      } catch (err) {
        console.warn("Error scaling image on canvas, falling back to original", err);
        resolve(src);
      }
    };

    img.onerror = (err) => {
      console.warn("Failed to load image for resizing, falling back to original", err);
      resolve(src);
    };

    img.src = src;
  });
}

