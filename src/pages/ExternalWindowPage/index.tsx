import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  SceneWindowContent, 
  CharacterSheetContent, 
  DiceWindowContent, 
  BestiaryWindowContent, 
  InventoryWindowContent, 
  ItemCreationModal, 
  ItemDetailModal,
  ManageCharacterModal,
  PlayerWindowContent,
  SkillsWindowContent,
  SkillCreationModal,
  QuestsWindowContent,
  QuestCreationModal
} from '../../components/SignetInterface';
import { DiceRollModal } from '../../components/DiceRollModal';
import { usePeer } from '../../hooks/usePeer';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useSkillsStore } from '../../store/skills';
import { useQuestsStore } from '../../store/quests';
import { useTagsStore } from '../../store/tags';
import { useUIStore } from '../../store/ui';
import { getSessionPlayers } from '../../services/session.service';
import { getSessionMaps, addSessionMap } from '../../services/maps.service';
import { getSessionCharacters } from '../../services/characters.service';
import { MapItem } from '../../components/BoardCanvas';
import { useSession } from '../../hooks/useSession';

export function ExternalWindowPage() {
  const { type, sessionId } = useParams<{ type: string; sessionId: string }>();
  const { onData, broadcast, init } = usePeer();
  const user = useAuthStore(state => state.user);
  const addOrUpdateCharacter = useCharactersStore(state => state.addOrUpdateCharacter);
  const initChars = useCharactersStore(state => state.initialize);
  const initItems = useItemsStore(state => state.initialize);
  const initSkills = useSkillsStore(state => state.initialize);
  const initTags = useTagsStore(state => state.initialize);
  const { characterManagementId, setCharacterManagement } = useUIStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  
  // Important: charge les sessions pour trouver le Host Peer ID
  const { sessions, isLoading: sessionsLoading } = useSession();
  
  const [players, setPlayers] = useState<{ peer_id: string; pseudo: string }[]>([]);
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string>('');

  // Initialisation des données personnages et objets depuis le storage
  useEffect(() => {
    if (sessionId) {
      initChars(sessionId);
      initItems(sessionId);
      initSkills(sessionId);
      initTags(sessionId);
      initQuests(sessionId);
    }
  }, [sessionId, initChars, initItems, initSkills, initTags, initQuests]);

  // Initialisation P2P pour rester synchronisé (Live Sync)
  useEffect(() => {
    const setup = async () => {
      if (!sessionId || !type || sessionsLoading) return;
      
      const session = sessions.find(s => s.id === sessionId);
      const hostId = session?.hostPeerId;
      
      if (hostId) {
        console.log('[ExternalWindow] Syncing with host:', hostId);
        // Toujours se connecter comme client (false) pour les fenêtres externes
        await init(false, hostId, `ext-${type}-${Math.random().toString(36).substr(2, 5)}`);
      }
    };
    setup();
  }, [sessionId, type, init, sessions, sessionsLoading]);

  // Chargement initial des données statiques
  useEffect(() => {
    const loadData = async () => {
      if (!sessionId) return;

      if (window.electronAPI) {
        try {
          const dbMaps = await getSessionMaps(sessionId);
          if (dbMaps.length > 0) {
            setMaps(dbMaps);
          } else {
            const savedMaps = localStorage.getItem(`maps_${sessionId}`);
            if (savedMaps) setMaps(JSON.parse(savedMaps));
          }

          const dbChars = await getSessionCharacters(sessionId);
          if (dbChars.length > 0) {
            useCharactersStore.getState().setCharacters(dbChars);
          }
        } catch (e) {
          const savedMaps = localStorage.getItem(`maps_${sessionId}`);
          if (savedMaps) setMaps(JSON.parse(savedMaps));
        }
      } else {
        const savedMaps = localStorage.getItem(`maps_${sessionId}`);
        if (savedMaps) setMaps(JSON.parse(savedMaps));
      }

      const lastActive = localStorage.getItem(`active_map_${sessionId}`);
      if (lastActive) setCurrentMapId(lastActive);

      const list = await getSessionPlayers(sessionId);
      setPlayers(list);
    };
    loadData();
  }, [sessionId]);

  // Écoute des mises à jour temps réel (via P2P)
  useEffect(() => {
    const unsub = onData((data) => {
      if (data.type === 'PLAYER_LIST') {
        setPlayers(data.payload);
      } else if (data.type === 'MAP_CHANGE') {
        const targetUrl = data.payload.url;
        const map = maps.find((m: MapItem) => m.url === targetUrl);
        if (map) {
          setCurrentMapId(map.id);
          if (sessionId) localStorage.setItem(`active_map_${sessionId}`, map.id);
        }
      } else if (data.type === 'MAP_UPDATE') {
        setMaps(data.payload);
      } else if (data.type === 'CHAR_UPDATE') {
        addOrUpdateCharacter(data.payload);
      }
    });
    return () => unsub();
  }, [onData, sessionId, maps, addOrUpdateCharacter]);

  const handleSelectMap = (map: MapItem) => {
    if (!sessionId) return;
    setCurrentMapId(map.id);
    localStorage.setItem(`active_map_${sessionId}`, map.id);

    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.postMessage({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
    channel.close();

    if (isMJ) {
      broadcast({ type: 'MAP_CHANGE', payload: { url: map.url, name: map.name } });
    }
  };

  const handleAddMap = async (name: string, url: string) => {
    if (!sessionId) return;
    const newMap = { id: Math.random().toString(36).substring(2, 9), name, url };
    const updatedMaps = [...maps, newMap];
    setMaps(updatedMaps);
    
    if (window.electronAPI) {
      await addSessionMap(sessionId, newMap);
    } else {
      localStorage.setItem(`maps_${sessionId}`, JSON.stringify(updatedMaps));
    }

    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.postMessage({ type: 'MAP_UPDATE', payload: updatedMaps });
    channel.close();

    if (isMJ) {
      broadcast({ type: 'MAP_UPDATE', payload: updatedMaps });
    }
  };

  // Sync avec l'app principale via BroadcastChannel
  useEffect(() => {
    if (!sessionId) return;
    const channel = new BroadcastChannel(`signet_sync_${sessionId}`);
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'MAP_CHANGE') {
        const map = maps.find((m: MapItem) => m.url === payload.url);
        if (map) setCurrentMapId(map.id);
      } else if (type === 'MAP_UPDATE') {
        setMaps(payload);
      }
    };
    return () => channel.close();
  }, [sessionId, maps]);

  if (!sessionId || !type) return null;

  return (
    <div className="w-full h-full bg-transparent text-[#e8d5a0] p-4 overflow-hidden flex flex-col relative">
       {/* Golden Corners */}
       <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gold-DEFAULT/50 pointer-events-none z-10" />
       <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gold-DEFAULT/50 pointer-events-none z-10" />

       <div className="flex-1 custom-scrollbar overflow-y-auto flex flex-col">
          {type === 'scenes' && (
            <SceneWindowContent 
              scenes={maps}
              currentSceneId={currentMapId}
              onSelectScene={handleSelectMap}
              onAddScene={handleAddMap}
            />
          )}

          {type === 'players' && (
            <PlayerWindowContent players={players} sessionId={sessionId} />
          )}

          {type === 'character' && (
            <CharacterSheetContent sessionId={sessionId} variant="window" />
          )}

          {type === 'dice' && (
            <DiceWindowContent sessionId={sessionId} />
          )}

          {type === 'quests' && (
             <QuestsWindowContent sessionId={sessionId} />
          )}

          {type === 'skills' && (
             <SkillsWindowContent sessionId={sessionId} />
          )}

          {type === 'assets' && (
             <InventoryWindowContent sessionId={sessionId} />
          )}

          {type === 'bestiary' && (
             <BestiaryWindowContent sessionId={sessionId} />
          )}
       </div>

       <DiceRollModal />
       <ItemCreationModal sessionId={sessionId} />
       <ItemDetailModal sessionId={sessionId} />
       <SkillCreationModal sessionId={sessionId} />
       <QuestCreationModal sessionId={sessionId} />
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
