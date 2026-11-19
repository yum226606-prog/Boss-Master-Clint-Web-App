const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const LIVE_CLIENT_URL = 'https://boss-master-clint-web-app.vercel.app/';

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'pwa-512x512.png');
  const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'BOSS Aluminium',
    backgroundColor: '#0C0F14',
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:boss-aluminium',
      devTools: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  // Anti-inspect & right-click protection matching Client App
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = String(input.key || '').toLowerCase();
    const mod = input.control || input.meta;
    if (
      key === 'f12' ||
      (mod && input.shift && (key === 'i' || key === 'j' || key === 'c')) ||
      (mod && (key === 'u' || key === 's'))
    ) {
      event.preventDefault();
    }
  });

  // Open external WhatsApp / Google Maps / Download links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Load Live Vercel Client App; automatically fall back to bundled offline dist if internet is disconnected
  mainWindow.loadURL(LIVE_CLIENT_URL).catch(() => {
    if (fs.existsSync(distIndexPath)) {
      mainWindow.loadFile(distIndexPath);
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _errDesc, validatedURL) => {
    if (errorCode === -3) return; // ignore aborted navigations
    if (validatedURL && validatedURL.startsWith('https://') && fs.existsSync(distIndexPath)) {
      mainWindow.loadFile(distIndexPath);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
