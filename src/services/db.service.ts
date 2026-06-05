import { Session } from './session.service';

export async function getAllSessions(): Promise<Session[]> {
  if (!window.electronAPI) return [];
  return window.electronAPI.getSessions();
}

export async function addSession(session: Session): Promise<void> {
  if (!window.electronAPI) return;
  return window.electronAPI.addSession(session);
}

export async function removeSession(id: string): Promise<void> {
  if (!window.electronAPI) return;
  return window.electronAPI.removeSession(id);
}

export async function getSessionPlayers(sessionId: string) {
  if (!window.electronAPI) return [];
  return window.electronAPI.getPlayers(sessionId);
}

export async function addSessionPlayer(sessionId: string, peerId: string, pseudo: string, role?: number) {
  if (!window.electronAPI) return;
  return window.electronAPI.addPlayer(sessionId, peerId, pseudo, role);
}

export async function removeSessionPlayer(sessionId: string, peerId: string) {
  if (!window.electronAPI) return;
  return window.electronAPI.removePlayer(sessionId, peerId);
}

export async function clearSessionPlayers(sessionId: string) {
  if (!window.electronAPI) return;
  return window.electronAPI.clearPlayers(sessionId);
}

export interface SessionLog {
  id: string;
  type: 'des' | 'action' | 'system' | 'skill' | 'item' | 'quest' | 'combat';
  action: string;
  details: any;
  timestamp: number;
  character_id?: string;
  character_name?: string;
}

export async function getSessionLogs(sessionId: string): Promise<SessionLog[]> {
  if (!window.electronAPI) return [];
  const logs = await window.electronAPI.getLogs(sessionId);
  return logs.map((l: any) => ({
    ...l,
    details: l.details ? JSON.parse(l.details) : {}
  }));
}

export async function addSessionLog(sessionId: string, log: SessionLog): Promise<void> {
  if (!window.electronAPI) return;
  return window.electronAPI.addLog(sessionId, log);
}