/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { contextBridge, ipcRenderer } = require("electron");

// Expose a safe, highly-focused desktop integration API to the web preview window
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  
  /**
   * Retrieve list of registered printers from the computer's OS
   */
  getPrinters: () => ipcRenderer.invoke("get-printers"),

  /**
   * Send standard office print command using Chromium webContents.print
   */
  printOffice: (options) => ipcRenderer.invoke("print-office", options),

  /**
   * Send print event back to main.cjs to trigger OS print picker with high-fidelity settings
   */
  print: () => ipcRenderer.send("window-print"),

  /**
   * Write raw label string (e.g. ZPL format) to a temp file and spool directly to a printer port
   */
  printThermalRaw: (rawData, port) => ipcRenderer.invoke("print-thermal-raw", { rawData, port })
});
