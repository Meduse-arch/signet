import { app, ipcMain } from 'electron';
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

  const getAllStmt = db.prepare('SELECT * FROM sessions ORDER BY lastPlayed DESC');
  const addStmt = db.prepare('INSERT OR REPLACE INTO sessions (id, name, imageUrl, lastPlayed, hostPeerId, system) VALUES (?, ?, ?, ?, ?, ?)');
  const removeStmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  const updateLastPlayedStmt = db.prepare('UPDATE sessions SET lastPlayed = ? WHERE id = ?');

  const getPlayersStmt = db.prepare('SELECT * FROM session_players WHERE session_id = ?');
  const addPlayerStmt = db.prepare('INSERT OR REPLACE INTO session_players (session_id, peer_id, pseudo) VALUES (?, ?, ?)');
  const removePlayerStmt = db.prepare('DELETE FROM session_players WHERE session_id = ? AND peer_id = ?');
  const clearPlayersStmt = db.prepare('DELETE FROM session_players WHERE session_id = ?');

  ipcMain.handle('sessions:getAll', () => {
    return getAllStmt.all();
  });

  ipcMain.handle('sessions:add', (_, s) => {
    console.log('IPC: Adding session', s.name);
    // On passe les paramètres dans l'ordre du point d'interrogation pour éviter toute erreur de clé nommée
    addStmt.run(
      s.id, 
      s.name, 
      s.imageUrl || null, 
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
}