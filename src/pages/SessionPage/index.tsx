import { useEffect, useRef, useState, useCallback } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { useAuthStore } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { relayService } from '../../services/relay.service';
import { usePeersStore } from '../../store/peers';
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
  const { init, broadcast, onData, destroy, connections, peerId } = usePeer();
  const [status, setStatus] = useState<ConnectionStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ peer_id: string; pseudo: string }[]>([]);
  const [copied, setCopied] = useState(false);
  
  const pendingJoinRef = useRef<{ peerId: string; pseudo: string } | null>(null);

  // ✅ Récupérer les infos de la session pour l'image de fond
  const currentSessions = useSessionStore(state => state.sessions);
  const sessionData = currentSessions.find(s => s.id === sessionId);
  const sessionImage = sessionData?.imageUrl;

  // ✅ Stabiliser les refs pour les callbacks asynchrones
  const currentUser = useAuthStore(state => state.user);
  const isMJ = (currentUser?.role === 'mj' || currentUser?.role === 'admin') && !sessionId.startsWith('SIGIL-');
  const isMJRef = useRef(isMJ);
  const sessionIdRef = useRef(sessionId);
  const broadcastRef = useRef(broadcast);
  const initRef = useRef(init);
  const statusRef = useRef(status);

  useEffect(() => { isMJRef.current = isMJ; }, [isMJ]);
  useEffect(() => { broadcastRef.current = broadcast; }, [broadcast]);
  useEffect(() => { initRef.current = init; }, [init]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // ✅ refreshPlayers stable
  const refreshPlayers = useCallback(async () => {
    try {
      const list = await getSessionPlayers(sessionIdRef.current);
      setPlayers(list);
      if (isMJRef.current) {
        broadcastRef.current({ type: 'PLAYER_LIST', payload: list });
      }
    } catch (e) {
      console.error('Failed to refresh players:', e);
    }
  }, []);

  // ÉCOUTEUR DE MESSAGES (Doit être actif AVANT la connexion)
  useEffect(() => {
    const handleMessage = async (data: { type: string, payload: any }, fromPeerId: string) => {
      console.log(`[SessionPage] Message reçu: ${data.type} de ${fromPeerId}`);
      
      // Pour le joueur : Confirme que la connexion P2P avec l'hôte est ouverte
      if (data.type === 'CONN_READY' && !isMJRef.current) {
        const myActualId = usePeersStore.getState().peerId;
        const joinMsg = {
          type: 'PLAYER_JOIN',
          payload: {
            peerId: myActualId,
            pseudo: useAuthStore.getState().user?.pseudo || 'Joueur'
          }
        };
        console.log(`[SessionPage] Envoi PLAYER_JOIN suite à CONN_READY (ID: ${myActualId})`);
        broadcastRef.current(joinMsg);
        setStatus('connected');
        return;
      }

      // Pour le MJ : Gère les nouvelles arrivées
      if (data.type === 'PLAYER_JOIN' && isMJRef.current) {
        console.log(`[SessionPage] Joueur rejoint: ${data.payload.pseudo} (${data.payload.peerId})`);
        const existingPlayer = players.find(p => p.pseudo === data.payload.pseudo);
        if (existingPlayer && existingPlayer.peer_id !== data.payload.peerId) {
          await removeSessionPlayer(sessionIdRef.current, existingPlayer.peer_id);
        }

        await addSessionPlayer(sessionIdRef.current, data.payload.peerId, data.payload.pseudo);
        await refreshPlayers();
      } 
      
      // Pour tout le monde : Liste des joueurs
      else if (data.type === 'PLAYER_LIST') {
        setPlayers(data.payload);
        if (statusRef.current !== 'connected' && statusRef.current !== 'error') {
          setStatus('connected');
        }
      } 
      
      // Pour tout le monde : Déconnexions
      else if (data.type === 'PLAYER_LEAVE') {
        if (isMJRef.current) {
          await removeSessionPlayer(sessionIdRef.current, data.payload.peerId);
          await refreshPlayers();
        } else {
          const sessionData = useSessionStore.getState().sessions.find(s => s.id === sessionIdRef.current);
          const hostId = sessionIdRef.current.startsWith('SIGIL-') ? sessionIdRef.current : sessionData?.hostPeerId;
          if (data.payload.peerId === hostId) setStatus('disconnected');
        }
      }
    };

    const unsubData = onData(handleMessage);
    return () => { unsubData(); };
  }, [onData, refreshPlayers, players]);

  // LOGIQUE DE CONNEXION P2P
  useEffect(() => {
    let mounted = true;

    const setupPeer = async () => {
      try {
        const sessionData = useSessionStore.getState().sessions.find(s => s.id === sessionIdRef.current);
        const hostPeerId = isMJRef.current 
          ? sessionData?.hostPeerId 
          : (sessionIdRef.current.startsWith('SIGIL-') ? sessionIdRef.current : sessionData?.hostPeerId);

        if (!hostPeerId) throw new Error("Impossible de déterminer l'identifiant de session");

        if (isMJRef.current) {
          if (mounted) setStatus('initializing');
          const myId = await initRef.current(true, hostPeerId);
          if (!mounted) return;

          await clearSessionPlayers(sessionIdRef.current);
          await addSessionPlayer(sessionIdRef.current, myId, currentUser?.pseudo || 'MJ');
          await refreshPlayers();
          
          if (mounted) setStatus('connected');
        } else {
          if (mounted) setStatus('initializing');
          await initRef.current(false, hostPeerId);
          if (!mounted) return;
          // Le reste de la logique (Join) est déclenché par CONN_READY dans l'écouteur de messages
        }
      } catch (e: any) {
        if (mounted) {
          setStatus('error');
          setErrorMessage(e.message || 'Une erreur inconnue est survenue');
        }
      }
    };

    setupPeer();
    return () => { mounted = false; };
  }, [sessionId, isMJ, currentUser?.pseudo, refreshPlayers]);

  // Nettoyage à la sortie
  useEffect(() => {
    return () => { 
      const currentPeerId = usePeersStore.getState().peerId;
      if (currentPeerId) {
        broadcastRef.current({ 
          type: 'PLAYER_LEAVE', 
          payload: { peerId: currentPeerId } 
        });
      }
      destroy(); 
    };
  }, [destroy]);

  const currentPeerId = usePeer().peerId;

  const copyId = () => {
    const idToCopy = isMJ ? currentPeerId : players.find(p => p.pseudo === 'MJ')?.peer_id;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0D0D0F] text-white font-sans overflow-hidden relative">
      {/* BACKGROUND IMAGE / WAITING ROOM STYLE */}
      <div className="absolute inset-0 z-0">
        {sessionImage ? (
          <>
            <img 
              src={sessionImage} 
              alt="Session Background" 
              className="w-full h-full object-cover opacity-20 blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0F]/80 via-[#0D0D0F]/40 to-[#0D0D0F]" />
          </>
        ) : (
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_#1a1a1f_0%,_#0D0D0F_100%)]" />
        )}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-[0.03] pointer-events-none" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-gold-DEFAULT/10">
            <Shield className="w-5 h-5 text-gold-DEFAULT" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gold-dim tracking-tight">
              {sessionData?.name || 'Salle d\'attente'}
            </h1>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 
                status === 'relay' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' :
                status === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
              }`} />
              <span className="text-white/40 uppercase tracking-widest font-medium flex items-center gap-1.5">
                {status === 'initializing' ? 'Initialisation...' :
                 status === 'connecting' ? 'Connexion...' :
                 status === 'connected' ? 'En ligne (P2P)' :
                 status === 'relay' ? 'En ligne (Relay)' :
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
      <main className="relative z-10 flex-1 flex overflow-hidden">
        {/* Waiting Room Body */}
        <section className="flex-1 flex flex-col items-center justify-center p-8">
          {status === 'error' ? (
            <div className="max-w-md w-full p-8 rounded-2xl bg-red-500/5 border border-red-500/20 text-center backdrop-blur-md">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                <WifiOff className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Échec de connexion</h2>
              <p className="text-white/60 text-sm mb-6 leading-relaxed">{errorMessage}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all border border-white/10">Réessayer</button>
            </div>
          ) : (status !== 'connected' && status !== 'relay') ? (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-gold-DEFAULT animate-spin mx-auto mb-6 opacity-50" />
              <h2 className="text-xl font-bold text-gold-dim mb-2 uppercase tracking-widest">Établissement du Sigil</h2>
              <p className="text-white/40 text-sm italic font-serif">
                {status === 'initializing' ? "Invocation des protocoles de signalement..." : "Recherche de la porte de l'hôte..."}
              </p>
            </div>
          ) : (
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Left Side: Session Info */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-gold-DEFAULT text-xs font-bold tracking-[0.2em] uppercase">Session Active</span>
                  <h2 className="text-4xl font-bold text-white">{sessionData?.name}</h2>
                  <p className="text-white/40 text-sm font-serif italic">Préparez-vous à l'aventure...</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <span className="block text-[10px] text-white/30 uppercase font-bold mb-1">Système</span>
                    <span className="text-sm text-gold-dim font-medium">{sessionData?.system || 'Classique'}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <span className="block text-[10px] text-white/30 uppercase font-bold mb-1">Membres</span>
                    <span className="text-sm text-gold-dim font-medium">{players.length} connectés</span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gold-DEFAULT/5 border border-gold-DEFAULT/10 flex items-center gap-4">
                  <Zap className="w-6 h-6 text-gold-DEFAULT" />
                  <div>
                    <span className="block text-sm font-bold text-white">Le MJ attend les joueurs</span>
                    <span className="text-xs text-white/40">Le lancement de la partie est imminent.</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Player List */}
              <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6 px-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white/60">
                    <Users className="w-4 h-4" />
                    GROUPE
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold text-white/40">
                    {players.length} / 6
                  </span>
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {players.map((player) => (
                    <div 
                      key={player.peer_id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5 hover:bg-white/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-DEFAULT/20 to-gold-dark/20 flex items-center justify-center border border-gold-DEFAULT/20">
                          <span className="text-sm font-bold text-gold-DEFAULT">
                            {player.pseudo.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                            {player.pseudo}
                          </span>
                          <span className="text-[10px] text-white/30 font-mono">
                            {player.peer_id === currentPeerId ? 'C\'est vous' : 'Connecté'}
                          </span>
                        </div>
                      </div>
                      {player.pseudo === 'MJ' && (
                        <Shield className="w-4 h-4 text-gold-DEFAULT/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Debug Info Overlay */}
        <div className="absolute bottom-6 right-6 p-4 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md text-[10px] font-mono text-white/30 space-y-1 z-10">
          <div className="flex justify-between gap-8">
            <span>CONNEXIONS:</span>
            <span className="text-gold-DEFAULT">{connections.length}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span>PROTOCOLE:</span>
            <span className={status === 'relay' ? 'text-blue-400' : 'text-green-500'}>
              {status === 'relay' ? 'SUPABASE RELAY' : 'WEBRTC P2P'}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}