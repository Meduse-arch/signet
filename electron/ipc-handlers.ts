import { app, ipcMain, BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

let masterDb: Database.Database;
const sessionDbs = new Map<string, Database.Database>();
let mainWin: BrowserWindow | null = null;

/**
 * Récupère ou initialise la base de données spécifique à une session.
 * La DB est stockée dans : userData/sessions/{hostPeerId}/{hostPeerId}.db
 */
function getSessionDb(sessionId: string): Database.Database {
  if (sessionDbs.has(sessionId)) return sessionDbs.get(sessionId)!;

  const session = masterDb.prepare('SELECT hostPeerId FROM sessions WHERE id = ?').get(sessionId) as any;
  if (!session) throw new Error(`Session ${sessionId} introuvable dans la base maître`);

  const hostPeerId = session.hostPeerId;
  const sessionsDir = path.join(app.getPath('userData'), 'sessions');
  if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

  const sessionFolder = path.join(sessionsDir, hostPeerId);
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });

  const dbPath = path.join(sessionFolder, `${hostPeerId}.db`);
  const db = new Database(dbPath);
  
  // Activer les performances et clés étrangères
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialisation des tables spécifiques à la session
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      peer_id TEXT PRIMARY KEY,
      pseudo TEXT
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      peer_id TEXT,
      name TEXT,
      stats TEXT,
      bars TEXT
    );
  `);

  sessionDbs.set(sessionId, db);
  return db;
}

export function registerIpcHandlers(mainWindow: BrowserWindow | null) {
  mainWin = mainWindow;
  
  const userDataPath = app.getPath('userData');
  const masterDbPath = path.join(userDataPath, 'sigil-vtt.db');
  console.log('Master Database path:', masterDbPath);
  
  masterDb = new Database(masterDbPath);
  masterDb.pragma('journal_mode = WAL');

  // Table des sessions (Globale)
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      imageUrl TEXT,
      settings TEXT,
      lastPlayed INTEGER,
      hostPeerId TEXT,
      system TEXT
    );
  `);

  // Migration: Ajouter la colonne settings si elle n'existe pas
  const tableInfo = masterDb.prepare("PRAGMA table_info(sessions)").all() as any[];
  const hasSettings = tableInfo.some(col => col.name === 'settings');
  if (!hasSettings) {
    console.log('Migration: Adding settings column to sessions table');
    masterDb.exec('ALTER TABLE sessions ADD COLUMN settings TEXT');
  }

  // Statements pour Master DB
  const getAllSessionsStmt = masterDb.prepare('SELECT * FROM sessions ORDER BY lastPlayed DESC');
  const addSessionStmt = masterDb.prepare('INSERT OR REPLACE INTO sessions (id, name, imageUrl, settings, lastPlayed, hostPeerId, system) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const removeSessionStmt = masterDb.prepare('DELETE FROM sessions WHERE id = ?');
  const updateLastPlayedStmt = masterDb.prepare('UPDATE sessions SET lastPlayed = ? WHERE id = ?');

  // --- HANDLERS SESSIONS (MASTER DB) ---

  ipcMain.handle('sessions:getAll', () => {
    const sessions = getAllSessionsStmt.all() as any[];
    return sessions.map(s => ({
      ...s,
      settings: s.settings ? JSON.parse(s.settings) : undefined
    }));
  });

  ipcMain.handle('sessions:add', (_, s) => {
    console.log('IPC: Adding session', s.name);
    addSessionStmt.run(
      s.id, 
      s.name, 
      s.imageUrl || null, 
      s.settings ? JSON.stringify(s.settings) : null,
      s.lastPlayed, 
      s.hostPeerId, 
      s.system || 'Système inconnu'
    );
  });

  ipcMain.handle('sessions:remove', (_, id) => {
    // Récupérer hostPeerId avant suppression pour nettoyer les fichiers
    const session = masterDb.prepare('SELECT hostPeerId FROM sessions WHERE id = ?').get(id) as any;
    
    removeSessionStmt.run(id);
    
    if (session) {
      // Fermer la connexion si elle est ouverte
      const db = sessionDbs.get(id);
      if (db) {
        db.close();
        sessionDbs.delete(id);
      }
      
      // Supprimer le dossier de la session
      const sessionFolder = path.join(app.getPath('userData'), 'sessions', session.hostPeerId);
      if (fs.existsSync(sessionFolder)) {
        try {
          fs.rmSync(sessionFolder, { recursive: true, force: true });
          console.log(`[DB] Session cleaned: ${session.hostPeerId}`);
        } catch (e) {
          console.error(`[DB] Failed to clean session folder: ${sessionFolder}`, e);
        }
      }
    }
  });

  ipcMain.handle('sessions:updateLastPlayed', (_, id, lastPlayed) => {
    updateLastPlayedStmt.run(lastPlayed, id);
  });

  // --- HANDLERS PLAYERS (SESSION DB) ---

  ipcMain.handle('players:getAll', (_, sessionId) => {
    try {
      const db = getSessionDb(sessionId);
      return db.prepare('SELECT * FROM players').all();
    } catch (e) {
      console.error('[DB] players:getAll error', e);
      return [];
    }
  });

  ipcMain.handle('players:add', (_, sessionId, peerId, pseudo) => {
    try {
      const db = getSessionDb(sessionId);
      db.prepare('INSERT OR REPLACE INTO players (peer_id, pseudo) VALUES (?, ?)').run(peerId, pseudo);
    } catch (e) {
      console.error('[DB] players:add error', e);
    }
  });

  ipcMain.handle('players:remove', (_, sessionId, peerId) => {
    try {
      const db = getSessionDb(sessionId);
      db.prepare('DELETE FROM players WHERE peer_id = ?').run(peerId);
    } catch (e) {
      console.error('[DB] players:remove error', e);
    }
  });

  ipcMain.handle('players:clear', (_, sessionId) => {
    try {
      const db = getSessionDb(sessionId);
      db.prepare('DELETE FROM players').run();
    } catch (e) {
      console.error('[DB] players:clear error', e);
    }
  });

  // --- HANDLERS CHARACTERS (SESSION DB) ---

  ipcMain.handle('characters:getAll', (_, sessionId) => {
    try {
      const db = getSessionDb(sessionId);
      const chars = db.prepare('SELECT * FROM characters').all() as any[];
      return chars.map(c => ({
        ...c,
        session_id: sessionId, // On rajoute l'id attendu par le frontend
        stats: c.stats ? JSON.parse(c.stats) : {},
        bars: c.bars ? JSON.parse(c.bars) : {}
      }));
    } catch (e) {
      console.error('[DB] characters:getAll error', e);
      return [];
    }
  });

  ipcMain.handle('characters:add', (_, c) => {
    try {
      const db = getSessionDb(c.session_id);
      db.prepare('INSERT OR REPLACE INTO characters (id, peer_id, name, stats, bars) VALUES (?, ?, ?, ?, ?)')
        .run(c.id, c.peer_id, c.name, JSON.stringify(c.stats), JSON.stringify(c.bars));
    } catch (e) {
      console.error('[DB] characters:add error', e);
    }
  });

  ipcMain.handle('characters:remove', (_, id) => {
    // Note: Dans cette architecture, characters:remove ne reçoit plus le sessionId.
    // Pour être rigoureux, il faudrait le passer. Pour l'instant, on cherche dans toutes les DB ouvertes
    // ou on modifie le frontend. On va chercher dans tous les sessionDbs par simplicité si id est unique.
    try {
      for (const db of sessionDbs.values()) {
        const result = db.prepare('DELETE FROM characters WHERE id = ?').run(id);
        if (result.changes > 0) break;
      }
    } catch (e) {
      console.error('[DB] characters:remove error', e);
    }
  });

  ipcMain.handle('characters:update', (_, id, name, stats, bars) => {
    try {
      for (const db of sessionDbs.values()) {
        const result = db.prepare('UPDATE characters SET name = ?, stats = ?, bars = ? WHERE id = ?')
          .run(name, JSON.stringify(stats), JSON.stringify(bars), id);
        if (result.changes > 0) break;
      }
    } catch (e) {
      console.error('[DB] characters:update error', e);
    }
  });

  // --- NAVIGATION & WINDOWS ---

  ipcMain.handle('windows:reDock', (event, type, sessionId) => {
    console.log('IPC: Re-docking window', type);
    const targetWin = mainWin || BrowserWindow.getAllWindows().find(w => !w.webContents.getURL().includes('/external/'));
    if (targetWin) {
      targetWin.webContents.send('windows:reDocked', type);

      const callerWin = BrowserWindow.fromWebContents(event.sender);
      if (callerWin && callerWin !== targetWin) {
        callerWin.close();
      }
    }
  });

  // Window Controls
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window:toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const isFS = win.isFullScreen();
      win.setFullScreen(!isFS);
    }
  });

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.handle('windows:openExternal', (event, type, sessionId) => {
    if (!mainWin || mainWin.isDestroyed()) {
      const caller = BrowserWindow.fromWebContents(event.sender);
      if (caller && !caller.webContents.getURL().includes('/external/')) {
        mainWin = caller;
      }
    }
    
    const win = new BrowserWindow({
      width: 400,
      height: 600,
      title: `Sigil - ${type.toUpperCase()}`,
      backgroundColor: '#0D0D0F',
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    const url = process.env.NODE_ENV === 'development' || !app.isPackaged
      ? `http://localhost:5173/#/external/${type}/${sessionId}`
      : `${path.join(__dirname, '../dist/index.html')}#/external/${type}/${sessionId}`;

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      win.loadURL(url);
    } else {
      win.loadFile(path.join(__dirname, '../dist/index.html'), { hash: `/external/${type}/${sessionId}` });
    }

    win.on('enter-full-screen', () => win.webContents.send('window:fullscreen', true));
    win.on('leave-full-screen', () => win.webContents.send('window:fullscreen', false));
  });
}
