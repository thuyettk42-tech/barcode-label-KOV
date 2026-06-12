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
