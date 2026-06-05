import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ChunkRecord, MapRecord } from './p2p-sync.types';

export interface AssetRecord {
  hash: string;
  data: ArrayBuffer;
  mime: string;
  size: number;
  last_accessed: number;
}

interface SignetDB extends DBSchema {
  chunks: {
    key: string;
    value: ChunkRecord;
    indexes: { 
      'by-map': string;
      'by-map-and-status': [string, string];
    };
  };
  maps: {
    key: string;
    value: MapRecord;
  };
  assets: {
    key: string;
    value: AssetRecord;
    indexes: {
      'by-access': number;
    };
  };
}

class DBStorageService {
  private dbPromise: Promise<IDBPDatabase<SignetDB>>;

  constructor() {
    this.dbPromise = openDB<SignetDB>('signet-vtt-db', 6, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'chunk_id' });
          chunkStore.createIndex('by-map', 'map_hash');
          chunkStore.createIndex('by-map-and-status', ['map_hash', 'status']);
        }

        if (!db.objectStoreNames.contains('maps')) {
          db.createObjectStore('maps', { keyPath: 'map_id' });
        }

        if (!db.objectStoreNames.contains('assets')) {
          const assetStore = db.createObjectStore('assets', { keyPath: 'hash' });
          assetStore.createIndex('by-access', 'last_accessed');
        }
      },
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('chunks');
    await db.clear('maps');
    await db.clear('assets');
    console.log('[DB] Cache intégral vidé.');
  }

  // --- Asset Management ---

  async putAsset(asset: AssetRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('assets', asset);
  }

  async getAsset(hash: string): Promise<AssetRecord | undefined> {
    const db = await this.dbPromise;
    const asset = await db.get('assets', hash);
    if (asset) {
      asset.last_accessed = Date.now();
      await db.put('assets', asset);
    }
    return asset;
  }

  async hasAsset(hash: string): Promise<boolean> {
    const db = await this.dbPromise;
    const count = await db.count('assets', hash);
    return count > 0;
  }

  /**
   * Nettoie les vieux assets si on dépasse le quota (en Mo)
   */
  async cleanupAssets(maxSizeMB: number = 5120): Promise<void> {
    const db = await this.dbPromise;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    const allAssets = await db.getAllFromIndex('assets', 'by-access');
    let currentTotalSize = allAssets.reduce((sum, a) => sum + (a.size || 0), 0);

    if (currentTotalSize <= maxSizeBytes) return;

    console.log(`[DB] Nettoyage des assets... (${Math.round(currentTotalSize/1024/1024)}Mo / ${maxSizeMB}Mo)`);
    
    for (const asset of allAssets) {
      if (currentTotalSize <= maxSizeBytes) break;
      await db.delete('assets', asset.hash);
      currentTotalSize -= (asset.size || 0);
      console.log(`[DB] Asset purgé: ${asset.hash}`);
    }
  }
  async deleteAsset(hash: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('assets', hash);
  }

  // --- Audio Management (Aliases for Assets) ---

  async putAudio(asset: Omit<AssetRecord, 'mime'> & { mime?: string }): Promise<void> {
    return this.putAsset({
      ...asset,
      mime: asset.mime || 'audio/ogg'
    });
  }

  async getAudio(hash: string): Promise<AssetRecord | undefined> {
    return this.getAsset(hash);
  }

  async getAllAudioHashes(): Promise<string[]> {
    const db = await this.dbPromise;
    const all = await db.getAllKeys('assets');
    return all as string[];
  }

  // --- Chunk Management ---

  async putChunk(chunk: ChunkRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('chunks', chunk);
  }

  async getChunk(chunkId: string): Promise<ChunkRecord | undefined> {
    const db = await this.dbPromise;
    const chunk = await db.get('chunks', chunkId);
    if (chunk) {
      chunk.last_accessed = Date.now();
      await db.put('chunks', chunk);
    }
    return chunk;
  }

  async getIncompleteChunks(mapHash: string): Promise<ChunkRecord[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('chunks', 'by-map-and-status', [mapHash, 'downloading']);
  }

  async putMap(mapRecord: MapRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('maps', mapRecord);
  }

  async getMap(mapId: string): Promise<MapRecord | undefined> {
    const db = await this.dbPromise;
    const map = await db.get('maps', mapId);
    if (map) {
      map.last_accessed = Date.now();
      await db.put('maps', map);
    }
    return map;
  }

  async getAllMaps(): Promise<MapRecord[]> {
    const db = await this.dbPromise;
    return db.getAll('maps');
  }

  async deleteMapData(mapId: string, mapHash: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('maps', mapId);
    const tx = db.transaction('chunks', 'readwrite');
    const index = tx.store.index('by-map');
    let cursor = await index.openCursor(mapHash);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }
}

export const dbStorage = new DBStorageService();
