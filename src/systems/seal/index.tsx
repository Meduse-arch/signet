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
import { Sparkles } from 'lucide-react';
import { useSessionStore } from '../../store/session';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useSkillsStore } from '../../store/skills';
import { useTagsStore } from '../../store/tags';
import { useUIStore } from '../../store/ui';

interface SealEngineProps {
  sessionId: string;
}

export default function SealEngine({ sessionId }: SealEngineProps) {
  const { windows, openWindow, closeWindow, focusWindow, updatePosition } = useSignetInterface(sessionId);
  const { characterManagementId, setCharacterManagement } = useUIStore();
  const { peers } = usePeersStore();
  const { user } = useAuthStore();
  const { broadcast, onData } = usePeer();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const characters = useCharactersStore(state => state.characters);
  const { addOrUpdateCharacter, removeCharacter } = useCharactersStore();
  const initItems = useItemsStore(state => state.initialize);
  const initSkills = useSkillsStore(state => state.initialize);
  const initTags = useTagsStore(state => state.initialize);
  
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const isHost = session?.hostPeerId === user?.id;

  const [maps, setMaps] = useState<MapItem[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string>('');

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

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#050507]">
      <BoardCanvas 
        sessionId={sessionId}
        currentMap={currentMap}
      />

      <SignetLauncher sessionId={sessionId} />

      <PlayerHUD sessionId={sessionId} />
      <CharacterHUD sessionId={sessionId} />

      {windows.scenes.isOpen && (
        <DraggableWindow
          id="scenes"
          title="Scènes & Lieux"
          onClose={() => closeWindow('scenes')}
          position={windows.scenes.position}
          onPositionChange={(pos) => updatePosition('scenes', pos)}
          zIndex={windows.scenes.zIndex}
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
          position={windows.players.position}
          onPositionChange={(pos) => updatePosition('players', pos)}
          zIndex={windows.players.zIndex}
          onFocus={() => focusWindow('players')}
        >
          <PlayerWindowContent players={peers} sessionId={sessionId} />
        </DraggableWindow>
      )}

      {windows.assets.isOpen && (
        <DraggableWindow
          id="assets"
          title="Le Coffre de l'Archive"
          onClose={() => closeWindow('assets')}
          position={windows.assets.position}
          onPositionChange={(pos) => updatePosition('assets', pos)}
          zIndex={windows.assets.zIndex}
          onFocus={() => focusWindow('assets')}
        >
          <InventoryWindowContent sessionId={sessionId} />
        </DraggableWindow>
      )}

      {windows.bestiary.isOpen && (
        <DraggableWindow
          id="bestiary"
          title="Bestiaire Occulte"
          onClose={() => closeWindow('bestiary')}
          position={windows.bestiary.position}
          onPositionChange={(pos) => updatePosition('bestiary', pos)}
          zIndex={windows.bestiary.zIndex}
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
          position={windows.dice.position}
          onPositionChange={(pos) => updatePosition('dice', pos)}
          zIndex={windows.dice.zIndex}
          onFocus={() => focusWindow('dice')}
        >
          <DiceWindowContent sessionId={sessionId} />
        </DraggableWindow>
      )}

      {windows.story.isOpen && (
        <DraggableWindow
          id="story"
          title="Codex des Maîtrises"
          onClose={() => closeWindow('story')}
          position={windows.story.position}
          onPositionChange={(pos) => updatePosition('story', pos)}
          zIndex={windows.story.zIndex}
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
          position={windows.character.position}
          onPositionChange={(pos) => updatePosition('character', pos)}
          zIndex={windows.character.zIndex}
          onFocus={() => focusWindow('character')}
        >
          <CharacterSheetContent sessionId={sessionId} variant="window" />
        </DraggableWindow>
      )}

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
