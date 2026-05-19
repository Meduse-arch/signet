import React, { useState, useEffect, useCallback } from 'react';
import { BoardCanvas, MapItem } from '../../components/BoardCanvas';
import { 
  SignetLauncher, 
  DraggableWindow, 
  SceneWindowContent, 
  CharacterSheetContent,
  DiceWindowContent,
  InventoryWindowContent,
  ItemCreationModal,
  ItemDetailModal
} from '../../components/SignetInterface';
import { BestiaryWindowContent } from '../../components/SignetInterface/BestiaryWindowContent';
import { DiceRollModal } from '../../components/DiceRollModal';
import { useSignetInterface } from '../../hooks/useSignetInterface';
import { usePeersStore } from '../../store/peers';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { PlayerHUD } from '../../components/PlayerHUD';
import { CharacterHUD } from '../../components/CharacterHUD';
import { Sparkles } from 'lucide-react';
import { PlayerWindowContent } from '../../components/SignetInterface/PlayerWindowContent';
import { useSessionStore } from '../../store/session';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { getSessionCharacters, addSessionCharacter, Character } from '../../services/characters.service';
import { getSessionMaps, addSessionMap, removeSessionMap } from '../../services/maps.service';

interface SealEngineProps {
  sessionId: string;
  imageUrl?: string;
  players: { peer_id: string; pseudo: string }[];
}

