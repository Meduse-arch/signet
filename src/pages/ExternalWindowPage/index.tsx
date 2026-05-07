import { useEffect, useState } from 'react';
import { SceneWindowContent } from '../../components/SignetInterface';
import { PlayerHUD } from '../../components/PlayerHUD';
import { usePeer } from '../../hooks/usePeer';
import { usePeersStore } from '../../store/peers';
import { useSessionStore } from '../../store/session';
import { getSessionPlayers } from '../../services/session.service';
import { MapItem } from '../../components/BoardCanvas';

interface ExternalWindowPageProps {
  type: string;
  sessionId: string;
}

export function ExternalWindowPage({ type, sessionId }: ExternalWindowPageProps) {
  const { onData, broadcast, init } = usePeer();
  const { isHost } = usePeersStore();
  const [players, setPlayers] = useState<{ peer_id: string; pseudo: string }[]>([]);
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string>('');

  // Initialisation P2P pour rester synchronisé
  useEffect(() => {
    const setup = async () => {
      const session = useSessionStore.getState().sessions.find(s => s.id === sessionId);
      const hostId = sessionId.startsWith('SIGNET-') ? sessionId : session?.hostPeerId;
      if (hostId) {
        // Toujours se connecter comme client (false) pour les fenêtres externes
        await init(false, hostId, `ext-${type}-${Math.random().toString(36).substr(2, 5)}`);
      }
    };
    setup();
  }, [sessionId, type, init]); // Suppression de isHost des dépendances pour forcer false

  // Chargement initial des données (Scènes)
  useEffect(() => {
    const savedMaps = localStorage.getItem(`maps_${sessionId}`);
    if (savedMaps) {
      const parsed = JSON.parse(savedMaps);
      setMaps(parsed);
      
      // On essaie de retrouver la map active par défaut
      const lastActive = localStorage.getItem(`active_map_${sessionId}`);
      if (lastActive) {
        setCurrentMapId(lastActive);
      } else {
        setCurrentMapId(parsed[0]?.id || '');
      }
    }
    
    const loadPlayers = async () => {
      const list = await getSessionPlayers(sessionId);
      setPlayers(list);
    };
    loadPlayers();
  }, [sessionId]);

  // Écoute des mises à jour
  useEffect(() => {
    const unsub = onData((data) => {
      if (data.type === 'PLAYER_LIST') {
        setPlayers(data.payload);
      } else if (data.type === 'MAP_CHANGE') {
        // Synchroniser l'affichage de la map active en utilisant l'état local ou localStorage
        const targetUrl = data.payload.url;
        const map = maps.find((m: MapItem) => m.url === targetUrl);
        
        if (map) {
          setCurrentMapId(map.id);
          localStorage.setItem(`active_map_${sessionId}`, map.id);
        } else {
          // Si on n'a pas encore la map dans l'état (ex: MAP_UPDATE pas encore reçu)
          // On peut essayer de la trouver dans localStorage pour être sûr
          const savedMaps = localStorage.getItem(`maps_${sessionId}`);
          if (savedMaps) {
            const parsed = JSON.parse(savedMaps);
            const found = parsed.find((m: MapItem) => m.url === targetUrl);
            if (found) {
              setCurrentMapId(found.id);
              localStorage.setItem(`active_map_${sessionId}`, found.id);
            }
          }
        }
      } else if (data.type === 'MAP_UPDATE') {
        // Une nouvelle map a été ajoutée par l'app principale
        setMaps(data.payload);
      }
    });
    return () => unsub();
  }, [onData, sessionId, maps]);

  const handleSelectMap = (map: MapItem) => {
    setCurrentMapId(map.id);
    localStorage.setItem(`active_map_${sessionId}`, map.id);
    if (isHost) {
      broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
    }
  };

  const handleAddMap = (name: string, url: string) => {
    const newMap = { id: Math.random().toString(36).substring(2, 9), name, url };
    const updatedMaps = [...maps, newMap];
    setMaps(updatedMaps);
    localStorage.setItem(`maps_${sessionId}`, JSON.stringify(updatedMaps));
    
    if (isHost) {
      // Prévenir l'app principale et les autres
      broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
    }
  };

  return (
    <div className="w-full h-screen bg-[#0D0D0F] p-4 overflow-hidden flex flex-col">
       <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-gold-DEFAULT/30 rounded-tl-2xl pointer-events-none" />
       <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-gold-DEFAULT/30 rounded-br-2xl pointer-events-none" />

       <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
          <h1 className="text-[10px] font-cinzel font-black text-gold-bright tracking-[0.2em] uppercase">
             {type === 'scenes' ? 'Archive des Scènes' : 
              type === 'players' ? 'Cercle des Voyageurs' : 
              type.toUpperCase()}
          </h1>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar">
          {type === 'scenes' && (
            <SceneWindowContent 
              scenes={maps}
              currentSceneId={currentMapId}
              onSelectScene={handleSelectMap}
              onAddScene={handleAddMap}
            />
          )}

          {type === 'players' && (
            <PlayerHUD players={players} className="flex flex-col gap-3" />
          )}

          {type === 'dice' && (
            <div className="grid grid-cols-3 gap-2">
              {[4, 6, 8, 10, 12, 20].map(d => (
                <button key={d} className="h-10 rounded bg-white/5 border border-gold-DEFAULT/20 text-gold-bright font-cinzel text-xs hover:bg-gold-DEFAULT/10 transition-colors">
                  D{d}
                </button>
              ))}
            </div>
          )}

          {type === 'story' && (
             <p className="text-xs font-serif italic text-gold-dim/70 leading-relaxed text-center py-20">
                Le grimoire externe est en attente d'écriture...
             </p>
          )}

          {type === 'assets' && (
             <div className="flex flex-col items-center justify-center py-20 opacity-20">
               <div className="w-12 h-12 border-2 border-dashed border-gold-DEFAULT/50 rounded-lg mb-2" />
               <span className="text-[10px] font-cinzel">Aucun artefact</span>
             </div>
          )}
       </div>
    </div>
  );
}
