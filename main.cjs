/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: "KiotLabel Designer Desktop - Ngoại Tuyến Hoàn Toàn",
    // Use logo.ico if present, otherwise fallback gracefully
    icon: fs.existsSync(path.join(__dirname, "logo.ico"))
      ? path.join(__dirname, "logo.ico")
      : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Disable web security for local app asset loading and offline CORS-free operations
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  // Load local build in production or dev server in development
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    // If running in development, load the local dev port
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built static file from dist/
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 1. Electron lifecycle events
app.whenReady().then(() => {
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
 * Handle listing all printers connected to this computer (both local and network)
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
 * Handle Silent Office Printing using standard Chromium webContents.print
 */
ipcMain.handle("print-office", async (event, options = {}) => {
  if (!mainWindow) {
    return { success: false, error: "Cửa sổ chính không hoạt động" };
  }

  return new Promise((resolve) => {
    // Electron print options
    const printOptions = {
      silent: true,
      deviceName: options.deviceName || "", // Empty means operating system default printer
      color: options.color !== false,
      copies: options.copies || 1,
      margins: options.margins || { marginType: "default" },
      landscape: options.landscape || false,
      pageSize: options.pageSize || "A4"
    };

    mainWindow.webContents.print(printOptions, (success, errorType) => {
      if (success) {
        resolve({ success: true });
      } else {
        console.error("Silent print failed:", errorType);
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
    // Create temporary directory path
    const tempDir = os.tmpdir();
    // Unique temp text file name for the transaction print payload
    const tempFilePath = path.join(tempDir, `zpl_raw_print_${Date.now()}.txt`);

    // Write raw ZPL payload to the file. We use UTF-8 representation (or raw bytes)
    fs.writeFileSync(tempFilePath, rawData, "utf8");

    // Port to print. Defaults to LPT1 if missing.
    // Can be a local parallel port (LPT1), USB virtual share (e.g. USB001), 
    // or a network shared path (e.g., \\\\127.0.0.1\\Xprinter-350B, \\\\localhost\\Zebra)
    const targetPort = port || "LPT1";

    // Setup command sequence based on the target OS (We prioritize Windows offline commands)
    let cmd = "";
    if (process.platform === "win32") {
      // Windows command lines for direct raw socket or shared stream writing
      if (targetPort.startsWith("\\\\")) {
        // Shared Windows printer path: must wrap in double quotes to handle empty space characters
        cmd = `copy /b "${tempFilePath}" "${targetPort}"`;
      } else {
        // Direct local physical Port (LPT1, COM1, PRN) or named alias
        cmd = `copy /b "${tempFilePath}" ${targetPort}`;
      }
    } else {
      // Unix/macOS fallback: pipe raw code to the standard cups offline backend command
      // Cups option -oraw sends unprocessed plain text payload directly to the printer controller
      cmd = `lp -d "${targetPort}" -o raw "${tempFilePath}"`;
    }

    // Execute the command in child_process
    return new Promise((resolve) => {
      exec(cmd, (error, stdout, stderr) => {
        // Always clean up and delete the temporary file after spooling is complete
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
