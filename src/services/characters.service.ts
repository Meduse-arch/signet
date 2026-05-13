export interface Character {
  id: string;
  session_id: string;
  user_id?: string | null;
  name: string;
  stats: Record<string, number>;
  skills: Record<string, number>;
  bars: Record<string, number>;
  image_url?: string;
  inventory?: any[];
  custom_skills?: any[];
  type?: 'Joueur' | 'PNJ' | 'Monstre' | 'Boss';
  is_template?: boolean;
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

export async function updateSessionCharacter(
  id: string, 
  name: string, 
  stats: Record<string, number>, 
  skills: Record<string, number>, 
  bars: Record<string, number>, 
  imageUrl?: string,
  inventory?: any[],
  custom_skills?: any[],
  type?: string,
  is_template?: boolean
): Promise<void> {
  if (window.electronAPI) {
    console.log(`[CharactersService] Updating character in DB: ${name}`);
    await window.electronAPI.updateCharacter(id, name, stats, skills, bars, imageUrl, inventory, custom_skills, type, is_template);
  }
}

export async function updateCharacterBars(id: string, bars: Record<string, number>): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.updateCharacterBars(id, bars);
  }
}

export async function removeSessionCharacter(id: string): Promise<void> {
  if (window.electronAPI) {
    await window.electronAPI.removeCharacter(id);
  }
}
