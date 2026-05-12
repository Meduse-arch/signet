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