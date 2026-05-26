import { peerService } from './peer.service';
import { dbStorage, AssetRecord } from './db.storage';
import { BrowserImageCompressor } from './browser-image-compressor';

class AssetSyncService {
  private compressor = new BrowserImageCompressor();
  private pendingRequests: Map<string, ((blobUrl: string) => void)[]> = new Map();

  constructor() {
    // Écouter les messages P2P pour les assets
    peerService.onData((data, fromPeerId) => {
      if (data.type === 'ASSET_REQUEST') {
        this.handleAssetRequest(data.payload.hash, fromPeerId);
      } else if (data.type === 'ASSET_RESPONSE') {
        this.handleAssetResponse(data.payload);
      }
    });
  }

  /**
   * MJ : Traite une image locale, la compresse, la stocke et retourne son URL asset://
   */
  async uploadLocalAsset(file: File | Blob): Promise<string> {
    // 1. Compression en WebP
    const compressed = await this.compressor.compress(file);
    
    // 2. Calcul du Hash SHA-256
    const hash = await this.calculateHash(compressed);
    
    // 3. Stockage local
    const asset: AssetRecord = {
      hash,
      data: compressed,
      mime: 'image/webp',
      size: compressed.byteLength,
      last_accessed: Date.now()
    };
    
    await dbStorage.putAsset(asset);
    return `asset://${hash}`;
  }

  /**
   * Joueur : Récupère une URL utilisable (blob:) pour un asset://hash
   * Si l'asset manque, le demande à l'hôte.
   */
  async getAssetUrl(assetUrl: string): Promise<string> {
    if (!assetUrl.startsWith('asset://')) return assetUrl;
    const hash = assetUrl.replace('asset://', '');

    // 1. Vérifier si on l'a déjà
    const cached = await dbStorage.getAsset(hash);
    if (cached) {
      return URL.createObjectURL(new Blob([cached.data], { type: cached.mime }));
    }

    // 2. Sinon, le demander à l'hôte
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const requests = this.pendingRequests.get(hash);
        if (requests) {
            // Supprimer de la liste d'attente pour forcer un retry via le hook
            this.pendingRequests.delete(hash);
            reject(new Error(`Timeout request for asset ${hash}`));
        }
      }, 5000); // 5s de timeout

      const requests = this.pendingRequests.get(hash) || [];
      requests.push((url) => {
          clearTimeout(timeout);
          resolve(url);
      });
      this.pendingRequests.set(hash, requests);

      if (requests.length === 1) {
        console.log(`[AssetSync] Demande de l'asset ${hash} à l'hôte...`);
        peerService.broadcast({ type: 'ASSET_REQUEST', payload: { hash } });
      }
    });
  }

  private async handleAssetRequest(hash: string, fromPeerId: string) {
    console.log(`[AssetSync] Requête d'asset reçue de ${fromPeerId} pour ${hash}`);
    const asset = await dbStorage.getAsset(hash);
    if (asset) {
      peerService.sendTo(fromPeerId, {
        type: 'ASSET_RESPONSE',
        payload: {
          hash: asset.hash,
          data: asset.data,
          mime: asset.mime
        }
      });
    }
  }

  private async handleAssetResponse(payload: any) {
    const { hash, data, mime } = payload;
    console.log(`[AssetSync] Asset reçu: ${hash} (${data.byteLength} octets)`);

    const asset: AssetRecord = {
      hash,
      data,
      mime,
      size: data.byteLength,
      last_accessed: Date.now()
    };

    await dbStorage.putAsset(asset);
    
    // Créer l'URL et résoudre toutes les promesses en attente
    const blobUrl = URL.createObjectURL(new Blob([data], { type: mime }));
    const callbacks = this.pendingRequests.get(hash);
    if (callbacks) {
      callbacks.forEach(cb => cb(blobUrl));
      this.pendingRequests.delete(hash);
    }

    // Lancer un nettoyage si nécessaire
    dbStorage.cleanupAssets(500); // Quota de 500Mo
  }

  private async calculateHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const assetSyncService = new AssetSyncService();
