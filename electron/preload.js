const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  printLabel: (labelData) => ipcRenderer.invoke('print-label', labelData)
})
