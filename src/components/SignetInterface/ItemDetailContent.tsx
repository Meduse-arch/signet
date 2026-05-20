import React from 'react';
import { Shield, Star, Sword, Package, Trash2, Hammer, Zap } from 'lucide-react';
import { Item } from '../../services/items.service';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';

interface ItemDetailContentProps {
  item: any;
  character?: any;
  onToggleEquip?: () => void;
  onUse?: () => void;
  isMJ?: boolean;
}

export function ItemDetailContent({ item, character, onToggleEquip, onUse, isMJ }: ItemDetailContentProps) {
  if (!item) return (
    <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
      <Package size={64} className="mb-4 text-gold-DEFAULT" />
      <span className="font-cinzel tracking-widest uppercase text-gold-bright text-xs">Sélectionnez une relique</span>
    </div>
  );

  const isEquipped = item.equipped;
  const isConsumable = item.category === 'Consommable';

  const getTargetName = (m: any) => {
    if (m.target === 'stat') return DEFAULT_STATS.find(s => s.id === m.targetId)?.name || m.targetId;
    return (DEFAULT_BARS.find(b => b.id === m.targetId)?.name || m.targetId) + (m.targetProperty === 'max' ? ' Max' : '');
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300 bg-[#0D0D0F]">
      {/* ... (header code) ... */}
      <div 
        className="relative h-48 shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          background: 'rgba(14, 11, 6, 0.55)',
          backdropFilter: 'blur(16px) saturate(160%)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.35)',
          boxShadow: 'inset 0 1px 0 rgba(255,215,0,0.12), 0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {item.image_url ? (
          <>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" style={{ backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2 }} />
            <img src={item.image_url} alt="" className="relative z-10 w-full h-full object-contain p-4 drop-shadow-2xl" />
          </>
        ) : (
          <Package size={60} className="text-gold-DEFAULT/10 relative z-10" />
        )}
        
        {/* Shimmer sweep effect */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-tr from-white/10 via-transparent to-transparent z-20" />
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] via-[#0D0D0F]/40 to-transparent z-20" />
        
        <div className="absolute bottom-4 left-6 right-6 z-30">
           <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-gold-DEFAULT/20 text-gold-bright text-[8px] font-cinzel font-black tracking-widest uppercase border border-gold-DEFAULT/30 backdrop-blur-sm">
                  {item.category}
                </span>
                {isEquipped && <Star size={14} className="text-gold-bright animate-pulse" />}
              </div>
              {item.quantity > 1 && (
                <span className="text-gold-bright font-cinzel font-black text-xs">
                  POSSÉDÉ x{item.quantity}
                </span>
              )}
           </div>
           <h2 className="text-xl font-cinzel font-black text-white uppercase tracking-tighter drop-shadow-lg leading-none truncate">
             {item.name}
           </h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-6 flex flex-col gap-6 h-full overflow-hidden">
          {/* Description - Fixed height scrollable container */}
          <div className="relative shrink-0 max-h-32 overflow-y-auto custom-scrollbar pr-2">
             <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gold-DEFAULT/30" />
             <p className="font-garamond italic text-base text-white/70 leading-relaxed pl-2 whitespace-pre-wrap">
               "{item.description}"
             </p>
          </div>

          {/* Modifiers - Flexible scrollable container */}
          {item.modifiers && item.modifiers.length > 0 ? (
            <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
              <h4 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-[0.2em] flex items-center gap-2 shrink-0">
                <Zap size={12} className="text-gold-bright animate-pulse" /> PROPRIÉTÉS MAGIQUES
              </h4>
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1 min-h-0 pb-4">
                {item.modifiers.map((m: any, i: number) => (
                  <div 
                    key={i} 
                    className="relative group p-4 rounded-xl transition-all overflow-hidden shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(212,175,55,0.02) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.05)',
                    }}
                  >
                    {/* Subtle magical glow background */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gold-DEFAULT/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-gold-DEFAULT/10 transition-colors" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-cinzel font-black text-white/80 uppercase tracking-widest">{getTargetName(m)}</span>
                        <span className="text-[8px] font-mono text-gold-DEFAULT/40 uppercase tracking-tighter">
                          {m.target === 'stat' ? 'Attribut' : (item.category === 'Arme' ? 'Attribut (Arme)' : 'Ressource')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="h-px w-8 bg-gold-DEFAULT/20" />
                         <span className="text-sm font-cinzel font-black text-gold-bright drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                           {m.mode === 'dice' ? m.formula : `${m.value >= 0 ? '+' : ''}${m.value}${m.mode === 'percent' ? '%' : ''}`}
                         </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10">
              <Sparkles size={48} className="mb-4" />
              <span className="text-[10px] font-cinzel tracking-widest uppercase">Aucun enchantement</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {character && (
        <div className="p-6 pt-4 shrink-0 border-t border-white/5 bg-black/40 backdrop-blur-xl">
          {isConsumable ? (
            <button 
              onClick={onUse}
              className="w-full py-4 rounded-xl font-cinzel font-black text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 border shadow-xl bg-gold-bright text-black border-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            >
              <Zap size={14} />
              UTILISER LA RELIQUE
            </button>
          ) : onToggleEquip && (
            <button 
              onClick={onToggleEquip}
              className={`w-full py-4 rounded-xl font-cinzel font-black text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 border shadow-xl ${
                isEquipped 
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                : 'bg-gold-DEFAULT text-black border-gold-DEFAULT hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]'
              }`}
            >
              <Shield size={14} />
              {isEquipped ? 'DÉSÉQUIPER' : 'ÉQUIPER LA RELIQUE'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
}
