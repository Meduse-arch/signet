import { useEffect, useCallback } from 'react';
import { usePeersStore } from '../store/peers';
import { peerService, PeerMessage } from '../services/peer.service';

export function usePeer() {
  const peerId = usePeersStore(state => state.peerId);
  const isHost = usePeersStore(state => state.isHost);
  const connections = usePeersStore(state => state.connections);
  const setPeerId = usePeersStore(state => state.setPeerId);
  const setIsHost = usePeersStore(state => state.setIsHost);
  const setConnections = usePeersStore(state => state.setConnections);

  useEffect(() => {
    const unsub = peerService.onConnectionChange((conns) => {
      setConnections(conns);
    });
    return () => { unsub(); };
  }, [setConnections]);

  const init = useCallback(async (hostMode: boolean, hostPeerId: string, myPeerId?: string) => {
    const id = await peerService.init(hostMode, hostPeerId, myPeerId);
    setPeerId(id);
    setIsHost(hostMode);
    return id;
  }, [setPeerId, setIsHost]);

  const broadcast = useCallback((data: PeerMessage) => {
    peerService.broadcast(data);
  }, []);

  const sendTo = useCallback((peerId: string, data: PeerMessage) => {
    peerService.sendTo(peerId, data);
  }, []);

  const onData = useCallback((cb: (data: PeerMessage, fromPeerId: string) => void) => {
    const unsub = peerService.onData(cb);
    return () => { unsub(); };
  }, []);

  const destroy = useCallback(() => {
    peerService.destroy();
    setPeerId(null);
    setIsHost(false);
    setConnections([]);
  }, [setPeerId, setIsHost, setConnections]);

  return { peerId, isHost, connections, init, broadcast, sendTo, onData, destroy };
}