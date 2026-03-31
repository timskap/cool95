const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('main-minimize'),
  maximize: () => ipcRenderer.send('main-maximize'),
  close: () => ipcRenderer.send('main-close'),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.sendSync('is-fullscreen'),
  shutdown: () => ipcRenderer.send('shutdown'),
  getBlogConfig: () => ipcRenderer.sendSync('get-blog-config'),
});
