import { FragmentHeader } from './p2p-sync.types';
import { peerService } from './peer.service';

export const CHUNK_SIZE = 16 * 1024; // 16KB

import { toArrayBuffer } from '../utils/binary';

// SHA-256 via crypto.subtle (sécurisé) avec fallback JS pur pour contextes LAN HTTP
export async function calculateHash(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
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

  public async sendChunkPaced(chunkId: string, rawData: ArrayBuffer | Blob | Uint8Array, expectedHash: string, targetPeerId?: string) {
    let data: ArrayBuffer;
    if (rawData instanceof Blob) data = await rawData.arrayBuffer();
    else if (rawData instanceof Uint8Array) data = rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength) as ArrayBuffer;
    else data = rawData;

    const totalFrags = Math.ceil(data.byteLength / CHUNK_SIZE);
    console.log(`[TransferService] Sending paced chunk ${chunkId} in ${totalFrags} fragments to ${targetPeerId || 'ALL'} (size: ${data.byteLength})`);
    
    const BUFFER_LIMIT = 64 * 1024; // 64 Ko
    
    for (let i = 0; i < totalFrags; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, data.byteLength);
      const fragData = data.slice(start, end);
      
      let currentBuffer = peerService.getTransferBufferedAmount(targetPeerId);
      while (currentBuffer > BUFFER_LIMIT) {
         // Pause de 10ms si le tampon est trop plein
         await new Promise(resolve => setTimeout(resolve, 10));
         currentBuffer = peerService.getTransferBufferedAmount(targetPeerId);
      }
      
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
      
      // Micro-pause pour laisser respirer l'Event Loop
      await new Promise(resolve => setTimeout(resolve, 2));
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
