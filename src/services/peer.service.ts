import Peer, { DataConnection } from 'peerjs';

export type PeerMessage = {
  type: string;
  payload?: any;
};

interface PeerConnections {
  control?: DataConnection;
  transfer?: DataConnection;
}

class PeerService {
  public peer: Peer | null = null;
  public isHost: boolean = false;
  public connections: Map<string, PeerConnections> = new Map();
  
  private dataCallbacks: Set<(data: PeerMessage, fromPeerId: string) => void> = new Set();
  private transferCallbacks: Set<(data: ArrayBuffer, fromPeerId: string) => void> = new Set();
  private connectionCallbacks: Set<(conns: string[]) => void> = new Set();

  private hostControlConnection: DataConnection | null = null;
  private hostTransferConnection: DataConnection | null = null;
  private isDestroying = false;
  private isConnecting = false;

  async init(isHost: boolean, hostPeerId: string, myPeerId?: string): Promise<string> {
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
        
        this.peer?.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        this.peer?.on('disconnected', () => {
          if (!this.isDestroying) {
            console.warn('[PeerService] Déconnecté du serveur, tentative reconnexion...');
            this.peer?.reconnect();
          }
        });

        resolve(id);
      });

      this.peer.on('error', (err: any) => {
        if (this.isDestroying) return;

        if (err.type === 'unavailable-id') {
            console.warn(`[PeerService] ID ${hostId} occupé (ghost), patience...`);
            
            if (this.peer) {
                this.peer.off('disconnected');
                this.peer.destroy();
                this.peer = null;
            }

            if (retryCount < 10) {
                const delay = 3000 + (retryCount * 1000);
                setTimeout(() => {
                    if (!this.isDestroying) {
                        this.initAsHost(hostId, retryCount + 1).then(resolve).catch(reject);
                    }
                }, delay);
                return;
            }
            reject(new Error("Identifiant bloqué. Réessayez dans 1 minute."));
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
    if (this.isConnecting) {
      console.warn('[PeerService] connectToHost appelé en double, ignoré.');
      return;
    }
    this.isConnecting = true;

    let attempts = 0;
    const maxAttempts = 15;

    const tryConnect = () => {
      if (this.isDestroying || !this.peer) {
          this.isConnecting = false;
          return;
      }
      attempts++;
      console.log(`[PeerService] Liaison MJ (${attempts}/${maxAttempts})...`);
      
      const controlConn = this.peer.connect(hostId, { reliable: true, label: 'control' });
      const transferConn = this.peer.connect(hostId, { reliable: false, label: 'transfer' });
      
      this.hostControlConnection = controlConn;
      this.hostTransferConnection = transferConn;
      
      let controlOpen = false;
      let transferOpen = false;

      const checkReady = () => {
        if (controlOpen && transferOpen) {
          clearTimeout(timeout);
          this.isConnecting = false;
          resolve(this.peer!.id);
        }
      };

      const retry = () => {
          controlConn.close();
          transferConn.close();
          if (attempts < maxAttempts && !this.isDestroying) {
            setTimeout(tryConnect, 2000);
          } else if (!this.isDestroying) {
            this.isConnecting = false;
            reject(new Error("Hôte injoignable après plusieurs tentatives."));
          } else {
            this.isConnecting = false;
          }
      };

      const timeout = setTimeout(() => {
        if (!controlOpen || !transferOpen) {
           console.warn(`[PeerService] Timeout de liaison MJ (${attempts}).`);
           retry();
        }
      }, 6000);

      controlConn.on('open', () => {
        controlOpen = true;
        this.setupConnection(controlConn);
        checkReady();
      });

      transferConn.on('open', () => {
        transferOpen = true;
        this.setupConnection(transferConn);
        checkReady();
      });

      controlConn.on('error', (err) => {
          console.warn(`[PeerService] Control connection error:`, err);
          retry();
      });
      transferConn.on('error', (err) => {
          console.warn(`[PeerService] Transfer connection error:`, err);
          retry();
      });
    };

    tryConnect();
  }

  private setupConnection(conn: DataConnection) {
    let peerConns = this.connections.get(conn.peer) || {};
    
    if (conn.label === 'transfer') {
      if (peerConns.transfer?.open) peerConns.transfer.close();
      peerConns.transfer = conn;
    } else {
      if (peerConns.control?.open) peerConns.control.close();
      peerConns.control = conn;
    }

    this.connections.set(conn.peer, peerConns);
    
    if (conn.label !== 'transfer') {
      this.notifyConnectionChange();
    }

    const onOpen = () => {
      if (this.isDestroying) return;
      if (conn.label !== 'transfer') {
        this.dataCallbacks.forEach(cb => cb({ type: 'CONN_READY', payload: { peerId: conn.peer } }, conn.peer));
      }
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
      
      if (conn.label === 'transfer') {
        this.transferCallbacks.forEach(cb => cb(data, conn.peer));
      } else {
        this.dataCallbacks.forEach(cb => cb(data as PeerMessage, conn.peer));
      }
    });

    conn.on('close', () => {
      const pc = this.connections.get(conn.peer);
      if (pc) {
        if (conn.label === 'transfer') pc.transfer = undefined;
        else pc.control = undefined;
        
        if (!pc.control && !pc.transfer) {
          this.connections.delete(conn.peer);
        }
      }
      if (conn.label !== 'transfer') {
        this.notifyConnectionChange();
        this.dataCallbacks.forEach(cb => cb({ type: 'PLAYER_LEAVE', payload: { peerId: conn.peer } }, conn.peer));
      }
    });

    conn.on('error', () => {
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
          // TODO: Replace with private TURN server for production (security/reliability/quota issues with openrelay)
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10
      }
    };
  }

  public getPeerId(): string | undefined {
    return this.peer?.id;
  }

  public isPeerConnected(peerId: string): boolean {
    const pc = this.connections.get(peerId);
    return !!pc?.transfer?.open || !!pc?.control?.open;
  }

  public broadcast(data: PeerMessage) {
    if (this.isHost) {
      this.connections.forEach(pc => { if (pc.control?.open) pc.control.send(data); });
    } else if (this.hostControlConnection?.open) {
      this.hostControlConnection.send(data);
    }
  }

  public sendTo(peerId: string, data: PeerMessage) {
    const pc = this.connections.get(peerId);
    if (pc?.control?.open) pc.control.send(data);
  }

  public broadcastTransfer(data: ArrayBuffer) {
    if (this.isHost) {
      this.connections.forEach(pc => { if (pc.transfer?.open) pc.transfer.send(data); });
    } else if (this.hostTransferConnection?.open) {
      this.hostTransferConnection.send(data);
    }
  }

  public sendTransferTo(peerId: string, data: ArrayBuffer) {
    const pc = this.connections.get(peerId);
    if (pc?.transfer?.open) {
      pc.transfer.send(data);
    } else {
      console.warn(`[PeerService] Cannot send transfer to ${peerId} - transfer channel not open.`);
    }
  }

  public getTransferBufferedAmount(targetPeerId?: string): number {
    if (targetPeerId) {
      const pc = this.connections.get(targetPeerId);
      return pc?.transfer?.dataChannel?.bufferedAmount || 0;
    } else {
      // Find max buffered amount across all transfer connections
      if (this.isHost) {
        let max = 0;
        this.connections.forEach(pc => {
          if (pc.transfer?.open && pc.transfer.dataChannel) {
             max = Math.max(max, pc.transfer.dataChannel.bufferedAmount);
          }
        });
        return max;
      } else if (this.hostTransferConnection?.open && this.hostTransferConnection.dataChannel) {
        return this.hostTransferConnection.dataChannel.bufferedAmount;
      }
      return 0;
    }
  }

  public onData(cb: (data: PeerMessage, fromPeerId: string) => void) {
    this.dataCallbacks.add(cb);
    return () => this.dataCallbacks.delete(cb);
  }

  public onTransferData(cb: (data: ArrayBuffer, fromPeerId: string) => void) {
    this.transferCallbacks.add(cb);
    return () => this.transferCallbacks.delete(cb);
  }

  public onConnectionChange(cb: (conns: string[]) => void) {
    this.connectionCallbacks.add(cb);
    return () => this.connectionCallbacks.delete(cb);
  }

  private notifyConnectionChange() {
    const ids = Array.from(this.connections.entries())
      .filter(([_, pc]) => pc.control?.open)
      .map(([id]) => id);
    this.connectionCallbacks.forEach(cb => cb(ids));
  }

  public destroy() { this.performDestroy(); }

  private performDestroy() {
    this.isDestroying = true;
    this.connections.forEach(pc => {
      pc.control?.close();
      pc.transfer?.close();
    });
    this.connections.clear();
    this.hostControlConnection = null;
    this.hostTransferConnection = null;
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
