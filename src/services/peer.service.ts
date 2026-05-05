import Peer, { DataConnection } from 'peerjs';

export type PeerMessage = {
  type: string;
  payload: any;
};

export type PeerConnection = DataConnection;

class PeerService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private dataCallbacks: Set<(data: PeerMessage) => void> = new Set();
  private connectionCallbacks: Set<(conns: string[]) => void> = new Set();
  
  private currentRole: 'host' | 'client' | null = null;
  private isDestroying = false;
  private destroyTimeout: ReturnType<typeof setTimeout> | null = null;
  private initPromise: Promise<string> | null = null;

  public async init(isHost: boolean, forceId?: string): Promise<string> {
    const requestedRole = isHost ? 'host' : 'client';

    // 1. Protection Re-mount : On annule toute destruction programmée
    if (this.destroyTimeout) {
      console.log(`[PeerService] Restauration session ${this.currentRole} (re-mount)`);
      clearTimeout(this.destroyTimeout);
      this.destroyTimeout = null;
      this.isDestroying = false;
    }

    // 2. Réutilisation de l'instance existante
    if (this.peer && !this.peer.destroyed) {
      if (this.currentRole === requestedRole) {
        const idMatches = !isHost || (forceId && this.peer.id === forceId);
        if (idMatches) {
          // Si on est déconnecté du serveur de signalement, on tente une reconnexion
          if (this.peer.disconnected) {
            console.warn('[PeerService] Peer déconnecté, tentative de reconnexion...');
            try { this.peer.reconnect(); } catch (e) { console.error('[PeerService] Erreur reconnexion:', e); }
          }
          
          if (this.initPromise) return this.initPromise;
          // On retourne l'ID si le peer est déjà là (même s'il attend d'être 'open')
          return this.peer.id;
        }
      }
      
      // Si changement de rôle ou d'ID, on détruit l'ancien
      console.log('[PeerService] Contexte obsolète ou ID différent, destruction...');
      this.performDestroy();
    }

    // 3. Verrouillage d'initialisation (Atomicité)
    if (this.initPromise) return this.initPromise;

    this.currentRole = requestedRole;
    this.initPromise = this.performInit(isHost, forceId);
    
    try {
      const id = await this.initPromise;
      return id;
    } finally {
      this.initPromise = null;
    }
  }

  private performInit(isHost: boolean, forceId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.isDestroying = false;
        
        const peerOptions: any = {
          debug: 1,
          secure: true,
          config: {
            // ✅ On simplifie à l'extrême : un seul STUN robuste. 
            // PeerJS ajoutera ses propres serveurs si nécessaire.
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 0, // Désactive le pooling pour éviter les latences de découverte
            iceTransportPolicy: 'all'
          }
        };


        const peerInstance = (isHost && forceId && forceId.trim() !== '')
          ? new Peer(forceId, peerOptions)
          : new Peer(peerOptions);

        this.peer = peerInstance;

        const initTimeout = setTimeout(() => {
          if (peerInstance && !peerInstance.open) {
            console.error('[PeerService] Timeout initialisation PeerJS');
            peerInstance.destroy();
            reject(new Error('Signalement : Timeout (Serveur injoignable)'));
          }
        }, 15000);

        peerInstance.on('open', (id) => {
          clearTimeout(initTimeout);
          if (this.isDestroying) {
            peerInstance.destroy();
            return;
          }
          console.log(`[PeerService] ONLINE : ${this.currentRole?.toUpperCase()} (ID: ${id})`);
          resolve(id);
        });

        peerInstance.on('connection', (conn) => {
          if (this.currentRole !== 'host') {
            console.warn('[PeerService] Connexion entrante bloquée (Rôle Client)');
            conn.close();
            return;
          }
          this.setupConnection(conn);
        });

        peerInstance.on('error', (err) => {
          if (this.isDestroying) return;
          console.error(`[PeerService] Erreur ${err.type}:`, err.message);
          
          if (err.type === 'unavailable-id' && isHost) {
            console.error('[PeerService] ID Hôte déjà occupé.');
          }
          
          // On ne rejette que si on n'est pas déjà "open"
          if (!peerInstance.open) {
            clearTimeout(initTimeout);
            reject(err);
          }
        });

        peerInstance.on('disconnected', () => {
          if (!this.isDestroying && this.peer && !this.peer.destroyed) {
            console.warn('[PeerService] Signalement déconnecté. Tentative de reconnexion...');
            try { this.peer.reconnect(); } catch (e) { console.error('[PeerService] Reconnexion impossible:', e); }
          }
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  public connect(hostId: string, retries = 5): Promise<DataConnection> {
    const tryConnect = (attempt: number): Promise<DataConnection> => {
      return new Promise((resolve, reject) => {
        if (!this.peer || this.peer.destroyed) {
          return reject(new Error('Nœud non prêt'));
        }

        if (this.peer.disconnected) {
          try { this.peer.reconnect(); } catch (e) { console.error('[PeerService] Reconnexion auto avant P2P:', e); }
        }

        console.log(`[PeerService] [Essai ${attempt + 1}] Connexion vers ${hostId}...`);
        const conn = this.peer.connect(hostId, { 
          reliable: true,
          connectionPriority: 'high'
        });
        
        const timeout = setTimeout(() => {
          if (!conn.open) {
            conn.close();
            reject(new Error('Négociation P2P (ICE) échouée (Timeout)'));
          }
        }, 20000);

        conn.on('open', () => {
          clearTimeout(timeout);
          console.log(`[PeerService] P2P Établi avec ${hostId}`);
          this.setupConnection(conn);
          resolve(conn);
        });

        conn.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    };

    const attemptWithBackoff = async (): Promise<DataConnection> => {
      for (let i = 0; i < retries; i++) {
        try {
          return await tryConnect(i);
        } catch (e) {
          if (i < retries - 1 && !this.isDestroying) {
            const delay = 1000 * (i + 1);
            console.warn(`[PeerService] Échec, nouvelle tentative dans ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            throw e;
          }
        }
      }
      throw new Error('Hôte injoignable (Problème de NAT ou Hôte déconnecté)');
    };

    return attemptWithBackoff();
  }

  private setupConnection(conn: DataConnection) {
    if (this.isDestroying) {
      conn.close();
      return;
    }

    this.connections.set(conn.peer, conn);
    this.notifyConnectionChange();

    const onOpen = () => {
      if (this.isDestroying) return;
      conn.send({ type: 'HEARTBEAT' });
      this.dataCallbacks.forEach(cb => cb({ type: 'CONN_READY', payload: { peerId: conn.peer } }));
    };

    if (conn.open) onOpen();
    else conn.on('open', onOpen);

    conn.on('data', (data: any) => {
      if (this.isDestroying) return;
      if (data && data.type === 'HEARTBEAT') return;
      this.dataCallbacks.forEach(cb => cb(data as PeerMessage));
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.notifyConnectionChange();
      if (!this.isDestroying) {
        this.dataCallbacks.forEach(cb => cb({ type: 'PLAYER_LEAVE', payload: { peerId: conn.peer } }));
      }
    });
  }

  private notifyConnectionChange() {
    const ids = Array.from(this.connections.keys());
    this.connectionCallbacks.forEach(cb => cb(ids));
  }

  public onConnectionChange(cb: (conns: string[]) => void) {
    this.connectionCallbacks.add(cb);
    return () => this.connectionCallbacks.delete(cb);
  }

  public broadcast(data: PeerMessage) {
    if (this.isDestroying) return;
    this.connections.forEach(conn => {
      if (conn.open) conn.send(data);
    });
  }

  public onData(cb: (data: PeerMessage) => void) {
    this.dataCallbacks.add(cb);
    return () => this.dataCallbacks.delete(cb);
  }

  public destroy() {
    if (this.destroyTimeout) return;

    this.destroyTimeout = setTimeout(() => {
      this.performDestroy();
      this.destroyTimeout = null;
    }, 800);
  }

  private performDestroy() {
    this.isDestroying = true;
    const role = this.currentRole;
    console.log(`[PeerService] Destruction du service (${role})`);
    
    this.connections.forEach(conn => {
      try { conn.close(); } catch (e) { console.error('[PeerService] Erreur fermeture connexion:', e); }
    });
    this.connections.clear();
    this.notifyConnectionChange();

    if (this.peer) {
      try { 
        this.peer.off('disconnected');
        this.peer.off('error');
        this.peer.destroy(); 
      } catch (e) { console.error('[PeerService] Erreur destruction peer:', e); }
      this.peer = null;
    }

    this.dataCallbacks.clear();
    this.connectionCallbacks.clear();
    this.currentRole = null;
    this.isDestroying = false;
  }
}

export const peerService = new PeerService();

export function generateSessionKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let word = '';
  for (let i = 0; i < 4; i++) {
    word += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `SIGIL-${digits}-${word}`;
}