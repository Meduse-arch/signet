export interface Character {
  id: string;
  session_id: string;
  user_id?: string;
  name: string;
  stats: Record<string, number>;
  bars: Record<string, number>;
  image_url?: string;
}

export async function getSessionCharacters(sessionId: string): Promise<Character[]> {
  if (!window.electronAPI) return [];
  return await window.electronAPI.getCharacters(sessionId);
}

export async function addSessionCharacter(character: Character): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.addCharacter(character);
  }
}

export async function updateSessionCharacter(id: string, name: string, stats: Record<string, number>, bars: Record<string, number>, imageUrl?: string): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.updateCharacter(id, name, stats, bars, imageUrl);
  }
}

export async function removeSessionCharacter(id: string): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.removeCharacter(id);
  }
}
