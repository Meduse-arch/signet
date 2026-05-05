import { useEffect, useCallback } from 'react';
import { usePeersStore } from '../store/peers';
import { peerService, PeerMessage } from '../services/peer.service';
import { relayService } from '../services/relay.service';

export function usePeer() {
  const { peerId, isHost, connections, setPeerId, setIsHost, setConnections } = usePeersStore();

  // BUG 4 FIX : synchroniser peerService.connections → store Zustand en temps réel
  useEffect(() => {
    const unsub = peerService.onConnectionChange((conns) => {
      setConnections(conns);
    });
    return () => { unsub(); };
  }, [setConnections]);

  const init = useCallback(async (hostMode: boolean, forceId?: string) => {
    const id = await peerService.init(hostMode, forceId);
    setPeerId(id);
    setIsHost(hostMode);
    return id;
  }, [setPeerId, setIsHost]);

  const connect = useCallback(async (hostId: string) => {
    const conn = await peerService.connect(hostId); // BUG 2 FIX : retry inclus dans le service
    return conn;
  }, []);

  const broadcast = useCallback((data: PeerMessage) => {
    peerService.broadcast(data);
  }, []);

  const broadcastHybrid = useCallback((sessionId: string, data: PeerMessage) => {
    // 1. Envoi via P2P (Rapide, direct)
    peerService.broadcast(data);
    
    // 2. Envoi via Relay (Backup pour ceux derrière des NAT symétriques)
    relayService.send(sessionId, peerId || 'unknown', data.type, data.payload);
  }, [peerId]);

  const onData = useCallback((cb: (data: PeerMessage) => void) => {
    // 1. Écoute P2P
    const unsubP2P = peerService.onData(cb);
    
    // 2. Écoute Relay
    const unsubRelay = relayService.onMessage((relayData) => {
      cb({ type: relayData.type, payload: relayData.payload });
    });

    return () => {
      unsubP2P();
      unsubRelay();
    };
  }, []);

  const destroy = useCallback(() => {
    peerService.destroy();
    setPeerId(null);
    setIsHost(false);
    setConnections([]);
  }, [setPeerId, setIsHost, setConnections]);

  return { peerId, isHost, connections, init, connect, broadcast, broadcastHybrid, onData, destroy };
}