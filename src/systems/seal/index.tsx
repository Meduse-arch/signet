import React, { useState, useEffect } from 'react';
import { BoardCanvas, MapItem } from '../../components/BoardCanvas';
import { SignetLauncher, DraggableWindow, SceneWindowContent } from '../../components/SignetInterface';
import { useSignetInterface } from '../../hooks/useSignetInterface';
import { usePeersStore } from '../../store/peers';
import { usePeer } from '../../hooks/usePeer';
import { PlayerHUD } from '../../components/PlayerHUD';

interface SealEngineProps {
  sessionId: string;
  imageUrl?: string;
  players: { peer_id: string; pseudo: string }[];
}

export default function SealEngine({ sessionId, imageUrl, players }: SealEngineProps) {
  const { isHost } = usePeersStore();
  const { broadcast, onData } = usePeer();
  const { windows, openWindow, closeWindow, focusWindow, updatePosition } = useSignetInterface(sessionId);

  const handlePopOut = (type: string) => {
    if (window.electronAPI) {
      window.electronAPI.openExternalWindow(type, sessionId);
      closeWindow(type as any);
    }
  };

  // État des cartes (Scènes)
  const [maps, setMaps] = useState<MapItem[]>(() => {
    const saved = localStorage.getItem(`maps_${sessionId}`);
    if (saved) return JSON.parse(saved);
    return imageUrl ? [{ id: 'default', name: 'Carte Initiale', url: imageUrl }] : [];
  });
  const [currentMapId, setCurrentMapId] = useState<string>(() => {
    const saved = localStorage.getItem(`active_map_${sessionId}`);
    if (saved) return saved;
    return imageUrl ? 'default' : '';
  });

  useEffect(() => {
    localStorage.setItem(`maps_${sessionId}`, JSON.stringify(maps));
  }, [maps, sessionId]);

  useEffect(() => {
    localStorage.setItem(`active_map_${sessionId}`, currentMapId);
  }, [currentMapId, sessionId]);

  const handleSelectMap = (map: MapItem) => {
    setCurrentMapId(map.id);
    if (isHost) {
      broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
    }
  };

  const handleAddMap = (name: string, url: string) => {
    const newMap = { id: Math.random().toString(36).substring(2, 9), name, url };
    const updatedMaps = [...maps, newMap];
    setMaps(updatedMaps);
    if (isHost) {
      broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
    }
  };

  // Écoute des messages (pour synchronisation avec fenêtres externes)
  useEffect(() => {
    const unsub = onData((data) => {
      if (data.type === 'MAP_CHANGE') {
        const map = maps.find(m => m.url === data.payload.url);
        if (map) {
          setCurrentMapId(map.id);
          // RELAY: On re-diffuse aux autres (joueurs) ce que la fenêtre externe a envoyé
          if (isHost) {
            broadcast(data);
          }
        }
      } else if (data.type === 'MAP_UPDATE') {
        setMaps(data.payload);
        // RELAY: On synchronise tout le monde sur la nouvelle liste de cartes
        if (isHost) {
          broadcast(data);
        }
      }
    });
    return () => unsub();
  }, [onData, maps, isHost, broadcast]);

  // On simule des joueurs pour le HUD (Normalement passé par le parent, mais on peut le récupérer du store)
  // Dans LobbyPage, players est géré localement. On devrait peut-être utiliser usePeersStore ?
  // Pour l'instant, on va juste afficher le HUD si on a des infos.

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0D0D0F] relative w-full h-full overflow-hidden">
      <BoardCanvas 
        sessionId={sessionId} 
        imageUrl={imageUrl} 
        maps={maps}
        currentMapId={currentMapId}
        onSelectMap={handleSelectMap}
      />

      {/* Signet Launcher (Orb) */}
      {isHost && (
        <SignetLauncher onOpenWindow={openWindow} />
      )}

      {/* Draggable Windows */}
      {windows.scenes.isOpen && (
        <DraggableWindow
          id="scenes"
          title="Scènes"
          onClose={() => closeWindow('scenes')}
          onPopOut={() => handlePopOut('scenes')}
          onFocus={() => focusWindow('scenes')}
          onPositionChange={(x, y) => updatePosition('scenes', x, y)}
          zIndex={windows.scenes.zIndex}
          defaultPosition={windows.scenes.position}
        >
          <SceneWindowContent 
            scenes={maps}
            currentSceneId={currentMapId}
            onSelectScene={handleSelectMap}
            onAddScene={handleAddMap}
          />
        </DraggableWindow>
      )}

      {windows.story.isOpen && (
        <DraggableWindow
          id="story"
          title="Histoire"
          onClose={() => closeWindow('story')}
          onPopOut={() => handlePopOut('story')}
          onFocus={() => focusWindow('story')}
          onPositionChange={(x, y) => updatePosition('story', x, y)}
          zIndex={windows.story.zIndex}
          defaultPosition={windows.story.position}
        >
          <div className="space-y-4">
            <p className="text-xs font-serif italic text-gold-dim/70 leading-relaxed">
              Le grimoire est encore vierge de vos exploits...
            </p>
          </div>
        </DraggableWindow>
      )}

      {windows.dice.isOpen && (
        <DraggableWindow
          id="dice"
          title="Dés"
          onClose={() => closeWindow('dice')}
          onPopOut={() => handlePopOut('dice')}
          onFocus={() => focusWindow('dice')}
          onPositionChange={(x, y) => updatePosition('dice', x, y)}
          zIndex={windows.dice.zIndex}
          defaultPosition={windows.dice.position}
        >
          <div className="grid grid-cols-3 gap-2">
            {[4, 6, 8, 10, 12, 20].map(d => (
              <button key={d} className="h-10 rounded bg-white/5 border border-gold-DEFAULT/20 text-gold-bright font-cinzel text-xs hover:bg-gold-DEFAULT/10 transition-colors">
                D{d}
              </button>
            ))}
          </div>
        </DraggableWindow>
      )}

      {windows.assets.isOpen && (
        <DraggableWindow
          id="assets"
          title="Coffre"
          onClose={() => closeWindow('assets')}
          onPopOut={() => handlePopOut('assets')}
          onFocus={() => focusWindow('assets')}
          onPositionChange={(x, y) => updatePosition('assets', x, y)}
          zIndex={windows.assets.zIndex}
          defaultPosition={windows.assets.position}
        >
          <div className="flex flex-col items-center justify-center py-8 opacity-20">
            <div className="w-12 h-12 border-2 border-dashed border-gold-DEFAULT/50 rounded-lg mb-2" />
            <span className="text-[10px] font-cinzel">Aucun artefact</span>
          </div>
        </DraggableWindow>
      )}

      {windows.players.isOpen && (
        <DraggableWindow
          id="players"
          title="Voyageurs"
          onClose={() => closeWindow('players')}
          onPopOut={() => handlePopOut('players')}
          onFocus={() => focusWindow('players')}
          onPositionChange={(x, y) => updatePosition('players', x, y)}
          zIndex={windows.players.zIndex}
          defaultPosition={windows.players.position}
        >
          <PlayerHUD players={players} className="flex flex-col gap-3" />
        </DraggableWindow>
      )}
      </div>
      );
      }