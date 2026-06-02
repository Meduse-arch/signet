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
  QuestCreationModal,
  InitiativeWindowContent
} from '../../components/SignetInterface';
import { DiceRollModal } from '../../components/DiceRollModal';
import { useSignetInterface } from '../../hooks/useSignetInterface';
import { usePeersStore } from '../../store/peers';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { PlayerHUD } from '../../components/PlayerHUD';
import { CharacterHUD } from '../../components/CharacterHUD';
import { CombatHUD } from '../../components/CombatHUD';
import { Pause, MonitorPlay, Zap, ZapOff } from 'lucide-react';
import { useSessionStore } from '../../store/session';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useQuestsStore } from '../../store/quests';
import { useSkillsStore } from '../../store/skills';
import { useTagsStore } from '../../store/tags';
import { useUIStore } from '../../store/ui';
import { mapSyncService } from '../../services/map-sync.service';
import { useCombatStore } from '../../store/combat';

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
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId || s.hostPeerId === sessionId));
  const characters = useCharactersStore(state => state.characters);
  const { addOrUpdateCharacter, removeCharacter } = useCharactersStore();
  const { autoSync, setAutoSync } = useUIStore();
  
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

  // Sync automatique de l'écran externe quand on active le toggle
  useEffect(() => {
    if (autoSync && isMJ && currentMapId && maps.length > 0) {
      const currentMap = maps.find(m => m.id === currentMapId);
      if (currentMap) {
        const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
        channel.postMessage({ type: 'MAP_CHANGE', payload: { url: currentMap.url, name: currentMap.name, id: currentMap.id, grid_size: currentMap.grid_size } });
        channel.close();
      }
    }
  }, [autoSync]); // Ne se déclenche qu'au changement du toggle

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
      const initialSceneId = `initial-scene-${sessionId}`;
      
      if (window.electronAPI && sessionId && isHost) {
        const dbMaps = await window.electronAPI.getMaps(sessionId);
        console.log(`[SealEngine] Host loading maps from DB: ${dbMaps.length} found`);

        // Migration : Si on a encore une vieille "initial-scene", on la renomme pour l'isoler
        const legacyMap = dbMaps.find(m => m.id === 'initial-scene');
        if (legacyMap) {
          console.log('[SealEngine] Migration de la scène initiale vers un ID isolé');
          const migratedMap = { ...legacyMap, id: initialSceneId };
          await window.electronAPI.removeMap(sessionId, 'initial-scene');
          await window.electronAPI.addMap(sessionId, migratedMap);
          // Re-charger les maps après migration
          const updatedDbMaps = await window.electronAPI.getMaps(sessionId);
          setMaps(updatedDbMaps);
          setCurrentMapId(initialSceneId);
          broadcast({ type: 'MAP_UPDATE', payload: updatedDbMaps });
          return;
        }

        if (dbMaps.length === 0 && (propImageUrl || session?.imageUrl)) {
          const defaultMap = {
            id: initialSceneId,
            name: 'Scène Initiale',
            url: propImageUrl || session?.imageUrl || '',
            is_hidden: false,
            grid_size: 50
          };
          await window.electronAPI.addMap(sessionId, defaultMap);
          const updatedMaps = [defaultMap];
          setMaps(updatedMaps);
          setCurrentMapId(defaultMap.id);
          broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
        } else {
          setMaps(dbMaps);
          broadcast({ type: 'MAP_UPDATE', payload: dbMaps });
          
          const initialScene = dbMaps.find(m => m.id === initialSceneId);
          setCurrentMapId(initialScene?.id || dbMaps[0]?.id || '');
        }
      } else if (!isHost) {
        // Pour les joueurs, on se base sur les maps du store session
        const storeMaps = (session as any)?.maps || [];
        setMaps(storeMaps);
        console.log(`[SealEngine] Player loading maps from session: ${storeMaps.length} found`);
        
        // On commence toujours par la scène initiale isolée
        const initial = storeMaps.find((m: any) => m.id === initialSceneId);
        setCurrentMapId(initial?.id || storeMaps[0]?.id || initialSceneId);
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
        addOrUpdateCharacter(payload, true);
      } else if (type === 'CHAR_DELETE') {
        removeCharacter(sessionId, payload.id);
      } else if (type === 'MAP_CHANGE' && !isHost) {
        if (payload.id) {
            setCurrentMapId(payload.id);
        }
      } else if (type === 'REQUEST_MAP_MANIFEST' && isHost) {
        // ✅ Un joueur demande le manifest d'une map spécifique (ex: changement de scène indépendant)
        console.log(`[Host] Joueur ${fromPeerId} demande le manifest pour: ${payload.mapId}`);
        mapSyncService.syncCurrentMapToPeer(payload.mapId, fromPeerId);
      } else if (type === 'CHARACTER_LIST' && !isHost) {
        console.log(`[Player] ${payload.length} personnages reçus du MJ.`);
        const hostCharIds = new Set(payload.map((c: any) => c.id));
        
        payload.forEach((char: any) => {
            addOrUpdateCharacter(char, true);
            const channel = new BroadcastChannel(`board_actions_${sessionId}`);
            channel.postMessage({ type: 'REFRESH_TOKEN_DATA', payload: char });
            channel.close();
        });

        // Restaurer la synchronisation: si le joueur a des persos en cache que le MJ a perdu/ne connait pas
        const localCharsToSync = characters.filter(c => !hostCharIds.has(c.id));
        if (localCharsToSync.length > 0) {
            console.log(`[Player] Envoi de ${localCharsToSync.length} personnages locaux manquants au MJ...`);
            localCharsToSync.forEach(c => {
                broadcast({ type: 'CHAR_UPDATE', payload: c });
            });
        }
      } else if (type === 'MAP_UPDATE') {
        setMaps(payload);
        if (!currentMapId && payload.length > 0) {
            setCurrentMapId(payload[0].id);
        }
      } else if (type === 'INITIAL_SYNC_REQUEST' && isHost) {
        // ✅ Résoudre les images locales → asset:// puis POUSSER les binaires au joueur
        const resolveAndSend = async () => {
          const { assetSyncService } = await import('../../services/asset-sync.service');

          // 1. Résoudre toutes les images locales en asset://
          const resolvedChars = await Promise.all(
            characters.map(async (char: any) => ({
              ...char,
              image_url: await assetSyncService.resolveLocalImage(char.image_url),
            }))
          );

          // 2. Envoyer la liste de personnages avec les URLs résolues
          sendTo(fromPeerId, { type: 'CHARACTER_LIST', payload: resolvedChars });

          // 3. PUSH proactif des binaires d'images → joueur les stocke avant d'en avoir besoin
          for (const char of resolvedChars) {
            if (char.image_url?.startsWith('asset://')) {
              await assetSyncService.pushAssetToPeer(char.image_url, fromPeerId);
            }
          }
        };
        resolveAndSend();
        sendTo(fromPeerId, { type: 'MAP_UPDATE', payload: maps });
        const current = maps.find(m => m.id === currentMapId) || maps[0];
        if (current) {
            sendTo(fromPeerId, { type: 'MAP_CHANGE', payload: { url: current.url, name: current.name, id: current.id, grid_size: current.grid_size } });
        }
      } else if (type === 'QUEST_UPDATE') {
        useQuestsStore.getState().addQuest(sessionId, payload, true);
      } else if (type === 'QUEST_DELETE') {
        useQuestsStore.getState().removeQuest(sessionId, payload.id, true);
      } else if (type === 'COMBAT_STATE_UPDATE') {
        useCombatStore.getState()._applySync(payload);
      }
    });

    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'MAP_CHANGE') {
        const map = maps.find(m => m.url === payload.url);
        if (map) {
          setCurrentMapId(map.id);
          if (isHost) broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name, id: map.id, grid_size: map.grid_size } });
        }
      } else if (type === 'MAP_UPDATE') {
        setMaps(payload);
        if (isHost) broadcast({ type: 'MAP_UPDATE', payload });
      } else if (type === 'REQUEST_CURRENT_MAP') {
        // ✅ Répondre à une demande de synchronisation (ex: fenêtre pop-out)
        channel.postMessage({ type: 'CURRENT_MAP_REPLY', payload: { currentMapId } });
      }
    };

    return () => {
      unsub();
      channel.close();
    };
  }, [onData, maps, addOrUpdateCharacter, removeCharacter, sessionId, characters, currentMapId, isHost, sendTo]);

  const handleSelectMap = (map: MapItem, global: boolean = false) => {
    setCurrentMapId(map.id);
    
    if (isMJ) {
      // 1. Fenêtre de projection externe (suit l'autoSync ou le double-clic forcé)
      if (autoSync || global) {
        const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
        channel.postMessage({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name, id: map.id, grid_size: map.grid_size } });
        channel.close();
      }

      // 2. Joueurs distants (P2P) -> UNIQUEMENT sur un double-clic (global = true)
      if (global) {
        broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name, id: map.id, grid_size: map.grid_size } });
      }
    }
  };

  const handleToggleHideMap = async (id: string, hidden: boolean) => {
    if (!isMJ) return;
    const updatedMaps = maps.map(m => m.id === id ? { ...m, is_hidden: hidden } : m);
    setMaps(updatedMaps);

    // Si la map devient cachée et que c'était la map actuelle, on repasse sur la scène initiale pour les joueurs
    if (hidden && currentMapId === id) {
        handleSelectMap(maps.find(m => m.id === 'initial-scene') || maps[0], true);
    }

    if (window.electronAPI) await window.electronAPI.addMap(sessionId, updatedMaps.find(m => m.id === id)!);
    if (isMJ) broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
  };

  const handleRemoveMap = async (id: string) => {
    if (!isMJ || id === 'initial-scene') return;
    
    const updatedMaps = maps.filter(m => m.id !== id);
    setMaps(updatedMaps);

    if (window.electronAPI) await window.electronAPI.removeMap(sessionId, id);
    
    // Si on supprime la map sur laquelle on est, on repasse sur la scène initiale
    if (currentMapId === id) {
        const fallbackMap = updatedMaps.find(m => m.id === 'initial-scene') || updatedMaps[0];
        if (fallbackMap) {
            handleSelectMap(fallbackMap, true);
        }
    }

    broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
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
          <CombatHUD sessionId={sessionId} />
          <PlayerHUD players={playersList} sessionId={sessionId} />
          <CharacterHUD sessionId={sessionId} />
          <div className="absolute inset-0 pointer-events-none z-[200]">
            {Object.entries(windows).map(([id, win]) => {
              const headerActions = id === 'scenes' && isMJ ? (
                <div className="flex items-center gap-1.5 mr-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.electronAPI) {
                        window.electronAPI.openExternalWindow('map', sessionId);
                      }
                    }}
                    className="p-1.5 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-gold-bright hover:border-gold-DEFAULT/40 transition-all"
                    title="Ouvrir le mode projection"
                  >
                    <MonitorPlay size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAutoSync(!autoSync);
                    }}
                    className={`p-1.5 rounded-full border transition-all ${
                      autoSync 
                        ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30' 
                        : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                    }`}
                    title={autoSync ? "Auto-Sync: Activé" : "Auto-Sync: Désactivé"}
                  >
                    {autoSync ? <Zap size={12} /> : <ZapOff size={12} />}
                  </button>
                </div>
              ) : null;

              const windowTitles: Record<string, string> = {
                scenes: 'Scènes',
                players: 'Liste',
                inventaire: 'Inventaire',
                bestiary: 'Bestiaire',
                dice: 'Dés',
                quests: 'Quêtes',
                skills: 'Compétences',
                character: 'Personnage',
                combat: 'Initiative'
              };

              return win.isOpen && (
                <DraggableWindow
                  key={id} id={id} title={windowTitles[id] || id} 
                  onClose={() => closeWindow(id as any)} 
                  onPopOut={() => handlePopOut(id)}
                  defaultPosition={win.position} 
                  onPositionChange={(x, y) => updatePosition(id as any, x, y)}
                  zIndex={win.zIndex + 200} 
                  onFocus={() => focusWindow(id as any)}
                  headerActions={headerActions}
                >
                  {id === 'scenes' && <SceneWindowContent sessionId={sessionId} scenes={maps} currentSceneId={currentMapId} onSelectScene={handleSelectMap} onAddScene={handleAddMap} onUpdateScene={handleUpdateMap} onToggleHide={handleToggleHideMap} onRemoveScene={handleRemoveMap} />}
                  {id === 'players' && <PlayerWindowContent players={playersList} sessionId={sessionId} />}
                  {id === 'inventaire' && <InventoryWindowContent sessionId={sessionId} />}
                  {id === 'bestiary' && <BestiaryWindowContent sessionId={sessionId} />}
                  {id === 'dice' && <DiceWindowContent sessionId={sessionId} />}
                  {id === 'quests' && <QuestsWindowContent sessionId={sessionId} />}
                  {id === 'skills' && <SkillsWindowContent sessionId={sessionId} />}
                  {id === 'character' && <CharacterSheetContent sessionId={sessionId} variant="window" />}
                  {id === 'combat' && <InitiativeWindowContent sessionId={sessionId} />}
                </DraggableWindow>
              );
            })}
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