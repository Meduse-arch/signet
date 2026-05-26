import { ImageCompressor, ChunkManifest, ChunkManifestEntry, TransferPayload, ControlChannelMessage, MapRecord, ChunkRecord } from './p2p-sync.types';
import { peerService } from './peer.service';
import { transferService } from './transfer.service';
import { dbStorage } from './db.storage';

import { evictionManager } from './eviction.manager';

// In a real implementation, we'd use crypto.subtle for SHA-256
async function calculateHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

class MapSyncService {
  private activeTransfers = new Map<string, string>(); // map_id -> session_transfer_id
  private pendingMeshRequests = new Set<string>(); // chunk_id -> prevents double requesting
  private isBroadcasting = new Set<string>(); // prevents double broadcasting
  
  private onChunkReadyCallbacks: Set<(mapId: string, chunk: ChunkManifestEntry, data: ArrayBuffer) => void> = new Set();
  private onManifestReceivedCallbacks: Set<(mapId: string, manifest: ChunkManifest, missingChunks: ChunkManifestEntry[], hostPeerId: string) => void> = new Set();

  constructor() {
    this.setupListeners();
    // Expose for debugging via window
    if (typeof window !== 'undefined') {
      (window as any).clearMapCache = () => this.clearCache();
    }
  }

  public async clearCache(): Promise<void> {
    await dbStorage.clearAllData();
  }

  public async hydrateMapFromCache(mapId: string) {
    const map = await dbStorage.getMap(mapId);
    if (!map) return;
    
    console.log(`[MapSync] Hydrating map ${mapId} from local cache (${map.manifest.chunks.length} chunks).`);
    
    for (const chunk of map.manifest.chunks) {
      const record = await dbStorage.getChunk(chunk.id);
      if (record?.data && record.status === 'complete') {
        this.onChunkReadyCallbacks.forEach(cb => cb(mapId, chunk, record.data!));
      }
    }
  }

  public onChunkReady(cb: (mapId: string, chunk: ChunkManifestEntry, data: ArrayBuffer) => void) {
    this.onChunkReadyCallbacks.add(cb);
    return () => this.onChunkReadyCallbacks.delete(cb);
  }

  public onManifestReceived(cb: (mapId: string, manifest: ChunkManifest, missingChunks: ChunkManifestEntry[], hostPeerId: string) => void) {
    this.onManifestReceivedCallbacks.add(cb);
    return () => this.onManifestReceivedCallbacks.delete(cb);
  }

  public requestChunks(mapId: string, chunkIds: string[], hostPeerId: string) {
    console.log(`[MapSync] Requesting ${chunkIds.length} chunks from ${hostPeerId} for map ${mapId}`);
    peerService.sendTo(hostPeerId, {
      type: ControlChannelMessage.CHUNK_REQUEST,
      payload: { map_id: mapId, chunk_ids: chunkIds }
    });
  }

  /**
   * Resends the transfer manifest for a specific map to a targeted peer.
   * Useful when a peer joins the lobby late.
   */
  public async syncCurrentMapToPeer(mapId: string, peerId: string) {
    const map = await dbStorage.getMap(mapId);
    if (!map) return;

    console.log(`[MapSync] Targeted sync for map ${mapId} to peer ${peerId}`);
    peerService.sendTo(peerId, {
      type: ControlChannelMessage.TRANSFER_START,
      payload: { 
        map_id: mapId, 
        session_transfer_id: crypto.randomUUID(), 
        manifest: map.manifest 
      }
    });
  }

  private setupListeners() {
    peerService.onData(async (data, fromPeerId) => {
      console.log(`[MapSync] Message reçu: ${data.type} de ${fromPeerId}`);
      
      if (data.type === ControlChannelMessage.TRANSFER_START) {
        await this.handleTransferStart(data.payload as Extract<TransferPayload, { manifest: any }>, fromPeerId);
      } else if (data.type === ControlChannelMessage.TRANSFER_INVALIDATED) {
        this.handleTransferInvalidated(data.payload as Extract<TransferPayload, { session_transfer_id: string }>);
      } else if (data.type === ControlChannelMessage.CHUNK_REQUEST) {
        await this.handleChunkRequest(data.payload as Extract<TransferPayload, { chunk_ids: string[] }>, fromPeerId);
      } else if (data.type === ControlChannelMessage.CHUNK_COMPLETE) {
        await this.handleChunkComplete(data.payload as Extract<TransferPayload, { map_hash: string, chunk_id: string }>, fromPeerId);
      }
    });

    transferService.onChunkAssembled(async (chunkId, data) => {
      await this.handleChunkAssembled(chunkId, data);
    });
  }

