/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabelTemplate } from "./types";

export const LABEL_TEMPLATES: LabelTemplate[] = [
  {
    name: "Tem kệ siêu thị (Thực phẩm tươi sống)",
    description: "Mẫu tem kệ siêu thị tiêu chuẩn 65x45mm dùng cho thực phẩm đông lạnh, tươi sống có giá bán, barcode, trọng lượng và thông tin hạn sử dụng.",
    config: {
      width: 65,
      height: 45,
      name: "Tem kệ siêu thị",
      bgColor: "#ffffff"
    },
    objects: [
      {
        id: "text-title",
        type: "text",
        x: 2,
        y: 2,
        width: 61,
        height: 6,
        content: "MÁ ĐÙI GÀ CP",
        fontSize: 14,
        fontWeight: "bold",
        fontFamily: "Inter",
        textAlign: "center",
        excelColumn: "Tên hàng"
      },
      {
        id: "barcode-main",
        type: "barcode",
        x: 4,
        y: 10,
        width: 28,
        height: 19,
        barcodeHeight: 12,
        content: "2510003000016",
        displayValue: true,
        barcodeFormat: "CODE128",
        excelColumn: "Mã vạch"
      },
      {
        id: "label-dongia",
        type: "text",
        x: 34,
        y: 8.5,
        width: 14,
        height: 3.5,
        content: "ĐƠN GIÁ",
        fontSize: 6,
        fontWeight: "bold",
        fontFamily: "Inter",
        color: "#DC2626",
        textAlign: "center"
      },
      {
        id: "val-dongia",
        type: "text",
        x: 34,
        y: 12,
        width: 14,
        height: 5.5,
        content: "105.000",
        fontSize: 9,
        fontWeight: "bold",
        fontFamily: "JetBrains Mono",
        textAlign: "center",
        excelColumn: "Giá bán"
      },
      {
        id: "label-soluong",
        type: "text",
        x: 49,
        y: 8.5,
        width: 12,
        height: 3.5,
        content: "SỐ LƯỢNG",
        fontSize: 6,
        fontWeight: "bold",
        fontFamily: "Inter",
        color: "#DC2626",
        textAlign: "center"
      },
      {
        id: "val-soluong",
        type: "text",
        x: 49,
        y: 12,
        width: 12,
        height: 5.5,
        content: "1 cái",
        fontSize: 9,
        fontWeight: "bold",
        fontFamily: "JetBrains Mono",
        textAlign: "center",
        excelColumn: "Số lượng"
      },
      {
        id: "label-thanhtien",
        type: "text",
        x: 34,
        y: 17,
        width: 27,
        height: 4,
        content: "THÀNH TIỀN",
        fontSize: 8.5,
        fontWeight: "bold",
        fontFamily: "Inter",
        color: "#DC2626",
        textAlign: "center"
      },
      {
        id: "val-thanhtien",
        type: "text",
        x: 34,
        y: 21,
        width: 27,
        height: 3,
        content: "105.000",
        fontSize: 15,
        fontWeight: "bold",
        fontFamily: "JetBrains Mono",
        color: "#000000",
        textAlign: "center",
        excelColumn: "Thành tiền"
      },
      {
        id: "label-packed",
        type: "text",
        x: 2,
        y: 29,
        width: 18,
        height: 3,
        content: "NGÀY ĐÓNG GÓI",
        fontSize: 6,
        fontWeight: "bold",
        fontFamily: "Inter",
        color: "#DC2626",
        textAlign: "center"
      },
      {
        id: "val-packed",
        type: "text",
        x: 3,
        y: 32,
        width: 18,
        height: 3.5,
        content: "21/04/12",
        fontSize: 8,
        fontFamily: "JetBrains Mono",
        textAlign: "center",
        excelColumn: "Ngày đóng gói"
      },
      {
        id: "label-expiry",
        type: "text",
        x: 22,
        y: 29,
        width: 18,
        height: 3,
        content: "NGÀY HẾT HẠN",
        fontSize: 6,
        fontWeight: "bold",
        fontFamily: "Inter",
        color: "#DC2626",
        textAlign: "center"
      },
      {
        id: "val-expiry",
        type: "text",
        x: 22,
        y: 32,
        width: 18,
        height: 3.5,
        content: "21/04/12",
        fontSize: 8,
        fontFamily: "JetBrains Mono",
        textAlign: "center",
        excelColumn: "Ngày hết hạn"
      },
      {
        id: "label-storage",
        type: "text",
        x: 40,
        y: 29,
        width: 25,
        height: 3,
        content: "NHIỆT ĐỘ BẢO QUẢN",
        fontSize: 6,
        fontWeight: "bold",
        fontFamily: "Inter",
        color: "#DC2626",
        textAlign: "center"
      },
      {
        id: "val-storage",
        type: "text",
        x: 41,
        y: 32,
        width: 22,
        height: 3.5,
        content: "-18 đến -15 °C",
        fontSize: 7.5,
        fontWeight: "bold",
        fontFamily: "Inter",
        textAlign: "center",
        excelColumn: "Nhiệt độ"
      },
      {
        id: "brand-logo",
        type: "text",
        x: 1,
        y: 38,
        width: 13,
        height: 4,
        content: "KiotViet",
        fontSize: 8,
        fontWeight: "bold",
        fontFamily: "Inter",
        color: "#008000",
        textAlign: "center"
      },
      {
        id: "banner-msg",
        type: "text",
        x: 15,
        y: 38,
        width: 50,
        height: 4,
        content: "TƯƠI NGON MỖI NGÀY",
        fontSize: 9,
        fontWeight: "bold",
        fontFamily: "Inter",
        color: "#00B63E",
        textAlign: "center"
      }
    ]
  }
];
