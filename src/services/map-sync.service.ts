import { ImageCompressor, ChunkManifest, ChunkManifestEntry, TransferPayload, ControlChannelMessage, MapRecord, ChunkRecord } from './p2p-sync.types';
import { peerService } from './peer.service';
import { transferService } from './transfer.service';
import { dbStorage } from './db.storage';
import { swarmService } from './swarm.service';
import { evictionManager } from './eviction.manager';

// SHA-256 via crypto.subtle (sécurisé) avec fallback en JS pur pour les contextes LAN HTTP
async function calculateHash(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback : FNV-1a 64-bit simplifié (suffisant pour l'intégrité de chunks P2P en LAN)
  return sha256Fallback(buffer);
}

function sha256Fallback(buffer: ArrayBuffer): string {
  const data = new Uint8Array(buffer);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const k = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const safe_add = (x: number, y: number) => (x + y) & 0xFFFFFFFF;

  const msgLen = data.length;
  const bitLen = msgLen * 8;
  const padLen = msgLen % 64 < 56 ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(data);
  padded[msgLen] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen & 0xFFFFFFFF, false);

  for (let i = 0; i < padded.length; i += 64) {
    const w = new Uint32Array(64);
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(7, w[j-15]) ^ rotr(18, w[j-15]) ^ (w[j-15] >>> 3);
      const s1 = rotr(17, w[j-2]) ^ rotr(19, w[j-2]) ^ (w[j-2] >>> 10);
      w[j] = safe_add(safe_add(safe_add(w[j-16], s0), w[j-7]), s1);
    }
    let [a,b,c,d,e,f,g,h] = [h0,h1,h2,h3,h4,h5,h6,h7];
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(6,e) ^ rotr(11,e) ^ rotr(25,e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = safe_add(safe_add(safe_add(safe_add(h, S1), ch), k[j]), w[j]);
      const S0 = rotr(2,a) ^ rotr(13,a) ^ rotr(22,a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = safe_add(S0, maj);
      h=g; g=f; f=e; e=safe_add(d,temp1); d=c; c=b; b=a; a=safe_add(temp1,temp2);
    }
    h0=safe_add(h0,a); h1=safe_add(h1,b); h2=safe_add(h2,c); h3=safe_add(h3,d);
    h4=safe_add(h4,e); h5=safe_add(h5,f); h6=safe_add(h6,g); h7=safe_add(h7,h);
  }
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(n => n.toString(16).padStart(8,'0')).join('');
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
    const toRequest = chunkIds.filter(id => !this.pendingMeshRequests.has(id));
    if (toRequest.length === 0) return;

    toRequest.forEach(id => this.pendingMeshRequests.add(id));

    console.log(`[MapSync] Requesting ${toRequest.length} chunks from ${hostPeerId} for map ${mapId}`);
    peerService.sendTo(hostPeerId, {
      type: ControlChannelMessage.CHUNK_REQUEST,
      payload: { map_id: mapId, chunk_ids: toRequest }
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
        session_transfer_id: this.activeTransfers.get(mapId) || crypto.randomUUID(), 
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
      // ✅ OPTIMISATION : On vérifie si la map est déjà en cache
      const existing = await dbStorage.getMap(mapId);
      if (existing) {
        console.log(`[MapSync] Map ${mapId} déjà en cache, on utilise le manifest existant.`);
        
        let sessionTransferId = this.activeTransfers.get(mapId);
        if (!sessionTransferId) {
            sessionTransferId = crypto.randomUUID();
            this.activeTransfers.set(mapId, sessionTransferId);
        }

        peerService.broadcast({
          type: ControlChannelMessage.TRANSFER_START,
          payload: { 
            map_id: mapId, 
            session_transfer_id: sessionTransferId, 
            manifest: existing.manifest 
          }
        });

        // On déclenche aussi l'évènement localement
        this.onManifestReceivedCallbacks.forEach(cb => cb(mapId, existing.manifest, [], peerService.getPeerId() || 'host'));
        return;
      }

      // ... code de compression et chunking existant ...
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

      // ─── SWARM : Amorce Round-Robin pour les maps ───────────────────────────
      // Chaque tuile de map devient un bloc Swarm naturel.
      // Le SwarmService distribue via Round-Robin puis les joueurs s'échangent le reste.
      const peers = Array.from(peerService.connections.entries())
        .filter(([_, pc]) => pc.control?.open)
        .map(([id]) => id);

      if (peers.length <= 1) {
        // 1 joueur ou 0 : étoile directe (Round-Robin dégénère automatiquement)
        for (const chunk of chunks) {
          if (peers.length === 1) {
            transferService.sendChunkPaced(chunk.id, chunk.data, chunk.hash, peers[0]);
          }
        }
      } else {
        // 2+ joueurs : Round-Robin Swarm
        // On reconstruit le fichier complet pour seedAsset, qui le redécoupera en blocs Swarm
        // Note : l'ID transferId = global_hash pour la déduplication
        await swarmService.seedAsset(manifest.global_hash, compressedData);
      }

      // MJ : déclenche localement son propre rendu
      this.onManifestReceivedCallbacks.forEach(cb =>
        cb(mapId, manifest, [], peerService.getPeerId() || 'host')
      );
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
      // ✅ MJ : On s'assure que le manifest local a bien les dimensions réelles (si reçues du MJ)
      if (manifest.width && manifest.height && (!existingMap.manifest.width || !existingMap.manifest.height)) {
          console.log(`[MapSync] Updating local manifest dimensions for ${map_id}`);
          existingMap.manifest.width = manifest.width;
          existingMap.manifest.height = manifest.height;
          await dbStorage.putMap(existingMap);
      }

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

    const missingChunks: ChunkManifestEntry[] = [];
    
    for (const c of manifest.chunks) {
      const existingChunk = await dbStorage.getChunk(c.id);
      if (!existingChunk || existingChunk.status !== 'complete' || existingChunk.hash !== c.hash) {
        missingChunks.push(c);
        await dbStorage.putChunk({
           chunk_id: c.id,
           map_hash: manifest.global_hash,
           hash: c.hash,
           status: 'downloading',
           last_accessed: Date.now()
        });
      }
    }

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