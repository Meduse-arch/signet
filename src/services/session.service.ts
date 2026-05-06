export interface Session {
  id: string;
  name: string;
  imageUrl?: string;
  lastPlayed: number;
  hostPeerId: string;
  system?: string;
  isSummoned?: boolean;
}

export function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 30) return `Il y a ${days} jours`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a plus d'un an`;
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export {
  addSessionPlayer,
  clearSessionPlayers,
  getSessionPlayers,
  removeSessionPlayer
} from './db.service';