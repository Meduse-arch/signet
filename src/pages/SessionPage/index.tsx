import { useEffect, useRef, useState, useCallback } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { useAuthStore } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { relayService } from '../../services/relay.service';
import { PlayerHUD } from '../../components/PlayerHUD';
import { RuneCanvas } from '../../components/RuneCanvas';
import {
  addSessionPlayer,
  clearSessionPlayers,
  getSessionPlayers,
  removeSessionPlayer,
} from '../../services/session.service';
import { 
  Users, 
  Shield, 
  Wifi, 
  WifiOff, 
  LogOut, 
  Loader2,
  Copy,
  CheckCircle2,
  Zap
} from 'lucide-react';

interface SessionPageProps {
  sessionId: string;
  onLeave: () => void;
}

type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'relay' | 'error' | 'disconnected';

export function SessionPage({ sessionId, onLeave }: SessionPageProps) {
  const { init, connect, broadcast, onData, destroy, connections, peerId } = usePeer();
  const [status, setStatus] = useState<ConnectionStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ peer_id: string; pseudo: string }[]>([]);
  const [copied, setCopied] = useState(false);
  
  const pendingJoinRef = useRef<{ peerId: string; pseudo: string } | null>(null);

  // ✅ Stabiliser les refs
  const currentUser = useAuthStore(state => state.user);
  const isMJ = (currentUser?.role === 'mj' || currentUser?.role === 'admin') && !sessionId.startsWith('SIGIL-');
  const isMJRef = useRef(isMJ);
  const sessionIdRef = useRef(sessionId);
  const broadcastRef = useRef(broadcast);
  const initRef = useRef(init);
  const connectRef = useRef(connect);
  const statusRef = useRef(status);

  useEffect(() => { isMJRef.current = isMJ; }, [isMJ]);
  useEffect(() => { broadcastRef.current = broadcast; }, [broadcast]);
  useEffect(() => { initRef.current = init; }, [init]);
  useEffect(() => { connectRef.current = connect; }, [connect]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // ✅ refreshPlayers stable
  const refreshPlayers = useCallback(async (relayId: string) => {
    try {
      const list = await getSessionPlayers(sessionIdRef.current);
      setPlayers(list);
      if (isMJRef.current) {
        const msg = { type: 'PLAYER_LIST', payload: list };
        broadcastRef.current(msg);
        // ✅ On envoie la liste sur le canal Relay correct (SIGIL-...)
        relayService.send(relayId, peerId || 'MJ', msg.type, msg.payload);
      }
    } catch (e) {
      console.error('Failed to refresh players:', e);
    }
  }, [peerId]);

  // LOGIQUE DE CONNEXION P2P + RELAY
  useEffect(() => {
    let mounted = true;

    const setupPeer = async () => {
      try {
        const currentSessions = useSessionStore.getState().sessions;
        const sessionData = currentSessions.find(s => s.id === sessionIdRef.current);
        
        // On détermine l'ID de secours (Relay) : Toujours le SIGIL-XXX-YYYY
        const relayId = isMJRef.current 
          ? sessionData?.hostPeerId 
          : (sessionIdRef.current.startsWith('SIGIL-') ? sessionIdRef.current : sessionData?.hostPeerId);

        if (!relayId) throw new Error("Impossible de déterminer l'identifiant de session");

        if (isMJRef.current) {
          if (mounted) setStatus('initializing');
          const myId = await initRef.current(true, relayId);
          if (!mounted) return;

          relayService.subscribe(relayId, myId);

          await clearSessionPlayers(sessionIdRef.current);
          await addSessionPlayer(sessionIdRef.current, myId, currentUser?.pseudo || 'MJ');
          await refreshPlayers(relayId);
          
          if (mounted) setStatus('connected');
        } else {
          if (mounted) setStatus('initializing');
          const myId = await initRef.current(false);
          if (!mounted) return;

          relayService.subscribe(relayId, myId);

          if (mounted) setStatus('connecting');
          
          try {
            await connectRef.current(relayId);
            if (!mounted) return;
          } catch (e) {
            console.warn('[SessionPage] P2P Échoué, basculement en mode RELAY...');
            if (mounted) setStatus('relay');
            relayService.send(relayId, myId, 'PLAYER_JOIN', {
              peerId: myId,
              pseudo: currentUser?.pseudo || 'Joueur'
            });
            return;
          }

          pendingJoinRef.current = {
            peerId: myId,
            pseudo: currentUser?.pseudo || 'Joueur',
          };
        }
      } catch (e: any) {
        if (mounted) {
          setStatus('error');
          setErrorMessage(e.message || 'Une erreur inconnue est survenue');
        }
      }
    };

    setupPeer();
    return () => { 
      mounted = false; 
      relayService.unsubscribe();
    };
  }, [sessionId, isMJ, currentUser?.pseudo, refreshPlayers]);

  // ÉCOUTEUR DE MESSAGES (P2P + RELAY)
  useEffect(() => {
    const handleMessage = async (data: { type: string, payload: any }) => {
      if (data.type === 'CONN_READY') {
        if (!isMJRef.current && pendingJoinRef.current) {
          broadcastRef.current({
            type: 'PLAYER_JOIN',
            payload: pendingJoinRef.current,
          });
          pendingJoinRef.current = null;
          setStatus('connected');
        }
        return;
      }

      if (data.type === 'PLAYER_JOIN' && isMJRef.current) {
        await addSessionPlayer(sessionIdRef.current, data.payload.peerId, data.payload.pseudo);
        
        // Récupérer le relayId pour refreshPlayers
        const currentSessions = useSessionStore.getState().sessions;
        const sessionData = currentSessions.find(s => s.id === sessionIdRef.current);
        if (sessionData?.hostPeerId) {
          await refreshPlayers(sessionData.hostPeerId);
        }
      } else if (data.type === 'PLAYER_LIST') {
        setPlayers(data.payload);
        // ✅ Si on reçoit la liste, c'est qu'on est au moins en mode RELAY
        if (statusRef.current === 'connecting' || statusRef.current === 'initializing' || statusRef.current === 'relay') {
          setStatus(connections.length > 0 ? 'connected' : 'relay');
        }
      } else if (data.type === 'PLAYER_LEAVE') {
        if (isMJRef.current) {
          await removeSessionPlayer(sessionIdRef.current, data.payload.peerId);
          
          const currentSessions = useSessionStore.getState().sessions;
          const sessionData = currentSessions.find(s => s.id === sessionIdRef.current);
          if (sessionData?.hostPeerId) {
            await refreshPlayers(sessionData.hostPeerId);
          }
        } else {
          const sessionData = useSessionStore.getState().sessions.find(s => s.id === sessionIdRef.current);
          const hostId = sessionIdRef.current.startsWith('SIGIL-') ? sessionIdRef.current : sessionData?.hostPeerId;
          if (data.payload.peerId === hostId) setStatus('disconnected');
        }
      }
    };

    const unsubData = onData(handleMessage);

    return () => { 
      unsubData(); 
    };
  }, [onData, connections.length, refreshPlayers]);

  // Nettoyage à la sortie
  useEffect(() => {
    return () => { 
      destroy(); 
    };
  }, [destroy]);

  const myPeerId = usePeer().peerId;

  const copyId = () => {
    const idToCopy = isMJ ? myPeerId : players.find(p => p.pseudo === 'MJ')?.peer_id;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0D0D0F] text-white font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/2 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-gold-DEFAULT/10">
            <Shield className="w-5 h-5 text-gold-DEFAULT" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gold-dim tracking-tight">Session Active</h1>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 
                status === 'relay' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' :
                status === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
              }`} />
              <span className="text-white/40 uppercase tracking-widest font-medium flex items-center gap-1.5">
                {status === 'initializing' ? 'Initialisation...' :
                 status === 'connecting' ? 'Connexion...' :
                 status === 'connected' ? 'En ligne' :
                 status === 'relay' ? (
                   <>
                     Mode Relay <Zap className="w-3 h-3 text-blue-400 fill-blue-400/20" />
                   </>
                 ) :
                 status === 'error' ? 'Erreur' : 'Déconnecté'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isMJ && (
            <button 
              onClick={copyId}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-medium transition-colors border border-white/5"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié !' : 'Copier ID'}
            </button>
          )}
          <button 
            onClick={onLeave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold transition-all border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Quitter
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar - Player List */}
        <aside className="w-72 border-r border-white/5 bg-black/20 flex flex-col z-10">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white/60">
              <Users className="w-4 h-4" />
              JOUEURS
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold text-white/40">
              {players.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {players.map((player) => (
              <div 
                key={player.peer_id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5 hover:bg-white/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-DEFAULT/20 to-gold-dark/20 flex items-center justify-center border border-gold-DEFAULT/20">
                    <span className="text-xs font-bold text-gold-DEFAULT">
                      {player.pseudo.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                      {player.pseudo}
                    </span>
                    <span className="text-[10px] text-white/30 font-mono tracking-tighter">
                      {player.peer_id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                {player.pseudo === 'MJ' && (
                  <Shield className="w-3.5 h-3.5 text-gold-DEFAULT/50" />
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Viewport / Game Area */}
        <section className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,_#1a1a1f_0%,_#0D0D0F_100%)]">
          {status === 'error' ? (
            <div className="absolute inset-0 flex items-center justify-center p-12 z-20 bg-[#0D0D0F]/80 backdrop-blur-sm">
              <div className="max-w-md w-full p-8 rounded-2xl bg-red-500/5 border border-red-500/20 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                  <WifiOff className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Échec de connexion</h2>
                <p className="text-white/60 text-sm mb-6 leading-relaxed">
                  {errorMessage || "Nous n'avons pas pu établir de connexion avec le serveur de signalement."}
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all border border-white/10"
                >
                  Réessayer
                </button>
              </div>
            </div>
          ) : (status !== 'connected' && status !== 'relay') ? (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#0D0D0F]">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-gold-DEFAULT animate-spin mx-auto mb-6 opacity-50" />
                <h2 className="text-xl font-bold text-gold-dim mb-2 uppercase tracking-widest">
                  Établissement du Sigil
                </h2>
                <p className="text-white/40 text-sm italic font-serif">
                  {status === 'initializing' ? "Invocation des protocoles de signalement..." : "Recherche de la porte de l'hôte..."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Le Canvas Pixi.js (Fond d'ambiance) */}
              <RuneCanvas />
              
              {/* HUD des Joueurs */}
              <PlayerHUD players={players} />

              {/* Overlay d'ambiance */}
              <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-[0.03]" />
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
            </>
          )}
          
          {/* Debug Info Overlay */}
          <div className="absolute bottom-6 right-6 p-4 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md text-[10px] font-mono text-white/30 space-y-1 z-10">
            <div className="flex justify-between gap-8">
              <span>CONNEXIONS ACTIVES:</span>
              <span className="text-gold-DEFAULT">{connections.length}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>PROTOCOLE:</span>
              <span className={status === 'relay' ? 'text-blue-400' : 'text-green-500'}>
                {status === 'relay' ? 'SUPABASE RELAY' : 'WEBRTC P2P'}
              </span>
            </div>
            <div className="flex justify-between gap-8">
              <span>ROLE:</span>
              <span className={isMJ ? 'text-gold-DEFAULT' : 'text-blue-400'}>{isMJ ? 'HOST/MJ' : 'PLAYER'}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}