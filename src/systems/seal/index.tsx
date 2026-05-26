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
  PlayerWindowContent,
  QuestsWindowContent,
  QuestCreationModal
} from '../../components/SignetInterface';
import { DiceRollModal } from '../../components/DiceRollModal';
import { useSignetInterface } from '../../hooks/useSignetInterface';
import { usePeersStore } from '../../store/peers';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { PlayerHUD } from '../../components/PlayerHUD';
import { CharacterHUD } from '../../components/CharacterHUD';
import { Pause } from 'lucide-react';
import { useSessionStore } from '../../store/session';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useQuestsStore } from '../../store/quests';
import { useSkillsStore } from '../../store/skills';
import { useTagsStore } from '../../store/tags';
import { useUIStore } from '../../store/ui';

interface SealEngineProps {
  sessionId: string;
  onPause?: () => void;
  players?: { peer_id: string; pseudo: string; role?: number }[];
  imageUrl?: string;
  lobbyMode?: boolean;
  isHost?: boolean;
}

export default function SealEngine({ sessionId, onPause, players = [], imageUrl: propImageUrl, lobbyMode, isHost: propIsHost }: SealEngineProps) {
  const { windows, openWindow, closeWindow, focusWindow, updatePosition } = useSignetInterface(sessionId);
  const { characterManagementId, setCharacterManagement } = useUIStore();
  const { peerId, connections } = usePeersStore();
  const { user } = useAuthStore();
  const { broadcast, onData, sendTo } = usePeer();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const characters = useCharactersStore(state => state.characters);
  const { addOrUpdateCharacter, removeCharacter } = useCharactersStore();
  
  const initItems = useItemsStore(state => state.initialize);
  const initSkills = useSkillsStore(state => state.initialize);
  const initTags = useTagsStore(state => state.initialize);
  const initQuests = useQuestsStore(state => state.initialize);
  const initChars = useCharactersStore(state => state.initialize);
  
  const isMJ = !!user && (user.role === SecurityLevel.MJ || user.role === SecurityLevel.ADMIN || Number(user.role) >= 1);
  const isHost = propIsHost ?? (session?.hostPeerId === user?.id);

  const [maps, setMaps] = useState<MapItem[]>(() => {
    return (session as any)?.maps || [];
  });
  const [currentMapId, setCurrentMapId] = useState<string>('');

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
    if (sessionId) {
        initItems(sessionId);
        initSkills(sessionId);
        initTags(sessionId);
        initQuests(sessionId);
        initChars(sessionId);
    }
  }, [sessionId, initItems, initSkills, initTags, initQuests, initChars]);

  useEffect(() => {
    if (!isHost && (session as any)?.maps) {
        setMaps((session as any).maps);
    }
  }, [session, isHost]);

  useEffect(() => {
    async function loadMaps() {
      const lastActive = localStorage.getItem(`active_map_${sessionId}`);
      const sessionActiveMapId = (session as any)?.activeMapId;

      if (window.electronAPI && sessionId && isHost) {
        const dbMaps = await window.electronAPI.getMaps(sessionId);
        console.log(`[SealEngine] Host loading maps from DB: ${dbMaps.length} found`);

        if (dbMaps.length === 0 && (propImageUrl || session?.imageUrl)) {
          const defaultMap = {
            id: 'initial-scene',
            name: 'Scène Initiale',
            url: propImageUrl || session?.imageUrl || '',
            is_hidden: false,
            grid_size: 50
          };
          await window.electronAPI.addMap(sessionId, defaultMap);
          const updatedMaps = [defaultMap];
          setMaps(updatedMaps);
          setCurrentMapId(defaultMap.id);
          localStorage.setItem(`active_map_${sessionId}`, defaultMap.id);
          broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
        } else {
          setMaps(dbMaps);
          broadcast({ type: 'MAP_UPDATE', payload: dbMaps });
          
          const foundMap = dbMaps.find(m => m.id === lastActive);
          if (foundMap) {
            setCurrentMapId(foundMap.id);
          } else {
            const initialScene = dbMaps.find(m => m.id === 'initial-scene');
            setCurrentMapId(initialScene?.id || dbMaps[0]?.id || '');
          }
        }
      } else if (!isHost) {
        // Pour les joueurs, on se base sur les maps du store session
        const storeMaps = (session as any)?.maps || [];
        setMaps(storeMaps);
        console.log(`[SealEngine] Player loading maps from session: ${storeMaps.length} found`);
        
        // On priorise la map active de la session, puis le localStorage
        const targetId = sessionActiveMapId || lastActive;
        const found = storeMaps.find((m: any) => m.id === targetId);
        
        if (found && (!found.is_hidden || isMJ)) {
            setCurrentMapId(found.id);
        } else {
            const initial = storeMaps.find((m: any) => m.id === 'initial-scene');
            setCurrentMapId(initial?.id || storeMaps[0]?.id || 'initial-scene');
        }
      }
    }
    loadMaps();
  }, [sessionId, propImageUrl, session?.imageUrl, isHost, isMJ, broadcast, (session as any)?.activeMapId]);

  useEffect(() => {
    if (isHost && maps.length > 0 && connections.length > 0) {
        broadcast({ type: 'MAP_UPDATE', payload: maps });
    }
  }, [connections.length, maps, isHost, broadcast]);

  useEffect(() => {
    if (!isHost && peerId) {
      console.log('[Player] Demande de synchronisation initiale...');
      broadcast({ type: 'INITIAL_SYNC_REQUEST', payload: { peerId } });
    }
  }, [isHost, peerId, broadcast]);

  useEffect(() => {
    const unsub = onData((data, fromPeerId) => {
      const { type, payload } = data;
      if (type === 'CHAR_UPDATE') {
        addOrUpdateCharacter(payload);
      } else if (type === 'CHAR_DELETE') {
        removeCharacter(sessionId, payload.id);
      } else if (type === 'MAP_CHANGE' && !isHost) {
        if (payload.id) {
            setCurrentMapId(payload.id);
            localStorage.setItem(`active_map_${sessionId}`, payload.id);
        }
      } else if (type === 'REQUEST_MAP_MANIFEST' && isHost) {
        // ✅ Un joueur demande le manifest d'une map spécifique (ex: changement de scène indépendant)
        console.log(`[Host] Joueur ${fromPeerId} demande le manifest pour: ${payload.mapId}`);
        mapSyncService.syncCurrentMapToPeer(payload.mapId, fromPeerId);
      } else if (type === 'CHARACTER_LIST' && !isHost) {
        console.log(`[Player] ${payload.length} personnages synchronisés.`);
        payload.forEach((char: any) => {
            addOrUpdateCharacter(char, true);
            const channel = new BroadcastChannel(`board_actions_${sessionId}`);
            channel.postMessage({ type: 'REFRESH_TOKEN_DATA', payload: char });
            channel.close();
        });
      } else if (type === 'MAP_UPDATE') {
        setMaps(payload);
        if (!currentMapId && payload.length > 0) {
            setCurrentMapId(payload[0].id);
        }
      } else if (type === 'INITIAL_SYNC_REQUEST' && isHost) {
        sendTo(fromPeerId, { type: 'CHARACTER_LIST', payload: characters });
        sendTo(fromPeerId, { type: 'MAP_UPDATE', payload: maps });
        const current = maps.find(m => m.id === currentMapId) || maps[0];
        if (current) {
            sendTo(fromPeerId, { type: 'MAP_CHANGE', payload: { url: current.url, name: current.name, id: current.id, grid_size: current.grid_size } });
        }
      } else if (type === 'QUEST_UPDATE') {
        useQuestsStore.getState().addQuest(sessionId, payload, true);
      } else if (type === 'QUEST_DELETE') {
        useQuestsStore.getState().removeQuest(sessionId, payload.id, true);
      }
    });

    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'MAP_CHANGE') {
        const map = maps.find(m => m.url === payload.url);
        if (map) setCurrentMapId(map.id);
      } else if (type === 'MAP_UPDATE') {
        setMaps(payload);
      }
    };

    return () => {
      unsub();
      channel.close();
    };
  }, [onData, maps, addOrUpdateCharacter, removeCharacter, sessionId, characters, currentMapId, isHost, sendTo]);

  const handleSelectMap = (map: MapItem, global: boolean = false) => {
    setCurrentMapId(map.id);
    localStorage.setItem(`active_map_${sessionId}`, map.id);
    if (global && isMJ) {
      broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name, id: map.id, grid_size: map.grid_size } });
    }
  };

  const handleToggleHideMap = async (id: string, hidden: boolean) => {
    if (!isMJ) return;
    const updatedMaps = maps.map(m => m.id === id ? { ...m, is_hidden: hidden } : m);
    setMaps(updatedMaps);
    if (window.electronAPI) await window.electronAPI.addMap(sessionId, updatedMaps.find(m => m.id === id)!);
    if (isMJ) broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
  };

  const handleUpdateMap = async (id: string, updates: Partial<MapItem>) => {
    if (!isMJ) return;
    const updatedMaps = maps.map(m => m.id === id ? { ...m, ...updates } : m);
    setMaps(updatedMaps);
    const updatedMap = updatedMaps.find(m => m.id === id);
    if (updatedMap && window.electronAPI) await window.electronAPI.addMap(sessionId, updatedMap);
    if (isMJ) {
      broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
      if (id === currentMapId && updates.url) {
        broadcast({ type: 'MAP_CHANGE', payload: { url: updates.url, name: updates.name || updatedMap?.name, id: updatedMap?.id, grid_size: updatedMap?.grid_size } });
      }
    }
  };

  const handleAddMap = async (name: string, url: string) => {
    const newMap: MapItem = { id: Math.random().toString(36).substring(2, 9), name, url, is_hidden: true, grid_size: 50 };
    const updatedMaps = [...maps, newMap];
    setMaps(updatedMaps);
    if (window.electronAPI) await window.electronAPI.addMap(sessionId, newMap);
    if (isMJ) broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
  };

  const handlePopOut = (type: string) => {
    if (window.electronAPI) {
      window.electronAPI.openExternalWindow(type, sessionId);
      closeWindow(type as any);
    }
  };

  useEffect(() => {
    if (!sessionId) return;
    const channel = new BroadcastChannel(`signet_window_manager_${sessionId}`);
    channel.onmessage = (event) => {
      if (event.data.type === 'REINTEGRATE_WINDOW') {
        openWindow(event.data.payload.windowType as any);
      }
    };
    return () => channel.close();
  }, [sessionId, openWindow]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#050507]">
      <BoardCanvas sessionId={sessionId} imageUrl={propImageUrl} maps={maps} currentMapId={currentMapId} characters={characters} />
      {!lobbyMode && (
        <>
          {isMJ && onPause && (
            <button onClick={onPause} className="fixed top-8 right-8 z-[150] group flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/40 text-gold-DEFAULT hover:text-gold-bright transition-all active:scale-95">
              <Pause size={18} />
              <span className="text-[10px] font-cinzel font-black tracking-[0.2em] uppercase">Pause</span>
            </button>
          )}
          <SignetLauncher sessionId={sessionId} onOpenWindow={openWindow} securityLevel={user?.role} />
          <PlayerHUD players={playersList} sessionId={sessionId} />
          <CharacterHUD sessionId={sessionId} />
          <div className="absolute inset-0 pointer-events-none z-[200]">
            {Object.entries(windows).map(([id, win]) => win.isOpen && (
              <DraggableWindow
                key={id} id={id} title={id} 
                onClose={() => closeWindow(id as any)} 
                onPopOut={() => handlePopOut(id)}
                defaultPosition={win.position} 
                onPositionChange={(x, y) => updatePosition(id as any, x, y)}
                zIndex={win.zIndex + 200} 
                onFocus={() => focusWindow(id as any)}
              >
                {id === 'scenes' && <SceneWindowContent scenes={maps} currentSceneId={currentMapId} onSelectScene={handleSelectMap} onAddScene={handleAddMap} onUpdateScene={handleUpdateMap} onToggleHide={handleToggleHideMap} />}
                {id === 'players' && <PlayerWindowContent players={playersList} sessionId={sessionId} />}
                {id === 'assets' && <InventoryWindowContent sessionId={sessionId} />}
                {id === 'bestiary' && <BestiaryWindowContent sessionId={sessionId} />}
                {id === 'dice' && <DiceWindowContent sessionId={sessionId} />}
                {id === 'quests' && <QuestsWindowContent sessionId={sessionId} />}
                {id === 'skills' && <SkillsWindowContent sessionId={sessionId} />}
                {id === 'character' && <CharacterSheetContent sessionId={sessionId} variant="window" />}
              </DraggableWindow>
            ))}
          </div>
          <DiceRollModal />
          <ItemCreationModal sessionId={sessionId} />
          <ItemDetailModal sessionId={sessionId} />
          <SkillCreationModal sessionId={sessionId} />
          <QuestCreationModal sessionId={sessionId} />
          {characterManagementId && <ManageCharacterModal sessionId={sessionId} characterId={characterManagementId} onClose={() => setCharacterManagement(null)} />}
        </>
      )}
    </div>
  );
}