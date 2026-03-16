const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the web renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // File system access (used for export/import in desktop mode)
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  fileExists: (filePath) => ipcRenderer.invoke('fs:exists', filePath),

  // Platform detection
  platform: process.platform,
  isElectron: true,
});
