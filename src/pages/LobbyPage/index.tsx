import { useEffect, useRef, useState, useCallback } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { SecurityLevel, useAuthStore } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { usePeersStore } from '../../store/peers';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useQuestsStore } from '../../store/quests';
import { peerService } from '../../services/peer.service';
import {
  addSessionPlayer,
  clearSessionPlayers,
  getSessionPlayers,
  removeSessionPlayer,
} from '../../services/session.service';
import { 
  Users, 
  WifiOff, 
  LogOut, 
  Loader2,
  Copy,
  CheckCircle2,
  Zap,
  Play
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { SystemRouter } from '../../systems/core/SystemRouter';

interface LobbyPageProps {
  sessionId: string;
  onLeave: () => void;
}

type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'relay' | 'error' | 'disconnected';

export function LobbyPage({ sessionId, onLeave }: LobbyPageProps) {
  const { init, broadcast, onData, destroy, connections, peerId } = usePeer();
  const [status, setStatus] = useState<ConnectionStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ peer_id: string; pseudo: string; role?: number }[]>([]);
  const [copied, setCopied] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [localMetadata, setLocalMetadata] = useState<{name?: string, id?: string, imageUrl?: string, system?: string, hostPeerId?: string, settings?: any} | null>(null);

  const currentUser = useAuthStore(state => state.user);
  const { sessions, addSession: addSessionToStore } = useSessionStore();
  
  const sessionDataFromStore = sessions.find(s => s.id === sessionId);
  
  // Si c'est un code SIGNET-xxx, on est forcément joueur. 
  // Sinon on regarde en base : si isSummoned est vrai, on est forcément joueur.
  const isHost = !sessionId.startsWith('SIGNET-') && (!sessionDataFromStore || !sessionDataFromStore.isSummoned);
  const isMJ = !!currentUser && currentUser.role >= SecurityLevel.MJ;

  const sessionData = isHost ? sessionDataFromStore : (localMetadata || sessionDataFromStore);
  const sessionImage = sessionData?.imageUrl;

  // Sync refs pour les callbacks asynchrones
  const isMJRef = useRef(isMJ);
  const isHostRef = useRef(isHost);
  const sessionIdRef = useRef(sessionId);
  const broadcastRef = useRef(broadcast);
  const initRef = useRef(init);
  const statusRef = useRef(status);
  const onLeaveRef = useRef(onLeave);

  useEffect(() => { isMJRef.current = isMJ; }, [isMJ]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { broadcastRef.current = broadcast; }, [broadcast]);
  useEffect(() => { initRef.current = init; }, [init]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { onLeaveRef.current = onLeave; }, [onLeave]);

  // Initialisation store persos
  useEffect(() => {
    if (sessionId) {
        localStorage.setItem('last_active_session', sessionId);
        useCharactersStore.getState().initialize(sessionId);
    }
  }, [sessionId]);

  const refreshPlayers = useCallback(async () => {
    try {
      const list = await getSessionPlayers(sessionIdRef.current);
      setPlayers(list);
      if (isHostRef.current) {
        broadcastRef.current({ type: 'PLAYER_LIST', payload: list });
      }
    } catch (e) {
      console.error('Failed to refresh players:', e);
    }
  }, []);

  useEffect(() => {
    const handleMessage = async (data: { type: string, payload: any }, fromPeerId: string) => {
      console.log(`[LobbyPage] Message reçu: ${data.type} de ${fromPeerId}`);
      
      if (data.type === 'SESSION_START') {
        setIsGameStarted(true);
      } else if (data.type === 'SESSION_PAUSE') {
        setIsGameStarted(false);
      }
      else if (data.type === 'CONN_READY' && !isHostRef.current) {
        if (statusRef.current === 'connected') return;
        const myActualId = peerId || usePeersStore.getState().peerId;
        const currentUserState = useAuthStore.getState().user;
        
        const joinMsg = {
          type: 'PLAYER_JOIN',
          payload: {
            peer_id: myActualId,
            userId: currentUserState?.id,
            pseudo: currentUserState?.pseudo || 'Joueur',
            role: currentUserState?.role || 0
          }
        };
        broadcastRef.current(joinMsg);
        setStatus('connected');
      }
      else if (data.type === 'PLAYER_JOIN' && isHostRef.current) {
        const newPeerId = data.payload.peer_id || fromPeerId;
        const { pseudo, userId, role } = data.payload;
        
        // Nettoyer d'abord
        await removeSessionPlayer(sessionIdRef.current, newPeerId);
        // Puis ajouter
        await addSessionPlayer(sessionIdRef.current, newPeerId, pseudo, role);
        
        const updatedList = await getSessionPlayers(sessionIdRef.current);
        setPlayers(updatedList);
        broadcastRef.current({ type: 'PLAYER_LIST', payload: updatedList });

        let sessionMaps = [];
        if (window.electronAPI) sessionMaps = await window.electronAPI.getMaps(sessionIdRef.current);

        broadcastRef.current({
          type: 'SESSION_METADATA',
          payload: {
            id: sessionData?.id,
            name: sessionData?.name,
            system: sessionData?.system,
            imageUrl: sessionData?.imageUrl,
            hostPeerId: sessionData?.hostPeerId,
            maps: sessionMaps
          }
        });

        if (isGameStarted) broadcastRef.current({ type: 'SESSION_START', payload: {} });
      } 
      else if (data.type === 'SESSION_METADATA' && !isHostRef.current) {
        console.log(`[LobbyPage] Métadonnées reçues:`, data.payload);
        setLocalMetadata(data.payload);
        const realId = data.payload.id;
        if (realId && realId !== sessionIdRef.current) {
            try {
                useCharactersStore.getState().initialize(realId);
                useItemsStore.getState().initialize(realId);
                useQuestsStore.getState().initialize(realId);
            } catch (err) { console.error('Switch UUID fail', err); }
        }
        const updatedSession = { ...data.payload, lastPlayed: Date.now(), isSummoned: true };
        addSessionToStore(updatedSession);
      }
      else if (data.type === 'PLAYER_LIST') {
        setPlayers(data.payload);
        if (statusRef.current !== 'connected') setStatus('connected');
      } 
      else if (data.type === 'SESSION_CLOSED') {
        onLeave();
      }
      else if (data.type === 'PLAYER_LEAVE') {
        if (isMJRef.current) {
          await removeSessionPlayer(sessionIdRef.current, data.payload.peerId);
          await refreshPlayers();
        } else {
          const sData = useSessionStore.getState().sessions.find(s => s.id === sessionIdRef.current);
          const hostId = sessionIdRef.current.startsWith('SIGNET-') ? sessionIdRef.current : sData?.hostPeerId;
          if (data.payload.peerId === hostId) onLeave();
        }
      }
    };

    const unsub = onData(handleMessage);
    return () => unsub();
  }, [onData, refreshPlayers, sessionData, isGameStarted, addSessionToStore, onLeave, peerId]);

  useEffect(() => {
    let mounted = true;
    const setupPeer = async () => {
      try {
        const sData = useSessionStore.getState().sessions.find(s => s.id === sessionIdRef.current);
        const hostPeerId = isHostRef.current 
          ? sData?.hostPeerId 
          : (sessionIdRef.current.startsWith('SIGNET-') ? sessionIdRef.current : sData?.hostPeerId);

        if (!hostPeerId) throw new Error("ID de session manquant");

        if (isHostRef.current) {
          if (mounted) setStatus('initializing');
          const myId = await init(true, hostPeerId);
          if (!mounted) return;
          await clearSessionPlayers(sessionIdRef.current);
          await addSessionPlayer(sessionIdRef.current, myId, currentUser?.pseudo || 'MJ', currentUser?.role);
          await refreshPlayers();
          if (mounted) setStatus('connected');
        } else {
          if (mounted) setStatus('initializing');
          await init(false, hostPeerId);
        }
      } catch (e: any) {
        if (mounted) { setStatus('error'); setErrorMessage(e.message); }
      }
    };
    setupPeer();
    return () => { mounted = false; };
  }, [sessionId, isHost, currentUser, init, refreshPlayers, sessionData?.hostPeerId]);

  useEffect(() => {
    const bc = broadcastRef.current;
    const host = isHostRef.current;
    return () => { 
      const currentPeerId = usePeersStore.getState().peerId;
      if (currentPeerId) {
        if (host) bc({ type: 'SESSION_CLOSED', payload: {} });
        else bc({ type: 'PLAYER_LEAVE', payload: { peerId: currentPeerId } });
      }
      destroy(); 
    };
  }, [destroy]);

  const handleLaunchSession = () => {
    setIsGameStarted(true);
    broadcast({ type: 'SESSION_START', payload: {} });
    if (isHost) {
        broadcast({ type: 'CHARACTER_LIST', payload: useCharactersStore.getState().characters });
    }
  };

  const copyId = () => {
    const idToCopy = isHost ? peerId : sessionData?.hostPeerId;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isGameStarted) {
    return (
      <div className="flex-1 w-full h-full animate-page-enter">
        <SystemRouter 
          system={sessionData?.system || 'Seal'} 
          isMJ={isMJ} 
          onPause={() => setIsGameStarted(false)}
          sessionId={sessionData?.id || sessionId}
          imageUrl={sessionImage}
          players={players}
        />
      </div>
    );
  }

  const getRoleLabelLocal = (role?: number) => {
    const level = role ?? 0;
    if (level === SecurityLevel.ADMIN) return 'ADMIN';
    if (level === SecurityLevel.MJ) return 'MJ';
    return 'INITIÉ';
  };

  return (
    <div className="flex flex-col h-screen bg-[#0D0D0F] text-white overflow-hidden relative">
      <div className="absolute inset-0 z-0">
        {sessionImage && <img src={sessionImage} className="w-full h-full object-cover opacity-20 grayscale-[0.5]" alt="bg" />}
        <div className="absolute inset-0 bg-vignette pointer-events-none" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-gold-DEFAULT/20 bg-[#0D0D0F]/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <img src={logo} className="w-8 h-8 animate-rune-pulse" alt="logo" />
          <div>
            <h1 className="text-lg font-black text-gold-bright tracking-widest uppercase">{sessionData?.name || 'Lobby'}</h1>
            <div className="flex items-center gap-2 text-[8px] font-cinzel">
              <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
              <span className="text-gold-muted uppercase tracking-widest">{status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isHost && <button onClick={copyId} className="px-4 py-1.5 rounded-lg border border-gold-DEFAULT/30 text-[9px] font-bold text-gold-bright hover:bg-gold-DEFAULT/10 transition-all">{copied ? 'COPIÉ' : 'PARTAGER'}</button>}
          <button onClick={onLeave} className="px-4 py-1.5 rounded-lg border border-red-500/30 text-[9px] font-bold text-red-500 hover:bg-red-500/10 transition-all">QUITTER</button>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-12">
        {status === 'error' ? (
          <div className="text-center space-y-4">
            <WifiOff size={48} className="mx-auto text-red-500 opacity-50" />
            <h2 className="text-xl font-bold">Lien Rompu</h2>
            <p className="text-sm text-white/60 italic">{errorMessage}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 rounded-full border border-white/20 text-xs font-bold uppercase tracking-widest">Ré-Invocation</button>
          </div>
        ) : (status !== 'connected' && status !== 'relay') ? (
          <div className="text-center space-y-4 animate-pulse">
            <Loader2 size={48} className="mx-auto text-gold-DEFAULT animate-spin" />
            <h2 className="text-sm font-cinzel tracking-[0.3em] text-gold-DEFAULT uppercase">Établissement du Signet...</h2>
          </div>
        ) : (
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gold-muted tracking-[0.3em] uppercase">Chroniques en attente</span>
                <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">{sessionData?.name}</h2>
                <p className="text-gold-muted italic font-serif">Les récits du système {sessionData?.system} s'apprêtent à naître.</p>
              </div>
              {isHost && (
                <button onClick={handleLaunchSession} className="w-full py-5 rounded-2xl bg-gold-DEFAULT text-black font-black uppercase tracking-widest hover:bg-gold-bright transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3">
                  <Play size={20} fill="currentColor" /> LANCER LA SESSION
                </button>
              )}
            </div>
            <div className="bg-black/40 border border-gold-DEFAULT/20 rounded-[2.5rem] p-8 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-grimoire-texture opacity-[0.03] pointer-events-none" />
              <h3 className="text-[10px] font-black text-gold-muted uppercase tracking-[0.3em] mb-6 flex items-center gap-2 relative z-10"><Users size={14}/> Cercle d'Initiés</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar relative z-10 pr-2">
                {players.map(p => (
                  <div key={p.peer_id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:border-gold-DEFAULT/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 flex items-center justify-center text-xs font-black text-gold-bright font-cinzel shadow-inner">{p.pseudo.charAt(0)}</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white/90 tracking-wide">{p.pseudo}</span>
                        <span className="text-[8px] text-gold-muted/60 uppercase font-black tracking-widest">{getRoleLabelLocal(p.role)}</span>
                      </div>
                    </div>
                    {p.pseudo === 'MJ' && <Zap size={12} className="text-gold-bright animate-pulse" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
