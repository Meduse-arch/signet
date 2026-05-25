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
    console.log(`[PeerService] Initialisation (Host: ${isHost}) pour ${hostPeerId}`);
    this.performDestroy(); 
    this.isHost = isHost;
    this.isDestroying = false;

    if (isHost) {
      return this.initAsHost(hostPeerId);
    } else {
      return this.initAsPlayer(hostPeerId, myPeerId || `player-${Math.random().toString(36).substr(2, 9)}`);
    }
  }

  private initAsHost(hostId: string, retryCount = 0): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.isDestroying) return;

      // Nettoyage total du peer précédent pour éviter les conflits d'écouteurs
      if (this.peer) {
          this.peer.off('open');
          this.peer.off('error');
          this.peer.off('disconnected');
          this.peer.off('connection');
          this.peer.destroy();
          this.peer = null;
      }

      console.log(`[PeerService] Tentative Host: ${hostId} (Essai ${retryCount + 1}/10)`);
      
      this.peer = new Peer(hostId, this.getPeerOptions());

      this.peer.on('open', (id) => {
        console.log(`[PeerService] ONLINE (HOST): ${id}`);
        
        // On ne branche les écouteurs de vie qu'une fois ouvert
        this.peer?.on('connection', (conn) => {
          console.log(`[PeerService] Connexion entrante: ${conn.peer}`);
          this.setupConnection(conn);
        });

        this.peer?.on('disconnected', () => {
          if (!this.isDestroying) {
            console.warn('[PeerService] Perte de signal, reconnexion...');
            this.peer?.reconnect();
          }
        });

        resolve(id);
      });

      this.peer.on('error', (err: any) => {
        if (this.isDestroying) return;

        if (err.type === 'unavailable-id') {
            console.warn(`[PeerService] ID ${hostId} occupé (stale). Nouveau test dans quelques secondes...`);
            
            // On désactive tout avant de détruire
            if (this.peer) {
                this.peer.off('disconnected'); 
                this.peer.destroy();
                this.peer = null;
            }

            if (retryCount < 10) {
                const delay = 3000;
                setTimeout(() => {
                    if (!this.isDestroying) {
                        this.initAsHost(hostId, retryCount + 1).then(resolve).catch(reject);
                    }
                }, delay);
                return;
            }
            reject(new Error("L'identifiant est bloqué. Patientez 30s ou changez de code."));
            return;
        }

        console.error('[PeerService] Host Peer Error:', err);
        reject(err);
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
          this.peer?.reconnect();
        }
      });
    });
  }

  private connectToHost(hostId: string, resolve: (id: string) => void, reject: (err: any) => void) {
    let attempts = 0;
    const maxAttempts = 15;

    const tryConnect = () => {
      if (this.isDestroying || !this.peer) return;
      attempts++;
      console.log(`[PeerService] Liaison MJ (${attempts}/${maxAttempts})...`);
      
      const conn = this.peer.connect(hostId, { reliable: true });
      this.hostConnection = conn;
      
      const timeout = setTimeout(() => {
        if (!conn.open) {
          conn.close();
          if (attempts < maxAttempts) {
            setTimeout(tryConnect, 2000);
          } else {
            reject(new Error("Hôte injoignable. Vérifiez le code."));
          }
        }
      }, 6000);

      conn.on('open', () => {
        clearTimeout(timeout);
        this.setupConnection(conn);
        resolve(this.peer!.id);
      });

      conn.on('error', (err) => {
        conn.close();
      });
    };

    tryConnect();
  }

  private setupConnection(conn: DataConnection) {
    if (this.connections.has(conn.peer)) {
      const oldConn = this.connections.get(conn.peer);
      if (oldConn?.open) {
        conn.close();
        return;
      }
      this.connections.delete(conn.peer);
    }

    this.connections.set(conn.peer, conn);
    this.notifyConnectionChange();

    const onOpen = () => {
      if (this.isDestroying) return;
      this.dataCallbacks.forEach(cb => cb({ type: 'CONN_READY', payload: { peerId: conn.peer } }, conn.peer));
    };

    conn.off('open');
    conn.off('data');
    conn.off('close');
    conn.off('error');

    if (conn.open) onOpen();
    else conn.once('open', onOpen);

    conn.on('data', (data: any) => {
      if (this.isDestroying) return;
      if (data?.type === 'HEARTBEAT') return;
      this.dataCallbacks.forEach(cb => cb(data as PeerMessage, conn.peer));
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.notifyConnectionChange();
      this.dataCallbacks.forEach(cb => cb({ type: 'PLAYER_LEAVE', payload: { peerId: conn.peer } }, conn.peer));
    });

    conn.on('error', (err) => {
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
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      }
    };
  }

  public broadcast(data: PeerMessage) {
    if (this.isHost) {
      this.connections.forEach(conn => { if (conn.open) conn.send(data); });
    } else if (this.hostConnection?.open) {
      this.hostConnection.send(data);
    }
  }

  public sendTo(peerId: string, data: PeerMessage) {
    const conn = this.connections.get(peerId);
    if (conn?.open) conn.send(data);
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

  public destroy() { this.performDestroy(); }

  private performDestroy() {
    this.isDestroying = true;
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    this.hostConnection = null;
    if (this.peer) {
      this.peer.off('open');
      this.peer.off('error');
      this.peer.off('disconnected');
      this.peer.off('connection');
      this.peer.destroy();
      this.peer = null;
    }
    this.notifyConnectionChange();
    this.isHost = false;
  }
}

export const peerService = new PeerService();

export function generateSessionKey(): string {
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  const letters = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  return `SIGNET-${digits}-${letters}`;
}