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
    title: "Sigil VTT",
    backgroundColor: '#0D0D0F',
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
}

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

  registerIpcHandlers();
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