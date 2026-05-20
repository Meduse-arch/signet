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
  ItemDetailModal,
  ManageCharacterModal,
  SkillsWindowContent,
  SkillCreationModal,
  BestiaryWindowContent,
  PlayerWindowContent
} from '../../components/SignetInterface';
import { DiceRollModal } from '../../components/DiceRollModal';
import { useSignetInterface } from '../../hooks/useSignetInterface';
import { usePeersStore } from '../../store/peers';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { PlayerHUD } from '../../components/PlayerHUD';
import { CharacterHUD } from '../../components/CharacterHUD';
import { Sparkles, Pause } from 'lucide-react';
import { useSessionStore } from '../../store/session';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useSkillsStore } from '../../store/skills';
import { useTagsStore } from '../../store/tags';
import { useUIStore } from '../../store/ui';

interface SealEngineProps {
  sessionId: string;
  onPause?: () => void;
  players?: { peer_id: string; pseudo: string; role?: number }[];
}

export default function SealEngine({ sessionId, onPause, players = [] }: SealEngineProps) {
  const { windows, openWindow, closeWindow, focusWindow, updatePosition } = useSignetInterface(sessionId);
  const { characterManagementId, setCharacterManagement } = useUIStore();
  const { peerId, connections } = usePeersStore();
  const { user } = useAuthStore();
  const { broadcast, onData } = usePeer();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const characters = useCharactersStore(state => state.characters);
  const { addOrUpdateCharacter, removeCharacter } = useCharactersStore();
  const initItems = useItemsStore(state => state.initialize);
  const initSkills = useSkillsStore(state => state.initialize);
  const initTags = useTagsStore(state => state.initialize);
  
  const isMJ = !!user && (user.role === SecurityLevel.MJ || user.role === SecurityLevel.ADMIN || Number(user.role) >= 1);
  const isHost = session?.hostPeerId === user?.id;

  const [maps, setMaps] = useState<MapItem[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string>('');

  // On utilise les joueurs passés en prop s'ils sont dispo, sinon fallback
  const playersList = players.length > 0 ? players : [
    ...(user ? [{ peer_id: user.id, pseudo: user.pseudo, role: user.role }] : []),
    ...connections.map(connId => {
      const char = characters.find(c => c.user_id === connId);
      return {
        peer_id: connId,
        pseudo: char ? char.name : 'Voyageur',
        role: 0
      };
    })
  ].filter((v, i, a) => a.findIndex(t => t.peer_id === v.peer_id) === i);

  useEffect(() => {
    initItems(sessionId);
    initSkills(sessionId);
    initTags(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getMaps(sessionId).then(setMaps);
    }
    const lastActive = localStorage.getItem(`active_map_${sessionId}`);
    if (lastActive) setCurrentMapId(lastActive);
  }, [sessionId]);

  useEffect(() => {
    const unsub = onData((data) => {
      const { type, payload } = data;
      if (type === 'CHAR_UPDATE') {
        addOrUpdateCharacter(payload);
      } else if (type === 'CHAR_DELETE') {
        removeCharacter(payload.id);
      } else if (type === 'MAP_CHANGE') {
        const map = maps.find(m => m.url === payload.url);
        if (map) {
          setCurrentMapId(map.id);
          localStorage.setItem(`active_map_${sessionId}`, map.id);
        }
      } else if (type === 'MAP_UPDATE') {
        setMaps(payload);
      }
    });

    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'MAP_CHANGE') {
        const map = maps.find(m => m.url === payload.url);
        if (map) {
          setCurrentMapId(map.id);
        }
      } else if (type === 'MAP_UPDATE') {
        setMaps(payload);
      }
    };

    return () => {
      unsub();
      channel.close();
    };
  }, [onData, maps, addOrUpdateCharacter, removeCharacter, sessionId]);

  const handleSelectMap = (map: MapItem) => {
    setCurrentMapId(map.id);
    localStorage.setItem(`active_map_${sessionId}`, map.id);
    if (isHost) {
      broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
    }
  };

  const handleAddMap = async (name: string, url: string) => {
    const newMap = { id: Math.random().toString(36).substring(2, 9), name, url };
    const updatedMaps = [...maps, newMap];
    setMaps(updatedMaps);
    if (window.electronAPI) {
      await window.electronAPI.addMap(sessionId, newMap);
    }
    if (isHost) {
      broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
    }
  };

  const currentMap = maps.find(m => m.id === currentMapId);

  const handlePopOut = (type: string) => {
    if (window.electronAPI) {
      window.electronAPI.openExternalWindow(type, sessionId);
      closeWindow(type as any);
    }
  };

  // Écouter les demandes de réintégration des fenêtres externes
  useEffect(() => {
    if (!sessionId) return;
    
    const channel = new BroadcastChannel(`signet_window_manager_${sessionId}`);
    console.log(`[DEBUG] Window Manager listener active for session: ${sessionId}`);
    
    channel.onmessage = (event) => {
      console.log('[DEBUG] Received window manager message:', event.data);
      if (event.data.type === 'REINTEGRATE_WINDOW') {
        const { windowType } = event.data.payload;
        console.log(`[DEBUG] Reintegrating window: ${windowType}`);
        openWindow(windowType as any);
      }
    };
    
    return () => {
        console.log(`[DEBUG] Closing Window Manager listener for session: ${sessionId}`);
        channel.close();
    };
  }, [sessionId, openWindow]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#050507]">
      <BoardCanvas 
        sessionId={sessionId}
        maps={maps}
        currentMapId={currentMapId}
        characters={characters}
      />

      {/* PAUSE BUTTON (MJ ONLY) */}
      {isMJ && onPause && (
        <button
          onClick={onPause}
          className="fixed top-8 right-8 z-[150] group flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/40 text-gold-DEFAULT hover:text-gold-bright hover:border-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all active:scale-95"
          title="Mettre la session en pause"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            <Pause size={18} className="relative z-10" />
          </div>
          <span className="text-[10px] font-cinzel font-black tracking-[0.2em] uppercase">Mettre en Pause</span>
        </button>
      )}

      <SignetLauncher 
        sessionId={sessionId} 
        onOpenWindow={openWindow}
        securityLevel={user?.role}
      />

      <PlayerHUD players={playersList} sessionId={sessionId} />
      <CharacterHUD sessionId={sessionId} />

      {/* WINDOWS LAYER */}
      <div className="absolute inset-0 pointer-events-none z-[200]">
        {windows.scenes.isOpen && (
          <DraggableWindow
            id="scenes"
            title="Scènes & Lieux"
            onClose={() => closeWindow('scenes')}
            onPopOut={() => handlePopOut('scenes')}
            defaultPosition={windows.scenes.position}
            onPositionChange={(x, y) => updatePosition('scenes', x, y)}
            zIndex={windows.scenes.zIndex + 200}
            onFocus={() => focusWindow('scenes')}
          >
            <SceneWindowContent 
              scenes={maps}
              currentSceneId={currentMapId}
              onSelectScene={handleSelectMap}
              onAddScene={handleAddMap}
            />
          </DraggableWindow>
        )}

        {windows.players.isOpen && (
          <DraggableWindow
            id="players"
            title="Le Cercle des Voyageurs"
            onClose={() => closeWindow('players')}
            onPopOut={() => handlePopOut('players')}
            defaultPosition={windows.players.position}
            onPositionChange={(x, y) => updatePosition('players', x, y)}
            zIndex={windows.players.zIndex + 200}
            onFocus={() => focusWindow('players')}
          >
            <PlayerWindowContent players={playersList} sessionId={sessionId} />
          </DraggableWindow>
        )}

        {windows.assets.isOpen && (
          <DraggableWindow
            id="assets"
            title="Le Coffre de l'Archive"
            onClose={() => closeWindow('assets')}
            onPopOut={() => handlePopOut('assets')}
            defaultPosition={windows.assets.position}
            onPositionChange={(x, y) => updatePosition('assets', x, y)}
            zIndex={windows.assets.zIndex + 200}
            onFocus={() => focusWindow('assets')}
          >
            <InventoryWindowContent sessionId={sessionId} />
          </DraggableWindow>
        )}

        {windows.bestiary.isOpen && (
          <DraggableWindow
            id="bestiary"
            title="Bestiaire Occulte"
            variant="codex"
            onClose={() => closeWindow('bestiary')}
            onPopOut={() => handlePopOut('bestiary')}
            defaultPosition={windows.bestiary.position}
            onPositionChange={(x, y) => updatePosition('bestiary', x, y)}
            zIndex={windows.bestiary.zIndex + 200}
            onFocus={() => focusWindow('bestiary')}
          >
            <BestiaryWindowContent sessionId={sessionId} />
          </DraggableWindow>
        )}

        {windows.dice.isOpen && (
          <DraggableWindow
            id="dice"
            title="Le Sort du Destin"
            onClose={() => closeWindow('dice')}
            onPopOut={() => handlePopOut('dice')}
            defaultPosition={windows.dice.position}
            onPositionChange={(x, y) => updatePosition('dice', x, y)}
            zIndex={windows.dice.zIndex + 200}
            onFocus={() => focusWindow('dice')}
          >
            <DiceWindowContent sessionId={sessionId} />
          </DraggableWindow>
        )}

        {windows.story.isOpen && (
          <DraggableWindow
            id="story"
            title="Codex des Maîtrises"
            variant="codex"
            onClose={() => closeWindow('story')}
            onPopOut={() => handlePopOut('story')}
            defaultPosition={windows.story.position}
            onPositionChange={(x, y) => updatePosition('story', x, y)}
            zIndex={windows.story.zIndex + 200}
            onFocus={() => focusWindow('story')}
          >
            <SkillsWindowContent sessionId={sessionId} />
          </DraggableWindow>
        )}

        {windows.character.isOpen && (
          <DraggableWindow
            id="character"
            title="Écho de l'Âme"
            onClose={() => closeWindow('character')}
            onPopOut={() => handlePopOut('character')}
            defaultPosition={windows.character.position}
            onPositionChange={(x, y) => updatePosition('character', x, y)}
            zIndex={windows.character.zIndex + 200}
            onFocus={() => focusWindow('character')}
          >
            <CharacterSheetContent sessionId={sessionId} variant="window" />
          </DraggableWindow>
        )}
      </div>

      <DiceRollModal />
      <ItemCreationModal sessionId={sessionId} />
      <ItemDetailModal sessionId={sessionId} />
      <SkillCreationModal sessionId={sessionId} />
      {characterManagementId && (
        <ManageCharacterModal 
          sessionId={sessionId} 
          characterId={characterManagementId} 
          onClose={() => setCharacterManagement(null)} 
        />
      )}
    </div>
  );
}
