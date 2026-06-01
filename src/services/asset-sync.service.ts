import { peerService } from './peer.service';
import { dbStorage, AssetRecord } from './db.storage';
import { BrowserImageCompressor } from './browser-image-compressor';

// ─── Helpers base64 ───────────────────────────────────────────────────────────
// Encodage/décodage base64 pour transport JSON-safe sur canal control.
// ─────────────────────────────────────────────────────────────────────────────

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

class AssetSyncService {
  private compressor = new BrowserImageCompressor();
  /** Promesses en attente d'un ASSET_RESPONSE (fallback pull) */
  private pendingRequests: Map<string, ((blobUrl: string) => void)[]> = new Map();

  constructor() {
    peerService.onData((data, fromPeerId) => {
      if (data.type === 'ASSET_REQUEST') {
        this.handleAssetRequest(data.payload.hash, fromPeerId);
      } else if (data.type === 'ASSET_RESPONSE' || data.type === 'ASSET_PUSH') {
        // ASSET_RESPONSE = réponse pull, ASSET_PUSH = push proactif du host
        this.handleAssetData(data.payload);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // API PUBLIQUE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * MJ : Compresse une image, la stocke en IndexedDB, retourne son URL asset://
   */
  async uploadLocalAsset(file: File | Blob): Promise<string> {
    const compressed = await this.compressor.compress(file);
    const hash = await this.calculateHash(compressed);

    if (!(await dbStorage.hasAsset(hash))) {
      await dbStorage.putAsset({
        hash, data: compressed, mime: 'image/webp',
        size: compressed.byteLength, last_accessed: Date.now()
      });
    }
    return `asset://${hash}`;
  }

  /**
   * MJ (Electron) : Convertit TOUTE image_url en asset:// P2P.
   * — Chemin local (C:\...)  → electronAPI.fetchImage → asset://
   * — URL HTTP/HTTPS          → fetch() Electron (sans CORS) → asset://
   * — Déjà asset://, blob:, data: → inchangé
   *
   * Les joueurs reçoivent toujours asset://, jamais une URL externe.
   */
  async resolveLocalImage(imageUrl: string | undefined): Promise<string | undefined> {
    if (!imageUrl) return imageUrl;

    // Déjà un format compatible joueur → aucune conversion
    if (
      imageUrl.startsWith('asset://') ||
      imageUrl.startsWith('blob:')    ||
      imageUrl.startsWith('data:')
    ) return imageUrl;

    try {
      let blob: Blob | null = null;

      // URL web externe ou Chemin local → electronAPI.fetchImage gère les deux et BYPASS LE CORS !
      if ((window as any).electronAPI?.fetchImage) {
        const base64 = await (window as any).electronAPI.fetchImage(imageUrl);
        if (base64) {
          const res = await fetch(base64);
          blob = await res.blob();
        }
      }

      if (blob) return await this.uploadLocalAsset(blob);
    } catch (e) {
      console.warn('[AssetSync] resolveLocalImage failed for:', imageUrl, e);
    }

    return imageUrl; // fallback : URL originale (ne devrait pas arriver côté MJ)
  }


  /**
   * MJ → Joueur : POUSSE un asset vers un pair spécifique (sans attendre ASSET_REQUEST).
   * Utile lors de la synchronisation initiale d'un joueur.
   */
  async pushAssetToPeer(assetUrl: string, peerId: string): Promise<void> {
    if (!assetUrl?.startsWith('asset://')) return;
    const hash = assetUrl.replace('asset://', '');
    const asset = await dbStorage.getAsset(hash);
    if (!asset) return;

    const dataBase64 = arrayBufferToBase64(asset.data);
    console.log(`[AssetSync] 📤 PUSH asset ${hash.substring(0,8)}... → ${peerId} (${Math.round(dataBase64.length / 1024)}Ko base64)`);
    peerService.sendTo(peerId, {
      type: 'ASSET_PUSH',
      payload: { hash: asset.hash, dataBase64, mime: asset.mime }
    });
  }

  /**
   * Joueur : Obtient une URL blob: à partir d'un asset://hash.
   * Vérifie d'abord le cache local, sinon demande au host en fallback.
   */
  async getAssetUrl(assetUrl: string): Promise<string> {
    if (!assetUrl.startsWith('asset://')) return assetUrl;
    const hash = assetUrl.replace('asset://', '');

    // 1. Cache local
    const cached = await dbStorage.getAsset(hash);
    if (cached) {
      return URL.createObjectURL(new Blob([cached.data], { type: cached.mime }));
    }

    // 2. Pull fallback : demander au host
    console.log(`[AssetSync] 📡 ASSET_REQUEST (fallback pull) : ${hash.substring(0,8)}...`);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(hash);
        reject(new Error(`[AssetSync] Timeout pour asset ${hash.substring(0,8)}...`));
      }, 15000);

      const requests = this.pendingRequests.get(hash) || [];
      requests.push((url) => { clearTimeout(timeout); resolve(url); });
      this.pendingRequests.set(hash, requests);

      if (requests.length === 1) {
        peerService.broadcast({ type: 'ASSET_REQUEST', payload: { hash } });
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS PRIVÉS
  // ──────────────────────────────────────────────────────────────────────────

  /** Reçoit une requête pull d'un joueur → répond avec le binaire (base64) */
  private async handleAssetRequest(hash: string, fromPeerId: string) {
    const asset = await dbStorage.getAsset(hash);
    if (asset) {
      const dataBase64 = arrayBufferToBase64(asset.data);
      peerService.sendTo(fromPeerId, {
        type: 'ASSET_RESPONSE',
        payload: { hash: asset.hash, dataBase64, mime: asset.mime }
      });
      console.log(`[AssetSync] ✅ ASSET_RESPONSE → ${fromPeerId} (${Math.round(dataBase64.length / 1024)}Ko)`);
    } else {
      console.warn(`[AssetSync] ⚠️ Asset introuvable : ${hash.substring(0,8)}...`);
    }
  }

  /** Reçoit un asset (push ou pull) → stocke en DB + résout les promesses en attente */
  private async handleAssetData(payload: any) {
    const { hash, dataBase64, mime } = payload;
    if (!hash || !dataBase64) return;

    const data = base64ToArrayBuffer(dataBase64);
    console.log(`[AssetSync] 💾 Asset reçu & stocké : ${hash.substring(0,8)}... (${data.byteLength} octets)`);

    await dbStorage.putAsset({
      hash, data, mime,
      size: data.byteLength,
      last_accessed: Date.now()
    });

    const blobUrl = URL.createObjectURL(new Blob([data], { type: mime }));

    // Résoudre les promesses en attente (cas pull)
    const callbacks = this.pendingRequests.get(hash);
    if (callbacks) {
      callbacks.forEach(cb => cb(blobUrl));
      this.pendingRequests.delete(hash);
    }

    dbStorage.cleanupAssets(500);
  }

  private async calculateHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray  = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const assetSyncService = new AssetSyncService();
