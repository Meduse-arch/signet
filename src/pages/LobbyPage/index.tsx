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

interface LobbyPageProps {
  sessionId: string;
  onLeave: () => void;
}

type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'relay' | 'error' | 'disconnected';

export function LobbyPage({ sessionId, onLeave }: LobbyPageProps) {
  const { init, broadcast, onData, destroy, connections, peerId } = usePeer();
  const [status, setStatus] = useState<ConnectionStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ peer_id: string; pseudo: string }[]>([]);
  const [copied, setCopied] = useState(false);
  
  // ✅ État local pour les métadonnées (au cas où le joueur n'ait pas la session en DB)
  const [localMetadata, setLocalMetadata] = useState<{name?: string, imageUrl?: string, system?: string} | null>(null);

  const pendingJoinRef = useRef<{ peerId: string; pseudo: string } | null>(null);

  // ✅ Récupérer les infos de la session
  const currentSessions = useSessionStore(state => state.sessions);
  const sessionDataFromStore = currentSessions.find(s => s.id === sessionId);
  
  // Priorité aux métadonnées reçues par P2P pour le joueur
  const sessionData = sessionDataFromStore || localMetadata;
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
      console.log(`[LobbyPage] Message reçu: ${data.type} de ${fromPeerId}`);
      
      // Pour le joueur : Confirme que la connexion P2P avec l'hôte est ouverte
      if (data.type === 'CONN_READY' && !isMJRef.current) {
        // ✅ Protection contre les signaux multiples
        if (statusRef.current === 'connected') return;

        const myActualId = usePeersStore.getState().peerId;
        const joinMsg = {
          type: 'PLAYER_JOIN',
          payload: {
            peerId: myActualId,
            pseudo: useAuthStore.getState().user?.pseudo || 'Joueur'
          }
        };
        console.log(`[LobbyPage] Envoi PLAYER_JOIN suite à CONN_READY (ID: ${myActualId})`);
        broadcastRef.current(joinMsg);
        setStatus('connected');
        return;
      }

      // Pour le MJ : Gère les nouvelles arrivées
      if (data.type === 'PLAYER_JOIN' && isMJRef.current) {
        console.log(`[LobbyPage] Joueur rejoint: ${data.payload.pseudo} (${data.payload.peer_id})`);

        // Envoyer les infos de la session au nouveau joueur immédiatement
        broadcastRef.current({
          type: 'SESSION_METADATA',
          payload: {
            name: sessionData?.name,
            system: sessionData?.system,
            imageUrl: sessionData?.imageUrl,
            hostPeerId: sessionData?.hostPeerId
          }
        });

        const currentList = await getSessionPlayers(sessionIdRef.current);
        const existingWithSamePseudo = currentList.filter(p => p.pseudo === data.payload.pseudo);

        for (const p of existingWithSamePseudo) {
          if (p.peer_id !== data.payload.peer_id) {
            await removeSessionPlayer(sessionIdRef.current, p.peer_id);
          }
        }

        await addSessionPlayer(sessionIdRef.current, data.payload.peer_id, data.payload.pseudo);
        await refreshPlayers();
      } 

      // Pour le JOUEUR : Reçoit les métadonnées et les stocke
      else if (data.type === 'SESSION_METADATA' && !isMJRef.current) {
        const metadata = data.payload;
        
        // Mise à jour de l'affichage immédiat
        setLocalMetadata(metadata);

        // Sauvegarde locale pour le joueur (persistance)
        const savedSessions = JSON.parse(localStorage.getItem('summoned_sessions') || '[]');
        const exists = savedSessions.find((s: any) => s.hostPeerId === metadata.hostPeerId);

        if (!exists) {
          const newSession = {
            id: `summoned-${metadata.hostPeerId}`,
            ...metadata,
            lastPlayed: Date.now(),
            isSummoned: true
          };
          localStorage.setItem('summoned_sessions', JSON.stringify([...savedSessions, newSession]));
        }
      }
      // Pour tout le monde : Liste des joueurs
      else if (data.type === 'PLAYER_LIST') {
        setPlayers(data.payload);
        if (statusRef.current !== 'connected' && statusRef.current !== 'error') {
          setStatus('connected');
        }
      } 
      
      // Pour tout le monde : Fermeture de session par l'hôte
      else if (data.type === 'SESSION_CLOSED') {
        console.log('[LobbyPage] Session fermée par l\'hôte');
        onLeave();
      }
      
      // Pour tout le monde : Déconnexions
      else if (data.type === 'PLAYER_LEAVE') {
        if (isMJRef.current) {
          await removeSessionPlayer(sessionIdRef.current, data.payload.peerId);
          await refreshPlayers();
        } else {
          const sessionData = useSessionStore.getState().sessions.find(s => s.id === sessionIdRef.current);
          const hostId = sessionIdRef.current.startsWith('SIGIL-') ? sessionIdRef.current : sessionData?.hostPeerId;
          
          if (data.payload.peerId === hostId) {
            console.log('[LobbyPage] L\'hôte a quitté, fermeture de la session');
            onLeave();
          }
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
        if (isMJRef.current) {
          console.log('[LobbyPage] Hôte quitte : envoi SESSION_CLOSED');
          broadcastRef.current({ type: 'SESSION_CLOSED', payload: {} });
        } else {
          broadcastRef.current({ 
            type: 'PLAYER_LEAVE', 
            payload: { peerId: currentPeerId } 
          });
        }
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
      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0 z-0">
        {sessionImage ? (
          <>
            <img 
              src={sessionImage} 
              alt="Session Background" 
              className="w-full h-full object-cover opacity-30 grayscale-[0.2]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0F]/90 via-transparent to-[#0D0D0F]" />
          </>
        ) : (
          <div className="w-full h-full bg-[radial-gradient(circle_at_center,_#1a1a1f_0%,_#0D0D0F_100%)]" />
        )}
        <div className="absolute inset-0 bg-grimoire-texture opacity-[0.04] pointer-events-none" />
        <div className="absolute inset-0 bg-vignette pointer-events-none" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-gold-DEFAULT/10 bg-black/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-xl group-hover:bg-gold-DEFAULT/40 transition-all rounded-full" />
            <div className="relative p-2.5 rounded-full border border-gold-DEFAULT/30 bg-black/40">
              <Shield className="w-5 h-5 text-gold-bright animate-rune-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-gold-bright tracking-[0.2em] mb-0.5">
              {sessionData?.name || 'Salle d\'attente'}
            </h1>
            <div className="flex items-center gap-3 text-[10px] font-cinzel">
              <span className={`w-1.5 h-1.5 rounded-full ${
                status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 
                status === 'relay' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' :
                status === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
              }`} />
              <span className="text-gold-dim uppercase tracking-[0.15em] font-bold">
                {status === 'initializing' ? 'Invocation...' :
                 status === 'connecting' ? 'Liaison...' :
                 status === 'connected' ? 'Sigil Actif (P2P)' :
                 status === 'relay' ? 'Relais Supabase' :
                 status === 'error' ? 'Échec' : 'Lien Rompu'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isMJ && (
            <button 
              onClick={copyId}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-DEFAULT/5 hover:bg-gold-DEFAULT/10 text-[10px] font-cinzel font-bold text-gold-bright transition-all border border-gold-DEFAULT/20 hover:border-gold-DEFAULT/50"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'CLEF COPIÉE' : 'PARTAGER LE SIGIL'}
            </button>
          )}
          <button 
            onClick={onLeave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/20 text-red-500 text-[10px] font-cinzel font-bold transition-all border border-red-500/20 hover:border-red-500/40"
          >
            <LogOut className="w-4 h-4" />
            QUITTER
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex overflow-hidden">
        <section className="flex-1 flex flex-col items-center justify-center p-8">
          {status === 'error' ? (
            <div className="max-w-md w-full p-10 rounded-3xl bg-black/60 border border-red-500/20 text-center backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <WifiOff className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-widest uppercase">Lien Brisé</h2>
              <p className="text-white/50 text-sm mb-8 font-serif italic leading-relaxed">{errorMessage}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-cinzel font-bold transition-all border border-white/10"
              >
                TENTER UNE RÉ-INVOCATION
              </button>
            </div>
          ) : (status !== 'connected' && status !== 'relay') ? (
            <div className="text-center space-y-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-3xl animate-pulse" />
                <Loader2 className="w-16 h-16 text-gold-bright animate-spin mx-auto relative z-10 opacity-60" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gold-bright mb-3 uppercase tracking-[0.4em] text-glow-gold">
                  Établissement du Sigil
                </h2>
                <p className="text-white/40 text-sm italic font-serif tracking-widest animate-pulse">
                  {status === 'initializing' ? "Éveil des protocoles de signalement..." : "Recherche de la porte de l'hôte..."}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              {/* Left Side: Session Info */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-muted/30" />
                    <span className="text-gold-bright text-[10px] font-cinzel font-black tracking-[0.3em] uppercase">Chroniques Actives</span>
                    <div className="h-px w-8 bg-gold-muted/30" />
                  </div>
                  <h2 className="text-5xl font-black text-white tracking-tight leading-none">
                    {sessionData?.name}
                  </h2>
                  <p className="text-gold-dim/60 text-lg font-serif italic leading-relaxed">
                    Le grimoire est ouvert, les destins s'entrelacent dans l'obscurité.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-black/40 border border-gold-border hover:border-gold-DEFAULT/30 transition-colors group">
                    <span className="block text-[10px] text-gold-muted uppercase font-black tracking-widest mb-2">Système</span>
                    <span className="text-md text-gold-bright font-cinzel group-hover:text-white transition-colors">
                      {sessionData?.system || 'Arcane Classique'}
                    </span>
                  </div>
                  <div className="p-5 rounded-2xl bg-black/40 border border-gold-border hover:border-gold-DEFAULT/30 transition-colors group">
                    <span className="block text-[10px] text-gold-muted uppercase font-black tracking-widest mb-2">Assemblage</span>
                    <span className="text-md text-gold-bright font-cinzel group-hover:text-white transition-colors italic">
                      {players.length} {players.length > 1 ? 'Inities' : 'Initie'}
                    </span>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 flex items-center gap-5 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-rune-glow opacity-30 group-hover:opacity-60 transition-opacity" />
                  <Zap className="w-8 h-8 text-gold-bright animate-rune-pulse relative z-10" />
                  <div className="relative z-10">
                    <span className="block text-sm font-black text-white uppercase tracking-widest">Le MJ prépare le Rituel</span>
                    <span className="text-xs text-gold-dim italic font-serif">L'aventure commencera dès que l'hôte l'ordonnera.</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Player List */}
              <div className="relative group">
                <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-gold-DEFAULT/30 rounded-tl-3xl group-hover:scale-110 transition-transform" />
                <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-gold-DEFAULT/30 rounded-br-3xl group-hover:scale-110 transition-transform" />
                
                <div className="bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-gold-border/20 p-6 shadow-2xl relative overflow-hidden h-[220px] flex flex-col">
                  <div className="absolute inset-0 bg-grimoire-texture opacity-[0.02] pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-4 px-2 relative z-10">
                    <h3 className="flex items-center gap-2 text-[9px] font-black text-gold-muted tracking-[0.3em] uppercase">
                      <Users className="w-3 h-3" />
                      Cercle d'Initiés
                    </h3>
                    <div className="text-[9px] font-black text-gold-bright tracking-widest">
                      {players.length} CONNECTÉ{players.length > 1 ? 'S' : ''}
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-1 snap-y snap-mandatory scrollbar-none relative z-10 mask-fade-edge">
                    <div className="space-y-2">
                      {players.map((player) => (
                        <div 
                          key={player.peer_id}
                          className="snap-start flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-gold-DEFAULT/[0.05] hover:border-gold-DEFAULT/10 transition-all group h-[50px]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-dim/20 to-black flex items-center justify-center border border-white/10 relative z-10">
                                <span className="text-sm font-black text-gold-muted group-hover:text-gold-bright font-cinzel transition-colors">
                                  {player.pseudo.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors font-cinzel tracking-wider">
                                {player.pseudo}
                              </span>
                              <span className="text-[7px] text-gold-muted/40 font-mono tracking-tighter uppercase">
                                {player.peer_id === currentPeerId ? 'VOTRE SIGIL' : 'ÂME LIÉE'}
                              </span>
                            </div>
                          </div>
                          {player.pseudo === 'MJ' && (
                            <div className="p-1.5 rounded-lg bg-gold-DEFAULT/5 border border-gold-DEFAULT/10">
                              <Shield className="w-3 h-3 text-gold-dim group-hover:text-gold-bright transition-colors" />
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Placeholder pour garder l'aspect 2 slots si un seul joueur */}
                      {players.length === 1 && (
                        <div className="flex items-center justify-center p-3 rounded-xl border border-dashed border-white/5 h-[50px] opacity-20">
                          <span className="text-[8px] font-cinzel tracking-[0.2em] text-gold-muted">En attente d'initié...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Debug Info Overlay */}
        <div className="absolute bottom-6 right-8 p-5 rounded-2xl bg-black/60 border border-gold-border backdrop-blur-xl text-[9px] font-cinzel font-bold text-gold-dim space-y-2 z-10 group hover:border-gold-DEFAULT/40 transition-colors shadow-2xl opacity-40 hover:opacity-100">
          <div className="flex justify-between gap-12 border-b border-gold-DEFAULT/5 pb-2">
            <span className="tracking-widest">LIAISONS ACTIVES</span>
            <span className="text-gold-bright">{connections.length}</span>
          </div>
          <div className="flex justify-between gap-12">
            <span className="tracking-widest">PROTOCOLE ARCANE</span>
            <span className={status === 'relay' ? 'text-blue-400' : 'text-green-500'}>
              {status === 'relay' ? 'RELAIS SUPABASE' : 'FLUX P2P'}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}