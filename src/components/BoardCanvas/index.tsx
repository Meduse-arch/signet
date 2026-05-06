import { useRef, useState, useEffect } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { usePeersStore } from '../../store/peers';
import { useAuthStore } from '../../store/auth';
import { MapGallery } from '../MapGallery';
import { usePeer } from '../../hooks/usePeer';

interface MapItem {
  id: string;
  name: string;
  url: string;
}

interface BoardCanvasProps {
  sessionId: string;
  imageUrl?: string;
}

export function BoardCanvas({ sessionId, imageUrl }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToken, loadMap } = useBoard(containerRef, sessionId, imageUrl);
  const { isHost } = usePeersStore();
  const { user } = useAuthStore();
  const { broadcast, onData } = usePeer();

  // État de la galerie (uniquement pour l'hôte ou si on veut persister côté client)
  const [maps, setMaps] = useState<MapItem[]>(() => {
    const saved = localStorage.getItem(`maps_${sessionId}`);
    if (saved) return JSON.parse(saved);
    return imageUrl ? [{ id: 'default', name: 'Carte Initiale', url: imageUrl }] : [];
  });
  const [currentMapId, setCurrentMapId] = useState<string>(imageUrl ? 'default' : '');

  useEffect(() => {
    localStorage.setItem(`maps_${sessionId}`, JSON.stringify(maps));
  }, [maps, sessionId]);

  // Synchronisation des changements de map pour les joueurs
  useEffect(() => {
    const unsub = onData((data) => {
      if (data.type === 'MAP_CHANGE' && !isHost) {
        console.log('[Player] Changement de map reçu:', data.payload.name);
        loadMap(data.payload.url);
      }
    });
    return () => unsub();
  }, [onData, isHost, loadMap]);

  const handleAddToken = () => {
    const id = Math.random().toString(36).substring(2, 9);
    addToken({
      id,
      name: user?.pseudo || 'Joueur',
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    });
  };

  const handleSelectMap = (map: MapItem) => {
    setCurrentMapId(map.id);
    loadMap(map.url);
    if (isHost) {
      broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
    }
  };

  const handleAddMap = (name: string, url: string) => {
    const newMap = { id: Math.random().toString(36).substring(2, 9), name, url };
    setMaps([...maps, newMap]);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      {isHost && (
        <>
          <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
            <button
              onClick={handleAddToken}
              className="px-4 py-2 rounded-lg bg-gold-DEFAULT/20 hover:bg-gold-DEFAULT/40 text-gold-DEFAULT text-xs font-bold border border-gold-DEFAULT/30 backdrop-blur-md transition-all uppercase tracking-widest"
            >
              Invoquer Pion
            </button>
          </div>

          <MapGallery 
            maps={maps}
            currentMapId={currentMapId}
            onSelectMap={handleSelectMap}
            onAddMap={handleAddMap}
          />
        </>
      )}
    </div>
  );
}
