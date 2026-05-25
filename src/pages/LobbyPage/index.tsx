import { useEffect, useRef, useState, useCallback } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { SecurityLevel, useAuthStore } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { usePeersStore } from '../../store/peers';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
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

  const getRoleLabel = (role?: number) => {
    const level = role ?? 0;
    if (level === SecurityLevel.ADMIN) return `ADMINISTRATEUR [${level}]`;
    if (level === SecurityLevel.MJ) return `MAÎTRE DE JEU [${level}]`;
    return `INITIÉ [${level}]`;
  };
  
  // ✅ État local pour les métadonnées (au cas où le joueur n'ait pas la session en DB)
  const [localMetadata, setLocalMetadata] = useState<{name?: string, imageUrl?: string, system?: string, hostPeerId?: string, settings?: any} | null>(null);

  // ✅ Stabiliser les refs pour les callbacks asynchrones
  const currentUser = useAuthStore(state => state.user);
  const isMJ = !!currentUser && currentUser.role >= SecurityLevel.MJ;
  const isHost = !sessionId.startsWith('SIGNET-');

  // ✅ Initialiser le store des personnages
  useEffect(() => {
    useCharactersStore.getState().initialize(sessionId);
  }, [sessionId]);

  // ✅ Récupérer les infos de la session
  const { sessions, addSession: addSessionToStore } = useSessionStore();
  const sessionDataFromStore = sessions.find(s => s.id === sessionId);
  
  // Priorité aux métadonnées reçues par P2P pour le joueur (données fraîches du MJ)
  const sessionData = isHost 
    ? sessionDataFromStore 
    : (localMetadata || sessionDataFromStore);
    
  const sessionImage = sessionData?.imageUrl;

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

  // ✅ refreshPlayers stable
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

  // ÉCOUTEUR DE MESSAGES (Doit être actif AVANT la connexion)
  useEffect(() => {
    const handleMessage = async (data: { type: string, payload: any }, fromPeerId: string) => {
      console.log(`[LobbyPage] Message reçu: ${data.type} de ${fromPeerId}`);
      
      // LOGIQUE DE SESSION (START / PAUSE)
      if (data.type === 'SESSION_START') {
        setIsGameStarted(true);
      } else if (data.type === 'SESSION_PAUSE') {
        setIsGameStarted(false);
      }
      
      // Pour le joueur : Confirme que la connexion P2P avec l'hôte est ouverte
      else if (data.type === 'CONN_READY' && !isHostRef.current) {
        if (statusRef.current === 'connected') return;

        // ✅ Utiliser peerId directement du hook s'il est dispo, sinon fallback sur le store
        const myActualId = peerId || usePeersStore.getState().peerId;
        const currentUser = useAuthStore.getState().user;
        
        const joinMsg = {
          type: 'PLAYER_JOIN',
          payload: {
            peer_id: myActualId,
            userId: currentUser?.id,
            pseudo: currentUser?.pseudo || 'Joueur',
            role: currentUser?.role || 0 // ✅ On envoie le niveau de sécurité
          }
        };
        console.log(`[LobbyPage] Envoi PLAYER_JOIN (ID: ${myActualId}, Role: ${currentUser?.role})`);
        broadcastRef.current(joinMsg);
        setStatus('connected');
        return;
      }

      // Pour le MJ : Gère les nouvelles arrivées
      if (data.type === 'PLAYER_JOIN' && isHostRef.current) {
        const newPeerId = data.payload.peer_id || fromPeerId;
        const pseudo = data.payload.pseudo;
        const userId = data.payload.userId;
        const role = data.payload.role;
        console.log(`[LobbyPage] Joueur rejoint: ${pseudo} (Role: ${role})`);

        // 1. Nettoyage préventif des doublons (ID ou Pseudo)
        const currentList = await getSessionPlayers(sessionIdRef.current);
        for (const p of currentList) {
          if (p.pseudo === pseudo || p.peer_id === newPeerId) {
            await removeSessionPlayer(sessionIdRef.current, p.peer_id);
          }
        }

        // 2. Ajout du nouveau joueur avec son rôle
        await addSessionPlayer(sessionIdRef.current, newPeerId, pseudo, role);
        
        // 3. Récupération et diffusion de la liste propre
        const updatedList = await getSessionPlayers(sessionIdRef.current);
        setPlayers(updatedList);
        broadcastRef.current({ type: 'PLAYER_LIST', payload: updatedList });

        // 4. Envoyer les infos de la session au nouveau joueur immédiatement
        let sessionMaps: any[] = [];
        if (window.electronAPI) {
            sessionMaps = await window.electronAPI.getMaps(sessionIdRef.current);
        }

        broadcastRef.current({
          type: 'SESSION_METADATA',
          payload: {
            name: sessionData?.name,
            system: sessionData?.system,
            imageUrl: sessionData?.imageUrl,
            hostPeerId: sessionData?.hostPeerId,
            settings: sessionData?.settings,
            isGameStarted: isGameStarted,
            maps: sessionMaps // ✅ On inclut la liste des maps
          }
        });

        // 5. Si la partie est lancée, on force le passage en mode jeu pour le nouveau
        if (isGameStarted) {
          broadcastRef.current({ type: 'SESSION_START', payload: {} });
        }

        // 6. Récupération auto du personnage et envoi DIRECT au nouveau joueur
        if (userId && window.electronAPI) {
          const sessionChars = await window.electronAPI.getCharacters(sessionIdRef.current);
          const ownedChar = sessionChars.find((c: any) => c.user_id === userId);
          if (ownedChar) {
            console.log(`[LobbyPage] Personnage trouvé pour ${pseudo} (${ownedChar.name}), envoi de la fiche...`);
            // On envoie DIRECTEMENT au nouveau peerId
            peerService.sendTo(newPeerId, { type: 'CHAR_UPDATE', payload: ownedChar });
            // Et on broadcast aussi pour que le HUD des autres soit à jour si besoin
            broadcastRef.current({ type: 'CHAR_UPDATE', payload: ownedChar });
          }
        }
      } 
      
      // Pour le JOUEUR : Reçoit les métadonnées et les stocke
      else if (data.type === 'SESSION_METADATA' && !isHostRef.current) {
        console.log(`[LobbyPage] Métadonnées reçues:`, data.payload);
        setLocalMetadata(data.payload);
        
        const savedSessions = JSON.parse(localStorage.getItem('summoned_sessions') || '[]');
        const existingIndex = savedSessions.findIndex((s: any) => s.hostPeerId === data.payload.hostPeerId);

        const updatedSession = {
          id: existingIndex >= 0 ? savedSessions[existingIndex].id : sessionId,
          ...data.payload,
          lastPlayed: Date.now(),
          isSummoned: true
        };

        if (existingIndex >= 0) {
          savedSessions[existingIndex] = updatedSession;
          localStorage.setItem('summoned_sessions', JSON.stringify(savedSessions));
        } else {
          localStorage.setItem('summoned_sessions', JSON.stringify([...savedSessions, updatedSession]));
        }

        // ✅ Mettre à jour le store global immédiatement pour que les composants (HUD) voient les réglages
        addSessionToStore(updatedSession);
      }

      // Pour tout le monde : Liste des joueurs
      else if (data.type === 'PLAYER_LIST') {
        console.log(`[LobbyPage] Mise à jour liste joueurs:`, data.payload);
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
      
      // Pour tout le monde : Mise à jour des personnages
      else if (data.type === 'CHAR_UPDATE') {
        console.log('[LobbyPage] Personnage reçu:', data.payload.name);
        useCharactersStore.getState().addOrUpdateCharacter(data.payload);
      }
      
      // Pour tout le monde : Déconnexions
      else if (data.type === 'PLAYER_LEAVE') {
        if (isMJRef.current) {
          console.log(`[LobbyPage] Nettoyage départ joueur: ${data.payload.peerId}`);
          await removeSessionPlayer(sessionIdRef.current, data.payload.peerId);
          await refreshPlayers();
        } else {
          const sessionData = useSessionStore.getState().sessions.find(s => s.id === sessionIdRef.current);
          const hostId = sessionIdRef.current.startsWith('SIGNET-') ? sessionIdRef.current : sessionData?.hostPeerId;
          
          if (data.payload.peerId === hostId) {
            console.log('[LobbyPage] L\'hôte a quitté, fermeture de la session');
            onLeave();
          }
        }
      }
    };

    const unsubData = onData(handleMessage);
    return () => { unsubData(); };
  }, [onData, refreshPlayers, players, sessionData]);

  // LOGIQUE DE CONNEXION P2P
  useEffect(() => {
    let mounted = true;

    const setupPeer = async () => {
      try {
        const sessionData = useSessionStore.getState().sessions.find(s => s.id === sessionIdRef.current);
        const hostPeerId = isHostRef.current 
          ? sessionData?.hostPeerId 
          : (sessionIdRef.current.startsWith('SIGNET-') ? sessionIdRef.current : sessionData?.hostPeerId);

        if (!hostPeerId) throw new Error("Impossible de déterminer l'identifiant de session");

        if (isHostRef.current) {
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
  }, [sessionId, isHost, currentUser?.pseudo, refreshPlayers]);

  // Nettoyage à la sortie
  useEffect(() => {
    const bc = broadcastRef.current;
    const host = isHostRef.current;
    return () => { 
      const currentPeerId = usePeersStore.getState().peerId;
      if (currentPeerId) {
        if (host) {
          console.log('[LobbyPage] Hôte quitte : envoi SESSION_CLOSED');
          bc({ type: 'SESSION_CLOSED', payload: {} });
        } else {
          bc({ 
            type: 'PLAYER_LEAVE', 
            payload: { peerId: currentPeerId } 
          });
        }
      }
      destroy(); 
    };
  }, [destroy]);

  const handleLaunchSession = () => {
    setIsGameStarted(true);
    broadcast({ type: 'SESSION_START', payload: {} });
  };

  const handlePauseSession = () => {
    setIsGameStarted(false);
    broadcast({ type: 'SESSION_PAUSE', payload: {} });
  };

  const copyId = () => {
    const idToCopy = isHost ? peerId : players.find(p => p.pseudo === 'MJ')?.peer_id;
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
          onPause={handlePauseSession}
          sessionId={sessionId}
          imageUrl={sessionImage}
          players={players}
        />
      </div>
    );
  }

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
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-gold-DEFAULT/30 bg-[#0D0D0F]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-xl group-hover:bg-gold-DEFAULT/40 transition-all rounded-full" />
            <div className="relative p-2 rounded-full border border-gold-DEFAULT/30 bg-[#0D0D0F]/80">
              <img src={logo} alt="Logo" className="w-6 h-6 object-contain animate-rune-pulse" />
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
              <span className="text-gold-DEFAULT drop-shadow-md uppercase tracking-[0.15em] font-bold">
                {status === 'initializing' ? 'Invocation...' :
                 status === 'connecting' ? 'Liaison...' :
                 status === 'connected' ? 'Signet Actif (P2P)' :
                 status === 'relay' ? 'Relais Supabase' :
                 status === 'error' ? 'Échec' : 'Lien Rompu'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isHost && (
            <button 
              onClick={copyId}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-DEFAULT/5 hover:bg-gold-DEFAULT/10 text-[10px] font-cinzel font-bold text-gold-bright transition-all border border-gold-DEFAULT/40 hover:border-gold-DEFAULT/50"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'CLEF COPIÉE' : 'PARTAGER LE SIGNET'}
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
            <div className="max-w-md w-full p-10 rounded-3xl bg-[#0D0D0F]/80 border border-red-500/20 text-center backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <WifiOff className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-widest uppercase">Lien Brisé</h2>
              <p className="text-white/80 text-sm mb-8 font-serif italic leading-relaxed">{errorMessage}</p>
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
                <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-3xl animate-pulse rounded-full" />
                <Loader2 className="w-16 h-16 text-gold-bright animate-spin mx-auto relative z-10 opacity-60" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gold-bright mb-3 uppercase tracking-[0.4em] text-glow-gold">
                  Établissement du Signet
                </h2>
                <p className="text-white/70 text-sm italic font-serif tracking-widest animate-pulse">
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
                  <p className="text-gold-DEFAULT drop-shadow-md/60 text-lg font-serif italic leading-relaxed">
                    Le grimoire est ouvert, les destins s'entrelacent dans l'obscurité.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-[#0D0D0F]/80 border border-gold-border hover:border-gold-DEFAULT/30 transition-colors group">
                    <span className="block text-[10px] text-gold-muted uppercase font-black tracking-widest mb-2">Système</span>
                    <span className="text-md text-gold-bright font-cinzel group-hover:text-white transition-colors">
                      {sessionData?.system || 'Seal'}
                    </span>
                  </div>
                  <div className="p-5 rounded-2xl bg-[#0D0D0F]/80 border border-gold-border hover:border-gold-DEFAULT/30 transition-colors group">
                    <span className="block text-[10px] text-gold-muted uppercase font-black tracking-widest mb-2">Assemblage</span>
                    <span className="text-md text-gold-bright font-cinzel group-hover:text-white transition-colors italic">
                      {players.length} {players.length > 1 ? 'Inities' : 'Initie'}
                    </span>
                  </div>
                </div>

                {isHost ? (
                  <button
                    onClick={handleLaunchSession}
                    className="w-full p-6 rounded-3xl bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/40 flex items-center justify-center gap-5 relative overflow-hidden group shadow-[0_4px_30px_rgba(212,175,55,0.15)] hover:border-gold-DEFAULT/80 hover:shadow-[0_4px_50px_rgba(212,175,55,0.4)] transition-all active:scale-95"
                  >
                    <div className="absolute inset-0 bg-gold-DEFAULT/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-rune-glow opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <Play className="w-8 h-8 fill-gold-DEFAULT group-hover:fill-gold-bright transition-colors relative z-10 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                    <div className="relative z-10 text-left">
                      <span className="block text-sm font-black text-gold-DEFAULT group-hover:text-gold-bright uppercase tracking-widest leading-none drop-shadow-md transition-colors">Lancer Session</span>
                      <span className="text-[10px] font-serif italic text-gold-dim group-hover:text-gold-bright/80 transition-colors">Ouvrir les portes de l'Archive</span>
                    </div>
                  </button>
                ) : (                  <div className="p-6 rounded-3xl bg-gold-DEFAULT/5 border border-gold-DEFAULT/40 flex items-center gap-5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-rune-glow opacity-30 group-hover:opacity-60 transition-opacity" />
                    <Zap className="w-8 h-8 text-gold-bright animate-rune-pulse relative z-10" />
                    <div className="relative z-10">
                      <span className="block text-sm font-black text-white uppercase tracking-widest">Le MJ prépare le Rituel</span>
                      <span className="text-xs text-gold-DEFAULT drop-shadow-md italic font-serif">L'aventure commencera dès que l'hôte l'ordonnera.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Player List */}
              <div className="relative group">
                <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-gold-DEFAULT/30 rounded-tl-3xl group-hover:scale-110 transition-transform" />
                <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-gold-DEFAULT/30 rounded-br-3xl group-hover:scale-110 transition-transform" />
                
                <div className="bg-[#0D0D0F]/80 backdrop-blur-2xl rounded-[2.5rem] border border-gold-border/20 p-6 shadow-2xl relative overflow-hidden h-[220px] flex flex-col">
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
                          className="snap-start flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-gold-DEFAULT/[0.05] hover:border-gold-DEFAULT/30 transition-all group h-[50px]"
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
                                {player.peer_id === peerId ? `VOTRE SIGNET (${getRoleLabel(player.role)})` : getRoleLabel(player.role)}
                              </span>
                            </div>
                          </div>
                          {player.pseudo === 'MJ' && (
                            <div className="p-1 rounded-lg bg-gold-DEFAULT/5 border border-gold-DEFAULT/30">
                              <img src={logo} alt="MJ" className="w-4 h-4 object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
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
        <div className="absolute bottom-6 right-8 p-5 rounded-2xl bg-[#0D0D0F]/80 border border-gold-border backdrop-blur-xl text-[9px] font-cinzel font-bold text-gold-DEFAULT drop-shadow-md space-y-2 z-10 group hover:border-gold-DEFAULT/40 transition-colors shadow-2xl opacity-40 hover:opacity-100">
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
