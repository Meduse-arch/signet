import { app, ipcMain, BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import * as path from 'path';

let db: Database.Database;

export function registerIpcHandlers() {
  const dbPath = path.join(app.getPath('userData'), 'sigil-vtt.db');
  console.log('Database path:', dbPath);
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      imageUrl TEXT,
      settings TEXT,
      lastPlayed INTEGER,
      hostPeerId TEXT,
      system TEXT
    );

    CREATE TABLE IF NOT EXISTS session_players (
      session_id TEXT,
      peer_id TEXT,
      pseudo TEXT,
      PRIMARY KEY(session_id, peer_id)
    );
  `);

  // Migration: Ajouter la colonne settings si elle n'existe pas
  const tableInfo = db.prepare("PRAGMA table_info(sessions)").all() as any[];
  const hasSettings = tableInfo.some(col => col.name === 'settings');
  if (!hasSettings) {
    console.log('Migration: Adding settings column to sessions table');
    db.exec('ALTER TABLE sessions ADD COLUMN settings TEXT');
  }

  const getAllStmt = db.prepare('SELECT * FROM sessions ORDER BY lastPlayed DESC');
  const addStmt = db.prepare('INSERT OR REPLACE INTO sessions (id, name, imageUrl, settings, lastPlayed, hostPeerId, system) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const removeStmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  const updateLastPlayedStmt = db.prepare('UPDATE sessions SET lastPlayed = ? WHERE id = ?');

  const getPlayersStmt = db.prepare('SELECT * FROM session_players WHERE session_id = ?');
  const addPlayerStmt = db.prepare('INSERT OR REPLACE INTO session_players (session_id, peer_id, pseudo) VALUES (?, ?, ?)');
  const removePlayerStmt = db.prepare('DELETE FROM session_players WHERE session_id = ? AND peer_id = ?');
  const clearPlayersStmt = db.prepare('DELETE FROM session_players WHERE session_id = ?');

  ipcMain.handle('sessions:getAll', () => {
    const sessions = getAllStmt.all() as any[];
    return sessions.map(s => ({
      ...s,
      settings: s.settings ? JSON.parse(s.settings) : undefined
    }));
  });

  ipcMain.handle('sessions:add', (_, s) => {
    console.log('IPC: Adding session', s.name);
    addStmt.run(
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
    removeStmt.run(id);
  });

  ipcMain.handle('sessions:updateLastPlayed', (_, id, lastPlayed) => {
    updateLastPlayedStmt.run(lastPlayed, id);
  });

  ipcMain.handle('players:getAll', (_, sessionId) => {
    return getPlayersStmt.all(sessionId);
  });

  ipcMain.handle('players:add', (_, sessionId, peerId, pseudo) => {
    addPlayerStmt.run(sessionId, peerId, pseudo);
  });

  ipcMain.handle('players:remove', (_, sessionId, peerId) => {
    removePlayerStmt.run(sessionId, peerId);
  });

  ipcMain.handle('players:clear', (_, sessionId) => {
    clearPlayersStmt.run(sessionId);
  });

  ipcMain.handle('windows:openExternal', (_, type, sessionId) => {
    const win = new BrowserWindow({
      width: 400,
      height: 600,
      title: `Sigil - ${type.toUpperCase()}`,
      backgroundColor: '#0D0D0F',
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
  });
}