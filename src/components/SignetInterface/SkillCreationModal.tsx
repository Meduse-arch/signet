import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Zap, Plus, X, Save, BarChart2, Droplets, BookOpen, Shuffle, Backpack } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { useSkillsStore } from '../../store/skills';
import { useTagsStore } from '../../store/tags';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Skill, SkillModifier, SkillEffect } from '../../services/skills.service';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { useSessionStore } from '../../store/session';
import { TagManagementModal } from './TagManagementModal';

interface SkillCreationModalProps {
  sessionId: string;
}

export function SkillCreationModal({ sessionId }: SkillCreationModalProps) {
  const { showSkillCreateModal, setShowSkillCreateModal, skillToEdit } = useUIStore();
  const { addSkill } = useSkillsStore();
  const { tags } = useTagsStore();
  const { user } = useAuthStore();
  const { broadcast } = usePeer();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'active' | 'passive_auto' | 'passive_toggle'>('active');
  const [imageUrl, setImageUrl] = useState('');
  const [modifiers, setModifiers] = useState<SkillModifier[]>([]);
  const [effects, setEffects] = useState<SkillEffect[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [onglet, setOnglet] = useState<'stats' | 'ressources' | 'condition'>('stats');

  const [conditionType, setConditionType] = useState<'item' | 'skill' | 'les_deux' | null>(null);
  const [conditionTags, setConditionTags] = useState<string[]>([]);
  const [showTagManager, setShowTagManagement] = useState(false);

  const availableStats = session?.settings?.stats || DEFAULT_STATS;
  const availableBars = session?.settings?.bars || DEFAULT_BARS;

  useEffect(() => {
    if (skillToEdit) {
      setName(skillToEdit.name);
      setDescription(skillToEdit.description);
      setType(skillToEdit.type);
      setImageUrl(skillToEdit.image_url || '');
      setModifiers(skillToEdit.modifiers || []);
      setEffects(skillToEdit.effects || []);
      setSelectedTags(skillToEdit.tags || []);
      setConditionType(skillToEdit.condition_type || null);
      setConditionTags(skillToEdit.condition_tags || []);
    } else {
      setName('');
      setDescription('');
      setType('active');
      setImageUrl('');
      setModifiers([]);
      setEffects([]);
      setSelectedTags([]);
      setConditionType(null);
      setConditionTags([]);
    }
  }, [skillToEdit, showSkillCreateModal]);

  if (!showSkillCreateModal || !isMJ) return null;

  const handleSave = async () => {
    if (!name.trim()) return;

    const skill: Skill = {
      id: skillToEdit?.id || crypto.randomUUID(),
      name,
      description,
      type,
      image_url: imageUrl,
      tags: selectedTags,
      modifiers,
      effects,
      condition_type: type === 'passive_auto' ? conditionType : null,
      condition_tags: type === 'passive_auto' ? conditionTags : []
    };

    await addSkill(sessionId, skill);
    broadcast({ type: 'SKILL_UPDATE', payload: skill });
    setShowSkillCreateModal(false);
  };

  const addModifier = () => {
    setModifiers([...modifiers, { target: 'stat', targetId: availableStats[0]?.id || '', mode: 'flat', value: 0 }]);
  };

  const removeModifier = (idx: number) => {
    setModifiers(modifiers.filter((_, i) => i !== idx));
  };

  const updateModifier = (idx: number, updates: Partial<SkillModifier>) => {
    setModifiers(modifiers.map((m, i) => i === idx ? { ...m, ...updates } : m));
  };

  const addEffect = () => {
    setEffects([...effects, { id: crypto.randomUUID(), type: 'damage', target: 'target', mode: 'flat', valeur: 0, description: '' }]);
  };

  const removeEffect = (idx: number) => {
    setEffects(effects.filter((_, i) => i !== idx));
  };

  const updateEffect = (idx: number, updates: Partial<SkillEffect>) => {
    setEffects(effects.map((e, i) => i === idx ? { ...e, ...updates } : e));
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  const toggleConditionTag = (tagId: string) => {
    setConditionTags(prev => prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]);
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl bg-[#0D0D0F]/95 border border-gold-DEFAULT/30 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold-DEFAULT/50 rounded-tl-[2rem] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold-DEFAULT/50 rounded-br-[2rem] pointer-events-none" />

        <header className="flex items-center justify-between p-6 border-b border-gold-DEFAULT/10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 flex items-center justify-center text-gold-bright shadow-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-cinzel font-black text-gold-bright tracking-[0.2em] uppercase">
                {skillToEdit ? "CONSOLIDER L'ART" : "GRAVER DANS LE CODEX"}
              </h2>
              <p className="text-[10px] font-cinzel text-gold-DEFAULT/60 tracking-widest uppercase mt-0.5">Forge des Maîtrises Occultes</p>
            </div>
          </div>
          <button onClick={() => setShowSkillCreateModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gold-dim hover:text-gold-bright transition-colors">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <section className="space-y-6">
                <div className="flex items-center gap-3 opacity-40">
                  <span className="text-[11px] font-cinzel font-black text-gold-DEFAULT tracking-[0.4em] uppercase">[ IDENTITÉ ]</span>
                  <div className="h-px flex-1 bg-gold-DEFAULT/20" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest ml-1">Nom de la Maîtrise</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Tempête de Givre"
                    className="w-full bg-white/5 border border-gold-DEFAULT/20 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-serif italic text-lg shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest ml-1">Illustration (URL)</label>
                  <input 
                    type="text" 
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-gold-DEFAULT/20 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest ml-1">Nature de la Maîtrise</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'active', label: 'Active', icon: Zap, desc: 'Au clic' },
                      { id: 'passive_auto', label: 'Passif Auto', icon: BookOpen, desc: 'Conditionnel' },
                      { id: 'passive_toggle', label: 'Passif Toggle', icon: Shuffle, desc: 'Bascule' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${type === t.id ? 'bg-gold-DEFAULT/20 border-gold-DEFAULT text-gold-bright shadow-lg shadow-gold-DEFAULT/10' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
                      >
                        <t.icon size={16} className="mb-2" />
                        <span className="text-[9px] font-cinzel font-black uppercase tracking-widest">{t.label}</span>
                        <span className="text-[7px] opacity-40 uppercase font-mono mt-1">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest ml-1">Récit & Effets</label>
                  <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Décrivez les arcanes de cette technique..."
                    className="w-full bg-white/5 border border-gold-DEFAULT/20 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-serif italic text-sm resize-none h-32 shadow-inner"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest">Affinités & Signes</label>
                  <button 
                    onClick={() => setShowTagManagement(true)}
                    className="text-[8px] font-cinzel font-black uppercase text-gold-bright hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Plus size={10} /> Gérer les Signes
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 p-4 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                  {tags.map(t => (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={`px-3 py-1.5 rounded-lg border text-[9px] font-cinzel font-black uppercase transition-all ${selectedTags.includes(t.id) ? 'bg-gold-DEFAULT/20 border-gold-DEFAULT text-gold-bright shadow-lg shadow-gold-DEFAULT/10' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}
                      style={selectedTags.includes(t.id) ? { borderColor: t.color, backgroundColor: t.color + '20', color: t.color } : {}}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="flex flex-col h-full space-y-6">
                <div className="flex items-center gap-3 opacity-40">
                  <span className="text-[11px] font-cinzel font-black text-gold-DEFAULT tracking-[0.4em] uppercase">[ ARCANES ]</span>
                  <div className="h-px flex-1 bg-gold-DEFAULT/20" />
                </div>

                <div className="flex gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 shrink-0 shadow-inner">
                  {[
                    { id: 'stats', label: 'Stats', icon: BarChart2 },
                    { id: 'ressources', label: 'Effets', icon: Droplets },
                    { id: 'condition', label: 'Condition', icon: BookOpen, hidden: type !== 'passive_auto' }
                  ].filter(t => !t.hidden).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setOnglet(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl font-cinzel text-[10px] font-black uppercase tracking-widest transition-all ${onglet === tab.id ? 'bg-gold-DEFAULT text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  {onglet === 'stats' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                      {modifiers.map((m, idx) => (
                        <div key={idx} className="bg-black/60 p-5 rounded-2xl border border-white/5 relative group hover:border-gold-DEFAULT/20 transition-all">
                          <button onClick={() => removeModifier(idx)} className="absolute top-2 right-2 text-white/10 hover:text-red-500 transition-colors p-2">
                            <X size={14} />
                          </button>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Cible</label>
                              <select 
                                value={m.targetId} 
                                onChange={e => updateModifier(idx, { targetId: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50"
                              >
                                {availableStats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                {availableBars.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Mode</label>
                              <select 
                                value={m.mode} 
                                onChange={e => updateModifier(idx, { mode: e.target.value as any })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50"
                              >
                                <option value="flat">Fixe</option>
                                <option value="percent">Pourcentage</option>
                                <option value="dice">Jet de Dés</option>
                              </select>
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">{m.mode === 'dice' ? 'Formule (ex: 1d6+2)' : 'Valeur'}</label>
                              {m.mode === 'dice' ? (
                                <input 
                                  type="text" 
                                  value={m.formula || ''} 
                                  onChange={e => updateModifier(idx, { formula: e.target.value })}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50 font-mono"
                                />
                              ) : (
                                <input 
                                  type="number" 
                                  value={m.value} 
                                  onChange={e => updateModifier(idx, { value: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50 font-mono"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <button onClick={addModifier} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl font-cinzel text-[10px] font-black tracking-[0.2em] text-white/20 hover:text-gold-bright hover:border-gold-DEFAULT/20 hover:bg-gold-DEFAULT/5 transition-all">
                        + AJOUTER UN MODIFICATEUR
                      </button>
                    </div>
                  )}

                  {onglet === 'ressources' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                      {effects.map((e, idx) => (
                        <div key={idx} className="bg-black/60 p-5 rounded-2xl border border-white/5 relative group hover:border-gold-DEFAULT/20 transition-all">
                          <button onClick={() => removeEffect(idx)} className="absolute top-2 right-2 text-white/10 hover:text-red-500 transition-colors p-2">
                            <X size={14} />
                          </button>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Nature</label>
                              <select 
                                value={e.type} 
                                onChange={ev => updateEffect(idx, { type: ev.target.value as any })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50"
                              >
                                <option value="damage">Dégâts</option>
                                <option value="heal">Soin</option>
                                <option value="buff">Buff</option>
                                <option value="debuff">Debuff</option>
                                <option value="utility">Utilitaire</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Cible</label>
                              <select 
                                value={e.target} 
                                onChange={ev => updateEffect(idx, { target: ev.target.value as any })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50"
                              >
                                <option value="self">Soi-même</option>
                                <option value="target">Cible unique</option>
                                <option value="area">Zone d'effet</option>
                              </select>
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Description Courte</label>
                              <input 
                                type="text" 
                                value={e.description} 
                                onChange={ev => updateEffect(idx, { description: ev.target.value })}
                                placeholder="Inflige 2d10 dégâts de givre..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button onClick={addEffect} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl font-cinzel text-[10px] font-black tracking-[0.2em] text-white/20 hover:text-gold-bright hover:border-gold-DEFAULT/20 hover:bg-gold-DEFAULT/5 transition-all">
                        + AJOUTER UN EFFET
                      </button>
                    </div>
                  )}

                  {onglet === 'condition' && type === 'passive_auto' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 bg-black/40 p-6 rounded-2xl border border-white/5">
                      <div className="space-y-3">
                        <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest">Cible de la Vérification</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'item', label: 'Objet', icon: Backpack },
                            { id: 'skill', label: 'Maîtrise', icon: BookOpen },
                            { id: 'les_deux', label: 'Les deux', icon: Shuffle }
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={() => setConditionType(t.id as any)}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${conditionType === t.id ? 'bg-gold-DEFAULT/20 border-gold-DEFAULT text-gold-bright shadow-lg shadow-gold-DEFAULT/10' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
                            >
                              <t.icon size={16} className="mb-2" />
                              <span className="text-[9px] font-cinzel font-black uppercase tracking-widest">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest">Déclencheur (Posséder un signe)</label>
                        <div className="flex flex-wrap gap-2">
                          {tags.map(t => (
                            <button
                              key={t.id}
                              onClick={() => toggleConditionTag(t.id)}
                              className={`px-3 py-1.5 rounded-lg border text-[9px] font-cinzel font-black uppercase transition-all ${conditionTags.includes(t.id) ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-lg shadow-purple-500/10' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-[9px] font-garamond italic text-white/40 leading-relaxed p-4 bg-white/5 rounded-xl border border-white/5">
                        Cette maîtrise s'activera automatiquement si le personnage possède un objet ou une autre maîtrise portant l'un des signes sélectionnés.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        <footer className="p-6 border-t border-gold-DEFAULT/10 flex justify-end shrink-0 gap-4">
          <button 
            onClick={() => setShowSkillCreateModal(false)}
            className="px-8 py-3 rounded-full text-[10px] font-cinzel font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Renoncer
          </button>
          <button 
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center justify-center gap-3 px-12 py-3 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/40 text-gold-bright hover:bg-gold-DEFAULT/20 hover:border-gold-DEFAULT disabled:opacity-30 disabled:pointer-events-none transition-all shadow-[0_0_30px_rgba(212,175,55,0.1)] group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-cinzel font-black uppercase tracking-[0.2em]">Graver le Destin</span>
          </button>
        </footer>
      </div>

      {showTagManager && (
        <TagManagementModal 
          sessionId={sessionId} 
          onClose={() => setShowTagManagement(false)} 
        />
      )}
    </div>,
    document.body
  );
}
