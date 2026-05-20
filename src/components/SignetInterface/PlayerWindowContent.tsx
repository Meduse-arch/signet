import { useState, useEffect } from 'react';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useCharactersStore } from '../../store/characters';
import { useSessionStore } from '../../store/session';
import { useUIStore } from '../../store/ui';
import { usePeer } from '../../hooks/usePeer';
import { Shield, User, ChevronRight, Ghost, Settings, Plus, Package } from 'lucide-react';
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
  const { setCharacterManagement } = useUIStore();
  const characters = useCharactersStore(state => state.characters);
  const { addOrUpdateCharacter } = useCharactersStore();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();

  const [tokenStatus, setTokenStatus] = useState<Record<string, boolean>>({});

  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  // Sync token status
  useEffect(() => {
    if (!isMJ) return;
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    
    const askStatus = () => {
        players.forEach(p => {
            const char = characters.find(c => c.user_id === p.peer_id);
            if (char) {
                channel.postMessage({ type: 'GET_TOKEN_STATUS', payload: { id: char.id } });
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
            players.forEach(p => {
                const char = characters.find(c => c.user_id === p.peer_id);
                if (char) newStatus[char.id] = payload.tokens.includes(char.id);
            });
            setTokenStatus(newStatus);
        }
    };

    const interval = setInterval(askStatus, 5000);
    return () => {
        clearInterval(interval);
        channel.close();
    };
  }, [sessionId, isMJ, players, characters]);

  const handleToggleToken = (charId: string) => {
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    channel.postMessage({ type: 'TOGGLE_TOKEN', payload: { id: charId } });
    setTokenStatus(prev => ({ ...prev, [charId]: !prev[charId] }));
    channel.close();
  };

  const handleCreateSave = async (data: any) => {
    const newChar: Character = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      user_id: user?.id,
      name: data.name,
      image_url: data.image_url,
      stats: data.stats,
      skills: data.skills,
      bars: data.bars,
      type: 'Joueur'
    };

    if (window.electronAPI) {
      await updateSessionCharacter(
        newChar.id,
        newChar.name,
        newChar.stats,
        newChar.skills,
        newChar.bars,
        newChar.image_url,
        [],
        [],
        'Joueur'
      );
    }
    addOrUpdateCharacter(newChar);
    broadcast({ type: 'CHAR_UPDATE', payload: newChar });
  };

  return (
    <div className="flex flex-col gap-4">
      {players.map((player) => {
        const char = characters.find(c => c.user_id === player.peer_id);
        const isSelf = player.peer_id === user?.id;
        const playerIsMJ = player.role === SecurityLevel.MJ;

        return (
          <div key={player.peer_id} className={`group relative p-4 rounded-2xl border transition-all duration-300 ${isSelf ? 'bg-gold-DEFAULT/5 border-gold-DEFAULT/30 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'bg-black/40 border-white/5 hover:border-white/10'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center overflow-hidden bg-black transition-colors ${isSelf ? 'border-gold-DEFAULT' : 'border-white/10 group-hover:border-gold-DEFAULT/40'}`}>
                    {char?.image_url ? (
                      <img src={char.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className={isSelf ? 'text-gold-DEFAULT' : 'text-white/20'} size={24} />
                    )}
                  </div>
                  {playerIsMJ && (
                    <div className="absolute -top-1 -right-1 p-1 rounded-lg bg-gold-DEFAULT text-black border-2 border-[#0D0D0F]">
                      <Shield size={10} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`font-cinzel font-black text-sm uppercase tracking-widest ${isSelf ? 'text-gold-bright' : 'text-white/80'}`}>
                      {player.pseudo}
                    </span>
                    {isSelf && <span className="text-[8px] px-1.5 py-0.5 rounded bg-gold-DEFAULT text-black font-black uppercase tracking-tighter">Moi</span>}
                  </div>
                  <span className="text-[10px] font-mono text-white/30 uppercase tracking-tighter">
                    {char ? char.name : 'En attente d\'incarnation...'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isMJ && char && (
                  <>
                    <button 
                      onClick={() => handleToggleToken(char.id)}
                      className={`p-3 rounded-xl transition-all ${tokenStatus[char.id] ? 'bg-gold-DEFAULT text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                      title={tokenStatus[char.id] ? "Retirer de la carte" : "Placer sur la carte"}
                    >
                      <Plus size={20} className={`transition-transform duration-500 ${tokenStatus[char.id] ? 'rotate-45' : ''}`} />
                    </button>
                    <button 
                      onClick={() => setCharacterManagement(char.id)}
                      className="p-3 rounded-xl bg-gold-DEFAULT/10 text-gold-DEFAULT border border-gold-DEFAULT/30 hover:bg-gold-DEFAULT/20 transition-all"
                      title="Gérer le voyageur"
                    >
                      <Settings size={20} />
                    </button>
                  </>
                )}
                {char && (
                  <div className="flex items-center gap-4 px-6 py-2 rounded-xl bg-black/40 border border-white/5 group-hover:border-gold-DEFAULT/20 transition-colors">
                    {Object.entries(char.bars).filter(([key]) => !key.startsWith('max')).map(([key, val]) => {
                      const barDef = session?.settings?.bars?.find(b => b.id === key) || { color: '#fff' };
                      return (
                        <div key={key} className="flex flex-col items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: barDef.color, color: barDef.color }} />
                          <span className="text-[10px] font-mono text-white/60">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!char && isSelf && (
                  <CreateCharacterModal 
                    onClose={() => {}} 
                    onSave={handleCreateSave} 
                    settings={session?.settings}
                  />
                )}
              </div>
            </div>
          </div>
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