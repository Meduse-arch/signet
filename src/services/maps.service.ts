export interface MapItem {
  id: string;
  name: string;
  url: string;
  is_hidden?: boolean;
}

export async function getSessionMaps(sessionId: string): Promise<MapItem[]> {
  if (!window.electronAPI) return [];
  return await window.electronAPI.getMaps(sessionId);
}

export async function addSessionMap(sessionId: string, map: MapItem): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.addMap(sessionId, map);
  }
}

export async function removeSessionMap(sessionId: string, id: string): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.removeMap(sessionId, id);
  }
}
