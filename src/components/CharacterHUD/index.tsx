import { useState } from 'react';
import { Shield, Zap, Heart, Plus, Activity } from 'lucide-react';
import { useCharactersStore } from '../../store/characters';
import { usePeersStore } from '../../store/peers';
import { useSessionStore } from '../../store/session';
import { usePeer } from '../../hooks/usePeer';
import { CreateCharacterModal } from '../CreateCharacterModal';
import { useAuthStore } from '../../store/auth';
import { addSessionCharacter, Character } from '../../services/characters.service';
import { DEFAULT_BARS } from '../../systems/seal/constants';

interface CharacterHUDProps {
  sessionId: string;
}

export function CharacterHUD({ sessionId }: CharacterHUDProps) {
  const { user } = useAuthStore();
  const { peerId } = usePeersStore();
  const { characters, addOrUpdateCharacter } = useCharactersStore();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Trouver le personnage de l'utilisateur actuel
  const myCharacter = characters.find(c => c.user_id === user?.id);

  const handleCreateSave = async (data: { name: string; stats: Record<string, number>; bars: Record<string, number> }) => {
    const newChar: Character = {
      id: myCharacter?.id || crypto.randomUUID(),
      session_id: sessionId,
      user_id: user?.id,
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
    
    // Broadcast via P2P (sera reçu par le MJ ou les autres joueurs via SealEngine)
    broadcast({ type: 'CHAR_UPDATE', payload: newChar });
    
    // Broadcast local (si plusieurs fenêtres sur la même machine)
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
  const barDefs = session?.settings?.bars || DEFAULT_BARS;

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
        {barDefs.map((bar: any) => {
          const Icon = bar.id === 'hp' ? Heart : bar.id === 'mana' ? Zap : bar.id === 'stam' ? Shield : Activity;
          const maxVal = bars[`max${bar.id.charAt(0).toUpperCase()}${bar.id.slice(1)}`] || bars[bar.id] || 1;
          const currentVal = bars[bar.id] || 0;
          const percent = Math.min(100, Math.max(0, (currentVal / maxVal) * 100));

          return (
            <div key={bar.id} className="flex items-center gap-3">
              <Icon className="w-3.5 h-3.5 drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]" style={{ color: bar.color }} />
              <div className="flex-1 h-1.5 bg-black/60 rounded-full border border-white/5 overflow-hidden relative">
                <div 
                  className="absolute top-0 left-0 h-full transition-all duration-500" 
                  style={{ 
                    width: `${percent}%`, 
                    backgroundColor: bar.color,
                    boxShadow: `0 0 10px ${bar.color}88`
                  }} 
                />
              </div>
              <span className="w-8 text-right text-[10px] font-mono text-white/90 drop-shadow-md">{Math.floor(currentVal)}</span>
            </div>
          );
        })}
      </div>
      
      {isModalOpen && (
        <CreateCharacterModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleCreateSave}
          initialStats={myCharacter.stats}
          initialName={myCharacter.name}
          title={`Modifier ${name}`}
          settings={session?.settings}
        />
      )}
    </div>
  );
}
