import { peerService } from './peer.service';
import { addSessionLog, getSessionLogs, SessionLog } from './db.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogType = 'des' | 'skill' | 'item' | 'quest' | 'combat' | 'system';

export interface ActivityLog extends SessionLog {
  type: LogType;
  /** Icône emoji pour l'affichage */
  icon?: string;
  /** Couleur accent (hex ou classe Tailwind) */
  color?: string;
}

export interface LogEvent {
  type: LogType;
  action: string;
  details?: any;
  character_id?: string;
  character_name?: string;
  icon?: string;
  color?: string;
}

// ─── Icônes et couleurs par type ──────────────────────────────────────────────

const LOG_META: Record<LogType, { icon: string; color: string }> = {
  des:     { icon: '🎲', color: '#d4af37' },
  skill:   { icon: '⚡', color: '#a78bfa' },
  item:    { icon: '🎒', color: '#34d399' },
  quest:   { icon: '📜', color: '#f59e0b' },
  combat:  { icon: '⚔️', color: '#f87171' },
  system:  { icon: '⚙️', color: '#94a3b8' },
};

// ─── ActivityLogService ───────────────────────────────────────────────────────

/**
 * Service singleton qui centralise tous les logs d'activité de session.
 *
 * Il :
 * - Écoute les messages P2P pour capter automatiquement les actions des joueurs
 * - Persiste les logs en DB via electronAPI
 * - Maintient un buffer en mémoire (50 derniers logs) pour l'UI réactive
 * - Notifie les abonnés (composants React) à chaque nouveau log
 */
class ActivityLogService {
  private sessionId: string | null = null;
  private buffer: ActivityLog[] = [];
  private listeners: Set<(logs: ActivityLog[]) => void> = new Set();
  private readonly BUFFER_SIZE = 100;

  constructor() {
    // Écoute les messages P2P — capte automatiquement les actions des autres joueurs
    peerService.onData((msg, fromPeerId) => {
      switch (msg.type) {

        // ── Jets de Dés ──────────────────────────────────────────────────────
        case 'DICE_ROLL':
          if (!msg.payload.secret) {
            this.addLog({
              type: 'des',
              action: `Lance ${msg.payload.label || msg.payload.diceString}`,
              details: {
                rolls: msg.payload.rolls,
                total: msg.payload.total,
                diceString: msg.payload.diceString,
                formula: msg.payload.diceString,
              },
              character_id: msg.payload.sender_id,
              character_name: msg.payload.sender_name,
            });
          }
          break;

        case 'SECRET_DICE_ROLL':
          // Log uniquement reçu par le MJ ou explicitement loggé
          this.addLog({
            type: 'des',
            action: `Lance ${msg.payload.label || msg.payload.diceString} (Secret)`,
            details: {
              rolls: msg.payload.rolls,
              total: msg.payload.total,
              diceString: msg.payload.diceString,
              formula: msg.payload.diceString,
            },
            character_id: msg.payload.sender_id,
            character_name: msg.payload.sender_name,
          });
          break;

        // ── Compétences ──────────────────────────────────────────────────────
        case 'SKILL_USED':
          this.addLog({
            type: 'skill',
            action: `Utilise : ${msg.payload.skill_name}`,
            details: {
              skill_id: msg.payload.skill_id,
              skill_name: msg.payload.skill_name,
              skill_type: msg.payload.skill_type,
              description: msg.payload.description,
            },
            character_id: msg.payload.sender_id,
            character_name: msg.payload.sender_name,
          });
          break;

        // ── Items Équipés / Déséquipés ─────────────────────────────────────
        case 'ITEM_EQUIPPED':
          this.addLog({
            type: 'item',
            action: `${msg.payload.equipped ? 'Équipe' : 'Déséquipe'} : ${msg.payload.item_name}`,
            details: {
              item_id: msg.payload.item_id,
              item_name: msg.payload.item_name,
              item_type: msg.payload.item_type,
              equipped: msg.payload.equipped,
            },
            character_id: msg.payload.sender_id,
            character_name: msg.payload.sender_name,
          });
          break;

        // ── Quêtes ───────────────────────────────────────────────────────────
        case 'QUEST_UPDATED':
          this.addLog({
            type: 'quest',
            action: `Quête "${msg.payload.quest_name}" : ${msg.payload.status}`,
            details: {
              quest_id: msg.payload.quest_id,
              quest_name: msg.payload.quest_name,
              status: msg.payload.status,
              previous_status: msg.payload.previous_status,
            },
            character_name: 'MJ',
          });
          break;

        // ── Combat ───────────────────────────────────────────────────────────
        case 'COMBAT_STATE_UPDATE':
          if (msg.payload?.isActive !== undefined) {
            this.addLog({
              type: 'combat',
              action: msg.payload.isActive ? '⚔️ Combat initié' : '🏳️ Combat terminé',
              details: { state: msg.payload },
              character_name: 'MJ',
            });
          }
          break;
      }
    });
  }

  // ─── API Publique ─────────────────────────────────────────────────────────

  /** Initialise le service pour une session — charge l'historique depuis la DB */
  async initialize(sessionId: string) {
    this.sessionId = sessionId;
    this.buffer = [];

    if (window.electronAPI) {
      const dbLogs = await getSessionLogs(sessionId);
      this.buffer = dbLogs
        .slice(-this.BUFFER_SIZE)
        .map(l => this.enrichLog(l as ActivityLog));
      this.notify();
    }

    console.log(`[ActivityLog] 📋 Initialisé pour session "${sessionId}" — ${this.buffer.length} logs chargés.`);
  }

  /**
   * Ajoute un log manuellement (pour les actions locales — ex: le joueur lui-même lance un dé)
   */
  async addLog(event: LogEvent) {
    const meta = LOG_META[event.type] || LOG_META.system;
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      type: event.type,
      action: event.action,
      details: event.details || {},
      timestamp: Date.now(),
      character_id: event.character_id,
      character_name: event.character_name,
      icon: event.icon || meta.icon,
      color: event.color || meta.color,
    };

    // Ajout en buffer mémoire
    this.buffer.unshift(log);
    if (this.buffer.length > this.BUFFER_SIZE) {
      this.buffer = this.buffer.slice(0, this.BUFFER_SIZE);
    }
    this.notify();

    // Persistance DB côté Electron
    if (this.sessionId && window.electronAPI) {
      await addSessionLog(this.sessionId, log).catch(err =>
        console.warn('[ActivityLog] Erreur persistance:', err)
      );
    }
  }

  /** Retourne une copie du buffer courant */
  getLogs(): ActivityLog[] {
    return [...this.buffer];
  }

  /** S'abonne aux mises à jour du buffer */
  subscribe(cb: (logs: ActivityLog[]) => void): () => void {
    this.listeners.add(cb);
    // Envoie immédiatement l'état actuel
    cb([...this.buffer]);
    return () => this.listeners.delete(cb);
  }

  // ─── Privé ────────────────────────────────────────────────────────────────

  private enrichLog(log: ActivityLog): ActivityLog {
    const meta = LOG_META[log.type as LogType] || LOG_META.system;
    return {
      ...log,
      icon: log.icon || meta.icon,
      color: log.color || meta.color,
    };
  }

  private notify() {
    const snapshot = [...this.buffer];
    this.listeners.forEach(cb => cb(snapshot));
  }
}

export const activityLogService = new ActivityLogService();
