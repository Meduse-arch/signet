import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Zap, Plus, X, Save, BarChart2, BookOpen, Shuffle, Backpack, ChevronDown, Dices, Power, Upload, Loader2, Trash2 } from 'lucide-react';
import { useSkillsStore } from '../../store/skills';
import { useUIStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import { useTagsStore } from '../../store/tags';
import { TagManagementModal } from './TagManagementModal';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { assetSyncService } from '../../services/asset-sync.service';
import { useSessionStore } from '../../store/session';

interface SkillCreationModalProps {
  sessionId: string;
}

export function SkillCreationModal({ sessionId }: SkillCreationModalProps) {
  const { showSkillCreateModal, setShowSkillCreateModal, skillToEdit, skillCreationType } = useUIStore();
  const { addSkill } = useSkillsStore();
  const { tags } = useTagsStore();
  const [showTagManager, setShowTagManager] = useState(false);
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const statDefs = session?.settings?.stats || DEFAULT_STATS;
  const barDefs = session?.settings?.bars || DEFAULT_BARS;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'active' | 'passive_auto' | 'passive_toggle'>('active');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isUploading, setIsWideUploading] = useState(false);

  // Coût
  const [hasCost, setHasCost] = useState(false);
  const [costBarId, setCostBarId] = useState('vitalite');
  const [costValue, setCostValue] = useState(1);

  // Effets techniques (Dégâts, Soins, etc)
  const [effects, setEffects] = useState<any[]>([]);

  // Modificateurs (Bonus passifs ou Aura)
  const [modifiers, setModifiers] = useState<any[]>([]);

  // Conditions
  const [conditionType, setConditionType] = useState<'none' | 'item' | 'skill' | 'both'>('none');
  const [conditionTags, setConditionTags] = useState<string[]>([]);

  useEffect(() => {
    if (showSkillCreateModal && skillToEdit) {
      setName(skillToEdit.name || '');
      setDescription(skillToEdit.description || '');
      setType(skillToEdit.type || 'active');
      setImageUrl(skillToEdit.image_url || '');
      setSelectedTags(skillToEdit.tags || []);
      setHasCost(!!skillToEdit.cost);
      if (skillToEdit.cost) {
        setCostBarId(skillToEdit.cost.barId);
        setCostValue(skillToEdit.cost.value);
      }
      setEffects(skillToEdit.effects || []);
      setModifiers(skillToEdit.modifiers || []);
      setConditionType(skillToEdit.condition_type || 'none');
      setConditionTags(skillToEdit.condition_tags || []);
    } else {
      setName('');
      setDescription('');
      setType('active');
      setImageUrl('');
      setSelectedTags([]);
      setHasCost(false);
      setEffects([]);
      setModifiers([]);
      setConditionType('none');
      setConditionTags([]);
    }
  }, [showSkillCreateModal, skillToEdit]);

  const handleSave = async () => {
    if (!name) return;

    const skillData = {
      id: skillToEdit?.id || crypto.randomUUID(),
      name,
      description,
      type,
      image_url: imageUrl,
      tags: selectedTags,
      cost: hasCost ? { barId: costBarId, value: costValue } : undefined,
      effects,
      modifiers,
      condition_type: conditionType !== 'none' ? conditionType : undefined,
      condition_tags: conditionTags.length > 0 ? conditionTags : undefined,
    };

    if (skillCreationType === 'inventory') {
        const { useCharactersStore } = await import('../../store/characters');
        const { controlledCharacterId } = useCharactersStore.getState();
        const character = useCharactersStore.getState().characters.find(c => c.id === controlledCharacterId);
        if (character) {
            const updatedChar = {
                ...character,
                custom_skills: (character.custom_skills || []).map((s: any) => s.id === skillData.id ? { ...skillData, is_active: s.is_active } : s)
            };
            useCharactersStore.getState().addOrUpdateCharacter(updatedChar);
        }
    } else {
        await addSkill(sessionId, skillData as any);
    }

    setShowSkillCreateModal(false);
  };

  const addEffect = () => {
    setEffects([...effects, { id: crypto.randomUUID(), type: 'damage', mode: 'dice', formula: '1d6', valeur: 0, description: '' }]);
  };

  const updateEffect = (id: string, updates: any) => {
    setEffects(effects.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const addModifier = () => {
    setModifiers([...modifiers, { target: 'stat', targetId: 'force', mode: 'flat', value: 1 }]);
  };

  const updateModifier = (index: number, updates: any) => {
    const newMods = [...modifiers];
    newMods[index] = { ...newMods[index], ...updates };
    setModifiers(newMods);
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

  if (!showSkillCreateModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 lg:p-10 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0D0D0F] border border-gold-DEFAULT/40 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8),0_0_40px_rgba(212,175,55,0.1)] flex flex-col overflow-hidden relative">
        
        {/* Decorative Golden Line Top */}
        <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-gold-bright to-transparent opacity-50" />

        {/* HEADER FIXED */}
        <header className="shrink-0 p-6 lg:p-8 border-b border-gold-DEFAULT/20 flex justify-between items-center bg-black/40 z-20">
           <div className="flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-bright shadow-lg shadow-gold-DEFAULT/5 transition-transform hover:scale-110 duration-500">
                <Sparkles size={28} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-cinzel font-black text-white uppercase tracking-[0.3em] leading-none mb-2">
                  {skillToEdit ? "MODIFIER LA COMPÉTENCE" : "CRÉER UNE COMPÉTENCE"}
                </h2>
                <p className="text-xs font-cinzel text-gold-DEFAULT/60 uppercase tracking-[0.4em]">Gestion des compétences</p>
              </div>
           </div>
           <button 
             onClick={() => setShowSkillCreateModal(false)}
             className="p-3 rounded-full hover:bg-red-500/10 text-white/60 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
           >
             <X size={24} />
           </button>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* COLONNE GAUCHE : IDENTITÉ */}
          <div className="space-y-10">
            <section className="space-y-6">
               <h3 className="text-xs font-cinzel font-black text-gold-DEFAULT/70 uppercase tracking-[0.3em] flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-gold-bright animate-pulse" /> Informations
               </h3>
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[11px] font-cinzel font-black text-white/70 uppercase tracking-widest ml-1">Nom de la compétence</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="NOM DE L'ARCANE..."
                      className="w-full bg-black/60 border border-gold-DEFAULT/20 rounded-2xl px-5 py-4 text-sm font-cinzel text-white placeholder:text-white/30 focus:border-gold-bright focus:bg-black/80 focus:shadow-[0_0_15px_rgba(212,175,55,0.1)] outline-none transition-all uppercase tracking-widest shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[11px] font-cinzel font-black text-white/70 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      value={description} 
                      onChange={e => setDescription(e.target.value)}
                      placeholder="DÉCRIVEZ LA NATURE DE CET ARCANNE..."
                      rows={4}
                      className="w-full bg-black/60 border border-gold-DEFAULT/20 rounded-2xl px-5 py-4 text-sm font-garamond italic text-white/70 placeholder:text-white/30 focus:border-gold-bright focus:bg-black/80 outline-none transition-all shadow-inner custom-scrollbar resize-none"
                    />
                  </div>
               </div>
            </section>

            <section className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                     <label className="text-[11px] font-cinzel font-black text-white/70 uppercase tracking-widest ml-1">Type de compétence</label>
                    <select 
                      value={type} 
                      onChange={e => setType(e.target.value as any)}
                      className="w-full bg-black/60 border border-gold-DEFAULT/20 rounded-2xl px-5 py-4 text-xs font-cinzel text-white uppercase focus:border-gold-bright outline-none appearance-none cursor-pointer"
                    >
                        <option value="active">Compétence Active</option>
                        <option value="passive_auto">Passif Permanent</option>
                        <option value="passive_toggle">Aura Activable</option>
                    </select>
                </div>
                <div className="space-y-2">
                     <label className="text-[11px] font-cinzel font-black text-white/70 uppercase tracking-widest ml-1">Image</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={imageUrl} 
                            onChange={e => setImageUrl(e.target.value)}
                            placeholder="URL OU SCEAU..."
                            className="flex-1 bg-black/60 border border-gold-DEFAULT/20 rounded-2xl px-4 py-4 text-[11px] font-mono text-white/60 focus:border-gold-bright outline-none"
                        />
                        <label className="p-4 rounded-2xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-bright hover:bg-gold-DEFAULT/20 cursor-pointer transition-all relative">
                            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>
            </section>

            {/* COÛT */}
            <section className="space-y-6 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-cinzel font-black text-gold-DEFAULT/70 uppercase tracking-[0.3em] flex items-center gap-3">
                        <Power size={14} /> Coût
                    </h3>
                    <button 
                        onClick={() => setHasCost(!hasCost)}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-cinzel font-black uppercase transition-all ${hasCost ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}
                    >
                        {hasCost ? 'Retirer' : 'Ajouter un coût'}
                    </button>
                </div>
                {hasCost && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                        <select 
                            value={costBarId} 
                            onChange={e => setCostBarId(e.target.value)}
                            className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-cinzel text-white uppercase focus:border-gold-bright outline-none"
                        >
                            {DEFAULT_BARS.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <input 
                            type="number" 
                            value={costValue} 
                            onChange={e => setCostValue(parseInt(e.target.value))}
                            className="bg-black border border-white/10 rounded-xl px-4 py-3 text-[12px] font-mono text-gold-bright text-center outline-none focus:border-gold-bright"
                        />
                    </div>
                )}
            </section>
          </div>

          {/* COLONNE DROITE : MÉCANIQUES */}
          <div className="space-y-10">
            
            {/* EFFETS ACTIFS */}
            <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-gold-DEFAULT/20 pb-3">
                    <h3 className="text-xs font-cinzel font-black text-gold-bright uppercase tracking-[0.3em] flex items-center gap-3">
                        <Zap size={16} className="text-gold-bright animate-pulse" /> Effets actifs
                    </h3>
                    <button onClick={addEffect} className="p-2 rounded-xl bg-gold-DEFAULT text-black hover:bg-gold-bright transition-all shadow-lg">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="space-y-4">
                    {effects.map((eff) => (
                        <div key={eff.id} className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 space-y-4 relative group hover:border-gold-DEFAULT/30 transition-all animate-in slide-in-from-right-4 duration-300">
                            <button 
                                onClick={() => setEffects(effects.filter(e => e.id !== eff.id))}
                                className="absolute -top-2 -right-2 p-2 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 opacity-30 group-hover:opacity-100 transition-all hover:scale-110"
                            >
                                <Trash2 size={12} />
                            </button>
                            <div className="grid grid-cols-3 gap-3">
                                <select 
                                    value={eff.type} 
                                    onChange={e => updateEffect(eff.id, { type: e.target.value })}
                                    className="col-span-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-[11px] font-cinzel text-white uppercase outline-none focus:border-gold-bright"
                                >
                                    <option value="damage">Dégâts</option>
                                    <option value="heal">Soin</option>
                                    <option value="buff">Bonus</option>
                                    <option value="debuff">Malus</option>
                                    <option value="utility">Utilité</option>
                                </select>
                                <div className="col-span-2 flex gap-2">
                                    <select 
                                        value={eff.mode} 
                                        onChange={e => updateEffect(eff.id, { mode: e.target.value })}
                                        className="w-24 bg-black border border-white/10 rounded-xl px-3 py-2 text-[11px] font-cinzel text-white outline-none"
                                    >
                                        <option value="dice">Dés</option>
                                        <option value="flat">Fixe</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        value={eff.mode === 'dice' ? eff.formula : eff.valeur}
                                        onChange={e => updateEffect(eff.id, eff.mode === 'dice' ? { formula: e.target.value } : { valeur: parseInt(e.target.value) })}
                                        placeholder={eff.mode === 'dice' ? "1d6..." : "0"}
                                        className="flex-1 bg-gold-DEFAULT/10 border border-gold-DEFAULT/40 rounded-xl px-3 py-2 text-[11px] font-mono text-gold-bright text-center outline-none focus:border-gold-bright"
                                    />
                                </div>
                            </div>
                            <input 
                                type="text" 
                                value={eff.description} 
                                onChange={e => updateEffect(eff.id, { description: e.target.value })}
                                placeholder="PROPRIÉTÉ DE LA MANIFESTATION..."
                                className="w-full bg-black/40 border border-white/5 rounded-xl text-xs font-serif italic text-white/50 px-4 py-2.5 focus:outline-none focus:border-gold-DEFAULT/40"
                            />
                        </div>
                    ))}
                    {effects.length === 0 && (
                        <div className="py-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                            <span className="text-xs font-cinzel text-white/10 uppercase tracking-[0.4em] italic">Aucun effet actif</span>
                        </div>
                    )}
                </div>
            </section>

            {/* MODIFICATEURS PASSIFS */}
            <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-gold-DEFAULT/20 pb-3">
                    <h3 className="text-xs font-cinzel font-black text-gold-bright uppercase tracking-[0.3em] flex items-center gap-3">
                        <BarChart2 size={16} className="text-gold-bright" /> Modificateurs de stats
                    </h3>
                    <button onClick={addModifier} className="p-2 rounded-xl bg-gold-DEFAULT text-black hover:bg-gold-bright transition-all shadow-lg">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="space-y-3">
                    {modifiers.map((m, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-gold-DEFAULT/30 transition-all animate-in slide-in-from-right-4 duration-300">
                            <select 
                                value={m.target} 
                                onChange={e => updateModifier(i, { target: e.target.value })}
                                className="w-28 bg-black border border-white/10 rounded-xl px-3 py-2.5 text-[11px] font-cinzel font-black text-gold-DEFAULT uppercase outline-none"
                            >
                                <option value="stat">ATTRIBUT</option>
                                <option value="bar">RESSOURCE</option>
                            </select>
                            <select 
                                value={m.targetId} 
                                onChange={e => updateModifier(i, { targetId: e.target.value })}
                                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2.5 text-xs font-cinzel font-bold text-white uppercase outline-none focus:border-gold-bright"
                            >
                                {m.target === 'stat' ? statDefs.map((s: any) => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>) : barDefs.map((b: any) => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
                            </select>
                            <input 
                                type="number" 
                                value={m.value} 
                                onChange={e => updateModifier(i, { value: parseInt(e.target.value) || 0 })}
                                className="w-20 bg-gold-DEFAULT/10 border border-gold-DEFAULT/40 rounded-xl px-3 py-2.5 text-[11px] font-mono text-gold-bright text-center outline-none focus:border-gold-bright"
                            />
                            <button onClick={() => setModifiers(modifiers.filter((_, idx) => idx !== i))} className="p-2 rounded-full text-white/60 hover:text-red-500 hover:bg-red-500/10 transition-all">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </section>

          </div>
        </main>

        {/* FOOTER FIXED & NOBLE */}
        <footer className="shrink-0 p-8 lg:p-10 border-t border-gold-DEFAULT/30 bg-black/60 backdrop-blur-3xl z-30 relative shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold-bright/20 to-transparent" />
          
          <div className="flex gap-4">
              <button 
                onClick={() => setShowSkillCreateModal(false)}
                className="flex-1 py-4 rounded-2xl text-white/70 hover:text-white text-xs font-cinzel font-black uppercase tracking-[0.3em] transition-all border border-white/20 hover:border-white/40"
              >
                Annuler
              </button>
              <button 
                onClick={handleSave}
                disabled={!name.trim()}
                className={`flex-[2] py-5 text-[11px] font-cinzel font-black tracking-[0.4em] rounded-2xl transition-all flex justify-center items-center gap-4 relative group overflow-hidden border-2 ${
                  !name.trim()
                    ? 'bg-black/20 text-white/40 border-white/15 cursor-not-allowed'
                    : 'bg-gold-DEFAULT text-black border-gold-DEFAULT hover:bg-gold-bright hover:shadow-[0_0_40px_rgba(212,175,55,0.4)]'
                }`}
              >
                {name.trim() && <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />}
                <Save size={20} className="relative z-10" />
                <span className="relative z-10">Enregistrer</span>
              </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
