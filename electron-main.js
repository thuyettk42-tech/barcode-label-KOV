const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "LabelPro Designer - Công Cụ Thiết Kế Và In Nhãn Offline",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Safeguards offline file access
    }
  });

  // Load the compiled static index.html built by Vite
  mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));

  // Remove default window menu bar for a clean design
  mainWindow.setMenuBarVisibility(false);

  // Enable F12 to open Google Chrome Developer Tools instantly
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    // Also support Ctrl+Shift+I as an alternative
    if (input.control && input.shift && input.key.toLowerCase() === 'i' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Prevent app frozen state by catching rendering errors
  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Cảnh báo: Ứng dụng không phản hồi. Đang tải lại...');
    mainWindow.reload();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
