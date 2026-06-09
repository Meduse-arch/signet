import React from 'react';
import { 
 Zap, 
 Sparkles, 
 Shield, 
 Sword, 
 Activity, 
 Info,
 Target,
 Flame,
 Heart,
 Droplets,
 Wind,
 Trash2
} from 'lucide-react';
import { Skill } from '../../services/skills.service';
import { useSkillsStore } from '../../store/skills';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { AssetImage } from '../AssetImage';
import { useTranslation } from 'react-i18next';

interface SkillDetailContentProps {
 skill: Skill;
 onEdit?: () => void;
 onDelete?: () => void;
 isMJ?: boolean;
 showActions?: boolean;
}

export function SkillDetailContent({ 
 skill: initialSkill, 
 onEdit, 
 onDelete, 
 isMJ,
 showActions = true
}: SkillDetailContentProps) {
 const { t } = useTranslation();
 const { skills } = useSkillsStore();
 
 // On dérive la compétence la plus à jour depuis le store
 const skill = React.useMemo(() => {
 if (!initialSkill) return null;
 return skills.find(s => s.id === initialSkill.id) || initialSkill;
 }, [initialSkill, skills]);

 if (!skill) return (
 <div className="flex flex-col items-center justify-center h-full opacity-40 py-20">
 <Zap size={64} className="mb-4 text-silver-bright" />
 <span className="font-quantico tracking-widest uppercase text-glacier-bright text-xs">{t('context.selectSkill', 'Sélectionnez une compétence')}</span>
 </div>
 );

 const getTargetName = (target: string, targetId: string, targetProperty?: string) => {
 if (target === 'stat') return DEFAULT_STATS.find(s => s.id === targetId)?.name || targetId;
 return (DEFAULT_BARS.find(b => b.id === targetId)?.name || targetId) + (targetProperty === 'max' ? ' Max' : '');
 };

 const getEffectIcon = (type: string) => {
 switch (type) {
 case 'damage': return <Flame size={12} className="text-red-500" />;
 case 'heal': return <Heart size={12} className="text-green-500" />;
 case 'buff': return <Sparkles size={12} className="text-blue-400" />;
 case 'debuff': return <Droplets size={12} className="text-purple-400" />;
 default: return <Wind size={12} className="text-white/60" />;
 }
 };

 const getEffectLabel = (type: string) => {
 switch (type) {
 case 'damage': return t('context.damage', 'Dégâts');
 case 'heal': return t('context.heal', 'Soin');
 case 'buff': return t('context.buff', 'Bonus');
 case 'debuff': return t('context.debuff', 'Malus');
 case 'pure_roll': return t('context.pureRoll', 'Jet Simple');
 case 'utility': return t('context.utility', 'Utilité');
 default: return type;
 }
 };

 const getTypeLabel = (type: string) => {
 switch (type) {
 case 'active': return t('context.typeActive', 'Active');
 case 'passive_auto': return t('context.typePassive', 'Passif');
 case 'passive_toggle': return t('context.typeToggle', 'Bascule');
 default: return t('context.skillType', 'Compétence');
 }
 };

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
 {skill.image_url ? (
 <>
 <div className="absolute inset-0 bg-black/60" style={{ backgroundImage: `url(${skill.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
 <AssetImage src={skill.image_url} alt="" className="relative z-10 w-full h-full object-contain p-3 drop-shadow-2xl" />
 </>
 ) : (
 <Zap size={48} className="text-silver-bright/10 relative z-10" />
 )}
 
 <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] via-transparent to-transparent z-20" />
 
 <div className="absolute bottom-2 left-4 right-4 z-30">
 <div className="flex items-center justify-between mb-0.5">
 <div className="flex items-center gap-1.5">
 <span className="px-1.5 py-0.5 rounded bg-glacier-DEFAULT/10 text-glacier-bright text-[6px] font-quantico font-black tracking-widest uppercase border border-silver-DEFAULT/20">
 {getTypeLabel(skill.type)}
 </span>
 {skill.cost && (
 <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[6px] font-mono border border-red-500/20">
 {skill.cost.value} {DEFAULT_BARS.find(b => b.id === skill.cost?.barId)?.name || skill.cost.barId}
 </span>
 )}
 </div>
 </div>
 <h2 className="text-base font-quantico font-black text-white uppercase tracking-tight truncate">
 {skill.name}
 </h2>
 </div>
 </div>

 {/* ─── CORPS SCROLLABLE PAR BLOCKS ─── */}
 <div className="flex-1 flex flex-col min-h-0">
 
 {/* BLOCK DESCRIPTION (Scrollable, plus compact) */}
 <div className="shrink-0 px-4 py-3">
 <div className="flex items-center gap-2 mb-2 opacity-40">
 <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
 <span className="text-[6px] font-quantico font-black uppercase tracking-[0.3em]">{t('context.arcanes', 'Arcanes')}</span>
 <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
 </div>
 <div className="max-h-20 overflow-y-auto custom-scrollbar pr-2">
 <p className="font-garamond italic text-xs text-white/50 leading-relaxed text-center">
 "{skill.description || t('context.noSkillDescription', "Une technique sans nom, perdue dans les âges...")}"
 </p>
 </div>
 </div>

 {/* BLOCK EFFETS & MODIFICATEURS (Flexible) ─── */}
 <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
 <div className="flex items-center gap-2 mb-3 opacity-40">
 <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
 <span className="text-[6px] font-quantico font-black uppercase tracking-[0.3em]">{t('context.manifestations', 'Manifestations')}</span>
 <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
 </div>
 
 {/* Conteneur scrollable dédié pour les effets et modificateurs */}
 <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1">
 <div className="space-y-3">
 {/* Effets Actifs */}
 {skill.effects && skill.effects.length > 0 && (
 <div className="space-y-1.5">
 {skill.effects.map((effect) => (
 <div key={effect.id} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 {getEffectIcon(effect.type)}
 <span className="text-[11px] font-quantico font-bold text-white/60 uppercase tracking-widest">{getEffectLabel(effect.type)}</span>
 </div>
 <span className="text-xs font-mono text-glacier-bright">
 {effect.mode === 'dice' ? effect.formula : `${effect.valeur >= 0 ? '+' : ''}${effect.valeur}${effect.mode === 'percent' ? '%' : ''}`}
 </span>
 </div>
 <p className="text-[11px] font-inter italic text-white/50 leading-relaxed">
 {effect.description}
 </p>
 </div>
 ))}
 </div>
 )}

 {/* Modificateurs Passifs */}
 {skill.modifiers && skill.modifiers.length > 0 && (
 <div className="grid grid-cols-1 gap-1.5">
 {skill.modifiers.map((m, i) => (
 <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-silver-DEFAULT/20 transition-all">
 <div className="flex flex-col">
 <span className="text-xs font-quantico font-black text-white/60 uppercase tracking-widest">
 {getTargetName(m.target, m.targetId, m.targetProperty)}
 </span>
 <span className="text-[6px] font-mono text-silver-bright/30 uppercase">{m.target === 'stat' ? t('context.attribute', 'Attribut') : t('context.resource', 'Ressource')}</span>
 </div>
 <span className="text-xs font-quantico font-black text-glacier-bright">
 {m.mode === 'dice' ? m.formula : `${m.value >= 0 ? '+' : ''}${m.value}${m.mode === 'percent' ? '%' : ''}`}
 </span>
 </div>
 ))}
 </div>
 )}

 {/* Conditions */}
 {skill.condition_type && (
 <div className="p-2.5 rounded-xl bg-glacier-DEFAULT/5 border border-silver-DEFAULT/10">
 <p className="text-[11px] font-quantico text-silver-bright/50 uppercase leading-relaxed text-center tracking-wider">
 {t('context.requires', 'Requiert')} {skill.condition_type === 'item' ? t('context.relic', 'Relique').toLowerCase() : skill.condition_type === 'skill' ? t('context.skillType', 'Compétence').toLowerCase() : t('context.relicAndSkill', 'Relique & Compétence').toLowerCase()}
 {skill.condition_tags && skill.condition_tags.length > 0 && ` [${skill.condition_tags.join(', ')}]`}
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* ─── FOOTER ACTIONS FIXE (Conditionnel) ─── */}
 {isMJ && showActions && (
 <div className="p-3 bg-black/40 border-t border-white/5 backdrop-blur-xl shrink-0">
 <div className="flex gap-1.5">
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
 </div>
 )}
 </div>
 );
}