export default function SealEngine({ sessionId, imageUrl, players }: SealEngineProps) {
  const isHost = usePeersStore(state => state.isHost);
  const user = useAuthStore(state => state.user);
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const characters = useCharactersStore(state => state.characters);
  const addOrUpdateCharacter = useCharactersStore(state => state.addOrUpdateCharacter);
  const setCharacters = useCharactersStore(state => state.setCharacters);
  const initChars = useCharactersStore(state => state.initialize);
  const initItems = useItemsStore(state => state.initialize);
  
  const { broadcast, onData } = usePeer();
  const { windows, openWindow, closeWindow, focusWindow, updatePosition } = useSignetInterface(sessionId);

  // Initialiser les personnages et objets depuis le storage local (important pour les clients)
  useEffect(() => {
    initChars(sessionId);
    initItems(sessionId);
  }, [sessionId, initChars, initItems]);

  // Charger les personnages initiaux (seulement si Hôte/Electron)
  useEffect(() => {
    const loadChars = async () => {
      if (isHost && window.electronAPI) {
        console.log('[SealEngine] Host detected, fetching characters from DB');
        const chars = await getSessionCharacters(sessionId);
        console.log(`[SealEngine] Characters fetched: ${chars.length}`);
        setCharacters(chars);
      }
    };
    loadChars();
  }, [sessionId, isHost, setCharacters]);

  // Écoute BroadcastChannel pour les personnages (UI locale)
  // NOTE: Le store gère déjà sa propre synchro via sigil_char_store_sync_
  // On utilise ce canal ici pour déclencher les actions réseau/DB uniquement si on est l'hôte
  useEffect(() => {
    const channel = new BroadcastChannel(`sigil_char_store_sync_${sessionId}`);
    channel.onmessage = (event) => {
      if (!isHost) return; // Seul l'hôte réagit aux updates locales pour les propager
      
      const { type, payload } = event.data;
      if (type === 'CHAR_UPDATE_INTERNAL') {
        console.log(`[SealEngine] Host relaying local update for ${payload.name} to DB and P2P`);
        if (window.electronAPI) addSessionCharacter(payload);
        broadcast({ type: 'CHAR_UPDATE', payload });
      }
    };
    return () => channel.close();
  }, [sessionId, isHost, broadcast]);

  const handlePopOut = (type: string) => {
    if (window.electronAPI) {
      window.electronAPI.openExternalWindow(type, sessionId);
      closeWindow(type as any);
    }
  };

  // État des cartes (Scènes)
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string>(() => {
    const saved = localStorage.getItem(`active_map_${sessionId}`);
    if (saved) return saved;
    return imageUrl ? 'default' : '';
  });

  // Charger les cartes initiales
  useEffect(() => {
    const loadMaps = async () => {
      if (isHost && window.electronAPI) {
        const dbMaps = await getSessionMaps(sessionId);
        if (dbMaps.length > 0) {
          setMaps(dbMaps);
        } else if (imageUrl) {
          const defaultMap = { id: 'default', name: 'Carte Initiale', url: imageUrl };
          setMaps([defaultMap]);
          await addSessionMap(sessionId, defaultMap);
        }
      } else {
        const saved = localStorage.getItem(`maps_${sessionId}`);
        if (saved) setMaps(JSON.parse(saved));
      }
    };
    loadMaps();
  }, [sessionId, isHost, imageUrl]);

  useEffect(() => {
    if (!isHost) {
      localStorage.setItem(`maps_${sessionId}`, JSON.stringify(maps));
    }
  }, [maps, sessionId, isHost]);

  useEffect(() => {
    localStorage.setItem(`active_map_${sessionId}`, currentMapId);
  }, [currentMapId, sessionId]);

  // Canal de communication local pour les fenêtres du MJ
  useEffect(() => {
    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      console.log(`[SealEngine] Sync reçu via BroadcastChannel: ${type}`);
      
      if (type === 'MAP_CHANGE') {
        const map = maps.find(m => m.url === payload.url);
        if (map) {
          setCurrentMapId(map.id);
          // Si on est l'hôte, on relaye aux autres joueurs via P2P
          if (isHost) {
            broadcast({ type, payload });
          }
        }
      } else if (type === 'MAP_UPDATE') {
        setMaps(payload);
        if (isHost) {
          broadcast({ type, payload });
        }
      }
    };

    return () => channel.close();
  }, [sessionId, maps, isHost, broadcast]);

  const handleSelectMap = useCallback((map: MapItem) => {
    setCurrentMapId(map.id);
    
    // Sync local
    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.postMessage({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
    channel.close();

    if (isHost) {
      broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
    }
  }, [sessionId, isHost, broadcast]);

  const handleAddMap = useCallback(async (name: string, url: string) => {
    const newMap = { id: Math.random().toString(36).substring(2, 9), name, url };
    const updatedMaps = [...maps, newMap];
    setMaps(updatedMaps);

    if (isHost && window.electronAPI) {
      await addSessionMap(sessionId, newMap);
    }

    // Sync local
    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.postMessage({ type: 'MAP_UPDATE', payload: updatedMaps });
    channel.close();

    if (isHost) {
      broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
    }
  }, [sessionId, maps, isHost, broadcast]);

  // Écoute des messages P2P (pour les joueurs distants)
  useEffect(() => {
    const unsubData = onData((data) => {
      if (data.type === 'MAP_CHANGE') {
        const map = maps.find(m => m.url === data.payload.url);
        if (map) {
          setCurrentMapId(map.id);
        }
      } else if (data.type === 'MAP_UPDATE') {
        setMaps(data.payload);
      } else if (data.type === 'CHAR_UPDATE') {
        console.log('[SealEngine] Mise à jour personnage reçue via P2P:', data.payload.name);
        addOrUpdateCharacter(data.payload);
        // Si on est l'hôte, on persiste en DB et on relaye aux autres
        if (isHost) {
          if (window.electronAPI) addSessionCharacter(data.payload);
          broadcast({ type: 'CHAR_UPDATE', payload: data.payload });
        }
      }
    });

    let unsubDock: (() => void) | undefined;
    if (window.electronAPI && window.electronAPI.onReDock) {
      unsubDock = window.electronAPI.onReDock((type) => {
        openWindow(type as any);
      });
    }

    return () => {
      unsubData();
      if (unsubDock) unsubDock();
    };
  }, [onData, maps, openWindow, isHost, broadcast, addOrUpdateCharacter, sessionId]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0D0D0F] relative w-full h-full overflow-hidden">
      <BoardCanvas 
        sessionId={sessionId} 
        imageUrl={imageUrl} 
        maps={maps}
        currentMapId={currentMapId}
        onSelectMap={handleSelectMap}
        characters={characters}
      />

      {/* HUD Global - Vignette et Interface Principale */}
      <div className="absolute inset-0 pointer-events-none z-50 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
      
      {/* Player HUD en overlay permanent */}
      <div className="absolute inset-0 pointer-events-none z-[60]">
        <PlayerHUD players={players} sessionId={sessionId} />
        <CharacterHUD sessionId={sessionId} />
      </div>

      {/* Signet Launcher (Orb) */}
      <SignetLauncher 
        onOpenWindow={openWindow} 
        securityLevel={user?.role ?? SecurityLevel.PLAYER} 
        sessionId={sessionId}
      />

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

      {windows.bestiary.isOpen && (
        <DraggableWindow
          id="bestiary"
          title="Bestiaire"
          onClose={() => closeWindow('bestiary')}
          onPopOut={() => handlePopOut('bestiary')}
          onFocus={() => focusWindow('bestiary')}
          onPositionChange={(x, y) => updatePosition('bestiary', x, y)}
          zIndex={windows.bestiary.zIndex}
          defaultPosition={windows.bestiary.position}
          variant="codex"
        >
          <BestiaryWindowContent sessionId={sessionId} />
        </DraggableWindow>
      )}

      {/* ... (rest of windows) ... */}
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
            <p className="text-xs font-serif italic text-gold-DEFAULT drop-shadow-md/70 leading-relaxed">
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
          <DiceWindowContent sessionId={sessionId} />
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
          variant="codex"
        >
          <InventoryWindowContent sessionId={sessionId} />
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
          <PlayerWindowContent players={players} sessionId={sessionId} />
        </DraggableWindow>
      )}

      {windows.character.isOpen && (
        <DraggableWindow
          id="character"
          title="Fiche de Personnage"
          onClose={() => closeWindow('character')}
          onPopOut={() => handlePopOut('character')}
          onFocus={() => focusWindow('character')}
          onPositionChange={(x, y) => updatePosition('character', x, y)}
          zIndex={windows.character.zIndex}
          defaultPosition={windows.character.position}
        >
          <CharacterSheetContent sessionId={sessionId} />
        </DraggableWindow>
      )}

      <DiceRollModal />
      <ItemCreationModal sessionId={sessionId} />
      <ItemDetailModal sessionId={sessionId} />
      </div>
      );
}