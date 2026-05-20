import Peer, { DataConnection } from 'peerjs';

export type PeerMessage = {
  type: string;
  payload: any;
};

class PeerService {
  public peer: Peer | null = null;
  public isHost: boolean = false;
  public connections: Map<string, DataConnection> = new Map();
  private dataCallbacks: Set<(data: PeerMessage, fromPeerId: string) => void> = new Set();
  private connectionCallbacks: Set<(conns: string[]) => void> = new Set();
  
  private hostConnection: DataConnection | null = null;
  private isDestroying = false;

  async init(isHost: boolean, hostPeerId: string, myPeerId?: string): Promise<string> {
    this.performDestroy(); // Nettoyage propre
    this.isHost = isHost;
    this.isDestroying = false;

    if (isHost) {
      return this.initAsHost(hostPeerId);
    } else {
      return this.initAsPlayer(hostPeerId, myPeerId || `player-${Math.random().toString(36).substr(2, 9)}`);
    }
  }

  private initAsHost(hostId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer(hostId, this.getPeerOptions());
      
      this.peer.on('open', (id) => {
        console.log(`[PeerService] ONLINE (HOST): ${id}`);
        resolve(id);
      });

      this.peer.on('error', (err) => {
        if (this.isDestroying) return;
        console.error('[PeerService] Host Peer Error:', err);
        reject(err);
      });

      this.peer.on('connection', (conn) => {
        console.log(`[PeerService] Connexion entrante: ${conn.peer}`);
        this.setupConnection(conn);
      });

      this.peer.on('disconnected', () => {
        if (!this.isDestroying) {
          console.warn('[PeerService] Host déconnecté du serveur de signalement, reconnexion...');
          this.peer?.reconnect();
        }
      });
    });
  }

  private initAsPlayer(hostId: string, playerId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer(playerId, this.getPeerOptions());
      
      this.peer.on('open', (id) => {
        console.log(`[PeerService] ONLINE (PLAYER): ${id}`);
        this.connectToHost(hostId, resolve, reject);
      });

      this.peer.on('error', (err) => {
        if (this.isDestroying) return;
        console.error('[PeerService] Player Peer Error:', err);
        reject(err);
      });

      this.peer.on('disconnected', () => {
        if (!this.isDestroying) {
          console.warn('[PeerService] Player déconnecté du serveur de signalement, reconnexion...');
          this.peer?.reconnect();
        }
      });
    });
  }

  private connectToHost(hostId: string, resolve: (id: string) => void, reject: (err: any) => void) {
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryConnect = () => {
      if (this.isDestroying || !this.peer) return;
      attempts++;
      console.log(`[PeerService] Tentative de connexion au MJ (${attempts}/${maxAttempts})...`);
      
      const conn = this.peer.connect(hostId, { reliable: true });
      this.hostConnection = conn;
      
      const timeout = setTimeout(() => {
        if (!conn.open) {
          conn.close();
          if (attempts < maxAttempts) {
            setTimeout(tryConnect, 1500);
          } else {
            reject(new Error("L'hôte est injoignable après plusieurs tentatives."));
          }
        }
      }, 5000);

      conn.on('open', () => {
        clearTimeout(timeout);
        console.log(`[PeerService] Connecté au MJ avec succès (P2P Établi)`);
        this.setupConnection(conn);
        resolve(this.peer!.id);
      });

      conn.on('error', (err) => {
        console.warn('[PeerService] Erreur de connexion individuelle:', err);
        // Le timeout gérera le retry
      });
    };

    tryConnect();
  }

  private setupConnection(conn: DataConnection) {
    // ✅ Protection contre les doublons de connexion
    if (this.connections.has(conn.peer)) {
      const oldConn = this.connections.get(conn.peer);
      if (oldConn && oldConn.open) {
        console.log(`[PeerService] Connexion déjà active pour ${conn.peer}, on ignore la nouvelle.`);
        conn.close();
        return;
      }
      this.connections.delete(conn.peer);
    }

    this.connections.set(conn.peer, conn);
    this.notifyConnectionChange();

    // ✅ Utiliser une fonction nommée pour éviter les doubles enregistrements
    const onOpen = () => {
      if (this.isDestroying) return;
      console.log(`[PeerService] P2P Ouvert avec ${conn.peer}`);
      
      // On se prévient nous-même
      this.dataCallbacks.forEach(cb => cb({ type: 'CONN_READY', payload: { peerId: conn.peer } }, conn.peer));
    };

    // Nettoyer les anciens écouteurs au cas où
    conn.off('open');
    conn.off('data');
    conn.off('close');
    conn.off('error');

    if (conn.open) onOpen();
    else conn.once('open', onOpen);

    conn.on('data', (data: any) => {
      if (this.isDestroying) return;
      if (data && data.type === 'HEARTBEAT') return;
      this.dataCallbacks.forEach(cb => cb(data as PeerMessage, conn.peer));
    });

    conn.on('close', () => {
      console.log(`[PeerService] Connexion fermée avec ${conn.peer}`);
      this.connections.delete(conn.peer);
      this.notifyConnectionChange();
      this.dataCallbacks.forEach(cb => cb({ type: 'PLAYER_LEAVE', payload: { peerId: conn.peer } }, conn.peer));
    });

    conn.on('error', (err) => {
      console.error(`[PeerService] Erreur sur connexion ${conn.peer}:`, err);
      conn.close();
    });
  }

  private getPeerOptions() {
    return {
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.services.mozilla.com' }
        ],
        iceCandidatePoolSize: 10
      }
    };
  }

  public broadcast(data: PeerMessage) {
    if (this.isHost) {
      this.connections.forEach(conn => {
        if (conn.open) conn.send(data);
      });
    } else if (this.hostConnection?.open) {
      this.hostConnection.send(data);
    }
  }

  public sendTo(peerId: string, data: PeerMessage) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(data);
    }
  }

  public onData(cb: (data: PeerMessage, fromPeerId: string) => void) {
    this.dataCallbacks.add(cb);
    return () => this.dataCallbacks.delete(cb);
  }

  public onConnectionChange(cb: (conns: string[]) => void) {
    this.connectionCallbacks.add(cb);
    return () => this.connectionCallbacks.delete(cb);
  }

  private notifyConnectionChange() {
    const ids = Array.from(this.connections.keys());
    this.connectionCallbacks.forEach(cb => cb(ids));
  }

  public destroy() {
    this.performDestroy();
  }

  private performDestroy() {
    this.isDestroying = true;
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    this.hostConnection = null;
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.notifyConnectionChange();
    this.isHost = false;
  }
}

export const peerService = new PeerService();

export function generateSessionKey(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${digits}`;
}