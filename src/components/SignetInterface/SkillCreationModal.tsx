import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Zap, Plus, X, Save, BarChart2, BookOpen, Shuffle, Backpack, ChevronDown, Dices, Power, Upload, Loader2 } from 'lucide-react';
import { useSkillsStore } from '../../store/skills';
import { useUIStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import { useTagsStore } from '../../store/tags';
import { TagManagementModal } from './TagManagementModal';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { assetSyncService } from '../../services/asset-sync.service';

interface SkillCreationModalProps {
  sessionId: string;
}

export function SkillCreationModal({ sessionId }: SkillCreationModalProps) {
  const { showSkillCreateModal, setShowSkillCreateModal, skillToEdit, skillCreationType } = useUIStore();
  const { addSkill } = useSkillsStore();
  const { tags } = useTagsStore();
  const [showTagManager, setShowTagManager] = useState(false);
  
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

    // Si on est en mode 'inventory', on met à jour directement le personnage
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
            // On peut aussi broadcaster ici si besoin
        }
    } else {
        // Sinon c'est une sauvegarde dans le codex global
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <header className="p-6 border-b border-gold-DEFAULT/20 flex justify-between items-center bg-black/40">
           <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-bright shadow-lg shadow-gold-DEFAULT/5">
                <Sparkles size={24} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-cinzel font-black text-white uppercase tracking-widest">
                  {skillToEdit ? "Façonner l'Arcane" : "Invoquer une Maîtrise"}
                </h2>
                <p className="text-[10px] font-cinzel text-gold-DEFAULT/40 uppercase tracking-[0.2em]">Codex des Manifestations</p>
              </div>
           </div>
           <button 
             onClick={() => setShowSkillCreateModal(false)}
             className="p-2 rounded-xl hover:bg-white/5 text-white/20 hover:text-white transition-all"
           >
             <X size={24} />
           </button>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* COLONNE GAUCHE : IDENTITÉ */}
          <div className="space-y-8">
            <section className="space-y-4">
               <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-[0.3em] flex items-center gap-2">
                 <BookOpen size={14} /> Identité de l'Arcane
               </h3>
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-cinzel font-black text-white/40 uppercase tracking-widest ml-1">Nom de la Maîtrise</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      placeholder="NOM DE L'ARCANE..."
                      className="w-full bg-black/40 border border-gold-DEFAULT/10 rounded-xl px-4 py-3 text-sm font-cinzel text-white placeholder:text-white/10 focus:outline-none focus:border-gold-DEFAULT/40 transition-all shadow-inner uppercase tracking-wider"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-cinzel font-black text-white/40 uppercase tracking-widest ml-1">Récit & Lore</label>
                    <textarea 
                      value={description} 
                      onChange={e => setDescription(e.target.value)}
                      placeholder="DÉCRIVEZ LA NATURE DE CET ARCANNE..."
                      rows={4}
                      className="w-full bg-black/40 border border-gold-DEFAULT/10 rounded-xl px-4 py-3 text-xs font-garamond italic text-white/60 placeholder:text-white/10 focus:outline-none focus:border-gold-DEFAULT/40 transition-all shadow-inner"
                    />
                  </div>
               </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[8px] font-cinzel font-black text-white/40 uppercase tracking-widest ml-1">Nature de l'Usage</label>
                    <select 
                      value={type} 
                      onChange={e => setType(e.target.value as any)}
                      className="w-full bg-black/40 border border-gold-DEFAULT/10 rounded-xl px-4 py-3 text-[10px] font-cinzel text-white uppercase focus:outline-none focus:border-gold-DEFAULT/40 appearance-none cursor-pointer"
                    >
                        <option value="active">Compétence Active</option>
                        <option value="passive_auto">Passif Permanent</option>
                        <option value="passive_toggle">Aura Activable</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[8px] font-cinzel font-black text-white/40 uppercase tracking-widest ml-1">Sceau Visuel</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={imageUrl} 
                            onChange={e => setImageUrl(e.target.value)}
                            placeholder="URL DU SCEAU..."
                            className="flex-1 bg-black/40 border border-gold-DEFAULT/10 rounded-xl px-4 py-3 text-[9px] font-mono text-white/60 focus:outline-none focus:border-gold-DEFAULT/40"
                        />
                        <label className="p-3 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-bright hover:bg-gold-DEFAULT/20 cursor-pointer transition-all relative">
                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>
            </section>

            {/* COÛT */}
            <section className="space-y-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Power size={14} /> Tribut de Ressource
                    </h3>
                    <button 
                        onClick={() => setHasCost(!hasCost)}
                        className={`px-3 py-1 rounded-full text-[8px] font-cinzel font-black uppercase transition-all ${hasCost ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}
                    >
                        {hasCost ? 'Supprimer' : 'Ajouter Coût'}
                    </button>
                </div>
                {hasCost && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                        <select 
                            value={costBarId} 
                            onChange={e => setCostBarId(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-cinzel text-white uppercase focus:outline-none focus:border-gold-DEFAULT/40"
                        >
                            {DEFAULT_BARS.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        <input 
                            type="number" 
                            value={costValue} 
                            onChange={e => setCostValue(parseInt(e.target.value))}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono text-white text-center"
                        />
                    </div>
                )}
            </section>
          </div>

          {/* COLONNE DROITE : MÉCANIQUES */}
          <div className="space-y-8">
            
            {/* EFFETS ACTIFS */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Zap size={14} /> Manifestations Actives
                    </h3>
                    <button onClick={addEffect} className="p-1.5 rounded-lg bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all">
                        <Plus size={14} />
                    </button>
                </div>
                <div className="space-y-3">
                    {effects.map((eff) => (
                        <div key={eff.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3 relative group">
                            <button 
                                onClick={() => setEffects(effects.filter(e => e.id !== eff.id))}
                                className="absolute top-2 right-2 p-1 text-white/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                            <div className="grid grid-cols-3 gap-3">
                                <select 
                                    value={eff.type} 
                                    onChange={e => updateEffect(eff.id, { type: e.target.value })}
                                    className="col-span-1 bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-cinzel text-white"
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
                                        className="w-20 bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-cinzel text-white"
                                    >
                                        <option value="dice">Dés</option>
                                        <option value="flat">Fixe</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        value={eff.mode === 'dice' ? eff.formula : eff.valeur}
                                        onChange={e => updateEffect(eff.id, eff.mode === 'dice' ? { formula: e.target.value } : { valeur: parseInt(e.target.value) })}
                                        placeholder={eff.mode === 'dice' ? "1d6 + Force..." : "0"}
                                        className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-gold-bright"
                                    />
                                </div>
                            </div>
                            <input 
                                type="text" 
                                value={eff.description} 
                                onChange={e => updateEffect(eff.id, { description: e.target.value })}
                                placeholder="DESCRIPTION DE L'EFFET (EX: DÉGÂTS DE FEU...)"
                                className="w-full bg-black/20 border-b border-white/5 text-[9px] font-serif italic text-white/40 px-1 py-1 focus:outline-none focus:border-gold-DEFAULT/40"
                            />
                        </div>
                    ))}
                    {effects.length === 0 && <p className="text-center py-4 text-[9px] font-cinzel text-white/10 uppercase tracking-widest italic">Aucun effet actif défini</p>}
                </div>
            </section>

            {/* MODIFICATEURS PASSIFS */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-[0.3em] flex items-center gap-2">
                        <BarChart2 size={14} /> Augures Passifs
                    </h3>
                    <button onClick={addModifier} className="p-1.5 rounded-lg bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all">
                        <Plus size={14} />
                    </button>
                </div>
                <div className="space-y-2">
                    {modifiers.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 group">
                            <select 
                                value={m.target} 
                                onChange={e => updateModifier(i, { target: e.target.value })}
                                className="w-24 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-cinzel text-white/60"
                            >
                                <option value="stat">Attribut</option>
                                <option value="bar">Ressource</option>
                            </select>
                            <select 
                                value={m.targetId} 
                                onChange={e => updateModifier(i, { targetId: e.target.value })}
                                className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-cinzel text-white"
                            >
                                {m.target === 'stat' ? statDefs.map(s => <option key={s.id} value={s.id}>{s.name}</option>) : barDefs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <input 
                                type="number" 
                                value={m.value} 
                                onChange={e => updateModifier(i, { value: parseInt(e.target.value) })}
                                className="w-16 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-mono text-gold-bright text-center"
                            />
                            <button onClick={() => setModifiers(modifiers.filter((_, idx) => idx !== i))} className="p-1.5 text-white/10 hover:text-red-500">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </section>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="p-6 border-t border-gold-DEFAULT/20 bg-black/40 flex justify-end gap-3">
          <button 
            onClick={() => setShowSkillCreateModal(false)}
            className="px-6 py-3 rounded-xl text-white/40 hover:text-white text-[10px] font-cinzel font-black uppercase tracking-[0.2em] transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-3 rounded-xl bg-gold-DEFAULT text-black hover:bg-gold-bright font-cinzel font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg flex items-center gap-3"
          >
            <Save size={18} />
            {skillCreationType === 'inventory' ? "LIER À L'ÂME" : "GRAVER DANS LE CODEX"}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
