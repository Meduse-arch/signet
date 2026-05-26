import { FragmentHeader } from './p2p-sync.types';
import { peerService } from './peer.service';

export const CHUNK_SIZE = 16 * 1024; // 16KB

import { toArrayBuffer } from '../utils/binary';

async function calculateHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

class TransferService {
  private assemblyBuffers: Map<string, { frags: ArrayBuffer[]; received: number; total: number; expected_hash: string }> = new Map();
  private chunkCallbacks: Set<(chunkId: string, data: ArrayBuffer) => void> = new Set();

  constructor() {
    peerService.onTransferData((data, fromPeerId) => {
      this.handleIncomingFragment(data, fromPeerId);
    });
  }

  public sendChunk(chunkId: string, data: ArrayBuffer, expectedHash: string, targetPeerId?: string) {
    const totalFrags = Math.ceil(data.byteLength / CHUNK_SIZE);
    console.log(`[TransferService] Sending chunk ${chunkId} in ${totalFrags} fragments to ${targetPeerId || 'ALL'}`);
    
    for (let i = 0; i < totalFrags; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, data.byteLength);
      const fragData = data.slice(start, end);
      
      const header: FragmentHeader = {
        chunk_id: chunkId,
        frag_index: i,
        total_frags: totalFrags,
        expected_hash: expectedHash
      };

      const headerString = JSON.stringify(header);
      const headerBytes = new TextEncoder().encode(headerString);
      
      const payload = new ArrayBuffer(4 + headerBytes.byteLength + fragData.byteLength);
      const view = new DataView(payload);
      
      view.setUint32(0, headerBytes.byteLength);
      new Uint8Array(payload, 4, headerBytes.byteLength).set(headerBytes);
      new Uint8Array(payload, 4 + headerBytes.byteLength).set(new Uint8Array(fragData));

      if (targetPeerId) {
        peerService.sendTransferTo(targetPeerId, payload);
      } else {
        peerService.broadcastTransfer(payload);
      }
    }
  }

  public onChunkAssembled(cb: (chunkId: string, data: ArrayBuffer) => void) {
    this.chunkCallbacks.add(cb);
    return () => this.chunkCallbacks.delete(cb);
  }

  private async handleIncomingFragment(payload: any, fromPeerId: string) {
    try {
      const buffer = await toArrayBuffer(payload);

      const view = new DataView(buffer);
      const headerLen = view.getUint32(0);
      const headerBytes = new Uint8Array(buffer, 4, headerLen);
      const headerString = new TextDecoder().decode(headerBytes);
      const header: FragmentHeader = JSON.parse(headerString);
      
      const fragData = buffer.slice(4 + headerLen);

      if (!this.assemblyBuffers.has(header.chunk_id)) {
        this.assemblyBuffers.set(header.chunk_id, {
          frags: new Array(header.total_frags),
          received: 0,
          total: header.total_frags,
          expected_hash: header.expected_hash
        });
      }

      const bufferObj = this.assemblyBuffers.get(header.chunk_id)!;
      if (!bufferObj.frags[header.frag_index]) {
        bufferObj.frags[header.frag_index] = fragData;
        bufferObj.received++;

        if (bufferObj.received === bufferObj.total) {
          this.assembleChunk(header.chunk_id, bufferObj.frags, bufferObj.expected_hash);
          this.assemblyBuffers.delete(header.chunk_id);
        }
      }
    } catch (e) {
      console.error('[TransferService] Error parsing fragment', e);
    }
  }

  private async assembleChunk(chunkId: string, frags: ArrayBuffer[], expectedHash: string) {
    const totalLen = frags.reduce((sum, frag) => sum + frag.byteLength, 0);
    const completeData = new Uint8Array(totalLen);
    let offset = 0;
    
    for (const frag of frags) {
      completeData.set(new Uint8Array(frag), offset);
      offset += frag.byteLength;
    }

    const calculatedHash = await calculateHash(completeData.buffer);
    if (calculatedHash !== expectedHash) {
      console.error(`[TransferService] Chunk ${chunkId} corrupted. Expected ${expectedHash}, got ${calculatedHash}`);
      return;
    }

    this.chunkCallbacks.forEach(cb => cb(chunkId, completeData.buffer));
  }
}

export const transferService = new TransferService();
