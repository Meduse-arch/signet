import React, { useState, useMemo } from 'react';
import { Scroll, Search, Plus, CheckCircle2, XCircle, User, BookOpen, PenTool, Trash2, LayoutGrid, LayoutList, Clock, Check, X as XIcon, Filter } from 'lucide-react';
import { useQuestsStore } from '../../store/quests';
import { useUIStore } from '../../store/ui';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useCharactersStore } from '../../store/characters';
import { usePeer } from '../../hooks/usePeer';
import { Quest } from '../../services/quests.service';

interface QuestsWindowContentProps {
  sessionId: string;
}

export function QuestsWindowContent({ sessionId }: QuestsWindowContentProps) {
  const { quests, removeQuest, updateQuestStatus } = useQuestsStore();
  const { setShowQuestCreateModal, setSelectedQuest, viewMode, setViewMode } = useUIStore();
  const { user } = useAuthStore();
  const { characters } = useCharactersStore();
  const { broadcast } = usePeer();
  
  const [activeTab, setActiveTab] = useState<'joueur' | 'forge'>('joueur');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'En cours' | 'Terminée' | 'Échouée'>('All');

  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const filteredQuests = useMemo(() => {
    return quests.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           q.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || q.status === statusFilter;

      if (activeTab === 'joueur') {
        // En mode joueur, on ne montre que les quêtes "En cours" par défaut, 
        // ou celles filtrées si l'utilisateur change le filtre de statut
        return matchesSearch && (statusFilter === 'All' ? q.status === 'En cours' : matchesStatus);
      }
      
      // Mode Forge : on montre tout selon les filtres
      return matchesSearch && matchesStatus;
    });
  }, [quests, searchQuery, statusFilter, activeTab]);

  const handleEdit = (quest: Quest) => {
    setSelectedQuest(quest);
    setShowQuestCreateModal(true, quest);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette quête ?')) {
      await removeQuest(sessionId, id);
      broadcast({ type: 'QUEST_DELETE', payload: { id } });
    }
  };

  const handleStatusChange = async (id: string, status: Quest['status']) => {
    await updateQuestStatus(sessionId, id, status);
    const updatedQuest = quests.find(q => q.id === id);
    if (updatedQuest) {
      broadcast({ type: 'QUEST_UPDATE', payload: { ...updatedQuest, status } });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0D0D0F]">
      {/* Header & Tabs */}
      <div className="p-4 border-b border-white/5 flex flex-col gap-4">
        <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5 shadow-inner">
          <button
            onClick={() => setActiveTab('joueur')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-cinzel font-black tracking-widest flex items-center justify-center gap-3 transition-all ${
              activeTab === 'joueur' 
              ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <User size={14} /> QUÊTES JOUEUR
          </button>
          <button
            onClick={() => setActiveTab('forge')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-cinzel font-black tracking-widest flex items-center justify-center gap-3 transition-all ${
              activeTab === 'forge' 
              ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={14} /> BIBLIOTHÈQUE DE QUÊTES
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input
                type="text"
                placeholder="Rechercher une quête..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-lg pl-9 pr-4 py-2 text-[10px] text-white outline-none focus:border-gold-DEFAULT/30 transition-all font-cinzel shadow-inner"
              />
            </div>
            
            <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5 shrink-0">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-gold-DEFAULT/20 text-gold-bright' : 'text-white/20 hover:text-white'}`}
                title="Vue Grille"
              >
                <LayoutGrid size={14} />
              </button>
              <button 
                onClick={() => setViewMode('codex')}
                className={`p-1.5 rounded transition-all ${viewMode === 'codex' ? 'bg-gold-DEFAULT/20 text-gold-bright' : 'text-white/20 hover:text-white'}`}
                title="Vue Liste"
              >
                <LayoutList size={14} />
              </button>
            </div>

            {isMJ && activeTab === 'forge' && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedQuest(null);
                  setShowQuestCreateModal(true, null);
                }}
                className="px-4 py-2 bg-gold-DEFAULT text-black rounded-lg text-[10px] font-cinzel font-black tracking-widest hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all shrink-0"
              >
                + NOUVELLE
              </button>
            )}

          </div>

          {/* Quick Filters (JDR-Local Style) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-1 px-2 border-r border-white/10 mr-1 shrink-0">
                <Filter size={10} className="text-gold-DEFAULT/40" />
                <span className="text-[8px] font-cinzel font-bold text-gold-DEFAULT/40 uppercase">Filtres:</span>
            </div>
            {[
              { id: 'All', label: 'Toutes', icon: Filter, color: 'text-white/40' },
              { id: 'En cours', label: 'En cours', icon: Clock, color: 'text-gold-bright' },
              { id: 'Terminée', label: 'Terminées', icon: Check, color: 'text-green-400' },
              { id: 'Échouée', label: 'Échouées', icon: XIcon, color: 'text-red-400' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-cinzel font-black uppercase transition-all shrink-0 ${
                  statusFilter === filter.id 
                  ? 'bg-gold-DEFAULT/10 border-gold-DEFAULT text-gold-bright shadow-lg' 
                  : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
                }`}
              >
                <filter.icon size={10} className={statusFilter === filter.id ? 'text-gold-bright' : filter.color} />
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quests List */}
      <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'flex flex-col gap-2'}`}>
        {filteredQuests.length > 0 ? (
          filteredQuests.map((quest) => (
            <div 
              key={quest.id}
              className={`group relative bg-black/40 border border-white/5 rounded-2xl overflow-hidden hover:border-gold-DEFAULT/30 transition-all ${viewMode === 'codex' ? 'flex items-center p-3 gap-4' : 'flex flex-col shadow-lg'}`}
            >
              {/* Status Indicator */}
              <div className={`absolute top-0 left-0 w-1 h-full z-10 ${
                quest.status === 'Terminée' ? 'bg-green-500' : 
                quest.status === 'Échouée' ? 'bg-red-500' : 'bg-gold-DEFAULT'
              }`} />

              {/* Image */}
              <div className={`${viewMode === 'codex' ? 'w-16 h-16 rounded-xl' : 'w-full h-36'} shrink-0 bg-black/60 relative overflow-hidden m-${viewMode === 'codex' ? '0' : '0'}`}>
                {quest.image_url ? (
                  <img src={quest.image_url} alt={quest.title} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/5">
                    <Scroll size={viewMode === 'codex' ? 24 : 48} />
                  </div>
                )}
                {/* Status Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                <div className="absolute top-2 right-2 flex gap-1">
                  {quest.status === 'Terminée' && <CheckCircle2 className="text-green-500 drop-shadow-lg" size={18} />}
                  {quest.status === 'Échouée' && <XCircle className="text-red-500 drop-shadow-lg" size={18} />}
                  {quest.status === 'En cours' && <Clock className="text-gold-bright drop-shadow-lg animate-pulse" size={18} />}
                </div>
              </div>

              {/* Content */}
              <div className={`flex-1 p-4 ${viewMode === 'codex' ? 'p-0 pr-4' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xs font-cinzel font-black text-gold-bright uppercase tracking-widest leading-tight">{quest.title}</h3>
                  {isMJ && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                      <button onClick={() => handleEdit(quest)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-gold-bright hover:bg-gold-DEFAULT/10 transition-all shadow-lg border border-white/5">
                        <PenTool size={12} />
                      </button>
                      <button onClick={() => handleDelete(quest.id)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all shadow-lg border border-white/5">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-serif italic text-white/50 line-clamp-2 leading-relaxed mb-3">
                  {quest.description || 'Aucune description disponible...'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {quest.rewards?.slice(0, 3).map((r, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 text-[7px] font-cinzel font-bold text-gold-DEFAULT/60 uppercase tracking-tighter shadow-inner">
                      🏆 {r.type === 'Item' ? 'Objet' : r.type === 'Experience' ? `${r.value} XP` : (r.description || 'Primordial')}
                    </span>
                  ))}
                  {quest.participantIds?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[7px] font-cinzel font-bold text-blue-400/60 uppercase flex items-center gap-1 tracking-tighter shadow-inner">
                      <User size={8} /> {quest.participantIds.length}
                    </span>
                  )}
                </div>
              </div>

              {/* MJ Status Actions */}
              {isMJ && viewMode === 'grid' && quest.status === 'En cours' && (
                <div className="p-2 bg-black/40 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => handleStatusChange(quest.id, 'Terminée')}
                    className="flex-1 py-1.5 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 text-[8px] font-cinzel font-black hover:bg-green-500/20 transition-all shadow-inner"
                  >
                    TERMINER
                  </button>
                  <button 
                    onClick={() => handleStatusChange(quest.id, 'Échouée')}
                    className="flex-1 py-1.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-cinzel font-black hover:bg-red-500/20 transition-all shadow-inner"
                  >
                    ÉCHOUER
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full h-full flex flex-col items-center justify-center opacity-20 py-24">
            <Scroll size={64} className="mb-6 animate-pulse text-gold-DEFAULT" />
            <p className="font-cinzel text-[10px] tracking-[0.4em] uppercase text-center max-w-[200px] leading-loose">Aucun récit n'est inscrit dans les astres...</p>
          </div>
        )}
      </div>
    </div>
  );
}
