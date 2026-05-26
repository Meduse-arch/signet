import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ChunkRecord, MapRecord } from './p2p-sync.types';

interface SigilDB extends DBSchema {
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
}

class DBStorageService {
  private dbPromise: Promise<IDBPDatabase<SigilDB>>;

  constructor() {
    this.dbPromise = openDB<SigilDB>('sigil-vtt-db', 3, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // En passant à la v3, on s'assure que les stores sont propres
        if (!db.objectStoreNames.contains('chunks')) {
          const chunkStore = db.createObjectStore('chunks', { keyPath: 'chunk_id' });
          chunkStore.createIndex('by-map', 'map_hash');
          chunkStore.createIndex('by-map-and-status', ['map_hash', 'status']);
        }

        if (!db.objectStoreNames.contains('maps')) {
          db.createObjectStore('maps', { keyPath: 'map_id' });
        }
      },
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('chunks');
    await db.clear('maps');
    console.log('[DB] Cache vidé.');
  }

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
