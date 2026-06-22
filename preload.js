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
   * Returns a Promise resolving to Array of printer objects: Array<{ name: string, displayName: string, isDefault: boolean, status: number, isLocal: boolean, isNetwork: boolean }>
   */
  getPrinters: () => ipcRenderer.invoke("get-printers"),

  /**
   * Send silent office print command using Chromium webContents.print
   * @param {Object} options - Print parameters (deviceName, copies, landscape, pageSize)
   */
  printOffice: (options) => ipcRenderer.invoke("print-office", options),

  /**
   * Write raw label string (e.g. ZPL format) to a temp file and spool directly to a printer port
   * @param {string} rawData - ZPL markup command content
   * @param {string} port - Local port (e.g., LPT1) or Shared network path (e.g., \\localhost\Xprinter)
   */
  printThermalRaw: (rawData, port) => ipcRenderer.invoke("print-thermal-raw", { rawData, port })
});
