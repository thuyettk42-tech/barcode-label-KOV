/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabelTemplate } from "./types";

export const LABEL_TEMPLATES: LabelTemplate[] = [
  {
    name: "Nhãn Vận Chuyển Giao Hàng (Courier Label)",
    description: "Nhãn chuẩn vận chuyển thương mại điện tử (75mm x 100mm), bao gồm thông tin người nhận, mã vạch đơn hàng và QR Code tra cứu nhanh.",
    config: {
      width: 75,
      height: 100,
      name: "Nhãn Vận Chuyển"
    },
    objects: [
      {
        id: "shp-header-txt",
        type: "text",
        x: 4,
        y: 4,
        width: 67,
        height: 6,
        content: "NƠI NHẬN - HOẢ TỐC GIAO NHANH",
        fontSize: 9,
        fontWeight: "bold",
        textAlign: "center"
      },
      {
        id: "shp-line-1",
        type: "text",
        x: 4,
        y: 9,
        width: 67,
        height: 3,
        content: "-------------------------------------------------------------",
        fontSize: 8,
        textAlign: "center"
      },
      {
        id: "shp-recipient",
        type: "text",
        x: 6,
        y: 13,
        width: 63,
        height: 5,
        content: "Khách hàng: ANH HOÀNG QUỐC VIỆT",
        fontSize: 8.5,
        fontWeight: "bold",
        textAlign: "left"
      },
      {
        id: "shp-phone",
        type: "text",
        x: 6,
        y: 19,
        width: 63,
        height: 5,
        content: "Số điện thoại: 098.555.2468",
        fontSize: 8.5,
        fontWeight: "bold",
        textAlign: "left"
      },
      {
        id: "shp-address",
        type: "text",
        x: 6,
        y: 25,
        width: 63,
        height: 12,
        content: "Địa chỉ: Tòa nhà Landmark 81, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh",
        fontSize: 7.5,
        textAlign: "left"
      },
      {
        id: "shp-line-2",
        type: "text",
        x: 4,
        y: 38,
        width: 67,
        height: 3,
        content: "-------------------------------------------------------------",
        fontSize: 8,
        textAlign: "center"
      },
      {
        id: "shp-barcode",
        type: "barcode",
        x: 4,
        y: 44,
        width: 44,
        height: 20,
        content: "VTP-88392102",
        barcodeFormat: "CODE128",
        displayValue: true,
        barcodeWidth: 1.3,
        barcodeHeight: 12
      },
      {
        id: "shp-qrcode",
        type: "qrcode",
        x: 50,
        y: 44,
        width: 20,
        height: 20,
        content: "https://viettelpost.com.vn/track/VTP-88392102"
      },
      {
        id: "shp-footer",
        type: "text",
        x: 4,
        y: 92,
        width: 67,
        height: 5,
        content: "Số tiền thu hộ (COD): 850.000 VNĐ - Cho xem hàng không cho thử",
        fontSize: 7.5,
        fontWeight: "bold",
        textAlign: "center"
      }
    ]
  },
  {
    name: "Nhãn Giá Sản Phẩm (Retail Price Tag)",
    description: "Nhãn giá nhỏ gọn (40mm x 30mm) tối ưu cho siêu thị, cửa hàng thời trang hoặc tạp hóa, chứa tên sản phẩm, giá bán và mã vạch thanh toán.",
    config: {
      width: 40,
      height: 30,
      name: "Nhãn Giá Bán"
    },
    objects: [
      {
        id: "prc-store",
        type: "text",
        x: 2,
        y: 1.5,
        width: 36,
        height: 3,
        content: "BLUE SKY BOUTIQUE",
        fontSize: 7,
        fontWeight: "bold",
        textAlign: "center"
      },
      {
        id: "prc-name",
        type: "text",
        x: 2,
        y: 4.5,
        width: 36,
        height: 4,
        content: "Sơ Mi Nam Oxford Premium",
        fontSize: 7.5,
        fontWeight: "normal",
        textAlign: "center"
      },
      {
        id: "prc-barcode",
        type: "barcode",
        x: 4,
        y: 10,
        width: 32,
        height: 12,
        content: "SP04712",
        barcodeFormat: "CODE128",
        displayValue: true,
        barcodeWidth: 1.2,
        barcodeHeight: 7
      },
      {
        id: "prc-price",
        type: "text",
        x: 2,
        y: 25,
        width: 36,
        height: 4,
        content: "Giá: 350.000đ",
        fontSize: 9,
        fontWeight: "bold",
        textAlign: "center"
      }
    ]
  },
  {
    name: "Nhãn Tài Sản Cố Định (Fixed Asset Tag)",
    description: "Nhãn quản lý trang thiết bị văn phòng (50mm x 30mm) dùng cho phòng hành chính nhân sự, theo dõi thiết bị máy tính, bàn ghế thông qua mã QR.",
    config: {
      width: 50,
      height: 30,
      name: "Nhãn Tài Sản"
    },
    objects: [
      {
        id: "ast-header",
        type: "text",
        x: 2,
        y: 2,
        width: 46,
        height: 4,
        content: "TSCD - TẬP ĐOÀN CÔNG NGHỆ",
        fontSize: 8,
        fontWeight: "bold",
        textAlign: "center"
      },
      {
        id: "ast-name",
        type: "text",
        x: 22,
        y: 8,
        width: 26,
        height: 4,
        content: "MacBook Pro M3 Max",
        fontSize: 7.5,
        fontWeight: "bold",
        textAlign: "left"
      },
      {
        id: "ast-dept",
        type: "text",
        x: 22,
        y: 12,
        width: 26,
        height: 3,
        content: "Bộ phận: R&D Lab",
        fontSize: 6.5,
        textAlign: "left"
      },
      {
        id: "ast-id",
        type: "text",
        x: 22,
        y: 15.5,
        width: 26,
        height: 3,
        content: "Mã TS: MB-2026-0892",
        fontSize: 6.5,
        textAlign: "left"
      },
      {
        id: "ast-barcode",
        type: "barcode",
        x: 22,
        y: 20,
        width: 26,
        height: 9,
        content: "MB20260892",
        barcodeFormat: "CODE128",
        displayValue: false,
        barcodeHeight: 6
      },
      {
        id: "ast-qrcode",
        type: "qrcode",
        x: 3,
        y: 7.5,
        width: 17,
        height: 17,
        content: "https://asset-mgmt.net/item/MB20260892"
      },
      {
        id: "ast-date",
        type: "text",
        x: 2,
        y: 26,
        width: 18,
        height: 3,
        content: "02/06/2026",
        fontSize: 6,
        textAlign: "center"
      }
    ]
  },
  {
    name: "Mã QR Thanh Toán (QR Payment Label)",
    description: "Nhãn thanh toán để bàn nhỏ gọn (50mm x 50mm) cho phép tích hợp mã tài khoản ngân hàng hoặc link ví điện tử MoMo, ShopeePay.",
    config: {
      width: 50,
      height: 50,
      name: "QR Thanh Toán"
    },
    objects: [
      {
        id: "pay-shop",
        type: "text",
        x: 2,
        y: 3,
        width: 46,
        height: 4,
        content: "CỬA HÀNG MINH KHANG",
        fontSize: 9,
        fontWeight: "bold",
        textAlign: "center"
      },
      {
        id: "pay-sub",
        type: "text",
        x: 2,
        y: 7.5,
        width: 46,
        height: 3,
        content: "QUÉT MÃ ĐỂ THANH TOÁN",
        fontSize: 7.5,
        fontWeight: "bold",
        textAlign: "center"
      },
      {
        id: "pay-qrcode",
        type: "qrcode",
        x: 10,
        y: 12,
        width: 30,
        height: 30,
        content: "https://img.vietqr.io/image/970415-1122334455-quick.jpg"
      },
      {
        id: "pay-footer",
        type: "text",
        x: 2,
        y: 44,
        width: 46,
        height: 4,
        content: "Xin cảm ơn quý khách!",
        fontSize: 7.5,
        textAlign: "center"
      }
    ]
  }
];
