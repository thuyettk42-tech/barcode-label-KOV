/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { app, BrowserWindow, ipcMain, Menu, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");

// Sửa lỗi 1: Ép sRGB color profile từ dòng lệnh để giữ màu sắc chuẩn xác giống trình duyệt
app.commandLine.appendSwitch("force-color-profile", "srgb");

let mainWindow = null;

function createWindow() {
  // Sửa lỗi 1: Ép themeSource thành 'light' để tránh chế độ tối hệ thống làm biến đổi hoặc xỉn màu giao diện
  nativeTheme.themeSource = "light";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: "KiotLabel Designer Desktop - Ngoại Tuyến Hoàn Toàn",
    icon: fs.existsSync(path.join(__dirname, "logo.ico"))
      ? path.join(__dirname, "logo.ico")
      : undefined,
    webPreferences: {
      // Sửa lỗi 3: Cấu hình chuẩn để hỗ trợ tuyệt đối các sự kiện tương tác chuột (pointer events), kéo thả (drag & drop)
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Cho phép tải tệp cục bộ và tránh lỗi CORS ngoại tuyến
      preload: path.join(__dirname, "preload.cjs"),
      // Cho phép kéo thả trực tiếp, tránh bị can thiệp bởi electron webPreferences
      enableBlinkFeatures: "PointerEvents"
    }
  });

  // Load local build in production or dev server in development
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  // Sửa lỗi 2: Luôn kích hoạt DevTools để dễ dàng tìm lỗi và debug ngoại tuyến
  mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Thêm lệnh disableHardwareAcceleration() theo đúng yêu cầu để xử lý triệt để lỗi màu sắc lệch/xỉn do phần cứng tăng tốc của card đồ họa
app.disableHardwareAcceleration();

// 1. Electron lifecycle events
app.whenReady().then(() => {
  // Sửa lỗi 3: Vô hiệu hóa Menu top-bar mặc định để trả lại trọn vẹn phím tắt Multi-select (Ctrl / Shift) cho React app
  Menu.setApplicationMenu(null);
  
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 2. IPC handlers for Office & Thermal offline printing

/**
 * Handle listing all printers connected to this computer
 */
ipcMain.handle("get-printers", async (event) => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error("Lỗi khi lấy danh sách máy in:", err);
    return [];
  }
});

/**
 * Sửa lỗi 4 & in ấn: Lắng nghe sự kiện in từ trình duyệt để kích hoạt hộp thoại in hệ thống (Hỗ trợ máy in thường và Save as PDF)
 */
ipcMain.on("window-print", (event, options = {}) => {
  const webContents = event.sender;
  if (webContents) {
    let pageSizeOption = options.pageSize || "A4";
    if (options.isCustomPage && options.customPageW && options.customPageH) {
      pageSizeOption = {
        width: Math.round(options.customPageW * 1000),  // 1 mm = 1000 microns
        height: Math.round(options.customPageH * 1000)
      };
    }

    webContents.print({
      silent: false,          // BẮT BUỘC: Hiển thị hộp thoại chọn máy in
      printBackground: true,  // BẮT BUỘC: Giữ màu nền/ảnh nền khi in
      color: true,
      landscape: options.landscape || false,
      margins: options.margins || { marginType: "none" }, // Vô hiệu hóa lề mặc định để khớp tọa độ 100%
      pageSize: pageSizeOption,
      copies: options.copies || 1
    }, (success, errorType) => {
      if (!success) {
        console.warn("Người dùng đã hủy in hoặc có lỗi xảy ra:", errorType);
      }
    });
  }
});

/**
 * Handle Standard Office Printing with Dialog using webContents.print
 */
ipcMain.handle("print-office", async (event, options = {}) => {
  if (!mainWindow) {
    return { success: false, error: "Cửa sổ chính không hoạt động" };
  }

  return new Promise((resolve) => {
    let pageSizeOption = options.pageSize || "A4";
    if (options.isCustomPage && options.customPageW && options.customPageH) {
      pageSizeOption = {
        width: Math.round(options.customPageW * 1000),  // 1 mm = 1000 microns
        height: Math.round(options.customPageH * 1000)
      };
    }

    const printOptions = {
      silent: false, // Bắt buộc mở hội thoại chọn máy in hoặc Lưu dưới dạng PDF
      color: options.color !== false,
      copies: options.copies || 1,
      margins: options.margins || { marginType: "none" }, // Vô hiệu hóa lề mặc định để không bị lệch tọa độ
      landscape: options.landscape || false,
      pageSize: pageSizeOption
    };

    mainWindow.webContents.print(printOptions, (success, errorType) => {
      if (success) {
        resolve({ success: true });
      } else {
        console.error("Print with dialog failed or cancelled:", errorType);
        resolve({ success: false, error: errorType });
      }
    });
  });
});

/**
 * Handle Direct Thermal Raw Printing (ZPL) using native child_process command-line
 */
ipcMain.handle("print-thermal-raw", async (event, { rawData, port }) => {
  try {
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `zpl_raw_print_${Date.now()}.txt`);
    fs.writeFileSync(tempFilePath, rawData, "utf8");

    const targetPort = port || "LPT1";
    let cmd = "";
    if (process.platform === "win32") {
      if (targetPort.startsWith("\\\\")) {
        cmd = `copy /b "${tempFilePath}" "${targetPort}"`;
      } else {
        cmd = `copy /b "${tempFilePath}" ${targetPort}`;
      }
    } else {
      cmd = `lp -d "${targetPort}" -o raw "${tempFilePath}"`;
    }

    return new Promise((resolve) => {
      exec(cmd, (error, stdout, stderr) => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (unlinkErr) {
          console.error("Lỗi xóa file ZPL tạm thời:", unlinkErr);
        }

        if (error) {
          console.error("Lỗi exec print raw:", error);
          resolve({
            success: false,
            error: error.message,
            stderr: stderr
          });
        } else {
          resolve({
            success: true,
            stdout: stdout
          });
        }
      });
    });
  } catch (err) {
    console.error("Lỗi tổng quát khi in Raw ZPL:", err);
    return { success: false, error: err.message };
  }
});
