import React from 'react';
import { X, Shield, Star, Sword, Package, Trash2, Hammer, Zap } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useCharactersStore } from '../../store/characters';
import { usePeer } from '../../hooks/usePeer';
import { addSessionCharacter } from '../../services/characters.service';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';

export function ItemDetailModal({ sessionId }: { sessionId: string }) {
  const { selectedItem, itemDetailOpen, setSelectedItem } = useUIStore();
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const { broadcast } = usePeer();

  if (!itemDetailOpen || !selectedItem) return null;

  const character = characters.find(c => controlledCharacterId ? c.id === controlledCharacterId : c.user_id === user?.id);
  const isEquipped = selectedItem.equipped;

  const handleToggleEquip = async () => {
    if (!character) return;
    const updatedChar = {
      ...character,
      inventory: (character.inventory || []).map((i: any) => 
        (i.instanceId === selectedItem.instanceId || i.id === selectedItem.id) ? { ...i, equipped: !i.equipped } : i
      )
    };
    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
    setSelectedItem({ ...selectedItem, equipped: !selectedItem.equipped });
  };

  const getTargetName = (m: any) => {
    if (m.target === 'stat') return DEFAULT_STATS.find(s => s.id === m.targetId)?.name || m.targetId;
    return (DEFAULT_BARS.find(b => b.id === m.targetId)?.name || m.targetId) + (m.targetProperty === 'max' ? ' Max' : '');
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(212,175,55,0.2)] overflow-hidden flex flex-col">
        
        {/* Header Image/Icon */}
        <div className="relative h-48 bg-black/60 flex items-center justify-center border-b border-white/10">
          {selectedItem.image_url ? (
            <img src={selectedItem.image_url} alt="" className="w-full h-full object-cover opacity-60" />
          ) : (
            <Package size={80} className="text-gold-DEFAULT/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] to-transparent" />
          
          <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white/60 hover:text-white transition-colors border border-white/10 backdrop-blur-sm">
            <X size={20} />
          </button>

          <div className="absolute bottom-4 left-6 right-6">
             <div className="flex items-center gap-3 mb-1">
                <span className="px-2 py-0.5 rounded bg-gold-DEFAULT/20 text-gold-bright text-[8px] font-cinzel font-black tracking-widest uppercase border border-gold-DEFAULT/30">
                  {selectedItem.category}
                </span>
                {isEquipped && <Star size={14} className="text-gold-bright animate-pulse" />}
             </div>
             <h2 className="text-2xl font-cinzel font-black text-white uppercase tracking-tighter drop-shadow-lg leading-none">
               {selectedItem.name}
             </h2>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          {/* Description */}
          <div className="relative">
             <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gold-DEFAULT/30" />
             <p className="font-garamond italic text-lg text-white/70 leading-relaxed pl-2">
               "{selectedItem.description}"
             </p>
          </div>

          {/* Modifiers */}
          {selectedItem.modifiers && selectedItem.modifiers.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-[0.2em] flex items-center gap-2">
                <Zap size={12} /> PROPRIÉTÉS MAGIQUES
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedItem.modifiers.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded-lg">
                    <span className="text-[9px] font-cinzel text-white/50">{getTargetName(m)}</span>
                    <span className="text-[10px] font-cinzel font-black text-gold-bright">
                      {m.mode === 'dice' ? m.formula : `${m.value >= 0 ? '+' : ''}${m.value}${m.mode === 'percent' ? '%' : ''}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 mt-auto">
          {character && (
            <button 
              onClick={handleToggleEquip}
              className={`w-full py-3 rounded-xl font-cinzel font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 border ${
                isEquipped 
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                : 'bg-gold-DEFAULT text-black border-gold-DEFAULT hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]'
              }`}
            >
              <Shield size={16} />
              {isEquipped ? 'DÉSÉQUIPER' : 'ÉQUIPER LA RELIQUE'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
