import { useState } from 'react';
import { Shield, Zap, Heart, Plus } from 'lucide-react';
import { useCharactersStore } from '../../store/characters';
import { usePeersStore } from '../../store/peers';
import { useSessionStore } from '../../store/session';
import { CreateCharacterModal } from '../CreateCharacterModal';
import { addSessionCharacter } from '../../services/characters.service';

interface CharacterHUDProps {
  sessionId: string;
}

export function CharacterHUD({ sessionId }: CharacterHUDProps) {
  const { peerId } = usePeersStore();
  const { characters, addOrUpdateCharacter } = useCharactersStore();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Trouver le personnage de l'utilisateur actuel
  const myCharacter = characters.find(c => c.peer_id === peerId);

  const handleCreateSave = async (data: { name: string; stats: Record<string, number>; bars: Record<string, number> }) => {
    const newChar = {
      id: Math.random().toString(36).substring(2, 9),
      session_id: sessionId,
      peer_id: peerId!,
      name: data.name,
      stats: data.stats,
      bars: data.bars
    };

    // Persistence locale (si Electron et MJ)
    if (window.electronAPI) {
      await addSessionCharacter(newChar);
    }

    // Mise à jour store local
    addOrUpdateCharacter(newChar);
    
    // Broadcast via P2P (sera géré par SealEngine)
    const channel = new BroadcastChannel(`signet_char_sync_${sessionId}`);
    channel.postMessage({ type: 'CHAR_UPDATE', payload: newChar });
    channel.close();
    
    setIsModalOpen(false);
  };

  if (!myCharacter) {
    return (
      <>
        <div className="absolute bottom-10 left-10 z-[60] pointer-events-auto">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/40 hover:border-gold-DEFAULT/80 hover:bg-[#0D0D0F]/90 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          >
            <div className="w-8 h-8 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4 text-gold-DEFAULT drop-shadow-md group-hover:text-gold-bright" />
            </div>
            <span className="text-gold-DEFAULT drop-shadow-md group-hover:text-gold-bright text-[10px] font-cinzel font-black tracking-widest uppercase transition-colors">
              Créer Personnage
            </span>
          </button>
        </div>
        {isModalOpen && (
          <CreateCharacterModal 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleCreateSave} 
            settings={session?.settings}
          />
        )}
      </>
    );
  }

  const { bars, name } = myCharacter;

  return (
    <div className="absolute bottom-10 left-10 z-[60] pointer-events-auto flex items-center gap-6 p-4 rounded-[2rem] bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/30 shadow-[0_4px_30px_rgba(0,0,0,0.6)] group hover:border-gold-DEFAULT/50 transition-colors">
      {/* Avatar / Class icon */}
      <div className="relative cursor-pointer" onClick={() => setIsModalOpen(true)}>
        <div className="absolute inset-[-6px] rounded-full border border-gold-DEFAULT/20 group-hover:border-gold-DEFAULT/60 group-hover:rotate-180 transition-all duration-1000 ease-linear" />
        <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-gold-DEFAULT/40 flex items-center justify-center shadow-[inset_0_0_15px_rgba(212,175,55,0.2)]">
          <span className="text-2xl font-cinzel text-gold-bright drop-shadow-md">{name.substring(0, 1).toUpperCase()}</span>
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0D0D0F] border border-gold-DEFAULT/40 flex items-center justify-center font-bold text-[9px] text-gold-bright font-mono drop-shadow-md shadow-[0_0_10px_rgba(212,175,55,0.2)]">
          1
        </div>
      </div>

      {/* Stats bars */}
      <div className="flex flex-col gap-2.5 w-48 pt-1">
        {/* HP */}
        <div className="flex items-center gap-3">
          <Heart className="w-3.5 h-3.5 text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
          <div className="flex-1 h-1.5 bg-black/60 rounded-full border border-red-500/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] transition-all duration-500" style={{ width: `${(bars.hp / bars.maxHp) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-[10px] font-mono text-white/90 drop-shadow-md">{Math.floor(bars.hp)}</span>
        </div>
        {/* Mana */}
        <div className="flex items-center gap-3">
          <Zap className="w-3.5 h-3.5 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
          <div className="flex-1 h-1.5 bg-black/60 rounded-full border border-blue-400/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] transition-all duration-500" style={{ width: `${(bars.mana / bars.maxMana) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-[10px] font-mono text-white/90 drop-shadow-md">{Math.floor(bars.mana)}</span>
        </div>
        {/* Stamina */}
        <div className="flex items-center gap-3">
          <Shield className="w-3.5 h-3.5 text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
          <div className="flex-1 h-1.5 bg-black/60 rounded-full border border-green-400/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)] transition-all duration-500" style={{ width: `${(bars.stam / bars.maxStam) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-[10px] font-mono text-white/90 drop-shadow-md">{Math.floor(bars.stam)}</span>
        </div>
      </div>
      
      {isModalOpen && (
        <CreateCharacterModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleCreateSave}
          initialStats={myCharacter.stats}
          title={`Modifier ${name}`}
          settings={session?.settings}
        />
      )}
    </div>
  );
}
