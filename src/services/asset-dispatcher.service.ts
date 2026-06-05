import { peerService } from './peer.service';
import { swarmService } from './swarm.service';
import { calculateHash } from './transfer.service';
import { dbStorage } from './db.storage';

// ─── Seuils de Routage ────────────────────────────────────────────────────────
//
// RÈGLE D'OR : le routeur est aveugle à la sémantique.
// Il ne regarde que le POIDS et le TYPE MIME.
// Un token de 800 Ko passe en Swarm. Un MP3 de 20 Ko passe en Direct. Point.
//
// GRILLE D'OPTIMISATION À 4 NIVEAUX :
//
//  < 500 Ko                           → DIRECT   (Base64, pas de coordination)
//  ≥ 500 Ko ET non-audio              → SWARM    (P2P Mesh, Round-Robin + Bitfield)
//  ≥ 500 Ko ET audio ET < 4.8 Mo     → SWARM    (téléchargé une fois, joué par Howler)
//  ≥ 4.8 Mo ET audio                  → MSE      (streaming live, jamais stocké)
//
// POURQUOI 4 NIVEAUX ET PAS 3 ?
// Un audio de 2 Mo (ex: une boucle de 2 min) peut être stocké en DB et joué par Howler
// avec des boucles parfaites (0ms de blanc à la répétition).
// Si on l'envoie en MSE, on re-streame à chaque session depuis le MJ inutilement.
// Le Swarm le télécharge une seule fois, et toutes les sessions suivantes jouent
// depuis le disque local → 0 bande passante pour le MJ.

/** Tout asset < ce seuil → Canal Direct (Base64/JSON) */
export const DIRECT_THRESHOLD_BYTES = 500 * 1024; // 500 Ko

/** Audio ≥ ce seuil → Canal MSE (streaming live, RAM protégée, jamais stocké) */
export const MSE_AUDIO_THRESHOLD_BYTES = 5 * 60 * (128_000 / 8); // ~4.8 Mo

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssetChannel = 'direct' | 'swarm' | 'mse';

export interface RouteDecision {
  channel: AssetChannel;
  reason: string;
}

export interface DispatchResult {
  channel: AssetChannel;
  hash: string;
  blobUrl?: string;
}

// ─── AssetDispatcher ──────────────────────────────────────────────────────────

class AssetDispatcher {

  constructor() {
    peerService.onData((msg, _fromPeerId) => {
      if (msg.type === 'DISPATCH_ANNOUNCE') {
        this.handleAnnounce(msg.payload);
      }
    });

    console.log(
      '%c[AssetDispatcher] ✅ Initialisé\n' +
      '  < 500 Ko              → DIRECT\n' +
      '  ≥ 500 Ko + non-audio  → SWARM\n' +
      '  ≥ 500 Ko + audio      → SWARM (stocké, joué par Howler)\n' +
      '  ≥ 4.8 Mo  + audio     → MSE   (streaming live, jamais stocké)',
      'color:#a78bfa;font-weight:bold'
    );
  }

  // ─── API Publique (côté MJ) ───────────────────────────────────────────────

  /**
   * [MJ] Dispatche un asset. Choisit le canal optimal automatiquement.
   * Agnostique du contexte : Token, Map, SFX, MP3 ambiance → peu importe.
   */
  async dispatch(data: ArrayBuffer, mime: string, label: string = 'asset'): Promise<DispatchResult> {
    const hash = await calculateHash(data);
    const { channel, reason } = this.classifyChannel(data.byteLength, mime);

    console.log(
      `%c[AssetDispatcher] 📦 "${label}" — ${this.formatSize(data.byteLength)} — ${mime}\n  → Canal : ${channel.toUpperCase()} (${reason})`,
      this.channelColor(channel)
    );

    switch (channel) {
      case 'direct': return this.dispatchDirect(data, mime, hash, label);
      case 'swarm':  return this.dispatchSwarm(data, mime, hash, label);
      case 'mse':    return { channel: 'mse', hash };
    }
  }

