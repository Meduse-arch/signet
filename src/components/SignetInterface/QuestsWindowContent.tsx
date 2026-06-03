import React, { useState, useMemo, useEffect } from 'react';
import { useQuestsStore } from '../../store/quests';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useUIStore } from '../../store/ui';
import { 
  Scroll, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Trash2,
  ChevronRight,
  History,
  X
} from 'lucide-react';
import { QuestCreationModal } from './QuestCreationModal';
import { QuestDetailContent } from './QuestDetailContent';
import { AssetImage } from '../AssetImage';
import { useTranslation } from 'react-i18next';

interface QuestsWindowContentProps {
  sessionId: string;
}

export function QuestsWindowContent({ sessionId }: QuestsWindowContentProps) {
  const { t } = useTranslation();
  const { quests, removeQuest, selectedQuest, setSelectedQuest } = useQuestsStore();
  const { user } = useAuthStore();
  const { setShowQuestCreateModal } = useUIStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'completed' | 'all'>('current');

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isWideView, setIsWideView] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsWideView(entry.contentRect.width > 650);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const filteredQuests = useMemo(() => {
    return quests.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase()) || 
                          (q.description && q.description.toLowerCase().includes(search.toLowerCase()));
      const matchesTab = activeTab === 'all' || 
                        (activeTab === 'current' && q.status === 'En cours') ||
                        (activeTab === 'completed' && q.status !== 'En cours');
      return matchesSearch && matchesTab;
    });
  }, [quests, search, activeTab]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Terminée': return <CheckCircle2 className="text-green-500" size={14} />;
      case 'Échouée': return <XCircle className="text-red-500" size={14} />;
      default: return <Clock className="text-gold-DEFAULT animate-pulse" size={14} />;
    }
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col relative bg-[#0D0D0F]">
      
      {/* ─── MODALE DÉTAIL (Mode Mobile) ─── */}
      {!isWideView && selectedQuest && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-md" onClick={() => setSelectedQuest(null)}>
          <div className="w-full max-w-sm bg-[#0D0D0F]/95 border border-gold-DEFAULT/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
            <QuestDetailContent 
              quest={selectedQuest} 
              sessionId={sessionId} 
              isMJ={isMJ}
              onEdit={isMJ ? () => setShowQuestCreateModal(true, selectedQuest) : undefined}
              onDelete={isMJ ? () => { if(window.confirm(t('context.deleteQuest', "Effacer ce récit ?"))) { removeQuest(sessionId, selectedQuest.id); setSelectedQuest(null); } } : undefined}
              showActions={false}
            />
            <button 
              onClick={() => setSelectedQuest(null)} 
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white/60 hover:text-white transition-colors z-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <QuestCreationModal sessionId={sessionId} />

      <div className="flex-1 flex overflow-hidden">
        {/* ─── LISTE DES QUÊTES (Panneau Gauche) ─── */}
        <div className={`flex-1 flex flex-col p-4 gap-4 min-w-0 transition-all duration-500 ${isWideView && selectedQuest ? 'border-r border-white/5 max-w-[45%]' : 'max-w-full'}`}>
            <div className="flex gap-2 shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gold-DEFAULT/40" />
                    <input 
                    type="text" 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('common.searchPlaceholder', "CHERCHER...").toUpperCase()}
                    className="w-full bg-black/60 border border-gold-DEFAULT/10 rounded-xl py-2 pl-9 pr-3 text-[11px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/40 focus:outline-none focus:border-gold-DEFAULT/30 transition-all shadow-inner uppercase tracking-widest"
                    />
                </div>
                {isMJ && (
                    <button 
                    onClick={() => setShowQuestCreateModal(true)}
                    className="p-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all flex items-center justify-center group"
                    >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                )}
            </div>

            <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/5 shadow-inner shrink-0 overflow-hidden">
                <button 
                    onClick={() => setActiveTab('current')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-cinzel font-black uppercase tracking-widest transition-all ${activeTab === 'current' ? 'bg-gold-DEFAULT text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                    <Clock size={10} /> {t('context.inProgress', 'En cours')}
                </button>
                <button 
                    onClick={() => setActiveTab('completed')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-cinzel font-black uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-gold-DEFAULT text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                >
                    <History size={10} /> {t('context.archives', 'Archives')}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2 pb-4 min-h-0">
                {filteredQuests.map((quest) => {
                    const isActive = selectedQuest?.id === quest.id;
                    return (
                    <div 
                        key={quest.id}
                        className={`group relative p-3 rounded-xl border transition-all flex items-center gap-3 overflow-hidden ${
                        isActive ? 'border-gold-bright bg-gold-DEFAULT/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-white/[0.05] bg-white/[0.02] hover:border-gold-DEFAULT/30'
                        }`}
                    >
                        <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden shrink-0 relative shadow-inner">
                            {quest.image_url ? (
                                <AssetImage src={quest.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Scroll size={18} className="text-white/10 group-hover:text-gold-DEFAULT/40 transition-colors" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute top-0.5 right-0.5 scale-75">
                                {getStatusIcon(quest.status)}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className={`text-xs font-cinzel font-black tracking-widest truncate uppercase ${isActive ? 'text-gold-bright' : 'text-white/60 group-hover:text-white'}`}>
                                {quest.title}
                            </h4>
                            <p className="text-xs font-serif italic text-white/50 truncate mt-0.5">
                                {quest.description || t('context.noDetails', "Aucun détail...")}
                            </p>
                        </div>

                        {/* ─── ACTIONS SUR LA BARRE (Apparaissent au hover) ─── */}
                        <div className="flex items-center gap-1 shrink-0 z-10">
                            {/* Bouton Détails (Chevron) */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedQuest(quest, false); }}
                                className="p-1.5 rounded-lg text-white/60 hover:text-gold-bright hover:bg-white/5 transition-all opacity-30 group-hover:opacity-100"
                                title={t('common.seeDetails', "Voir les détails")}
                            >
                                <ChevronRight size={14} />
                            </button>

                            {isMJ && (
                                <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity ml-1 border-l border-white/10 pl-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(window.confirm(t('context.deleteQuest', "Effacer ce récit ?"))) removeQuest(sessionId, quest.id); }}
                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 transition-colors"
                                        title={t('common.delete', "Supprimer")}
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    );
                })}

                {filteredQuests.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-10 grayscale">
                        <Scroll size={32} className="mb-2" />
                        <span className="text-xs font-cinzel tracking-widest italic">{t('common.empty', "VIDE...")}</span>
                    </div>
                )}
            </div>
        </div>

        {/* ─── PANNEAU DE DÉTAIL (Mode Codex) ─── */}
        {isWideView && (
          <div className={`transition-all duration-500 overflow-hidden bg-black/20 ${selectedQuest ? 'flex-1 opacity-100' : 'w-0 opacity-0'}`}>
            {selectedQuest ? (
              <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-500 relative">
                 <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/40 shrink-0">
                    <span className="text-[11px] font-cinzel font-black text-gold-DEFAULT tracking-[0.3em] uppercase">{t('context.questDetails', "Récit du Destin")}</span>
                    <button onClick={() => setSelectedQuest(null)} className="p-1 rounded hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <QuestDetailContent 
                      quest={selectedQuest} 
                      sessionId={sessionId} 
                      isMJ={isMJ}
                      onEdit={isMJ ? () => setShowQuestCreateModal(true, selectedQuest) : undefined}
                      onDelete={isMJ ? () => { if(window.confirm(t('context.deleteQuest', "Effacer ce récit ?"))) { removeQuest(sessionId, selectedQuest.id); setSelectedQuest(null); } } : undefined}
                    />
                 </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-10 pointer-events-none">
                 <Scroll size={64} className="mb-4 text-gold-DEFAULT" />
                 <span className="text-xs font-cinzel font-black tracking-[0.4em] uppercase">{t('context.worldChronicles', "Chroniques du Monde")}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
