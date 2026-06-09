import React from 'react';
import { 
 Scroll, 
 CheckCircle2, 
 XCircle, 
 Clock, 
 Users, 
 Gift, 
 MapPin,
 Sparkles,
 ChevronRight,
 Trash2
} from 'lucide-react';
import { Quest } from '../../services/quests.service';
import { useQuestsStore } from '../../store/quests';
import { AssetImage } from '../AssetImage';
import { useTranslation } from 'react-i18next';

interface QuestDetailContentProps {
 quest: Quest;
 sessionId: string;
 onEdit?: () => void;
 onDelete?: () => void;
 isMJ?: boolean;
 showActions?: boolean;
 fullHeight?: boolean;
}

export function QuestDetailContent({ 
 quest: initialQuest, 
 sessionId, 
 onEdit, 
 onDelete, 
 isMJ,
 showActions = true,
 fullHeight = false
}: QuestDetailContentProps) {
 const { t } = useTranslation();
 const { quests } = useQuestsStore();
 
 // On dérive la quête la plus à jour depuis le store
 const quest = React.useMemo(() => {
 if (!initialQuest) return null;
 return quests.find(q => q.id === initialQuest.id) || initialQuest;
 }, [initialQuest, quests]);

 if (!quest) return (
 <div className="flex flex-col items-center justify-center h-full opacity-40 py-20">
 <Scroll size={64} className="mb-4 text-silver-bright" />
 <span className="font-quantico tracking-widest uppercase text-glacier-bright text-xs">{t('context.selectQuest', 'Sélectionnez un récit')}</span>
 </div>
 );

 const getStatusInfo = (status: string) => {
 switch (status) {
 case 'Terminée': return { icon: <CheckCircle2 className="text-green-500" size={14} />, label: t('context.questCompleted', 'Accomplie'), color: 'text-green-500' };
 case 'Échouée': return { icon: <XCircle className="text-red-500" size={14} />, label: t('context.questFailed', 'Échouée'), color: 'text-red-500' };
 default: return { icon: <Clock className="text-silver-bright animate-pulse" size={14} />, label: t('context.questInProgress', 'En cours'), color: 'text-silver-bright' };
 }
 };

 const statusInfo = getStatusInfo(quest.status);

 return (
 <div className={`w-full min-h-0 flex flex-col relative overflow-hidden bg-[#0D0D0F] ${fullHeight ? 'flex-1' : ''}`}>
 {/* ─── BLOCK IMAGE (Plus compact) ─── */}
 <div 
 className="relative h-32 shrink-0 flex items-center justify-center overflow-hidden border-b border-silver-DEFAULT/20"
 style={{
 background: 'rgba(14, 11, 6, 0.45)',
 backdropFilter: 'blur(16px)',
 }}
 >
 {quest.image_url ? (
 <>
 <div className="absolute inset-0 bg-black/60" style={{ backgroundImage: `url(${quest.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
 <AssetImage src={quest.image_url} alt="" className="relative z-10 w-full h-full object-cover opacity-60" />
 </>
 ) : (
 <Scroll size={48} className="text-silver-bright/10 relative z-10" />
 )}
 
 <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] via-transparent to-transparent z-20" />
 
 <div className="absolute bottom-2 left-4 right-4 z-30">
 <div className="flex items-center justify-between mb-0.5">
 <span className={`px-1.5 py-0.5 rounded bg-black/40 ${statusInfo.color} text-[6px] font-quantico font-black tracking-widest uppercase border border-white/10 backdrop-blur-sm flex items-center gap-1`}>
 {statusInfo.icon}
 {statusInfo.label}
 </span>
 </div>
 <h2 className="text-base font-quantico font-black text-white uppercase tracking-tight truncate">
 {quest.title}
 </h2>
 </div>
 </div>

 {/* ─── CORPS SCROLLABLE PAR BLOCKS ─── */}
 <div className="flex-1 flex flex-col min-h-0">
    
    {/* BLOCK DESCRIPTION (Scrollable, plus compact) */}
    <div className="shrink-0 px-4 pt-3 pb-2 border-b border-white/5">
      <div className="flex items-center gap-2 mb-2 opacity-40">
        <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
        <span className="text-[6px] font-quantico font-black uppercase tracking-[0.3em]">{t('context.questStory', 'Récit')}</span>
        <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
      </div>
      <div className="max-h-24 overflow-y-auto custom-scrollbar pr-2">
        <p className="font-garamond italic text-xs text-white/50 leading-relaxed text-center">
          "{quest.description || t('context.questNoStory', "Les chroniques sont muettes sur ce récit...")}"
        </p>
      </div>
    </div>

    {/* BLOCK RÉCOMPENSES */}
    <div className="shrink-0 max-h-[350px] overflow-y-auto overflow-x-hidden custom-scrollbar px-4 py-3 min-h-0 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3 opacity-40">
          <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
          <span className="text-[6px] font-quantico font-black uppercase tracking-[0.3em]">{t('context.rewards', 'Récompenses')}</span>
          <div className="h-px flex-1 bg-glacier-DEFAULT/30" />
        </div>
        
        <div className="space-y-4">
 {/* Participants supprimés pour raisons RP */}

 {/* Rewards */}
 {quest.rewards && quest.rewards.length > 0 ? (
 <div className="space-y-1.5">
 {quest.rewards.map((reward, i) => (
 <div 
 key={reward.id || i} 
 className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2 hover:border-silver-DEFAULT/30 transition-all"
 >
 <div className="flex flex-col min-w-0">
 <span className="text-xs font-quantico font-black text-white/60 uppercase tracking-widest truncate">{reward.type}</span>
 <span className="text-[6px] font-mono text-silver-bright/30 uppercase truncate max-w-[100px]">
 {reward.description || t('context.mysticValue', 'Valeur mystique')}
 </span>
 </div>
 <span className="text-xs font-quantico font-black text-glacier-bright whitespace-nowrap">
 {reward.type === 'Experience' ? `+${reward.value} XP` : (reward.value ? `x${reward.value}` : t('context.unique', 'UNIQUE').toUpperCase())}
 </span>
 </div>
 ))}
 </div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center py-4 opacity-5">
 <Sparkles size={20} className="mb-1" />
 <span className="text-[6px] font-quantico uppercase tracking-widest">{t('context.nothing', 'Néant')}</span>
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