  private async handleChunkComplete(payload: Extract<TransferPayload, { map_hash: string, chunk_id: string }>, fromPeerId: string) {
    // P2P Mesh logic: A peer has completed a chunk.
    // If we are currently downloading this chunk, we can request it from them instead of the host to save host bandwidth.
    const chunkRecord = await dbStorage.getChunk(payload.chunk_id);
    if (chunkRecord && chunkRecord.status === 'downloading') {
        console.log(`[MapSync] Peer ${fromPeerId} has chunk ${payload.chunk_id}. Requesting from them (Mesh P2P).`);
        // In a real implementation, we would keep track of who has what to balance requests.
        // For now, we eagerly request it from the first peer that announces it.
        const mapId = chunkRecord.chunk_id.split('_').slice(0, -2).join('_');
        this.requestChunks(mapId, [payload.chunk_id], fromPeerId);
    }
  }

  private async handleChunkRequest(payload: Extract<TransferPayload, { chunk_ids: string[] }>, fromPeerId: string) {
    const { map_id, chunk_ids } = payload;
    console.log(`[MapSync] handleChunkRequest: ${chunk_ids.length} chunks demandés par ${fromPeerId}`);
    
    for (const chunkId of chunk_ids) {
      const chunkRecord = await dbStorage.getChunk(chunkId);
      if (chunkRecord && chunkRecord.data && chunkRecord.status === 'complete') {
        console.log(`[MapSync] Sending chunk ${chunkId}, data size: ${chunkRecord.data.byteLength}`);
        transferService.sendChunk(chunkId, chunkRecord.data, chunkRecord.hash, fromPeerId);
      } else {
        console.warn(`[MapSync] Impossible to send chunk ${chunkId} to ${fromPeerId}: Missing or incomplete in DB.`);
      }
    }
  }

  public async broadcastNewMap(mapId: string, imageSource: ArrayBuffer | Blob, compressor: ImageCompressor, gridSize: number = 50) {
    if (this.isBroadcasting.has(mapId)) {
      console.warn(`[MapSync] broadcastNewMap déjà en cours pour ${mapId}, ignoré.`);
      return;
    }
    this.isBroadcasting.add(mapId);

    try {
      const sessionTransferId = crypto.randomUUID();
      this.activeTransfers.set(mapId, sessionTransferId);

      const compressedData = await compressor.compress(imageSource);
      const { chunks, manifest } = await this.chunkAndHashImage(mapId, compressedData, gridSize);

      const mapRecord: MapRecord = {
        map_id: mapId,
        global_hash: manifest.global_hash,
        manifest,
        last_accessed: Date.now(),
        total_chunks: chunks.length,
        completed_chunks: chunks.length
      };
      await dbStorage.putMap(mapRecord);

      for (const chunk of chunks) {
        await dbStorage.putChunk({
          chunk_id: chunk.id,
          map_hash: manifest.global_hash,
          hash: chunk.hash,
          status: 'complete',
          data: chunk.data,
          last_accessed: Date.now()
        });
      }

      peerService.broadcast({
        type: ControlChannelMessage.TRANSFER_START,
        payload: { map_id: mapId, session_transfer_id: sessionTransferId, manifest }
      });

      // ✅ MJ : On déclenche aussi l'évènement localement pour que notre propre useBoard réagisse
      this.onManifestReceivedCallbacks.forEach(cb => cb(mapId, manifest, [], peerService.getPeerId() || 'host'));
    } finally {
      this.isBroadcasting.delete(mapId);
    }
  }

