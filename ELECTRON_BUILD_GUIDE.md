# Hướng Dẫn Đóng Gói KiotLabel Designer Thành Ứng Dụng Windows Offline (Electron v22.x)

Tài liệu này hướng dẫn cách đóng gói ứng dụng web hiện tại thành một ứng dụng Windows hoàn chỉnh chạy **offline 100%**, có khả năng gọi lệnh in trực tiếp:
1. **In nhiệt (ZPL):** Gửi spool thô tới cổng `LPT1`/`USB001`/Network share bằng lệnh `copy /b`.
2. **In văn phòng (A4/A5):** Sử dụng in silent (không hiện hộp thoại) bằng `webContents.print()`.

---

## 🛠️ Bước 1: Chuẩn bị Cấu hình `package.json`

Để chạy và biên dịch ứng dụng bằng Electron, bạn cấu hình tệp `package.json` trên máy tính bằng thông tin bổ sung sau.

### 1. Thêm chỉ định file main & script Electron
Mở tệp `package.json` và thêm các trường sau vào:

```json
{
  "name": "kiotlabel-designer-desktop",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "dev:web": "tsx server.ts",
    "build:web": "vite build",
    "electron:start": "electron .",
    "electron:dev": "concurrently \"vite\" \"cross-env NODE_ENV=development electron .\"",
    "dist:win": "vite build && electron-builder --win --x64"
  },
  "dependencies": {
    // ... Giữ nguyên các thư viện React hiện tại ...
  },
  "devDependencies": {
    "electron": "^22.3.27",
    "electron-builder": "^24.13.3",
    "concurrently": "^8.2.2",
    "cross-env": "^7.0.3"
  },
  "build": {
    "appId": "com.kiotviet.kiotlabel.designer",
    "productName": "KiotLabelDesigner",
    "copyright": "Copyright © 2026 KiotViet",
    "directories": {
      "output": "dist_desktop"
    },
    "files": [
      "dist/**/*",
      "main.js",
      "preload.js",
      "logo.ico"
    ],
    "win": {
      "icon": "logo.ico",
      "target": [
        {
          "target": "nsis",
          "arch": [
            "x64"
          ]
        },
        {
          "target": "portable",
          "arch": [
            "x64"
          ]
        }
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "KiotLabel Designer",
      "installerIcon": "logo.ico",
      "uninstallerIcon": "logo.ico"
    }
  }
}
```

---

## 🚀 Bước 2: Thiết lập & Đóng gói từ máy tính của bạn

Sau khi giải nén mã nguồn tải từ Google AI Studio về máy tính cá nhân của bạn, hãy thực hiện tuần tự các lệnh sau trong thư mục dự án bằng **Command Prompt (CMD)** hoặc PowerShell:

### 1. Cài đặt các thư viện Node.js và Electron
Chạy lệnh cài các thư viện cục bộ (bao gồm cả môi trường chạy Electron Offline):
```cmd
npm install
```

### 2. Sắp sửa biểu tượng ứng dụng Windows (`logo.ico`)
Hệ điều hành Windows yêu cầu hình ảnh icon đại diện của ứng dụng có định dạng mở rộng là `.ico`. 
1. Truy cập một bên chuyển đổi ảnh trực tuyến như `convertio.co` hoặc `ezgif.com` để chuyển file `logo.svg` trong thư mục dự án này thành tệp tin **`logo.ico`** chất lượng cao.
2. Lưu tệp mới tải trực tiếp vào thư mục gốc của dự án này với tên chính xác là **`logo.ico`**.

### 3. Đóng gói ra file cài đặt Windows (.exe)
Chạy lệnh đóng gói duy nhất sau để tự động biên dịch toàn bộ mã nguồn React và nén thành bộ cài đặt Electron chuyên sâu:
```cmd
npm run dist:win
```

Sau khi quá trình trên kết thúc thành công, bạn sẽ nhận được thư mục mới **`dist_desktop/`** chứa:
- **`KiotLabelDesigner Setup 1.0.0.exe`**: Trình cài đặt chuyên nghiệp từng bước cho người sử dụng (Inno/NSIS style, cho phép chọn thư mục đích cài đặt độc lập).
- **`KiotLabelDesigner 1.0.0.exe`**: Phiên bản Portable chạy trực tiếp không cần cài đặt rườm rà.

---

## 🖨️ Cách cấu hình Thiết bị In ấn Offline

Khi khởi chạy ứng dụng, bảng **Kết nối Electron (Ngoại Tuyến)** màu xanh sẽ hiển thị trong Bước 2 của bảng điều khiển. Bật trạng thái **In trực tiếp bỏ qua hộp thoại**:

### 1- in nhãn cuộn (Máy in nhiệt Zebra / Xprinter / Godex / Brother...)
- **Cơ chế hoạt động:** Electron lấy dữ liệu tọa độ của nhãn, biên dịch sang ngôn ngữ ZPL thô và chạy câu lệnh `child_process` để gửi file trực tiếp vào luồng máy in của Windows thông qua câu lệnh:
  `copy /b <temp_file> <port>`
- **Cấu hình Cổng in nhiệt:**
  - Nhập **`USB001`**, **`USB002`**, v.v. nếu máy in cắm dây trực tiếp thông qua cổng USB Windows.
  - Nhập **`LPT1`** nếu dùng cổng mạng nối tiếp cổ điển.
  - Bạn có thể **Share máy in** thông qua mạng LAN nội bộ và điền đường dẫn dạng: **`\\localhost\Tên_Máy_In_Chia_Sẻ`** (Không cần Internet, spooler hệ thống Windows sẽ tự động phân giải luồng và in tem mượt mà chỉ trong 0.1 giây).

### 2- In văn phòng (Máy in Canon, HP, Brother dùng giấy lưới A4/A5...)
- **Cơ chế hoạt động:** Sử dụng API `win.webContents.print` trong lõi Chromium để ra lệnh in silent.
- **Lựa chọn máy in:** Danh sách máy in kết nối với máy tính sẽ được Electron tự động nạp. Bạn chỉ cần chọn máy in mục tiêu trong hộp đổ xuống (Dropdown dropdown), sau đó nhấn **IN NHÃN** là xong. Máy in văn phòng sẽ tự động in đúng số lượng mà không xuất hiện thêm bất kỳ hộp thoại trung gian nào!
