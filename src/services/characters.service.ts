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
  console.log(`[CharactersService] Fetching characters for session: ${sessionId}`);
  const chars = await window.electronAPI.getCharacters(sessionId);
  console.log(`[CharactersService] Fetched ${chars.length} characters`);
  return chars;
}

export async function addSessionCharacter(character: Character): Promise<void> {
  if (window.electronAPI) {
    console.log(`[CharactersService] Adding character to DB: ${character.name}`);
    await window.electronAPI.addCharacter(character);
  }
}

export async function updateSessionCharacter(id: string, name: string, stats: Record<string, number>, bars: Record<string, number>, imageUrl?: string): Promise<void> {
  if (window.electronAPI) {
    console.log(`[CharactersService] Updating character in DB: ${name}`);
    await window.electronAPI.updateCharacter(id, name, stats, bars, imageUrl);
  }
}

export async function removeSessionCharacter(id: string): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.removeCharacter(id);
  }
}
