import React from 'react';
import { Shield, Star, Sword, Package, Trash2, Hammer, Zap, Sparkles } from 'lucide-react';
import { Item } from '../../services/items.service';
import { useItemsStore } from '../../store/items';
import { useCharactersStore } from '../../store/characters';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { AssetImage } from '../AssetImage';
import { useTranslation } from 'react-i18next';

interface ItemDetailContentProps {
 item: any;
 character?: any;
 onToggleEquip?: () => void;
 onUse?: () => void;
 onEdit?: () => void;
 onDelete?: () => void;
 onGive?: () => void;
 isMJ?: boolean;
 showActions?: boolean;
}

export function ItemDetailContent({ 
 item: initialItem, 
 character: propCharacter, 
 onToggleEquip, 
 onUse, 
 onEdit, 
 onDelete, 
 onGive, 
 isMJ,
 showActions = true 
}: ItemDetailContentProps) {
 const { t } = useTranslation();
 const { items } = useItemsStore();
 const { characters } = useCharactersStore();

 // On retrouve la version la plus fraîche du personnage et de l'item
 const character = propCharacter ? (characters.find(c => c.id === propCharacter.id) || propCharacter) : null;
 
 const item = React.useMemo(() => {
 if (!initialItem) return null;
 
 // 1. Si on a un personnage, on cherche dans son inventaire (via instanceId)
 if (character?.inventory) {
 const foundInInv = character.inventory.find((i: any) => i.instanceId === initialItem.instanceId);
 if (foundInInv) return foundInInv;
 }
 
 // 2. Sinon on cherche dans la forge (via id)
 const foundInForge = items.find(i => i.id === initialItem.id);
 if (foundInForge) return foundInForge;

 // 3. Fallback sur l'item initial
 return initialItem;
 }, [initialItem, items, character?.inventory]);

 if (!item) return (
 <div className="flex flex-col items-center justify-center h-full opacity-40 py-20">
 <Package size={64} className="mb-4 text-silver-bright" />
 <span className="font-quantico tracking-widest uppercase text-glacier-bright text-xs">{t('context.selectRelic', 'Sélectionnez une relique')}</span>
 </div>
 );

 const isEquipped = item.equipped;
 const isConsumable = item.category === 'Consommable';

 const getTargetName = (m: any) => {
 if (m.target === 'stat') return DEFAULT_STATS.find(s => s.id === m.targetId)?.name || m.targetId;
 return (DEFAULT_BARS.find(b => b.id === m.targetId)?.name || m.targetId) + (m.targetProperty === 'max' ? ' Max' : '');
 };

 const possessedCount = React.useMemo(() => {
 if (!item || !character?.inventory) return 0;
 return character.inventory.filter((i: any) => i.id === item.id).length;
 }, [item, character?.inventory]);

 return (
 <div className="flex flex-col h-full bg-[#0D0D0F]">
 {/* ─── BLOCK IMAGE (Plus compact) ─── */}
 <div 
 className="relative h-32 shrink-0 flex items-center justify-center overflow-hidden border-b border-silver-DEFAULT/20"
 style={{
 background: 'rgba(14, 11, 6, 0.45)',
 backdropFilter: 'blur(16px)',
 }}
 >
 {item.image_url ? (
 <>
 <div className="absolute inset-0 bg-black/60" style={{ backgroundImage: `url(${item.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
 <AssetImage src={item.image_url} alt="" className="relative z-10 w-full h-full object-contain p-3 drop-shadow-2xl" />
 </>
 ) : (
 <Package size={48} className="text-silver-bright/10 relative z-10" />
 )}
 
 <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] via-transparent to-transparent z-20" />
 
 <div className="absolute bottom-2 left-4 right-4 z-30">
 <div className="flex items-center justify-between mb-0.5">
 <span className="px-1.5 py-0.5 rounded bg-glacier-DEFAULT/10 text-glacier-bright text-[6px] font-quantico font-black tracking-widest uppercase border border-silver-DEFAULT/20">
 {item.category}
 </span>
 {possessedCount > 0 && (
 <span className="px-2 py-0.5 rounded bg-glacier-DEFAULT text-black font-quantico font-black text-xs shadow-lg border border-black/10">
 x{possessedCount}
 </span>
 )}
 </div>
 <h2 className="text-base font-quantico font-black text-white uppercase tracking-tight truncate">
 {item.name}
 </h2>
 </div>
 </div>

 {/* ─── CORPS SCROLLABLE PAR BLOCKS ─── */}
 <div className="flex-1 flex flex-col min-h-0">
 
 {/* BLOCK DESCRIPTION (Scrollable, plus compact) */}
 <div className="shrink-0 px-4 py-3">
 <div className="flex items-center gap-2 mb-2 opacity-40">
 <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
 <span className="text-[6px] font-quantico font-black uppercase tracking-[0.3em]">{t('context.chroniclesTitle', 'Chroniques')}</span>
 <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
 </div>
 <div className="max-h-20 overflow-y-auto custom-scrollbar pr-2">
 <p className="font-garamond italic text-xs text-white/50 leading-relaxed text-center">
 "{item.description || t('context.noItemStory', "Aucun récit n'accompagne cet objet...")}"
 </p>
 </div>
 </div>

 {/* BLOCK MODIFICATEURS (Flexible, prend le reste) ─── */}
 <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
 <div className="flex items-center gap-2 mb-3 opacity-40">
 <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
 <span className="text-[6px] font-quantico font-black uppercase tracking-[0.3em]">{t('context.arithmancyTitle', 'Arithmancie')}</span>
 <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
 </div>
 
 {/* Conteneur scrollable dédié pour les modificateurs */}
 <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1">
 <div className="space-y-1.5">
 {item.modifiers && item.modifiers.length > 0 ? (
 <>
 {item.modifiers.map((m: any, i: number) => (
 <div 
 key={i} 
 className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 transition-all hover:border-silver-DEFAULT/20"
 >
 <div className="flex flex-col">
 <span className="text-xs font-quantico font-black text-white/60 uppercase tracking-widest">{getTargetName(m)}</span>
 <span className="text-[6px] font-mono text-silver-bright/30 uppercase">
 {m.target === 'stat' ? t('context.attribute', 'Attribut') : t('context.resource', 'Ressource')}
 </span>
 </div>
 <span className="text-xs font-quantico font-black text-glacier-bright">
 {m.mode === 'dice' ? m.formula : `${m.value >= 0 ? '+' : ''}${m.value}${m.mode === 'percent' ? '%' : ''}`}
 </span>
 </div>
 ))}
 </>
 ) : (
 <div className="flex flex-col items-center justify-center opacity-5 py-4">
 <Sparkles size={20} />
 <span className="text-[6px] font-quantico uppercase tracking-widest mt-1">{t('context.neutral', 'Neutre')}</span>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* ─── FOOTER ACTIONS FIXE (Conditionnel) ─── */}
 {showActions && (
 <div className="p-3 bg-black/40 border-t border-white/5 backdrop-blur-xl shrink-0">
 <div className="flex flex-col gap-1.5">
 {/* Actions de Personnage */}
 {character && (
 <>
 {isConsumable ? (
 <button 
 onClick={onUse}
 className="w-full py-2.5 rounded-xl font-quantico font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 border bg-gold-bright text-black border-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
 >
 <Zap size={12} /> {t('common.use', 'Utiliser').toUpperCase()}
 </button>
 ) : onToggleEquip && (
 <button 
 onClick={onToggleEquip}
 className={`w-full py-2.5 rounded-xl font-quantico font-black text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 border ${
 isEquipped 
 ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
 : 'bg-glacier-DEFAULT text-black border-silver-DEFAULT hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]'
 }`}
 >
 {isEquipped ? <Trash2 size={12} /> : <Shield size={12} />}
 {isEquipped ? t('common.unequip', 'Déséquiper').toUpperCase() : t('common.equip', 'Équiper').toUpperCase()}
 </button>
 )}
 </>
 )}

 {/* Actions MJ */}
 {isMJ && (
 <div className="flex gap-1.5">
 {onGive && character && (
 <button 
 onClick={onGive}
 className="flex-1 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all font-quantico text-[11px] font-black uppercase tracking-widest"
 >
 {t('common.give', 'Offrir')}
 </button>
 )}
 {onEdit && (
 <button 
 onClick={onEdit}
 className="flex-1 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all font-quantico text-[11px] font-black uppercase tracking-widest"
 >
 {t('common.edit', 'Modifier')}
 </button>
 )}
 {onDelete && (
 <button 
 onClick={onDelete}
 className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500/40 hover:text-red-500 transition-all"
 >
 <Trash2 size={12} />
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
