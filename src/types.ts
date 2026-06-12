/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ObjectType = 'text' | 'barcode' | 'qrcode' | 'image' | 'shape';

export interface LabelObject {
  id: string;
  type: ObjectType;
  x: number; // in mm
  y: number; // in mm
  width: number; // in mm
  height: number; // in mm
  content: string;
  angle?: number; // in degrees (0 - 360)
  isCenterRelative?: boolean;
  
  // Text attributes
  fontSize?: number; // in pt
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecorationUnderline?: boolean;
  textDecorationLineThrough?: boolean;
  textSuperSub?: 'normal' | 'subscript' | 'superscript';
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  textFlowOrigin?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  letterSpacing?: number; // in mm

  // Prefix and Suffix attributes
  prefixText?: string;
  prefixFontSize?: number;
  prefixFontFamily?: string;
  prefixFontWeight?: 'normal' | 'bold';
  prefixFontStyle?: 'normal' | 'italic';
  prefixTextDecorationUnderline?: boolean;
  prefixTextDecorationLineThrough?: boolean;
  prefixTextSuperSub?: 'normal' | 'subscript' | 'superscript';
  prefixColor?: string; // Text color for prefix

  suffixText?: string;
  suffixFontSize?: number;
  suffixFontFamily?: string;
  suffixFontWeight?: 'normal' | 'bold';
  suffixFontStyle?: 'normal' | 'italic';
  suffixTextDecorationUnderline?: boolean;
  suffixTextDecorationLineThrough?: boolean;
  suffixTextSuperSub?: 'normal' | 'subscript' | 'superscript';
  suffixColor?: string; // Text color for suffix

  // Barcode attributes
  barcodeFormat?: 'CODE128' | 'EAN13' | 'CODE39';
  displayValue?: boolean;
  barcodeWidth?: number; // 1, 2, 3, 4
  barcodeHeight?: number; // in mm
  barcodeShowTextAbove?: boolean;
  barcodeShowTextBelow?: boolean;
  barcodeFontFamily?: string;
  barcodeFontSize?: number;
  barcodeFontWeight?: 'normal' | 'bold';
  barcodeFontStyle?: 'normal' | 'italic';
  barcodeTextMargin?: number; // in mm

  // QR code attributes
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';

  // Image attributes
  imageFit?: 'contain' | 'cover' | 'fill';
  imageOpacity?: number; // 0 to 1

   // Excel integration attributes
  excelColumn?: string;

  // Data Formatting attributes
  dataFormatType?: 'general' | 'number' | 'datetime';
  numberDecimalSeparator?: '.' | ',';
  numberThousandsSeparator?: boolean;
  numberDecimalPlaces?: number;
  datetimeFormat?: string;
  useSystemTime?: boolean;

  // Custom styling colors
  color?: string; // Text color, QR code color, or Barcode lines color
  barcodeTextColor?: string; // Specific color for the barcode label text

  // Shape attributes
  shapeType?: 'line' | 'rect' | 'circle' | 'oval';
  shapeStrokeWidth?: number; // in mm
  shapeStrokeColor?: string;
  shapeFillColor?: string;
  shapeCornerRadius?: number; // in mm
  shapeStrokeStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface LabelConfig {
  width: number; // in mm
  height: number; // in mm
  name: string;
  bgColor?: string;
  bgImage?: string;
  bgImageOpacity?: number;
  bgImageSize?: 'contain' | 'cover' | 'repeat' | 'auto';
}

export interface SheetLayoutConfig {
  mode: 'thermal' | 'office'; // 'thermal' is standard thermal roll, 'office' is office desktop print sheet
  paperSize: 'A4' | 'A5' | 'custom';
  customWidth: number; // in mm
  customHeight: number; // in mm
  orientation: 'portrait' | 'landscape';
  
  // Margins in mm
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  
  // Grid counts
  rows: number;
  cols: number;
  
  // Gaps in mm
  rowGap: number;
  colGap: number;
  
  // Label borders
  showBorder: boolean;
  borderWidth: number; // in px
  borderRadius: number; // in mm
  borderColor?: string; // border color hex code
  rollSideMargin?: number; // side margins in mm for thermal roll
}

export interface LabelTemplate {
  name: string;
  description: string;
  config: LabelConfig;
  objects: LabelObject[];
  sheetConfig?: Partial<SheetLayoutConfig>;
}
