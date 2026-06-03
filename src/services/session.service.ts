export interface Session {
  id: string;
  name: string;
  imageUrl?: string;
  settings?: Record<string, any>;
  lastPlayed: number;
  hostPeerId: string;
  system?: string;
  isSummoned?: boolean;
  activeMapId?: string;
  maps?: any[];
}

import i18next from 'i18next';

export function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return i18next.t('time.today', "Aujourd'hui");
  if (days === 1) return i18next.t('time.yesterday', "Hier");
  if (days < 30) return i18next.t('time.daysAgo', { count: days, defaultValue: `Il y a ${days} jours` });
  if (days < 365) return i18next.t('time.monthsAgo', { count: Math.floor(days / 30), defaultValue: `Il y a ${Math.floor(days / 30)} mois` });
  return i18next.t('time.yearsAgo', "Il y a plus d'un an");
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