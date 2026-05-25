import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Scroll, X, Save, Image as ImageIcon, Plus, Trash2, User, Trophy, Star } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { useQuestsStore } from '../../store/quests';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Quest, QuestReward } from '../../services/quests.service';

interface QuestCreationModalProps {
  sessionId: string;
}

export function QuestCreationModal({ sessionId }: QuestCreationModalProps) {
  const { showQuestCreateModal, setShowQuestCreateModal, questToEdit } = useUIStore();
  const { addQuest } = useQuestsStore();
  const { characters } = useCharactersStore();
  const { items } = useItemsStore();
  const { user } = useAuthStore();
  const { broadcast } = usePeer();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<Quest['status']>('En cours');
  const [rewards, setRewards] = useState<QuestReward[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  useEffect(() => {
    if (questToEdit && showQuestCreateModal) {
      setTitle(questToEdit.title);
      setDescription(questToEdit.description);
      setImageUrl(questToEdit.image_url || '');
      setStatus(questToEdit.status);
      setRewards(questToEdit.rewards || []);
      setParticipantIds(questToEdit.participantIds || []);
    } else if (showQuestCreateModal) {
      setTitle('');
      setDescription('');
      setImageUrl('');
      setStatus('En cours');
      setRewards([]);
      setParticipantIds([]);
    }
  }, [questToEdit, showQuestCreateModal]);

  if (!showQuestCreateModal || !isMJ) return null;

  const handleSave = async () => {
    if (!title.trim()) return;

    const quest: Quest = {
      id: questToEdit?.id || crypto.randomUUID(),
      title,
      description,
      status,
      image_url: imageUrl,
      rewards,
      participantIds,
      created_at: questToEdit?.created_at || new Date().toISOString()
    };

    await addQuest(sessionId, quest);
    broadcast({ type: 'QUEST_UPDATE', payload: quest });
    setShowQuestCreateModal(false);
  };

  const addReward = () => {
    setRewards([...rewards, { id: crypto.randomUUID(), type: 'Autre', description: 'Nouvelle récompense' }]);
  };

  const removeReward = (id: string) => {
    setRewards(rewards.filter(r => r.id !== id));
  };

  const updateReward = (id: string, updates: Partial<QuestReward>) => {
    setRewards(rewards.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const toggleParticipant = (id: string) => {
    setParticipantIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return createPortal(
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-gold-DEFAULT/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gold-DEFAULT text-black">
              <Scroll size={24} />
            </div>
            <div>
              <h2 className="text-xl font-cinzel font-black text-white uppercase tracking-widest">
                {questToEdit ? "MODIFIER LE RÉCIT" : "INSCRIRE UN RÉCIT"}
              </h2>
              <p className="text-[10px] font-cinzel text-gold-DEFAULT/60 uppercase tracking-[0.2em]">Chroniqueur du Destin</p>
            </div>
          </div>
          <button onClick={() => setShowQuestCreateModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Main Info */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/50 uppercase tracking-widest ml-1">Titre de la Quête</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Le Secret de la Forêt Maudite..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-gold-DEFAULT/50 outline-none transition-all font-cinzel text-lg shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/50 uppercase tracking-widest ml-1">Illustration (URL)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="text" 
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs text-white placeholder:text-white/20 focus:border-gold-DEFAULT/50 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/50 uppercase tracking-widest ml-1">Détails de l'Aventure</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Décrivez les enjeux et les mystères de cette quête..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:border-gold-DEFAULT/50 outline-none transition-all resize-none h-48 font-serif italic leading-relaxed shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/50 uppercase tracking-widest ml-1">État de la Quête</label>
                <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                  {(['En cours', 'Terminée', 'Échouée'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-cinzel font-black uppercase transition-all ${
                        status === s 
                        ? (s === 'Terminée' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 
                           s === 'Échouée' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 
                           'bg-gold-DEFAULT/20 text-gold-bright border border-gold-DEFAULT/40')
                        : 'text-white/20 hover:bg-white/5'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Participants & Rewards */}
            <div className="space-y-8">
              {/* Participants */}
              <section className="space-y-4">
                <div className="flex items-center gap-3 opacity-40">
                  <User size={14} className="text-gold-DEFAULT" />
                  <span className="text-[10px] font-cinzel font-black text-gold-DEFAULT tracking-[0.2em] uppercase">Voyageurs Concernés</span>
                  <div className="h-px flex-1 bg-gold-DEFAULT/20" />
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  {characters.map(char => (
                    <button
                      key={char.id}
                      onClick={() => toggleParticipant(char.id)}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition-all text-left ${
                        participantIds.includes(char.id) 
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                        : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 overflow-hidden shrink-0">
                        {char.image_url ? (
                          <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><User size={14} /></div>
                        )}
                      </div>
                      <span className="text-[10px] font-cinzel font-bold uppercase truncate">{char.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Rewards */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 opacity-40">
                    <Trophy size={14} className="text-gold-DEFAULT" />
                    <span className="text-[10px] font-cinzel font-black text-gold-DEFAULT tracking-[0.2em] uppercase">Récompenses du Destin</span>
                  </div>
                  <button onClick={addReward} className="p-1 rounded bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all">
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {rewards.map(reward => (
                    <div key={reward.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 relative group">
                      <button 
                        onClick={() => removeReward(reward.id)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <select 
                          value={reward.type}
                          onChange={e => updateReward(reward.id, { type: e.target.value as any })}
                          className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white font-cinzel outline-none appearance-none"
                        >
                          <option value="Experience">EXPÉRIENCE</option>
                          <option value="Item">OBJET</option>
                          <option value="Autre">AUTRE</option>
                        </select>

                        {reward.type === 'Item' ? (
                          <select 
                            value={reward.itemId}
                            onChange={e => updateReward(reward.id, { itemId: e.target.value })}
                            className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white font-cinzel outline-none appearance-none"
                          >
                            <option value="">Choisir un objet...</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.name.toUpperCase()}</option>)}
                          </select>
                        ) : reward.type === 'Experience' ? (
                          <input 
                            type="number"
                            value={reward.value}
                            onChange={e => updateReward(reward.id, { value: parseInt(e.target.value) || 0 })}
                            placeholder="Valeur XP..."
                            className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white font-mono outline-none"
                          />
                        ) : (
                          <input 
                            type="text"
                            value={reward.description}
                            onChange={e => updateReward(reward.id, { description: e.target.value })}
                            placeholder="Description..."
                            className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white font-serif outline-none"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {rewards.length === 0 && (
                    <div className="py-8 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center opacity-20">
                      <Star size={32} />
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-4">
          <button 
            onClick={() => setShowQuestCreateModal(false)}
            className="px-8 py-3 rounded-full text-[10px] font-cinzel font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Fermer le Registre
          </button>
          <button 
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex items-center justify-center gap-3 px-12 py-3 rounded-full bg-gold-DEFAULT text-black hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] disabled:opacity-20 disabled:grayscale transition-all"
          >
            <Save size={18} />
            <span className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em]">Inscrire au Destin</span>
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
