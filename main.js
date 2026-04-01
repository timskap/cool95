const { app, BrowserWindow, Menu, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let dataDir = null;

function ensureDataDir() {
  if (!dataDir) {
    dataDir = path.join(app.getPath('userData'), 'win98');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readJSON(file, fallback) {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, file + '.json'), 'utf8')); }
  catch { return fallback; }
}

function writeJSON(file, data) {
  ensureDataDir();
  fs.writeFileSync(path.join(dataDir, file + '.json'), JSON.stringify(data, null, 2));
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 6 },
    backgroundColor: '#008080',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));
}

// Window controls
ipcMain.on('main-minimize', () => mainWindow?.minimize());
ipcMain.on('main-maximize', () => {
  if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('main-close', () => mainWindow?.close());
ipcMain.on('toggle-fullscreen', () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});
ipcMain.on('is-fullscreen', (event) => {
  event.returnValue = mainWindow ? mainWindow.isFullScreen() : false;
});
ipcMain.on('shutdown', () => app.quit());

// Reset all app data
ipcMain.handle('reset-all-data', async () => {
  ensureDataDir();
  // Delete all JSON storage
  const files = fs.readdirSync(dataDir);
  files.forEach(f => {
    try { fs.unlinkSync(path.join(dataDir, f)); } catch {}
  });
  // Clear browsing session (cookies, cache, localStorage)
  await session.defaultSession.clearStorageData();
  await session.defaultSession.clearCache();
  // Relaunch
  app.relaunch();
  app.exit(0);
});

// Persistent storage
ipcMain.on('storage-read', (event, key, fallback) => {
  event.returnValue = readJSON(key, fallback);
});
ipcMain.on('storage-write', (event, key, data) => {
  writeJSON(key, data);
  event.returnValue = true;
});

// Extensions
ipcMain.handle('load-extension', async (_event, extPath) => {
  try {
    const ext = await session.defaultSession.loadExtension(extPath, { allowFileAccess: true });
    return { success: true, name: ext.name, id: ext.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.on('get-extensions', (event) => {
  event.returnValue = session.defaultSession.getAllExtensions().map(e => ({ name: e.name, id: e.id }));
});

ipcMain.handle('remove-extension', async (_event, id) => {
  try {
    await session.defaultSession.removeExtension(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Downloads
ipcMain.handle('pick-save-path', async (_event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath: defaultName });
  if (result.canceled) return null;
  return result.filePath;
});

const menuTemplate = [
  {
    label: 'Cool 95',
    submenu: [
      { label: 'About Cool 95', role: 'about' },
      { type: 'separator' },
      { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
      { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
    ],
  },
];

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

app.whenReady().then(() => {
  // Set user agent globally so sites don't block us
  session.defaultSession.setUserAgent(CHROME_UA);
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Load saved extensions
  const savedExtensions = readJSON('extensions', []);
  savedExtensions.forEach(extPath => {
    session.defaultSession.loadExtension(extPath, { allowFileAccess: true }).catch(() => {});
  });

  createWindow();

  // Handle popups from webviews (OAuth, sign-in, etc.)
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(({ url }) => {
        const popup = new BrowserWindow({
          width: 500,
          height: 650,
          parent: mainWindow,
          backgroundColor: '#fff',
          webPreferences: {
            partition: 'persist:browser',
            contextIsolation: true,
            nodeIntegration: false,
          },
        });
        popup.loadURL(url);
        return { action: 'deny' };
      });
    }
  });

  // Handle downloads
  session.defaultSession.on('will-download', (_event, item) => {
    mainWindow?.webContents.send('download-started', {
      filename: item.getFilename(),
      totalBytes: item.getTotalBytes(),
    });

    item.on('updated', (_event, state) => {
      if (state === 'progressing') {
        mainWindow?.webContents.send('download-progress', {
          filename: item.getFilename(),
          received: item.getReceivedBytes(),
          total: item.getTotalBytes(),
        });
      }
    });

    item.once('done', (_event, state) => {
      mainWindow?.webContents.send('download-done', {
        filename: item.getFilename(),
        state: state,
        path: item.getSavePath(),
      });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
