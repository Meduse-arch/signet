import { useState, useEffect } from 'react';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useCharactersStore } from '../../store/characters';
import { useSessionStore } from '../../store/session';
import { usePeer } from '../../hooks/usePeer';
import { Shield, User, ChevronRight, Ghost, Settings, Plus } from 'lucide-react';
import { Character, updateSessionCharacter } from '../../services/characters.service';
import { CreateCharacterModal } from '../CreateCharacterModal';

interface Player {
  peer_id: string;
  pseudo: string;
  role?: number;
}

interface PlayerWindowContentProps {
  players: Player[];
  sessionId: string;
}

export function PlayerWindowContent({ players, sessionId }: PlayerWindowContentProps) {
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { characters, controlledCharacterId, setPnjControle, addOrUpdateCharacter } = useCharactersStore();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();
  const [isEditing, setIsEditing] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<Record<string, boolean>>({});

  // Écouter le status des tokens depuis le Board
  useEffect(() => {
    if (!isMJ) return;
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    
    const askStatus = () => {
        characters.forEach(c => {
            if (!c.is_template) {
                channel.postMessage({ type: 'GET_TOKEN_STATUS', payload: { id: c.id } });
            }
        });
    };

    askStatus();

    channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'TOKEN_STATUS_RESPONSE') {
            setTokenStatus(prev => ({ ...prev, [payload.id]: payload.isOnMap }));
        } else if (type === 'TOKEN_LIST_UPDATE') {
            const newStatus: Record<string, boolean> = {};
            characters.forEach(c => {
                newStatus[c.id] = payload.tokens.includes(c.id);
            });
            setTokenStatus(newStatus);
        }
    };

    const interval = setInterval(askStatus, 5000);

    return () => {
        clearInterval(interval);
        channel.close();
    };
  }, [sessionId, isMJ, characters]);

  const handleToggleToken = (charId: string) => {
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    channel.postMessage({ type: 'TOGGLE_TOKEN', payload: { id: charId } });
    setTokenStatus(prev => ({ ...prev, [charId]: !prev[charId] }));
    channel.close();
  };

  const getRoleLabel = (role?: number) => {
    if (role === SecurityLevel.ADMIN) return 'ADMINISTRATEUR';
    if (role === SecurityLevel.MJ) return 'MAÎTRE DE JEU';
    return 'INITIÉ';
  };

  const handleSavePlayer = async (data: {
    name: string;
    image_url?: string;
    stats: Record<string, number>;
    skills: Record<string, number>;
    bars: Record<string, number>;
  }) => {
    const char = characters.find(c => selectedPlayer ? c.user_id === players.find(p => p.pseudo === selectedPlayer.pseudo)?.peer_id : c.user_id === user?.id);
    if (!char) return;

    const updatedChar: Character = {
      ...char,
      name: data.name,
      image_url: data.image_url,
      stats: data.stats,
      skills: data.skills,
      bars: data.bars
    };

    if (window.electronAPI) {
      await updateSessionCharacter(updatedChar.id, updatedChar.name, updatedChar.stats, updatedChar.skills, updatedChar.bars, updatedChar.image_url);
    }

    addOrUpdateCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
    
    setIsEditing(false);
  };

  // Vue Fiche de Personnage
  const renderCharacterSheet = (player: Player | null) => {
    const pseudo = player ? player.pseudo : user?.pseudo || 'Inconnu';
    const isMe = !player || player.pseudo === user?.pseudo;
    
    const char = characters.find(c => player ? c.user_id === players.find(p => p.pseudo === player.pseudo)?.peer_id : c.user_id === user?.id);
    const isPossessed = char && controlledCharacterId === char.id;

    return (
      <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Header Fiche */}
        <div className="flex items-center justify-between border-b border-gold-DEFAULT/20 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
                <div className="w-14 h-14 rounded-full bg-black/60 border border-gold-DEFAULT/40 flex items-center justify-center shadow-[inset_0_0_15px_rgba(212,175,55,0.2)] overflow-hidden">
                {char?.image_url ? (
                    <img src={char.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-2xl font-cinzel text-gold-bright drop-shadow-md">
                    {pseudo.substring(0, 1).toUpperCase()}
                    </span>
                )}
                </div>
                {/* Token Toggle Button on Portrait */}
                {isMJ && char && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleToken(char.id); }}
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0D0D0F] shadow-lg transition-all flex items-center justify-center ${
                            tokenStatus[char.id]
                            ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                            : 'bg-black/80 text-gold-DEFAULT border-gold-DEFAULT/40 hover:border-gold-DEFAULT'
                        }`}
                        title={tokenStatus[char.id] ? "Bannir la figurine du plateau" : "Invoquer sur le plateau"}
                    >
                        <Plus size={12} className={`transition-transform duration-500 ${tokenStatus[char.id] ? 'rotate-45' : ''}`} />
                    </button>
                )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-cinzel font-black text-gold-DEFAULT tracking-widest drop-shadow-md uppercase truncate" title={pseudo}>
                {pseudo}
              </h2>
              <p className="text-[10px] text-white/50 font-serif italic truncate">
                {isMe ? "Votre personnage" : "Voyageur de l'Archive"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isMJ && char && (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-3 rounded-xl bg-gold-DEFAULT/10 text-gold-DEFAULT border border-gold-DEFAULT/30 hover:bg-gold-DEFAULT/20 transition-all"
                  title="Gérer le voyageur"
                >
                  <Settings size={20} />
                </button>
                <button 
                  onClick={() => setPnjControle(isPossessed ? null : char.id)}
                  className={`p-3 rounded-xl transition-all ${
                    isPossessed 
                      ? 'bg-gold-DEFAULT text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                      : 'bg-gold-DEFAULT/10 text-gold-DEFAULT border border-gold-DEFAULT/30 hover:bg-gold-DEFAULT/20'
                  }`}
                  title={isPossessed ? "Relâcher la possession" : "Posséder ce voyageur"}
                >
                  <Ghost size={20} className={isPossessed ? 'animate-pulse' : ''} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats de base */}
        <div className="space-y-4">
          {char ? (
            Object.entries(char.bars).map(([key, val]) => {
              if (key.startsWith('max')) return null;
              const max = char.bars[`max${key.charAt(0).toUpperCase()}${key.slice(1)}`] || val;
              const percent = (val / max) * 100;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-white/70">
                    <span className="uppercase">{key}</span>
                    <span>{val} / {max}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gold-DEFAULT transition-all duration-500" 
                      style={{ width: `${percent}%`, filter: 'drop-shadow(0 0 5px var(--color-gold))' }} 
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-center text-white/30 italic">Aucune donnée occulte trouvée...</p>
          )}
        </div>

        {/* Section Infos */}
        <div className="p-4 rounded-xl bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 min-h-[100px]">
          <p className="text-[10px] font-cinzel text-gold-DEFAULT/60 uppercase tracking-widest mb-2">Inventaire</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square rounded-lg bg-black/40 border border-white/5 flex items-center justify-center opacity-20">
                <Shield size={16} />
              </div>
            ))}
          </div>
          <p className="text-[8px] text-center text-gold-DEFAULT/30 font-serif italic mt-4">
            Système d'inventaire en cours d'éveil...
          </p>
        </div>
        
        {isEditing && char && (
          <CreateCharacterModal 
            onClose={() => setIsEditing(false)}
            onSave={handleSavePlayer}
            initialName={char.name}
            initialImageUrl={char.image_url}
            initialStats={char.stats}
            initialSkills={char.skills}
            title={`Gérer ${char.name}`}
            settings={session?.settings}
          />
        )}
      </div>
    );
  };

  // Si on est joueur, on voit direct sa propre fiche
  if (!isMJ) {
    return renderCharacterSheet(null);
  }

  // Si on est MJ et qu'on a cliqué sur un joueur
  if (isMJ && selectedPlayer) {
    return (
      <div className="flex flex-col h-full">
        <button 
          onClick={() => setSelectedPlayer(null)}
          className="self-start mb-4 text-[10px] font-cinzel text-gold-DEFAULT hover:text-gold-bright transition-colors uppercase tracking-widest flex items-center"
        >
          <ChevronRight className="w-3 h-3 rotate-180" />
          Retour à la liste
        </button>
        {renderCharacterSheet(selectedPlayer)}
      </div>
    );
  }

  // Si on est MJ et qu'on regarde la liste
  return (
    <div className="flex flex-col gap-2">
      {players.map((p) => {
        const char = characters.find(c => c.user_id === p.peer_id);
        return (
            <button
            key={p.peer_id}
            onClick={() => setSelectedPlayer(p)}
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-gold-DEFAULT/20 hover:bg-gold-DEFAULT/10 hover:border-gold-DEFAULT/40 transition-all group text-left min-w-0"
            >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-black/60 border border-gold-DEFAULT/30 flex items-center justify-center group-hover:border-gold-bright transition-colors">
                        {char?.image_url ? (
                            <img src={char.image_url} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <User className="w-4 h-4 text-gold-DEFAULT group-hover:text-gold-bright" />
                        )}
                    </div>
                    {/* Token Toggle Button on Portrait in List */}
                    {isMJ && char && (
                        <div 
                            onClick={(e) => { e.stopPropagation(); handleToggleToken(char.id); }}
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0D0D0F] shadow-lg transition-all flex items-center justify-center ${
                                tokenStatus[char.id]
                                ? 'bg-gold-DEFAULT text-black shadow-[0_0_10px_rgba(212,175,55,0.4)]' 
                                : 'bg-black/80 text-gold-DEFAULT border-gold-DEFAULT/40 hover:border-gold-DEFAULT'
                            }`}
                            title={tokenStatus[char.id] ? "Bannir la figurine du plateau" : "Invoquer sur le plateau"}
                        >
                            <Plus size={8} className={`transition-transform duration-500 ${tokenStatus[char.id] ? 'rotate-45' : ''}`} />
                        </div>
                    )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-cinzel font-bold text-white/90 group-hover:text-white drop-shadow-md truncate" title={p.pseudo}>
                    {p.pseudo}
                </span>
                <span className="text-[9px] text-white/40 font-mono truncate">
                    {getRoleLabel(p.role)}
                </span>
                </div>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-gold-DEFAULT/50 group-hover:text-gold-bright transition-colors ml-2" />
            </button>
        );
      })}
      {players.length === 0 && (
        <p className="text-xs text-center text-gold-DEFAULT/50 font-serif italic py-8">
          Aucun voyageur connecté...
        </p>
      )}
    </div>
  );
}