  /**
   * Détermine le canal optimal — peut être appelé sans envoyer.
   * Utile pour les composants UI qui veulent afficher le canal prévu.
   */
  classifyChannel(byteLength: number, mime: string): RouteDecision {
    const isAudio = mime.startsWith('audio/');

    // Niveau 1 : Sous le seuil direct → toujours Direct, sans exception
    if (byteLength < DIRECT_THRESHOLD_BYTES) {
      return {
        channel: 'direct',
        reason: `< 500 Ko — envoi direct Base64 (${this.formatSize(byteLength)})`
      };
    }

    // Niveau 2 : Non-audio lourd → toujours Swarm (Maps, images 4K, etc.)
    if (!isAudio) {
      return {
        channel: 'swarm',
        reason: `≥ 500 Ko + non-audio — P2P Mesh Round-Robin (${this.formatSize(byteLength)})`
      };
    }

    // Niveau 3 : Audio moyen (500 Ko - 4.8 Mo) → Swarm pour stockage permanent
    // Avantage : téléchargé 1 seule fois, joué par Howler en boucle parfaite
    if (byteLength < MSE_AUDIO_THRESHOLD_BYTES) {
      return {
        channel: 'swarm',
        reason: `Audio moyen (${this.formatSize(byteLength)} < 4.8 Mo) — Swarm + stocké DB + Howler boucle parfaite`
      };
    }

    // Niveau 4 : Audio long (≥ 4.8 Mo) → MSE streaming live, jamais stocké en DB
    // RAM protégée, 0 Mo sur disque joueur, stream depuis MJ à ~128 kbps
    return {
      channel: 'mse',
      reason: `Audio long (${this.formatSize(byteLength)} ≥ 4.8 Mo) — MSE streaming live, jamais stocké`
    };
  }

  // ─── Canal Direct ────────────────────────────────────────────────────────

  private async dispatchDirect(
    data: ArrayBuffer,
    mime: string,
    hash: string,
    label: string
  ): Promise<DispatchResult> {
    const dataBase64 = arrayBufferToBase64(data);

    peerService.broadcast({
      type: 'DISPATCH_ANNOUNCE',
      payload: { channel: 'direct', hash, mime, label, dataBase64 }
    });

    const peerCount = this.getPeerCount();
    console.log(`[AssetDispatcher] ✉️  Direct envoyé : "${label}" → ${peerCount} pair(s)`);

    await this.storeAsset(hash, mime, data);
    return {
      channel: 'direct',
      hash,
      blobUrl: URL.createObjectURL(new Blob([data], { type: mime }))
    };
  }

  // ─── Canal Swarm ─────────────────────────────────────────────────────────

  private async dispatchSwarm(
    data: ArrayBuffer,
    mime: string,
    hash: string,
    label: string
  ): Promise<DispatchResult> {
    const peerCount = this.getPeerCount();
    console.log(`[AssetDispatcher] 🕸️  Swarm déclenché : "${label}" — ${this.formatSize(data.byteLength)} — ${peerCount} pair(s)`);

    // Annonce les métadonnées (le binaire passe par le canal Transfer)
    peerService.broadcast({
      type: 'DISPATCH_ANNOUNCE',
      payload: { channel: 'swarm', hash, mime, label }
    });

    await swarmService.seedAsset(hash, data);
    await this.storeAsset(hash, mime, data);

    return {
      channel: 'swarm',
      hash,
      blobUrl: URL.createObjectURL(new Blob([data], { type: mime }))
    };
  }

  // ─── Réception côté Joueur ────────────────────────────────────────────────

  private handleAnnounce(payload: any) {
    const { channel, hash, mime, label, dataBase64 } = payload;

    switch (channel as AssetChannel) {
      case 'direct':
        if (!dataBase64) return;
        const data = base64ToArrayBuffer(dataBase64);
        this.storeAsset(hash, mime, data).then(() =>
          console.log(`[AssetDispatcher] ✅ Direct reçu : "${label}" (${this.formatSize(data.byteLength)})`)
        );
        break;

      case 'swarm':
        console.log(`[AssetDispatcher] 📡 Swarm annoncé : "${label}" — En attente des blocs...`);
        swarmService.onAssetComplete(hash, async (completedData) => {
          await this.storeAsset(hash, mime, completedData);
          console.log(
            `%c[AssetDispatcher] ✅ Swarm complet : "${label}" (${this.formatSize(completedData.byteLength)}) — Stocké en DB`,
            'color:#34d399;font-weight:bold'
          );
        });
        break;

      case 'mse':
        // Géré par useAudioSync / AudioStreamProvider
        break;
    }
  }

  // ─── Stockage Commun (LRU 5 Go) ──────────────────────────────────────────

  private async storeAsset(hash: string, mime: string, data: ArrayBuffer) {
    if (!(await dbStorage.hasAsset(hash))) {
      await dbStorage.putAsset({ hash, data, mime, size: data.byteLength, last_accessed: Date.now() });
      dbStorage.cleanupAssets(5120);
    }
  }

  // ─── Utilitaires ─────────────────────────────────────────────────────────

  private getPeerCount(): number {
    return Array.from(peerService.connections.entries())
      .filter(([_, pc]) => pc.control?.open).length;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  }

  private channelColor(channel: AssetChannel): string {
    return {
      direct: 'color:#60a5fa;font-weight:bold',
      swarm:  'color:#a78bfa;font-weight:bold',
      mse:    'color:#f59e0b;font-weight:bold',
    }[channel];
  }
}

// ─── Helpers Base64 ──────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export const assetDispatcher = new AssetDispatcher();
