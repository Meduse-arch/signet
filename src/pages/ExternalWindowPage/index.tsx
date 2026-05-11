import { useEffect, useState } from 'react';
import { SceneWindowContent } from '../../components/SignetInterface';
import { PlayerWindowContent } from '../../components/SignetInterface/PlayerWindowContent';
import { usePeer } from '../../hooks/usePeer';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { getSessionPlayers } from '../../services/session.service';
import { MapItem } from '../../components/BoardCanvas';
import { LogIn } from 'lucide-react';

interface ExternalWindowPageProps {
  type: string;
  sessionId: string;
}

export function ExternalWindowPage({ type, sessionId }: ExternalWindowPageProps) {
  const { onData, broadcast, init } = usePeer();
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  
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
  }, [sessionId, type, init]);

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
        const targetUrl = data.payload.url;
        const map = maps.find((m: MapItem) => m.url === targetUrl);
        
        if (map) {
          setCurrentMapId(map.id);
          localStorage.setItem(`active_map_${sessionId}`, map.id);
        } else {
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
        setMaps(data.payload);
      }
    });
    return () => unsub();
  }, [onData, sessionId, maps]);
const handleSelectMap = (map: MapItem) => {
  setCurrentMapId(map.id);
  localStorage.setItem(`active_map_${sessionId}`, map.id);

  // Sync local via BroadcastChannel
  const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
  channel.postMessage({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
  channel.close();

  if (isMJ) {
    broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
  }
};

const handleAddMap = (name: string, url: string) => {
  const newMap = { id: Math.random().toString(36).substring(2, 9), name, url };
  const updatedMaps = [...maps, newMap];
  setMaps(updatedMaps);
  localStorage.setItem(`maps_${sessionId}`, JSON.stringify(updatedMaps));

  // Sync local via BroadcastChannel
  const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
  channel.postMessage({ type: 'MAP_UPDATE', payload: updatedMaps });
  channel.close();

  if (isMJ) {
    // Prévenir l'app principale et les autres
    broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
  }
};

// Écoute BroadcastChannel pour recevoir les mises à jour de l'app principale
useEffect(() => {
  const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
  channel.onmessage = (event) => {
    const { type, payload } = event.data;
    if (type === 'MAP_CHANGE') {
      const map = maps.find((m: MapItem) => m.url === payload.url);
      if (map) {
        setCurrentMapId(map.id);
      }
    } else if (type === 'MAP_UPDATE') {
      setMaps(payload);
    }
  };
  return () => channel.close();
}, [sessionId, maps]);

  const handleReDock = () => {
    if (window.electronAPI) {
      window.electronAPI.reDock(type, sessionId);
    }
  };

  return (
    <div className="w-full h-screen bg-[#0D0D0F]/80 p-0 overflow-hidden flex flex-col relative">
       {/* Golden Corners */}
       <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gold-DEFAULT/50 pointer-events-none z-10" />
       <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gold-DEFAULT/50 pointer-events-none z-10" />

       <div className="flex-1 p-4 custom-scrollbar overflow-y-auto">
          {type === 'scenes' && (
            <SceneWindowContent 
              scenes={maps}
              currentSceneId={currentMapId}
              onSelectScene={handleSelectMap}
              onAddScene={handleAddMap}
            />
          )}

          {type === 'players' && (
            <PlayerWindowContent players={players} />
          )}

          {type === 'dice' && (
            <div className="grid grid-cols-3 gap-2">
              {[4, 6, 8, 10, 12, 20].map(d => (
                <button key={d} className="h-10 rounded bg-white/5 border border-gold-DEFAULT/40 text-gold-bright font-cinzel text-xs hover:bg-gold-DEFAULT/10 transition-colors">
                  D{d}
                </button>
              ))}
            </div>
          )}

          {type === 'story' && (
             <p className="text-xs font-serif italic text-gold-DEFAULT drop-shadow-md/70 leading-relaxed text-center py-20">
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