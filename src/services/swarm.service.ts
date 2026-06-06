import { peerService, PeerMessage } from './peer.service';
import { transferService, calculateHash } from './transfer.service';

// ─── Constantes ────────────────────────────────────────────────────────────────

const SWARM_BLOCK_SIZE = 512 * 1024; // 512 Ko par bloc logique
const REQUEST_TIMEOUT_MS = 2500;     // Délai avant fallback MJ

const S = {
  BITFIELD: 'SWARM_BITFIELD',
  HAVE:     'SWARM_HAVE',
  REQUEST:  'SWARM_REQUEST',
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SwarmStrategy = 'STAR' | 'SWARM_LIGHT' | 'SWARM_FULL';

interface SwarmBlock {
  index: number;
  data: ArrayBuffer;
  hash: string;
}

interface PendingRequest {
  blockIndex: number;
  fromPeerId: string;
  timer: ReturnType<typeof setTimeout>;
}

interface SwarmSession {
  transferId: string;
  totalBlocks: number;
  bitfield: Uint8Array;
  blocks: Map<number, ArrayBuffer>;
  hashes: string[];
  pendingRequests: Map<number, PendingRequest>;
  onComplete: (data: ArrayBuffer) => void;
}

// ─── Stratégie Dynamique ───────────────────────────────────────────────────────

/**
 * Évalue quelle stratégie de distribution utiliser selon le nombre de pairs actifs.
 * Cette fonction est appelée à CHAQUE changement de connexion (joueur rejoint/quitte).
 *
 * STAR       (0-1 pair)  : Round-Robin dégénère en étoile directe. Pas de coordination Swarm.
 * SWARM_LIGHT (2-3 pairs) : MJ envoie beaucoup, les joueurs complètent entre eux.
 * SWARM_FULL  (4+ pairs)  : MJ envoie peu, les joueurs se suffisent presque.
 */
export function evaluateStrategy(peerCount: number): SwarmStrategy {
  if (peerCount <= 1) return 'STAR';
  if (peerCount <= 3) return 'SWARM_LIGHT';
  return 'SWARM_FULL';
}

export function logStrategy(peerCount: number, context: string = '') {
  const strategy = evaluateStrategy(peerCount);
  const prefix = context ? `[${context}]` : '';

  const details: Record<SwarmStrategy, string> = {
    STAR: `🌟 STAR — ${peerCount} pair(s). Round-Robin = Étoile directe MJ → Joueur(s). Swarm désactivé.`,
    SWARM_LIGHT: `⚡ SWARM LIGHT — ${peerCount} pairs. MJ distribue ~1/${peerCount} des blocs, les pairs complètent entre eux.`,
    SWARM_FULL: `🕸️  SWARM FULL — ${peerCount} pairs. MJ n'envoie que ~1/${peerCount}. Les joueurs se distribuent eux-mêmes le reste.`,
  };

  console.log(`%c[SwarmService]${prefix} Stratégie active : ${details[strategy]}`, 'color:#a78bfa;font-weight:bold');
  return strategy;
}

// ─── SwarmService ──────────────────────────────────────────────────────────────

class SwarmService {

  private sessions: Map<string, SwarmSession> = new Map();
  private possessionMatrix: Map<string, Map<string, Uint8Array>> = new Map();

  /** [FIX #1] MJ garde ses blocs en mémoire pour le fallback (seeder de dernier recours) */
  private hostBlocks: Map<string, Map<number, SwarmBlock>> = new Map();

  /** [FIX #2] HostId capturé au moment de la connexion côté joueur */
  private hostPeerId: string | null = null;

  /** Stratégie courante — réévaluée à chaque changement de connexion */
  private currentStrategy: SwarmStrategy = 'STAR';

  constructor() {
    // Écoute les messages Swarm sur le canal control
    peerService.onData((msg: PeerMessage, fromPeerId: string) => {
      if (msg.type === 'CONN_READY' && !peerService.isHost && !this.hostPeerId) {
        // [FIX #2] Capture l'hostId au premier CONN_READY reçu côté joueur
        this.hostPeerId = fromPeerId;
        console.log(`[SwarmService] 🔗 HostId capturé : ${fromPeerId}`);
      }

      if (msg.type.startsWith('SWARM_')) {
        this.handleSwarmMessage(msg, fromPeerId);
      }
    });

    // Réévalue la stratégie à chaque changement de connexion
    peerService.onConnectionChange((connectedPeers) => {
      const prev = this.currentStrategy;
      this.currentStrategy = logStrategy(connectedPeers.length, 'Réévaluation');

      if (prev !== this.currentStrategy) {
        console.log(
          `%c[SwarmService] ♻️  Stratégie CHANGÉE : ${prev} → ${this.currentStrategy} (${connectedPeers.length} pairs)`,
          'color:#f59e0b;font-weight:bold'
        );
      } else {
        console.log(`[SwarmService] ✅ Stratégie confirmée : ${this.currentStrategy} (${connectedPeers.length} pairs — inchangé)`);
      }
    });

    // Quand un bloc arrive via TransferService, on le valide et propage
    transferService.onChunkAssembled((chunkId, data) => {
      this.handleBlockAssembled(chunkId, data);
    });
  }

  // ─── API Publique ─────────────────────────────────────────────────────────────

  /**
   * [MJ] Lance le transfert Swarm d'un asset vers tous les joueurs.
   * Découpe en blocs logiques et amorce via Round-Robin.
   * La stratégie est toujours le Round-Robin — c'est son paramètre (nombre de pairs) qui détermine
   * si ça se comporte comme une étoile ou un vrai Swarm.
   */
  public async seedAsset(transferId: string, data: ArrayBuffer): Promise<void> {
    const peers = this.getConnectedPeers();

    // Log de stratégie au moment du seed
    const strategy = logStrategy(peers.length, `seedAsset "${transferId.substring(0, 8)}..."`);

    if (peers.length === 0) {
      console.warn('[SwarmService] ⚠️ Aucun pair connecté, transfert annulé.');
      return;
    }

    const blocks = await this.splitIntoBlocks(transferId, data);
    console.log(
      `[SwarmService] 🚀 Début transfert "${transferId.substring(0, 8)}..." — ${blocks.length} blocs × ${this.formatSize(SWARM_BLOCK_SIZE)} → ${peers.length} pair(s) — Stratégie : ${strategy}`
    );

    // Sauvegarde des blocs côté MJ (filet de sécurité fallback)
    const blockMap = new Map<number, SwarmBlock>();
    blocks.forEach(b => blockMap.set(b.index, b));
    this.hostBlocks.set(transferId, blockMap);

    this.possessionMatrix.set(transferId, new Map());

    const hashes = blocks.map(b => b.hash);
    peerService.broadcast({
      type: 'SWARM_INIT',
      payload: { transferId, totalBlocks: blocks.length, hashes }
    });

    // Round-Robin universel : s'adapte à n'importe quel nombre de pairs
    for (let i = 0; i < blocks.length; i++) {
      const targetPeer = peers[i % peers.length];
      const block = blocks[i];
      const chunkId = this.makeChunkId(transferId, block.index);

      console.log(`[SwarmService]   ↗ Bloc ${block.index}/${blocks.length - 1} → Pair ${targetPeer.substring(0, 8)}... (${strategy})`);
      await transferService.sendChunkPaced(chunkId, block.data, block.hash, targetPeer);

      peerService.sendTo(targetPeer, {
        type: S.HAVE,
        payload: { transferId, blockIndex: block.index, fromSeed: true }
      });
    }

    console.log(`%c[SwarmService] ✅ Amorce terminée — "${transferId.substring(0, 8)}..." — ${blocks.length} blocs distribués.`, 'color:#34d399;font-weight:bold');
  }

  /** [Joueur] Enregistre une session Swarm entrante. */
  public onIncomingAsset(
    transferId: string,
    totalBlocks: number,
    hashes: string[],
    onComplete: (data: ArrayBuffer) => void
  ): void {
    if (this.sessions.has(transferId)) return;

    const session: SwarmSession = {
      transferId,
      totalBlocks,
      bitfield: new Uint8Array(Math.ceil(totalBlocks / 8)),
      blocks: new Map(),
      hashes,
      pendingRequests: new Map(),
      onComplete,
    };

    this.sessions.set(transferId, session);
    console.log(`[SwarmService] 📥 Session entrante "${transferId.substring(0, 8)}..." — ${totalBlocks} blocs attendus.`);

    // Envoie le Bitfield vide initial pour signaler la présence
    this.broadcastBitfield(session);
  }

  // ─── Callbacks Asset Complet ─────────────────────────────────────────────
  //
  // [FIX #4] On utilise un Set par transferId pour éviter qu'un second
  // enregistrement n'écrase le premier (ex : deux composants qui écoutent
  // la fin du même transfert simultanément).

  private assetCompleteCallbacks: Map<string, Set<(data: ArrayBuffer) => void>> = new Map();

  public onAssetComplete(transferId: string, cb: (data: ArrayBuffer) => void) {
    if (!this.assetCompleteCallbacks.has(transferId)) {
      this.assetCompleteCallbacks.set(transferId, new Set());
    }
    this.assetCompleteCallbacks.get(transferId)!.add(cb);
  }

  private notifyAssetComplete(transferId: string, data: ArrayBuffer) {
    const callbacks = this.assetCompleteCallbacks.get(transferId);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
      this.assetCompleteCallbacks.delete(transferId);
    }
  }

  // ─── Libération explicite des blocs MJ (anti-fuite mémoire) ──────────────
  //
  // [FIX #1] Le MJ ne reconstruit jamais son propre fichier → finalizeSession()
  // ne s'exécute jamais côté MJ → hostBlocks grossit indéfiniment.
  // L'appelant (asset-dispatcher) doit appeler cette méthode une fois que
  // tous les pairs ont confirmé la réception de l'asset.
  public releaseHostBlocks(transferId: string): void {
    if (this.hostBlocks.has(transferId)) {
      const blockMap = this.hostBlocks.get(transferId)!;
      const blockCount = blockMap.size;
      this.hostBlocks.delete(transferId);
      this.possessionMatrix.delete(transferId);
      console.log(
        `%c[SwarmService] 🗑️  Blocs MJ libérés : "${transferId.substring(0, 8)}..." (${blockCount} blocs purgés de la RAM)`,
        'color:#94a3b8'
      );
    }
  }

  // ─── Gestion des Messages ─────────────────────────────────────────────────────

  private handleSwarmMessage(msg: PeerMessage, fromPeerId: string) {
    switch (msg.type) {
      case 'SWARM_INIT':   this.handleSwarmInit(msg.payload, fromPeerId); break;
      case S.BITFIELD:     this.handleBitfield(msg.payload, fromPeerId); break;
      case S.HAVE:         this.handleHave(msg.payload, fromPeerId); break;
      case S.REQUEST:      this.handleRequest(msg.payload, fromPeerId); break;
    }
  }

  private handleSwarmInit(
    payload: { transferId: string; totalBlocks: number; hashes: string[] },
    _fromPeerId: string
  ) {
    this.onIncomingAsset(
      payload.transferId,
      payload.totalBlocks,
      payload.hashes,
      (data) => {
        console.log(`%c[SwarmService] 🎉 Asset "${payload.transferId.substring(0, 8)}..." complet côté joueur (${this.formatSize(data.byteLength)}).`, 'color:#34d399;font-weight:bold');
        this.notifyAssetComplete(payload.transferId, data);
      }
    );
  }

  private handleBitfield(payload: { transferId: string; bitfield: number[] }, fromPeerId: string) {
    if (peerService.isHost) {
      const matrix = this.possessionMatrix.get(payload.transferId);
      if (matrix) {
        matrix.set(fromPeerId, new Uint8Array(payload.bitfield));
        this.checkForHoles(payload.transferId);
      }
    }

    const session = this.sessions.get(payload.transferId);
    if (!session) return;

    const theirBitfield = new Uint8Array(payload.bitfield);
    this.requestMissingBlocksFrom(session, theirBitfield, fromPeerId);
  }

  private handleHave(
    payload: { transferId: string; blockIndex: number; fromSeed?: boolean },
    fromPeerId: string
  ) {
    const session = this.sessions.get(payload.transferId);
    if (!session) return;

    if (peerService.isHost) {
      const matrix = this.possessionMatrix.get(payload.transferId);
      if (matrix) {
        let bf = matrix.get(fromPeerId);
        if (!bf) {
          bf = new Uint8Array(Math.ceil(session.totalBlocks / 8));
          matrix.set(fromPeerId, bf);
        }
        this.setBit(bf, payload.blockIndex);
      }
    }

    if (!this.hasBit(session.bitfield, payload.blockIndex)) {
      this.sendRequest(session, payload.blockIndex, fromPeerId);
    }
  }

  private async handleRequest(
    payload: { transferId: string; blockIndex: number },
    fromPeerId: string
  ) {
    const chunkId = this.makeChunkId(payload.transferId, payload.blockIndex);

    // Côté MJ : répond depuis hostBlocks (toujours disponible)
    if (peerService.isHost) {
      const blockMap = this.hostBlocks.get(payload.transferId);
      const block = blockMap?.get(payload.blockIndex);
      if (!block) {
        console.error(`[SwarmService] ❌ MJ : bloc ${payload.blockIndex} introuvable pour "${payload.transferId.substring(0, 8)}..."`);
        return;
      }
      console.log(`[SwarmService] 🛡️  MJ (Fallback Seeder) → Bloc ${payload.blockIndex} → ${fromPeerId.substring(0, 8)}...`);
      await transferService.sendChunkPaced(chunkId, block.data, block.hash, fromPeerId);
      return;
    }

    // Côté joueur : répond uniquement si on possède le bloc
    const session = this.sessions.get(payload.transferId);
    if (!session) return;

    const hasBlock = this.hasBit(session.bitfield, payload.blockIndex) && session.blocks.has(payload.blockIndex);
    if (!hasBlock) return;

    const blockData = session.blocks.get(payload.blockIndex)!;
    const hash = session.hashes[payload.blockIndex];
    console.log(`[SwarmService] ↔️  P2P : Bloc ${payload.blockIndex} → ${fromPeerId.substring(0, 8)}... (latéral)`);
    await transferService.sendChunkPaced(chunkId, blockData, hash, fromPeerId);
  }

  // ─── Logique Bitfield & Assemblage ───────────────────────────────────────────

  private handleBlockAssembled(chunkId: string, data: ArrayBuffer) {
    const parts = chunkId.split('__');
    if (parts.length < 2) return;

    const transferId = parts.slice(0, -1).join('__');
    const blockIndex = parseInt(parts[parts.length - 1], 10);

    const session = this.sessions.get(transferId);
    if (!session) return;
    if (session.blocks.has(blockIndex)) return;

    session.blocks.set(blockIndex, data);
    this.setBit(session.bitfield, blockIndex);

    const pending = session.pendingRequests.get(blockIndex);
    if (pending) {
      clearTimeout(pending.timer);
      session.pendingRequests.delete(blockIndex);
    }

    const progress = `${session.blocks.size}/${session.totalBlocks}`;
    const pct = Math.round((session.blocks.size / session.totalBlocks) * 100);
    console.log(`[SwarmService] 📦 Bloc ${blockIndex} reçu — Progression : ${progress} (${pct}%)`);

    this.broadcastHave(session, blockIndex);

    if (session.blocks.size === session.totalBlocks) {
      this.finalizeSession(session);
    }
  }

  private requestMissingBlocksFrom(
    session: SwarmSession,
    theirBitfield: Uint8Array,
    fromPeerId: string
  ) {
    for (let i = 0; i < session.totalBlocks; i++) {
      if (!this.hasBit(session.bitfield, i) && this.hasBit(theirBitfield, i)) {
        if (!session.pendingRequests.has(i)) {
          this.sendRequest(session, i, fromPeerId);
        }
      }
    }
  }

  private sendRequest(session: SwarmSession, blockIndex: number, fromPeerId: string) {
    peerService.sendTo(fromPeerId, {
      type: S.REQUEST,
      payload: { transferId: session.transferId, blockIndex }
    });

    const timer = setTimeout(() => {
      console.warn(`[SwarmService] ⏱️  Timeout REQUEST bloc ${blockIndex} depuis ${fromPeerId.substring(0, 8)}... → Fallback MJ`);
      session.pendingRequests.delete(blockIndex);
      this.requestFromHost(session, blockIndex);
    }, REQUEST_TIMEOUT_MS);

    session.pendingRequests.set(blockIndex, { blockIndex, fromPeerId, timer });
  }

  private requestFromHost(session: SwarmSession, blockIndex: number) {
    if (this.hasBit(session.bitfield, blockIndex)) return;

    const hostId = peerService.isHost ? null : this.hostPeerId;
    if (!hostId) {
      console.error('[SwarmService] ❌ Impossible de contacter le MJ : hostId inconnu.');
      return;
    }

    console.log(`[SwarmService] 🛡️  Demande fallback au MJ pour le bloc ${blockIndex}`);
    peerService.sendTo(hostId, {
      type: S.REQUEST,
      payload: { transferId: session.transferId, blockIndex }
    });
  }

  // ─── Filet de Sécurité MJ ────────────────────────────────────────────────────

  private checkForHoles(transferId: string) {
    const matrix = this.possessionMatrix.get(transferId);
    if (!matrix || matrix.size === 0) return;

    const peers = Array.from(matrix.values());
    const blockMap = this.hostBlocks.get(transferId);
    if (!blockMap) return;

    const totalBlocks = blockMap.size;
    const session = this.sessions.get(transferId);

    for (let i = 0; i < totalBlocks; i++) {
      const anyoneHasIt = peers.some(bf => this.hasBit(bf, i));
      if (!anyoneHasIt) {
        console.warn(`%c[SwarmService] 🕳️  Trou détecté : bloc ${i} de "${transferId.substring(0, 8)}..." orphelin → Réinjection MJ`, 'color:#f87171');
        const connectedPeers = this.getConnectedPeers();
        if (connectedPeers.length > 0) {
          const target = session
            ? this.pickLeastComplete(transferId, connectedPeers)
            : connectedPeers[0];
          peerService.sendTo(target, {
            type: S.HAVE,
            payload: { transferId, blockIndex: i, fromSeed: true }
          });
        }
      }
    }
  }

  // ─── Finalisation ─────────────────────────────────────────────────────────────

  private async finalizeSession(session: SwarmSession) {
    console.log(`%c[SwarmService] 🏁 Reconstruction "${session.transferId.substring(0, 8)}..." (${session.totalBlocks} blocs)`, 'color:#34d399;font-weight:bold');

    const ordered = Array.from({ length: session.totalBlocks }, (_, i) => session.blocks.get(i)!);
    const totalSize = ordered.reduce((sum, b) => sum + b.byteLength, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const block of ordered) {
      result.set(new Uint8Array(block), offset);
      offset += block.byteLength;
    }

    console.log(`[SwarmService] ✅ Fichier reconstruit : ${this.formatSize(totalSize)}`);
    session.onComplete(result.buffer);
    this.sessions.delete(session.transferId);
    this.possessionMatrix.delete(session.transferId);
    this.hostBlocks.delete(session.transferId);
  }

  // ─── Utilitaires Bitfield ─────────────────────────────────────────────────────

  private setBit(bf: Uint8Array, index: number) {
    bf[Math.floor(index / 8)] |= (1 << (index % 8));
  }

  private hasBit(bf: Uint8Array, index: number): boolean {
    return !!(bf[Math.floor(index / 8)] & (1 << (index % 8)));
  }

  private broadcastBitfield(session: SwarmSession) {
    peerService.broadcast({
      type: S.BITFIELD,
      payload: { transferId: session.transferId, bitfield: Array.from(session.bitfield) }
    });
  }

  private broadcastHave(session: SwarmSession, blockIndex: number) {
    peerService.broadcast({
      type: S.HAVE,
      payload: { transferId: session.transferId, blockIndex }
    });

    if (peerService.isHost) {
      const matrix = this.possessionMatrix.get(session.transferId);
      if (matrix) {
        const myId = peerService.getPeerId() || 'host';
        let bf = matrix.get(myId);
        if (!bf) {
          bf = new Uint8Array(Math.ceil(session.totalBlocks / 8));
          matrix.set(myId, bf);
        }
        this.setBit(bf, blockIndex);
      }
    }
  }

  // ─── Utilitaires Réseau ───────────────────────────────────────────────────────

  private getConnectedPeers(): string[] {
    return Array.from(peerService.connections.entries())
      .filter(([_, pc]) => pc.control?.open)
      .map(([id]) => id);
  }

  private pickLeastComplete(transferId: string, peers: string[]): string {
    const matrix = this.possessionMatrix.get(transferId);
    if (!matrix) return peers[Math.floor(Math.random() * peers.length)];

    let minCount = Infinity;
    let target = peers[0];
    for (const peerId of peers) {
      const bf = matrix.get(peerId);
      if (!bf) return peerId;
      const count = bf.reduce((sum, byte) => {
        let b = byte; let c = 0;
        while (b) { c += b & 1; b >>= 1; }
        return sum + c;
      }, 0);
      if (count < minCount) { minCount = count; target = peerId; }
    }
    return target;
  }

  // ─── Découpage en Blocs ───────────────────────────────────────────────────────

  private async splitIntoBlocks(transferId: string, data: ArrayBuffer): Promise<SwarmBlock[]> {
    const totalBlocks = Math.ceil(data.byteLength / SWARM_BLOCK_SIZE);
    const blocks: SwarmBlock[] = [];
    for (let i = 0; i < totalBlocks; i++) {
      const start = i * SWARM_BLOCK_SIZE;
      const end = Math.min(start + SWARM_BLOCK_SIZE, data.byteLength);
      const blockData = data.slice(start, end);
      const hash = await calculateHash(blockData);
      blocks.push({ index: i, data: blockData, hash });
    }
    return blocks;
  }

  private makeChunkId(transferId: string, blockIndex: number): string {
    return `${transferId}__${blockIndex}`;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  }
}

export const swarmService = new SwarmService();
