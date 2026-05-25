import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Zap, Plus, X, Save, BarChart2, BookOpen, Shuffle, Backpack, ChevronDown } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { useSkillsStore } from '../../store/skills';
import { useTagsStore } from '../../store/tags';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Skill, SkillModifier, SkillEffect } from '../../services/skills.service';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { useSessionStore } from '../../store/session';
import { TagManagementModal } from './TagManagementModal';

// --- Composant Select Personnalisé ---
const CustomSelect = ({ value, options, onChange, placeholder }: { value: string, options: {value: string, label: string}[], onChange: (v: string) => void, placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={ref}>
      <div 
        className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white cursor-pointer hover:border-gold-DEFAULT/50 flex justify-between items-center font-cinzel tracking-widest uppercase transition-colors shadow-inner"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{selected ? selected.label : placeholder || 'Choisir...'}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-white/40 ml-2`} />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-[#1a1a1d] border border-gold-DEFAULT/30 rounded-lg shadow-2xl z-[400] max-h-48 overflow-y-auto custom-scrollbar">
          {options.map(o => (
            <div 
              key={o.value} 
              className={`px-3 py-2.5 text-[10px] font-cinzel tracking-widest uppercase cursor-pointer transition-colors ${value === o.value ? 'bg-gold-DEFAULT/20 text-gold-bright' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
              onClick={() => { onChange(o.value); setIsOpen(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Modèles de données unifiés pour l'UI ---
type UnifiedEntry = {
  _uid: string;
  nature: 'classique' | 'buff' | 'debuff';
  targetType: 'attribut' | 'ressource';
  targetId: string;
  mode: 'flat' | 'percent' | 'dice';
  value: number;
  formula: string;
  description: string;
};

const NATURE_OPTIONS = [
  { value: 'classique', label: 'Classique (Dégâts, Soins...)' },
  { value: 'buff', label: 'Buff (Bonus)' },
  { value: 'debuff', label: 'Debuff (Malus)' }
];

const TARGET_TYPE_OPTIONS = [
  { value: 'attribut', label: 'Attribut (Stats)' },
  { value: 'ressource', label: 'Ressource (Jauges)' }
];

const MODE_OPTIONS = [
  { value: 'flat', label: 'Valeur Fixe' },
  { value: 'percent', label: 'Pourcentage (%)' },
  { value: 'dice', label: 'Jet de Dé / Formule' }
];

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [onglet, setOnglet] = useState<'arcanes' | 'condition'>('arcanes');

  const [unifiedEntries, setUnifiedEntries] = useState<UnifiedEntry[]>([]);

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
      setSelectedTags(skillToEdit.tags || []);
      setConditionType(skillToEdit.condition_type || null);
      setConditionTags(skillToEdit.condition_tags || []);

      const initialUnified: UnifiedEntry[] = [];
      skillToEdit.modifiers?.forEach((m: any) => {
        const isNegative = m.value < 0 || (m.formula && m.formula.startsWith('-'));
        initialUnified.push({
          _uid: crypto.randomUUID(),
          nature: isNegative ? 'debuff' : 'buff',
          targetType: m.target === 'stat' ? 'attribut' : 'ressource',
          targetId: m.targetId,
          mode: m.mode || 'flat',
          value: Math.abs(m.value || 0),
          formula: m.formula ? m.formula.replace(/^-/, '') : '',
          description: ''
        });
      });
      skillToEdit.effects?.forEach((e: any) => {
        if (e.type === 'buff' || e.type === 'debuff') {
          initialUnified.push({
            _uid: crypto.randomUUID(),
            nature: e.type,
            targetType: 'ressource',
            targetId: e.cible_jauge || availableBars[0]?.id || '',
            mode: e.mode || 'flat',
            value: Math.abs(e.valeur || 0),
            formula: e.formula ? e.formula.replace(/^-/, '') : '',
            description: e.description || ''
          });
        } else {
          initialUnified.push({
            _uid: crypto.randomUUID(),
            nature: 'classique',
            targetType: 'attribut',
            targetId: '',
            mode: e.mode || 'flat',
            value: e.valeur || 0,
            formula: e.formula || '',
            description: e.description || ''
          });
        }
      });
      setUnifiedEntries(initialUnified);
    } else {
      setName('');
      setDescription('');
      setType('active');
      setImageUrl('');
      setUnifiedEntries([]);
      setSelectedTags([]);
      setConditionType(null);
      setConditionTags([]);
    }
  }, [skillToEdit, showSkillCreateModal]);

  if (!showSkillCreateModal || !isMJ) return null;

  const handleSave = async () => {
    if (!name.trim()) return;

    const modifiers: SkillModifier[] = [];
    const effects: SkillEffect[] = [];

    unifiedEntries.forEach(entry => {
      if (entry.nature === 'buff' || entry.nature === 'debuff') {
        const isDebuff = entry.nature === 'debuff';
        const finalValue = isDebuff ? -Math.abs(entry.value) : Math.abs(entry.value);
        let finalFormula = entry.formula;
        if (isDebuff && finalFormula && !finalFormula.startsWith('-')) {
            finalFormula = '-' + finalFormula;
        }

        modifiers.push({
          target: entry.targetType === 'attribut' ? 'stat' : 'bar',
          targetId: entry.targetId,
          mode: entry.mode,
          value: finalValue,
          formula: finalFormula
        });
      } else if (entry.nature === 'classique') {
        effects.push({
          id: crypto.randomUUID(),
          type: 'utility', 
          target: 'target', 
          valeur: entry.value,
          mode: entry.mode,
          formula: entry.formula,
          description: entry.description
        });
      }
    });

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

  const addEntry = () => {
    setUnifiedEntries([...unifiedEntries, {
      _uid: crypto.randomUUID(),
      nature: 'classique',
      targetType: 'attribut',
      targetId: availableStats[0]?.id || '',
      mode: 'dice',
      value: 0,
      formula: '',
      description: ''
    }]);
  };

  const removeEntry = (idx: number) => {
    setUnifiedEntries(unifiedEntries.filter((_, i) => i !== idx));
  };

  const updateEntry = (idx: number, updates: Partial<UnifiedEntry>) => {
    setUnifiedEntries(unifiedEntries.map((e, i) => i === idx ? { ...e, ...updates } : e));
  };

  const StatHelper = ({ onSelect }: { onSelect: (statName: string) => void }) => (
    <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-black/40 rounded-xl border border-white/5 shadow-inner">
      <span className="text-[7px] font-cinzel font-black text-white/30 uppercase tracking-widest w-full mb-1">Insérer un attribut :</span>
      {availableStats.map(s => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.name)}
          className="px-2 py-1 rounded-lg bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 text-[8px] font-cinzel font-bold text-gold-DEFAULT hover:bg-gold-DEFAULT/20 hover:border-gold-DEFAULT/40 transition-all uppercase tracking-wider"
        >
          {s.name}
        </button>
      ))}
    </div>
  );

  const removeEntry = (idx: number) => {

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
                    className="w-full bg-black/60 border border-gold-DEFAULT/20 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-serif italic text-lg shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest ml-1">Illustration (URL)</label>
                  <input 
                    type="text" 
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-black/60 border border-gold-DEFAULT/20 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-mono shadow-inner"
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
                    className="w-full bg-black/60 border border-gold-DEFAULT/20 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-colors font-serif italic text-sm resize-none h-32 shadow-inner"
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
                    { id: 'arcanes', label: 'Effets & Modificateurs', icon: BarChart2 },
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
                  {onglet === 'arcanes' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
                      {unifiedEntries.map((entry, idx) => (
                        <div key={entry._uid} className="bg-black/60 p-5 rounded-2xl border border-white/5 relative group hover:border-gold-DEFAULT/20 transition-all">
                          <button onClick={() => removeEntry(idx)} className="absolute top-2 right-2 text-white/10 hover:text-red-500 transition-colors p-2 z-10">
                            <X size={14} />
                          </button>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Choix Principal : Nature de l'effet */}
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                              <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Type d'Effet</label>
                              <CustomSelect 
                                value={entry.nature} 
                                options={NATURE_OPTIONS} 
                                onChange={val => updateEntry(idx, { nature: val as any })} 
                              />
                            </div>

                            {/* Si Buff ou Debuff -> Choix de la Cible (Attribut ou Ressource) */}
                            {(entry.nature === 'buff' || entry.nature === 'debuff') && (
                              <>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Élément Impacté</label>
                                  <CustomSelect 
                                    value={entry.targetType} 
                                    options={TARGET_TYPE_OPTIONS} 
                                    onChange={val => updateEntry(idx, { targetType: val as any, targetId: val === 'attribut' ? availableStats[0]?.id : availableBars[0]?.id })} 
                                  />
                                </div>
                                <div className="space-y-1 col-span-2 sm:col-span-1">
                                  <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Sélection précise</label>
                                  <CustomSelect 
                                    value={entry.targetId} 
                                    options={entry.targetType === 'attribut' 
                                      ? availableStats.map(s => ({ value: s.id, label: s.name }))
                                      : availableBars.map(b => ({ value: b.id, label: b.name }))} 
                                    onChange={val => updateEntry(idx, { targetId: val })} 
                                  />
                                </div>
                              </>
                            )}

                            {/* Options communes (Mode + Valeur/Formule) */}
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                              <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Mode de Calcul</label>
                              <CustomSelect 
                                value={entry.mode} 
                                options={MODE_OPTIONS} 
                                onChange={val => updateEntry(idx, { mode: val as any })} 
                              />
                            </div>
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                              <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">
                                {entry.mode === 'dice' ? 'Formule (ex: 1d6+2)' : 'Valeur'}
                              </label>
                              {entry.mode === 'dice' ? (
                                <>
                                  <input 
                                    type="text" 
                                    value={entry.formula} 
                                    onChange={e => updateEntry(idx, { formula: e.target.value })}
                                    placeholder="ex: 2d10 + Force"
                                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50 font-mono shadow-inner"
                                  />
                                  <StatHelper onSelect={(statName) => {
                                    const current = entry.formula || '';
                                    const newVal = current + (current && !current.endsWith(' ') ? ' ' : '') + statName;
                                    updateEntry(idx, { formula: newVal });
                                  }} />
                                </>
                              ) : (
                                <input 
                                  type="number" 
                                  value={entry.value} 
                                  onChange={e => updateEntry(idx, { value: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50 font-mono shadow-inner"
                                />
                              )}
                            </div>

                            {/* Si Classique -> Description Custom */}
                            {entry.nature === 'classique' && (
                              <div className="col-span-2 space-y-1">
                                <label className="text-[8px] font-cinzel font-black text-white/30 uppercase tracking-widest">Description (ex: Dégâts de givre)</label>
                                <input 
                                  type="text" 
                                  value={entry.description} 
                                  onChange={e => updateEntry(idx, { description: e.target.value })}
                                  placeholder="Décrivez l'effet..."
                                  className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-gold-DEFAULT/50 font-mono shadow-inner"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <button onClick={addEntry} className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl font-cinzel text-[10px] font-black tracking-[0.2em] text-white/20 hover:text-gold-bright hover:border-gold-DEFAULT/20 hover:bg-gold-DEFAULT/5 transition-all">
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
