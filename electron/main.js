const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Determine if we're in dev mode or packaged
const isDev = !app.isPackaged;

// Path to the exported Expo web build
const WEB_BUILD_DIR = path.join(__dirname, '..', 'dist');

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 860,
    minWidth: 360,
    minHeight: 640,
    title: 'LabDoc',
    backgroundColor: '#f4f4f0',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Allow local file access for images saved by the app
      webSecurity: false,
    },
    // Simulate mobile-like window (portrait)
    resizable: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
  });

  if (isDev) {
    // In dev mode, load the Expo web dev server
    win.loadURL('http://localhost:8081');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the exported static web build
    const indexPath = path.join(WEB_BUILD_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      win.loadFile(indexPath);
    } else {
      // Fallback: show error page
      win.loadURL(`data:text/html,
        <html style="font-family:monospace;background:#f4f4f0;color:#1a1a1a;padding:40px">
        <h2 style="color:#cc2200">Web-Build nicht gefunden</h2>
        <p>Bitte zuerst <code>npm run build:web</code> ausführen, dann <code>npm run dist</code>.</p>
        <p>Erwarteter Pfad: <code>${indexPath}</code></p>
        </html>
      `);
    }
  }

  // Open external links in default browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  return win;
}

// IPC: allow renderer to read/write files (for export/import)
ipcMain.handle('fs:readFile', async (_event, filePath) => {
  return fs.promises.readFile(filePath, 'utf8');
});

ipcMain.handle('fs:writeFile', async (_event, filePath, content) => {
  await fs.promises.writeFile(filePath, content, 'utf8');
});

ipcMain.handle('fs:exists', async (_event, filePath) => {
  return fs.existsSync(filePath);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
