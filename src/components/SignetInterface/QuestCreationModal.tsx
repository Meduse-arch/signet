import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Scroll, X, Save, Image as ImageIcon, Plus, Trash2, User, Trophy, Star, Upload, Loader2, Sparkles, Gift } from 'lucide-react';
import { useQuestsStore } from '../../store/quests';
import { useUIStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import { usePeersStore } from '../../store/peers';
import { usePeer } from '../../hooks/usePeer';
import { assetSyncService } from '../../services/asset-sync.service';

interface QuestCreationModalProps {
  sessionId: string;
}

export function QuestCreationModal({ sessionId }: QuestCreationModalProps) {
  const { showQuestCreateModal, setShowQuestCreateModal, questToEdit } = useUIStore();
  const { addQuest } = useQuestsStore();
  const { connections } = usePeersStore();
  const { broadcast } = usePeer();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'En cours' | 'Terminée' | 'Échouée'>('En cours');
  const [rewards, setRewards] = useState<any[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [isUploading, setIsWideUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showQuestCreateModal && questToEdit) {
      setTitle(questToEdit.title || '');
      setDescription(questToEdit.description || '');
      setImageUrl(questToEdit.image_url || '');
      setStatus(questToEdit.status || 'En cours');
      setRewards(questToEdit.rewards || []);
      setParticipantIds(questToEdit.participantIds || []);
    } else {
      setTitle('');
      setDescription('');
      setImageUrl('');
      setStatus('En cours');
      setRewards([]);
      setParticipantIds([]);
    }
  }, [showQuestCreateModal, questToEdit]);

  const handleSave = async () => {
    if (!title) return;

    const questData = {
      id: questToEdit?.id || crypto.randomUUID(),
      title,
      description,
      image_url: imageUrl,
      status,
      rewards,
      participantIds,
    };

    await addQuest(sessionId, questData as any);
    broadcast({ type: 'QUEST_UPDATE', payload: questData });
    setShowQuestCreateModal(false);
  };

  const addReward = () => {
    setRewards([...rewards, { id: crypto.randomUUID(), type: 'Experience', value: 50, description: 'Récompense de quête' }]);
  };

  const updateReward = (id: string, updates: any) => {
    setRewards(rewards.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsWideUploading(true);
    try {
        const assetUrl = await assetSyncService.uploadLocalAsset(file);
        setImageUrl(assetUrl);
    } catch (err) {
        console.error("Upload failed", err);
    } finally {
        setIsWideUploading(false);
    }
  };

  if (!showQuestCreateModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 lg:p-10 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0D0D0F] border border-gold-DEFAULT/40 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.1)] flex flex-col overflow-hidden relative">
        
        {/* Decorative Golden Line Top */}
        <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-gold-bright to-transparent opacity-50" />

        {/* HEADER FIXED */}
        <header className="shrink-0 p-6 lg:p-8 border-b border-gold-DEFAULT/20 flex justify-between items-center bg-black/40 z-20">
           <div className="flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-bright shadow-lg shadow-gold-DEFAULT/5 transition-transform hover:scale-110 duration-500">
                <Scroll size={28} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-cinzel font-black text-white uppercase tracking-[0.3em] leading-none mb-2">
                  {questToEdit ? "RÉÉCRIRE LE DESTIN" : "INSCRIRE UNE CHRONIQUE"}
                </h2>
                <p className="text-[10px] font-cinzel text-gold-DEFAULT/40 uppercase tracking-[0.4em]">Le Livre des Hauts Faits et des Épopées</p>
              </div>
           </div>
           <button 
             onClick={() => setShowQuestCreateModal(false)}
             className="p-3 rounded-full hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
           >
             <X size={24} />
           </button>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* COLONNE GAUCHE : IDENTITÉ */}
          <div className="space-y-10">
            <section className="space-y-6">
               <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-[0.3em] flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-gold-bright animate-pulse" /> Identité du Récit
               </h3>
               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-cinzel font-black text-white/40 uppercase tracking-widest ml-1">Titre de la Chronique</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      placeholder="NOM DU RÉCIT..."
                      className="w-full bg-black/60 border border-gold-DEFAULT/20 rounded-2xl px-5 py-4 text-sm font-cinzel text-white placeholder:text-white/10 focus:border-gold-bright focus:bg-black/80 focus:shadow-[0_0_15px_rgba(212,175,55,0.1)] outline-none transition-all uppercase tracking-widest shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-cinzel font-black text-white/40 uppercase tracking-widest ml-1">Déroulement & Enjeux</label>
                    <textarea 
                      value={description} 
                      onChange={e => setDescription(e.target.value)}
                      placeholder="DÉCRIVEZ LES ÉPREUVES ET LES MOTIVATIONS..."
                      rows={6}
                      className="w-full bg-black/60 border border-gold-DEFAULT/20 rounded-2xl px-5 py-4 text-sm font-garamond italic text-white/70 placeholder:text-white/10 focus:border-gold-bright focus:bg-black/80 outline-none transition-all shadow-inner custom-scrollbar resize-none"
                    />
                  </div>
               </div>
            </section>

            <section className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[9px] font-cinzel font-black text-white/40 uppercase tracking-widest ml-1">État du Récit</label>
                    <select 
                      value={status} 
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-black/60 border border-gold-DEFAULT/20 rounded-2xl px-5 py-4 text-[10px] font-cinzel text-white uppercase focus:border-gold-bright outline-none appearance-none cursor-pointer"
                    >
                        <option value="En cours">En cours de Récit</option>
                        <option value="Terminée">Épopée Accomplie</option>
                        <option value="Échouée">Tragédie Scellée</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-cinzel font-black text-white/40 uppercase tracking-widest ml-1">Sceau de l'Épopée</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={imageUrl} 
                            onChange={e => setImageUrl(e.target.value)}
                            placeholder="URL DU SCEAU..."
                            className="flex-1 bg-black/60 border border-gold-DEFAULT/20 rounded-2xl px-4 py-4 text-[9px] font-mono text-white/40 focus:border-gold-bright outline-none"
                        />
                        <label className="p-4 rounded-2xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-bright hover:bg-gold-DEFAULT/20 cursor-pointer transition-all relative">
                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>
            </section>
          </div>

          {/* COLONNE DROITE : RÉCOMPENSES & VOYAGEURS */}
          <div className="space-y-10">
            
            {/* RÉCOMPENSES */}
            <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-gold-DEFAULT/20 pb-3">
                    <h3 className="text-[10px] font-cinzel font-black text-gold-bright uppercase tracking-[0.3em] flex items-center gap-3">
                        <Gift size={16} className="text-gold-bright animate-pulse" /> Tributs Décernés
                    </h3>
                    <button onClick={addReward} className="p-2 rounded-xl bg-gold-DEFAULT text-black hover:bg-gold-bright transition-all shadow-lg">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="space-y-4">
                    {rewards.map((reward) => (
                        <div key={reward.id} className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 space-y-4 relative group hover:border-gold-DEFAULT/30 transition-all animate-in slide-in-from-right-4 duration-300">
                            <button 
                                onClick={() => setRewards(rewards.filter(r => r.id !== reward.id))}
                                className="absolute -top-2 -right-2 p-2 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                            >
                                <Trash2 size={12} />
                            </button>
                            <div className="grid grid-cols-2 gap-4">
                                <select 
                                    value={reward.type} 
                                    onChange={e => updateReward(reward.id, { type: e.target.value })}
                                    className="bg-black border border-white/10 rounded-xl px-4 py-3 text-[10px] font-cinzel text-white uppercase outline-none focus:border-gold-bright"
                                >
                                    <option value="Experience">Expérience (XP)</option>
                                    <option value="Item">Relique de Pouvoir</option>
                                    <option value="Autre">Faveur Divine</option>
                                </select>
                                <input 
                                    type="number" 
                                    value={reward.value} 
                                    onChange={e => updateReward(reward.id, { value: parseInt(e.target.value) || 0 })}
                                    className="bg-black border border-white/10 rounded-xl px-4 py-3 text-[12px] font-mono text-gold-bright text-center outline-none focus:border-gold-bright"
                                />
                            </div>
                            <input 
                                type="text" 
                                value={reward.description} 
                                onChange={e => updateReward(reward.id, { description: e.target.value })}
                                placeholder="DÉTAILS DU TRIBUT..."
                                className="w-full bg-black/40 border border-white/5 rounded-xl text-[10px] font-serif italic text-white/50 px-4 py-2.5 focus:outline-none focus:border-gold-DEFAULT/40"
                            />
                        </div>
                    ))}
                    {rewards.length === 0 && (
                        <div className="py-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                            <span className="text-[10px] font-cinzel text-white/10 uppercase tracking-[0.4em] italic">Aucun tribut n'est encore scellé</span>
                        </div>
                    )}
                </div>
            </section>

          </div>
        </main>

        {/* FOOTER FIXED & NOBLE */}
        <footer className="shrink-0 p-8 lg:p-10 border-t border-gold-DEFAULT/30 bg-black/60 backdrop-blur-3xl z-30 relative shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold-bright/20 to-transparent" />
          
          <div className="flex gap-4">
              <button 
                onClick={() => setShowQuestCreateModal(false)}
                className="flex-1 py-4 rounded-2xl text-white/30 hover:text-white text-[10px] font-cinzel font-black uppercase tracking-[0.3em] transition-all border border-white/5 hover:border-white/20"
              >
                Ignorer
              </button>
              <button 
                onClick={handleSave}
                disabled={!title.trim()}
                className="flex-[2] py-5 bg-gold-DEFAULT text-black text-[11px] font-cinzel font-black tracking-[0.4em] rounded-2xl hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] hover:bg-gold-bright disabled:opacity-10 disabled:grayscale transition-all flex justify-center items-center gap-4 relative group overflow-hidden"
              >
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                <Save size={20} className="relative z-10" />
                <span className="relative z-10">
                    {questToEdit ? "SCELLER LES MODIFICATIONS" : "INSCRIRE DANS LE LIVRE DU DESTIN"}
                </span>
              </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
