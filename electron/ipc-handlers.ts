import { app, ipcMain, BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

let masterDb: Database.Database;
const sessionDbs = new Map<string, Database.Database>();
const initializedDbs = new Set<string>(); // ✅ Track initialized DBs to avoid redundant exec()
let mainWin: BrowserWindow | null = null;

/**
 * Récupère ou initialise la base de données spécifique à une session.
 * Supporte la recherche par UUID (id) ou par clef (hostPeerId).
 */
function getSessionDb(sessionId: string): Database.Database {
  if (sessionDbs.has(sessionId)) return sessionDbs.get(sessionId)!;

  // 1. Chercher la session dans la Master DB
  let session = masterDb.prepare('SELECT id, hostPeerId FROM sessions WHERE id = ? OR hostPeerId = ?').get(sessionId, sessionId) as any;
  
  if (!session) {
    console.warn(`[DB] Session ${sessionId} introuvable. Création d'une entrée temporaire ou erreur ?`);
    // Si c'est un joueur qui rejoint via une clé SIGNET, on peut créer le dossier si nécessaire
    if (sessionId.startsWith('SIGNET-')) {
      session = { id: sessionId, hostPeerId: sessionId };
    } else {
      throw new Error(`Session ${sessionId} introuvable dans la base maître`);
    }
  }

  const hostPeerId = session.hostPeerId;
  
  // ✅ On utilise le dossier AppData pour les bases de données (conforme aux standards OS)
  const baseDir = app.getPath('userData');
  const sessionsDir = path.join(baseDir, 'data', 'sessions');
  
  if (!fs.existsSync(sessionsDir)) {
    console.log(`[DB] Création du répertoire des sessions : ${sessionsDir}`);
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  const sessionFolder = path.join(sessionsDir, hostPeerId);
  if (!fs.existsSync(sessionFolder)) {
    console.log(`[DB] Création du dossier session : ${sessionFolder}`);
    fs.mkdirSync(sessionFolder, { recursive: true });
  }

  const dbPath = path.join(sessionFolder, `${hostPeerId}.db`);
  console.log(`[DB] Ouverture de la base session : ${dbPath}`);
  
  // ✅ On ajoute un timeout pour éviter les erreurs SQLITE_BUSY lors de micro-conflits
  const db = new Database(dbPath, { timeout: 5000 });
  
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ✅ On n'exécute le script d'initialisation qu'une seule fois par session de l'app
  if (!initializedDbs.has(dbPath)) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS players (
          peer_id TEXT PRIMARY KEY,
          pseudo TEXT,
          role INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS characters (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          name TEXT,
          stats TEXT,
          skills TEXT,
          bars TEXT,
          image_url TEXT,
          inventory TEXT,
          custom_skills TEXT,
          type TEXT,
          is_template INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          name TEXT,
          description TEXT,
          category TEXT,
          image_url TEXT,
          effects TEXT,
          stats TEXT
        );

        CREATE TABLE IF NOT EXISTS maps (
          id TEXT PRIMARY KEY,
          name TEXT,
          url TEXT
        );

        CREATE TABLE IF NOT EXISTS map_tokens (
          id TEXT PRIMARY KEY,
          map_id TEXT NOT NULL,
          character_id TEXT NOT NULL,
          x REAL NOT NULL DEFAULT 0,
          y REAL NOT NULL DEFAULT 0,
          FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS logs (
          id TEXT PRIMARY KEY,
          type TEXT,
          action TEXT,
          details TEXT,
          timestamp INTEGER,
          character_id TEXT,
          character_name TEXT
        );
      `);

      // Migration: Ajouter les colonnes manquantes si nécessaire
      const playerTableInfo = db.prepare("PRAGMA table_info(players)").all() as any[];
      if (!playerTableInfo.some(col => col.name === 'role')) {
        db.exec('ALTER TABLE players ADD COLUMN role INTEGER DEFAULT 0');
      }

      const charTableInfo = db.prepare("PRAGMA table_info(characters)").all() as any[];
      if (!charTableInfo.some(col => col.name === 'inventory')) {
        db.exec('ALTER TABLE characters ADD COLUMN inventory TEXT');
      }
      if (!charTableInfo.some(col => col.name === 'custom_skills')) {
        db.exec('ALTER TABLE characters ADD COLUMN custom_skills TEXT');
      }
      if (!charTableInfo.some(col => col.name === 'user_id')) {
        db.exec('ALTER TABLE characters ADD COLUMN user_id TEXT');
      }
      if (!charTableInfo.some(col => col.name === 'image_url')) {
        db.exec('ALTER TABLE characters ADD COLUMN image_url TEXT');
      }
      if (!charTableInfo.some(col => col.name === 'skills')) {
        db.exec('ALTER TABLE characters ADD COLUMN skills TEXT');
      }
      if (!charTableInfo.some(col => col.name === 'type')) {
        db.exec('ALTER TABLE characters ADD COLUMN type TEXT');
      }
      if (!charTableInfo.some(col => col.name === 'is_template')) {
        db.exec('ALTER TABLE characters ADD COLUMN is_template INTEGER DEFAULT 0');
      }
      
      initializedDbs.add(dbPath);
    } catch (err) {
      console.error(`[DB] Erreur lors de l'initialisation de la session ${sessionId}:`, err);
      db.close();
      throw err;
    }
  }

  sessionDbs.set(sessionId, db);
  // On indexe aussi par l'autre ID pour les recherches futures
  if (session.id !== sessionId) sessionDbs.set(session.id, db);
  if (session.hostPeerId !== sessionId) sessionDbs.set(session.hostPeerId, db);
  
  return db;
}

export function registerIpcHandlers(mainWindow: BrowserWindow | null) {
  mainWin = mainWindow;
  
  // ✅ On utilise le dossier AppData pour les bases de données (conforme aux standards OS)
  const baseDir = app.getPath('userData');
  const dataDir = path.join(baseDir, 'data');
  const masterDbPath = path.join(dataDir, 'sigil-vtt.db');
  const sessionsDir = path.join(dataDir, 'sessions');
  
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

  console.log('--- SIGIL VTT DATABASE INFO ---');
  console.log('Base Directory:', baseDir);
  console.log('Data Directory:', dataDir);
  console.log('Master DB Path:', masterDbPath);
  console.log('Sessions Dir :', sessionsDir);
  console.log('-------------------------------');
  
  masterDb = new Database(masterDbPath, { timeout: 5000 });
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
      const baseDir = app.getPath('userData');
      const sessionFolder = path.join(baseDir, 'data', 'sessions', session.hostPeerId);
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

  ipcMain.handle('players:add', (_, sessionId, peerId, pseudo, role) => {
    try {
      const db = getSessionDb(sessionId);
      db.prepare('INSERT OR REPLACE INTO players (peer_id, pseudo, role) VALUES (?, ?, ?)').run(peerId, pseudo, role || 0);
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
        session_id: sessionId,
        stats: c.stats ? JSON.parse(c.stats) : {},
        skills: c.skills ? JSON.parse(c.skills) : {},
        bars: c.bars ? JSON.parse(c.bars) : {},
        inventory: c.inventory ? JSON.parse(c.inventory) : [],
        custom_skills: c.custom_skills ? JSON.parse(c.custom_skills) : [],
        is_template: c.is_template === 1
      }));
    } catch (e) {
      console.error('[DB] characters:getAll error', e);
      return [];
    }
  });

  ipcMain.handle('characters:add', (_, c) => {
    try {
      const db = getSessionDb(c.session_id);
      db.prepare('INSERT OR REPLACE INTO characters (id, user_id, name, stats, skills, bars, image_url, inventory, custom_skills, type, is_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(c.id, c.user_id || null, c.name, JSON.stringify(c.stats), JSON.stringify(c.skills || {}), JSON.stringify(c.bars), c.image_url || null, JSON.stringify(c.inventory || []), JSON.stringify(c.custom_skills || []), c.type || null, c.is_template ? 1 : 0);
    } catch (e) {
      console.error('[DB] characters:add error', e);
    }
  });

  ipcMain.handle('characters:remove', (_, id) => {
    try {
      for (const db of sessionDbs.values()) {
        const result = db.prepare('DELETE FROM characters WHERE id = ?').run(id);
        if (result.changes > 0) break;
      }
    } catch (e) {
      console.error('[DB] characters:remove error', e);
    }
  });

  ipcMain.handle('characters:update', (_, id, name, stats, skills, bars, imageUrl, inventory, custom_skills, type, is_template) => {
    try {
      for (const db of sessionDbs.values()) {
        const result = db.prepare('UPDATE characters SET name = ?, stats = ?, skills = ?, bars = ?, image_url = ?, inventory = ?, custom_skills = ?, type = ?, is_template = ? WHERE id = ?')
          .run(name, JSON.stringify(stats), JSON.stringify(skills || {}), JSON.stringify(bars), imageUrl || null, JSON.stringify(inventory || []), JSON.stringify(custom_skills || []), type || null, is_template ? 1 : 0, id);
        if (result.changes > 0) break;
      }
    } catch (e) {
      console.error('[DB] characters:update error', e);
    }
  });

  ipcMain.handle('characters:updateBars', (_, id, bars) => {
    try {
      for (const db of sessionDbs.values()) {
        const result = db.prepare('UPDATE characters SET bars = ? WHERE id = ?')
          .run(JSON.stringify(bars), id);
        if (result.changes > 0) break;
      }
    } catch (e) {
      console.error('[DB] characters:updateBars error', e);
    }
  });

  // --- HANDLERS MAPS (SESSION DB) ---

  ipcMain.handle('maps:getAll', (_, sessionId) => {
    try {
      const db = getSessionDb(sessionId);
      return db.prepare('SELECT * FROM maps').all();
    } catch (e) {
      console.error('[DB] maps:getAll error', e);
      return [];
    }
  });

  ipcMain.handle('maps:add', (_, sessionId, map) => {
    try {
      const db = getSessionDb(sessionId);
      db.prepare('INSERT OR REPLACE INTO maps (id, name, url) VALUES (?, ?, ?)')
        .run(map.id, map.name, map.url);
    } catch (e) {
      console.error('[DB] maps:add error', e);
    }
  });

  ipcMain.handle('maps:remove', (_, sessionId, id) => {
    try {
      const db = getSessionDb(sessionId);
      db.prepare('DELETE FROM maps WHERE id = ?').run(id);
    } catch (e) {
      console.error('[DB] maps:remove error', e);
    }
  });

  // --- HANDLERS MAP TOKENS (SESSION DB) ---

  ipcMain.handle('map_tokens:getAll', (_, sessionId, mapId) => {
    try {
      const db = getSessionDb(sessionId);
      return db.prepare('SELECT * FROM map_tokens WHERE map_id = ?').all(mapId);
    } catch (e) {
      console.error('[DB] map_tokens:getAll error', e);
      return [];
    }
  });

  ipcMain.handle('map_tokens:update', (_, sessionId, mapId, characterId, x, y) => {
    try {
      const db = getSessionDb(sessionId);
      db.prepare('INSERT OR REPLACE INTO map_tokens (id, map_id, character_id, x, y) VALUES (?, ?, ?, ?, ?)')
        .run(`${mapId}_${characterId}`, mapId, characterId, x, y);
    } catch (e) {
      console.error('[DB] map_tokens:update error', e);
    }
  });

  ipcMain.handle('map_tokens:remove', (_, sessionId, mapId, characterId) => {
    try {
      const db = getSessionDb(sessionId);
      db.prepare('DELETE FROM map_tokens WHERE map_id = ? AND character_id = ?').run(mapId, characterId);
    } catch (e) {
      console.error('[DB] map_tokens:remove error', e);
    }
  });

  // --- HANDLERS LOGS (SESSION DB) ---

  ipcMain.handle('logs:getAll', (_, sessionId) => {
    try {
      const db = getSessionDb(sessionId);
      return db.prepare('SELECT * FROM logs ORDER BY timestamp DESC').all();
    } catch (e) {
      console.error('[DB] logs:getAll error', e);
      return [];
    }
  });

  ipcMain.handle('logs:add', (_, sessionId, log) => {
    try {
      const db = getSessionDb(sessionId);
      db.prepare('INSERT INTO logs (id, type, action, details, timestamp, character_id, character_name) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(log.id, log.type, log.action, JSON.stringify(log.details), log.timestamp, log.character_id, log.character_name);
    } catch (e) {
      console.error('[DB] logs:add error', e);
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