  private async chunkAndHashImage(mapId: string, buffer: ArrayBuffer, gridSize: number = 50) {
    const blob = new Blob([buffer]);
    const bitmap = await createImageBitmap(blob);
    
    const CHUNK_SIZE = 512;
    const cols = Math.ceil(bitmap.width / CHUNK_SIZE);
    const rows = Math.ceil(bitmap.height / CHUNK_SIZE);
    
    const chunks = [];
    const entries: ChunkManifestEntry[] = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const canvas = new OffscreenCanvas(CHUNK_SIZE, CHUNK_SIZE);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Failed to get 2d context for OffscreenCanvas");

        // Peindre la portion correspondante de l'image (le canvas va rogner automatiquement ce qui dépasse)
        ctx.drawImage(bitmap, -x * CHUNK_SIZE, -y * CHUNK_SIZE);

        const chunkBlob = await canvas.convertToBlob({ type: 'image/webp' });
        const chunkBuffer = await chunkBlob.arrayBuffer();
        const hash = await calculateHash(chunkBuffer);
        const chunkId = `${mapId}_${x}_${y}`;

        chunks.push({ id: chunkId, hash, data: chunkBuffer, x, y });
        entries.push({ id: chunkId, hash, x, y });
      }
    }

    const hashesConcat = entries.map(e => e.hash).join('');
    const encoder = new TextEncoder();
    const encoded = encoder.encode(hashesConcat);
    const globalHash = await calculateHash(encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength));

    const manifest: ChunkManifest = {
      map_id: mapId,
      global_hash: globalHash,
      grid_size: gridSize,
      width: bitmap.width,
      height: bitmap.height,
      chunks: entries
    };

    return { chunks, manifest };
  }

  private async handleTransferStart(payload: Extract<TransferPayload, { manifest: any }>, fromPeerId: string) {
    const { map_id, session_transfer_id, manifest } = payload;
    
    const existingMap = await dbStorage.getMap(map_id);
    
    if (existingMap && existingMap.global_hash === manifest.global_hash) {
      const allChunkRecords = await Promise.all(manifest.chunks.map(c => dbStorage.getChunk(c.id)));
      const missingChunks = manifest.chunks.filter((c, i) => 
        !allChunkRecords[i] || allChunkRecords[i]?.status !== 'complete'
      );
      
      if (missingChunks.length === 0) {
        console.log(`[MapSync] Map ${map_id} already up to date.`);
        this.onManifestReceivedCallbacks.forEach(cb => cb(map_id, manifest, [], fromPeerId));
        return;
      }
      
      console.log(`[MapSync] Map ${map_id} has same hash but ${missingChunks.length} chunks incomplete, resuming download.`);
      this.activeTransfers.set(map_id, session_transfer_id);
      this.onManifestReceivedCallbacks.forEach(cb => cb(map_id, manifest, missingChunks, fromPeerId));
      return;
    }

    if (existingMap) {
      console.log(`[MapSync] Map ${map_id} version changed (hash mismatch). Clearing old data.`);
      await dbStorage.deleteMapData(map_id, existingMap.global_hash);
    }

    console.log(`[MapSync] Starting transfer for map ${map_id}`);
    this.activeTransfers.set(map_id, session_transfer_id);

    await dbStorage.putMap({
      map_id,
      global_hash: manifest.global_hash,
      manifest,
      last_accessed: Date.now(),
      total_chunks: manifest.chunks.length,
      completed_chunks: 0
    });

    const missingChunks = manifest.chunks;
    
    missingChunks.forEach(c => {
       dbStorage.putChunk({
           chunk_id: c.id,
           map_hash: manifest.global_hash,
           hash: c.hash,
           status: 'downloading',
           last_accessed: Date.now()
       });
    });

    this.onManifestReceivedCallbacks.forEach(cb => cb(map_id, manifest, missingChunks, fromPeerId));
  }

  private handleTransferInvalidated(payload: Extract<TransferPayload, { session_transfer_id: string }>) {
    console.warn(`[MapSync] Transfer Invalidated: ${payload.session_transfer_id}`);
  }

  private async handleChunkAssembled(chunkId: string, data: ArrayBuffer) {
      this.pendingMeshRequests.delete(chunkId);
      
      const chunkRecord = await dbStorage.getChunk(chunkId);
      if (chunkRecord && chunkRecord.status === 'downloading') {
          chunkRecord.status = 'complete';
          chunkRecord.data = data;
          await dbStorage.putChunk(chunkRecord);
          console.log(`[MapSync] Chunk ${chunkId} saved to DB.`);

          evictionManager.checkAndEvict();

          // P2P Mesh: Announce we have this chunk
          peerService.broadcast({
            type: ControlChannelMessage.CHUNK_COMPLETE,
            payload: { map_hash: chunkRecord.map_hash, chunk_id: chunkId }
          });

          // Extract map_id and coordinates from chunkId (format: mapId_x_y)
          const parts = chunkId.split('_');
          if (parts.length >= 3) {
            const y = parseInt(parts.pop()!);
            const x = parseInt(parts.pop()!);
            const mapId = parts.join('_');
            
            const chunkEntry: ChunkManifestEntry = { id: chunkId, hash: chunkRecord.hash, x, y };
            this.onChunkReadyCallbacks.forEach(cb => cb(mapId, chunkEntry, data));
          }
      }
  }

}

export const mapSyncService = new MapSyncService();