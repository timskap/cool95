const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('main-minimize'),
  maximize: () => ipcRenderer.send('main-maximize'),
  close: () => ipcRenderer.send('main-close'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.sendSync('is-fullscreen'),
  shutdown: () => ipcRenderer.send('shutdown'),

  // Persistent storage
  storageRead: (key, fallback) => ipcRenderer.sendSync('storage-read', key, fallback),
  storageWrite: (key, data) => ipcRenderer.sendSync('storage-write', key, data),

  // Extensions
  loadExtension: (path) => ipcRenderer.invoke('load-extension', path),
  getExtensions: () => ipcRenderer.sendSync('get-extensions'),
  removeExtension: (id) => ipcRenderer.invoke('remove-extension', id),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),

  // Debug
  resetAllData: () => ipcRenderer.invoke('reset-all-data'),

  // Popup URLs from main process
  onOpenUrl: (cb) => ipcRenderer.on('open-url', (_e, url) => cb(url)),

  // Downloads
  pickSavePath: (name) => ipcRenderer.invoke('pick-save-path', name),
  onDownloadStarted: (cb) => ipcRenderer.on('download-started', (_e, data) => cb(data)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_e, data) => cb(data)),
  onDownloadDone: (cb) => ipcRenderer.on('download-done', (_e, data) => cb(data)),
});
