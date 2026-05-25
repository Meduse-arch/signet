import { app, BrowserWindow, session } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc-handlers';

// ✅ Désactive le masquage MDNS pour permettre le P2P en réseau local/loopback
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');
// ✅ Désactive globalement la sécurité web pour que les Web Workers (PixiJS) ignorent CORS
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'IsolateOrigins,site-per-process');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Signet",
    backgroundColor: '#0D0D0F',
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Permet de charger des images externes (CORS) pour les maps/tokens
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen', true);
  });
  
  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window:fullscreen', false);
  });
}

// ✅ Empêche plusieurs instances de l'application de s'exécuter simultanément (évite les conflits DB)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // ✅ Force les en-têtes CORS pour toutes les requêtes (contourne les limitations des Web Workers)
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['*'],
        },
      });
    });

    createWindow();
    registerIpcHandlers(mainWindow);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        registerIpcHandlers(mainWindow);
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});