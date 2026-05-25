import React, { useState, useMemo, useEffect } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useSkillsStore } from '../../store/skills';
import { useTagsStore } from '../../store/tags';
import { useUIStore } from '../../store/ui';
import { useDiceStore } from '../../store/dice';
import { usePeer } from '../../hooks/usePeer';
import { useSessionStore } from '../../store/session';
import { Sparkles, Plus, Trash2, Search, Zap, Dices, User, BookOpen, Hammer, Power } from 'lucide-react';
import { addSessionCharacter } from '../../services/characters.service';
import { DEFAULT_SKILLS, DEFAULT_STATS } from '../../systems/seal/constants';
import { Skill } from '../../services/skills.service';
import { parseAndRoll } from '../../services/des.service';
import { addSessionLog } from '../../services/db.service';

interface SkillsWindowContentProps {
  sessionId: string;
}

export function SkillsWindowContent({ sessionId }: SkillsWindowContentProps) {
  const user = useAuthStore(state => state.user);
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const { skills, removeSkill } = useSkillsStore();
  const { tags } = useTagsStore();
  const { setShowSkillCreateModal } = useUIStore();
  const { setDiceResult, diceSharingEnabled, modifier } = useDiceStore();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();
  
  const [activeTab, setActiveTab] = useState<'skills' | 'archives'>('skills');
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<any>(null);

  const character = useMemo(() => {
    if (controlledCharacterId) return characters.find(c => c.id === controlledCharacterId);
    return characters.find(c => c.user_id === user?.id);
  }, [characters, controlledCharacterId, user?.id]);

  useEffect(() => {
    if (isMJ && !character && activeTab === 'skills') {
      setActiveTab('archives');
    }
  }, [isMJ, character, activeTab]);

  const handleLearnSkill = async (e: React.MouseEvent, skill: Skill) => {
    e.stopPropagation();
    if (!character || !isMJ) return;

    // 1. Collecter les valeurs des attributs pour le remplacement
    const statDefs = session?.settings?.stats || DEFAULT_STATS;
    const statValues: Record<string, number> = {};
    statDefs.forEach(s => {
      const val = (character.stats || {})[s.id] || 20;
      statValues[s.name.toLowerCase()] = val;
    });

    let updatedModifiers = skill.modifiers;
    if (skill.type === 'passive_auto' && updatedModifiers) {
      updatedModifiers = updatedModifiers.map((m: any) => {
        if (m.mode === 'dice' && m.formula) {
          let formula = m.formula;
          const sortedStats = Object.entries(statValues).sort((a, b) => b[0].length - a[0].length);
          sortedStats.forEach(([name, val]) => {
            const regex = new RegExp(`(?<=\\b|d)${name}\\b`, 'gi');
            formula = formula.replace(regex, `(${name.charAt(0).toUpperCase() + name.slice(1)}=${val})`);
          });

          const rollRes = parseAndRoll(formula);
          return { ...m, value: rollRes.total };
        }
        return m;
      });
    }

    const updatedChar = {
      ...character,
      custom_skills: [...(character.custom_skills || []), { ...skill, modifiers: updatedModifiers, is_active: false }]
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleRemoveFromCharacter = async (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation();
    if (!character || !isMJ || !window.confirm("Oublier cette maîtrise ?")) return;

    const updatedChar = {
      ...character,
      custom_skills: (character.custom_skills || []).filter((s: any) => s.id !== skillId)
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleToggleSkill = async (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation();
    if (!character) return;

    // 1. Collecter les valeurs des attributs pour le remplacement
    const statDefs = session?.settings?.stats || DEFAULT_STATS;
    const statValues: Record<string, number> = {};
    statDefs.forEach(s => {
      const val = (character.stats || {})[s.id] || 20;
      statValues[s.name.toLowerCase()] = val;
    });

    const updatedBars = { ...(character.bars || {}) };
    let barsChanged = false;

    const updatedSkills = (character.custom_skills || []).map((s: any) => {
      if (s.id === skillId) {
        const isActive = !s.is_active;
        let updatedModifiers = s.modifiers;
        const diceResults: any[] = [];

        if (isActive) {
          if (updatedModifiers) {
            updatedModifiers = updatedModifiers.map((m: any) => {
              let valueToApply = 0;

              if (m.mode === 'dice' && m.formula) {
                let formula = m.formula;
                const sortedStats = Object.entries(statValues).sort((a, b) => b[0].length - a[0].length);
                sortedStats.forEach(([name, val]) => {
                  const regex = new RegExp(`(?<=\\b|d)${name}\\b`, 'gi');
                  formula = formula.replace(regex, `(${name.charAt(0).toUpperCase() + name.slice(1)}=${val})`);
                });
                const rollRes = parseAndRoll(formula);
                
                // AJOUT : On ajoute au DiceRollModal SEULEMENT s'il y a eu des dés
                if (rollRes.rolls.length > 0) {
                  diceResults.push({
                    rolls: rollRes.rolls || [],
                    total: rollRes.total,
                    bonus: 0,
                    diceString: m.formula,
                    label: `Bonus ${m.targetId}`,
                    groups: rollRes.groups,
                    color: '#3b82f6', // Bleu pour les auras/buffs
                    secret: !diceSharingEnabled,
                    timestamp: Date.now(),
                    sender_id: user?.id,
                    sender_name: character.name
                  });
                }
                valueToApply = rollRes.total;
              } else {
                valueToApply = m.value;
              }

              // Gestion Spécifique de la Régénération / Soin (Propriété 'current')
              if (m.target === 'bar' && m.targetProperty === 'current') {
                const barId = m.targetId;
                const currentVal = updatedBars[barId] || 0;
                const maxKey = `max${barId.charAt(0).toUpperCase()}${barId.slice(1)}`;
                
                // On recalcule le max effectif (base + item bonuses) pour le clamp
                const statsFlat: Record<string, number> = {};
                (character.inventory || []).forEach((item: any) => {
                  if (item.equipped && item.modifiers) {
                    item.modifiers.forEach((mod: any, modIdx: number) => {
                      if (mod.target === 'bar' && mod.targetId === barId && mod.targetProperty === 'max') {
                        statsFlat[barId] = (statsFlat[barId] || 0) + (mod.mode === 'dice' ? (item.rolledValues?.[modIdx] || 0) : mod.value);
                      }
                    });
                  }
                });
                const baseMaxVal = (character.bars as Record<string, number>)[maxKey] || (character.bars as Record<string, number>)[barId] || 100;
                const maxVal = baseMaxVal + (statsFlat[barId] || 0);

                updatedBars[barId] = Math.max(0, Math.min(maxVal, currentVal + valueToApply));
                barsChanged = true;
                return m; 
              }

              if (m.mode === 'dice') {
                return { ...m, value: valueToApply };
              }
              return m;
            });
          }

          // Effets Classiques (Dégâts, etc.) - On déclenche l'animation de roll
          if (s.effects && s.effects.length > 0) {
            s.effects.forEach((eff: any) => {
              if (eff.mode === 'dice' && eff.formula) {
                let formula = eff.formula;
                const sortedStats = Object.entries(statValues).sort((a, b) => b[0].length - a[0].length);
                sortedStats.forEach(([name, val]) => {
                  const regex = new RegExp(`(?<=\\b|d)${name}\\b`, 'gi');
                  formula = formula.replace(regex, `(${name.charAt(0).toUpperCase() + name.slice(1)}=${val})`);
                });

                const rollRes = parseAndRoll(formula);
                // On n'ajoute que s'il y a des dés
                if (rollRes.rolls.length > 0) {
                  diceResults.push({
                    rolls: rollRes.rolls || [],
                    total: rollRes.total,
                    bonus: 0,
                    diceString: eff.formula,
                    label: eff.description || s.name,
                    groups: rollRes.groups,
                    color: '#d4af37',
                    secret: !diceSharingEnabled,
                    timestamp: Date.now(),
                    sender_id: user?.id,
                    sender_name: character.name
                  });
                }
              }
            });
          }
        }

        if (diceResults.length > 0) {
          setDiceResult(diceResults);
          if (diceSharingEnabled) diceResults.forEach(r => broadcast({ type: 'DICE_ROLL', payload: r }));
        }

        return { ...s, is_active: isActive, modifiers: updatedModifiers };
      }
      return s;
    });


    const updatedChar = { ...character, custom_skills: updatedSkills, bars: barsChanged ? updatedBars : character.bars };
    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };


  const handleUseSkill = async (e: React.MouseEvent | undefined, skill: any) => {
    if (e) e.stopPropagation();
    if (!character) return;

    const diceResults: any[] = [];
    const statDefs = session?.settings?.stats || DEFAULT_STATS;

    // 1. Calculer les valeurs finales des attributs (Base + Modificateurs)
    const statsFlat: Record<string, number> = {};
    const statsPercent: Record<string, number> = {};
    
    // Objets
    (character.inventory || []).forEach((item: any) => {
      if (item.equipped && item.modifiers) {
        item.modifiers.forEach((m: any, idx: number) => {
          if (m.target === 'stat') {
            if (m.mode === 'percent') statsPercent[m.targetId] = (statsPercent[m.targetId] || 0) + m.value;
            else if (m.mode === 'dice') statsFlat[m.targetId] = (statsFlat[m.targetId] || 0) + (item.rolledValues?.[idx] || 0);
            else statsFlat[m.targetId] = (statsFlat[m.targetId] || 0) + m.value;
          }
        });
      }
    });

    // Compétences Passives
    (character.custom_skills || []).forEach((s: any) => {
      if ((s.type === 'passive_auto' || (s.type === 'passive_toggle' && s.is_active)) && s.modifiers) {
        s.modifiers.forEach((m: any) => {
          if (m.target === 'stat') {
            if (m.mode === 'percent') statsPercent[m.targetId] = (statsPercent[m.targetId] || 0) + m.value;
            else statsFlat[m.targetId] = (statsFlat[m.targetId] || 0) + m.value;
          }
        });
      }
    });

    const statValues: Record<string, number> = {};
    statDefs.forEach(s => {
      const baseVal = (character.stats || {})[s.id] || 20;
      const flat = statsFlat[s.id] || 0;
      const percent = statsPercent[s.id] || 0;
      statValues[s.name.toLowerCase()] = flat + Math.round(baseVal * (1 + percent / 100));
    });

    // 2. Traiter chaque effet configuré
    if (skill.effects && skill.effects.length > 0) {
      skill.effects.forEach((eff: any) => {
        let label = eff.description || skill.name;
        const mode = eff.mode || 'dice';
        const formulaStr = eff.formula || '';
        
        if (mode === 'dice' && formulaStr) {
          let formula = formulaStr;
          const sortedStats = Object.entries(statValues).sort((a, b) => b[0].length - a[0].length);
          
          sortedStats.forEach(([name, val]) => {
            const regex = new RegExp(`(?<=\\b|d)${name}\\b`, 'gi');
            // Utiliser le format (Nom=Valeur) pour que parseAndRoll puisse extraire le label
            formula = formula.replace(regex, `(${name.charAt(0).toUpperCase() + name.slice(1)}=${val})`);
          });

          const rollRes = parseAndRoll(formula);
          const finalTotal = (rollRes.total || 0) + (modifier || 0);
          const modStr = modifier ? (modifier > 0 ? `+${modifier}` : modifier) : '';
          
          diceResults.push({
            rolls: rollRes.rolls || [],
            total: finalTotal,
            bonus: modifier || 0,
            diceString: `${formulaStr}${modStr}`,
            label: label,
            groups: rollRes.groups,
            color: '#d4af37',
            secret: !diceSharingEnabled,
            timestamp: Date.now(),
            sender_id: user?.id,
            sender_name: character.name
          });
        } else if (eff.valeur !== undefined) {
          diceResults.push({
            rolls: [eff.valeur],
            total: eff.valeur,
            bonus: 0,
            diceString: `Effet fixe`,
            label: label,
            color: '#d4af37',
            secret: !diceSharingEnabled,
            timestamp: Date.now(),
            sender_id: user?.id,
            sender_name: character.name
          });
        } else if (eff.description) {
           diceResults.push({
            rolls: [],
            total: 0,
            bonus: 0,
            diceString: 'Narratif',
            label: label,
            color: '#d4af37',
            secret: !diceSharingEnabled,
            timestamp: Date.now(),
            sender_id: user?.id,
            sender_name: character.name
          });
        }
      });
    }

    // 3. Envoyer les résultats
    const finalResults = diceResults.length > 0 ? diceResults : [{
      rolls: [],
      total: 0,
      bonus: 0,
      diceString: 'Utilisation',
      label: skill.name,
      color: '#d4af37',
      secret: !diceSharingEnabled,
      timestamp: Date.now(),
      sender_id: user?.id,
      sender_name: character.name
    }];

    setDiceResult(finalResults);
    
    const logEntry = {
      id: crypto.randomUUID(),
      type: 'competence',
      action: `Invoque ${skill.name}`,
      details: { results: finalResults },
      timestamp: Date.now(),
      character_id: character.id,
      character_name: character.name
    };

    if (window.electronAPI) await addSessionLog(sessionId, logEntry as any);
    if (diceSharingEnabled) finalResults.forEach(r => broadcast({ type: 'DICE_ROLL', payload: r }));
  };

  const handleDeleteArchiveSkill = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isMJ || !window.confirm("Supprimer cette maîtrise des archives ?")) return;
    await removeSkill(sessionId, id);
  };

  const handleEditArchiveSkill = (e: React.MouseEvent, skill: Skill) => {
    e.stopPropagation();
    setShowSkillCreateModal(true, skill);
  };

  const effectiveTab = (!character && isMJ) ? 'archives' : activeTab;
  const customSkills = character?.custom_skills || [];
  
  const characterSkills = [
    ...customSkills.map((s: any) => ({ ...s, value: s.level || 20, isDefault: false }))
  ];

  const filteredCharacterSkills = characterSkills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredArchiveSkills = skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const getTagColor = (tagId: string) => tags.find(t => t.id === tagId)?.color || '#d4af37';


  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500 relative bg-[#0D0D0F]">
      
      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSkill(null)}>
          <div className="w-full max-w-sm bg-[#0D0D0F]/95 border border-gold-DEFAULT/30 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
               <div className="w-16 h-16 rounded-xl bg-black/40 border border-gold-DEFAULT/20 flex items-center justify-center text-gold-DEFAULT overflow-hidden shrink-0">
                 {selectedSkill.image_url ? <img src={selectedSkill.image_url} alt="" className="w-full h-full object-cover" /> : <BookOpen size={24} />}
               </div>
               <div>
                 <h3 className="font-cinzel font-black text-lg text-gold-bright tracking-widest uppercase">{selectedSkill.name}</h3>
                 <span className="text-[10px] font-mono text-gold-DEFAULT/60 uppercase">{selectedSkill.type.replace('_', ' ')}</span>
               </div>
            </div>
            {selectedSkill.description && (
              <p className="text-xs text-white/70 italic leading-relaxed mb-4 p-3 bg-white/5 rounded-xl border border-white/5">"{selectedSkill.description}"</p>
            )}
            
            {(selectedSkill.effects && selectedSkill.effects.length > 0) && (
              <div className="mb-4">
                <h4 className="text-[10px] font-cinzel font-bold text-gold-DEFAULT uppercase tracking-widest mb-2">Effets Actifs</h4>
                <div className="flex flex-col gap-1.5">
                  {selectedSkill.effects.map((eff: any, i: number) => (
                    <div key={i} className="text-xs text-white/80 bg-white/5 px-3 py-2 rounded-lg flex justify-between items-center">
                      <span>{eff.description || 'Action'}</span>
                      <span className="font-mono text-gold-DEFAULT">{eff.mode === 'dice' ? eff.formula : eff.valeur}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(selectedSkill.modifiers && selectedSkill.modifiers.length > 0) && (
              <div>
                <h4 className="text-[10px] font-cinzel font-bold text-gold-DEFAULT uppercase tracking-widest mb-2">Aura / Passif</h4>
                <div className="flex flex-col gap-1.5">
                  {selectedSkill.modifiers.map((mod: any, i: number) => (
                    <div key={i} className="text-xs text-white/80 bg-white/5 px-3 py-2 rounded-lg flex justify-between items-center">
                      <span>Bonus {mod.targetId}</span>
                      <span className="font-mono text-blue-400">
                        {mod.mode === 'dice' ? mod.formula : `${mod.value > 0 ? '+' : ''}${mod.value}${mod.mode === 'percent' ? '%' : ''}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setSelectedSkill(null)} className="px-4 py-2 rounded-xl text-white/50 hover:text-white text-xs font-cinzel uppercase transition-colors">Fermer</button>
              {effectiveTab === 'skills' && selectedSkill.type === 'active' && (
                <button onClick={(e) => { handleUseSkill(e, selectedSkill); setSelectedSkill(null); }} className="px-4 py-2 rounded-xl bg-gold-DEFAULT/20 text-gold-bright hover:bg-gold-DEFAULT/40 border border-gold-DEFAULT/30 text-xs font-cinzel font-black uppercase transition-all flex items-center gap-2">
                  <Dices size={14} /> Invoquer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isMJ && character && (
        <div className="flex gap-2 mb-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 shrink-0 shadow-inner">
          <button
            onClick={() => setActiveTab('skills')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-cinzel font-black tracking-widest flex items-center justify-center gap-3 transition-all ${
              effectiveTab === 'skills' 
              ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <User size={14} /> {character.name ? `CODEX DE ${character.name.toUpperCase()}` : 'MAÎTRISES'}
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-cinzel font-black tracking-widest flex items-center justify-center gap-3 transition-all ${
              effectiveTab === 'archives' 
              ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={14} /> ARCHIVES OCCULTES
          </button>
        </div>
      )}

      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-DEFAULT/40" />
          <input 
            type="text" 
            placeholder={effectiveTab === 'skills' ? "MURMURER LE NOM D'UN ART..." : "INTERROGER LES ARCHIVES..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/60 border border-gold-DEFAULT/10 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/10 focus:outline-none focus:border-gold-DEFAULT/30 transition-all shadow-inner uppercase tracking-widest"
          />
        </div>
        {effectiveTab === 'archives' && isMJ && (
          <button 
            onClick={() => setShowSkillCreateModal(true)}
            className="px-4 py-3 rounded-2xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all flex items-center justify-center shadow-lg group"
            title="Graver un nouvel art"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1.5 pb-4">
        {effectiveTab === 'skills' ? (
          <>
            {!character ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-10 grayscale">
                <Sparkles size={48} className="mb-4" />
                <span className="text-xs font-cinzel font-black tracking-[0.3em] italic">AUCUN CODEX LIÉ...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredCharacterSkills.map((skill: any) => (
                  <div key={skill.id} onClick={() => setSelectedSkill(skill)} className="group cursor-pointer relative rounded-xl p-3 bg-white/[0.03] border border-white/[0.05] hover:border-gold-DEFAULT/40 transition-all flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-gold-DEFAULT/40 group-hover:text-gold-bright transition-colors shrink-0 overflow-hidden">
                      {skill.image_url ? (
                        <img src={skill.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <Zap size={18} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-cinzel font-black text-xs uppercase tracking-widest text-white/90 truncate">{skill.name}</span>
                        {skill.type === 'passive_auto' && <span className="text-[7px] font-mono text-purple-400 border border-purple-400/20 px-1 rounded">PASSIF</span>}
                        {skill.type === 'passive_toggle' && <span className="text-[7px] font-mono text-blue-400 border border-blue-400/20 px-1 rounded">AURA</span>}
                      </div>
                      <div className="flex gap-1">
                        {skill.tags?.map((tagId: string) => (
                          <div key={tagId} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getTagColor(tagId) }} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                      {skill.type === 'active' && (
                        <button 
                          onClick={(e) => handleUseSkill(e, skill)}
                          className="p-1.5 rounded-lg bg-gold-DEFAULT/10 text-gold-DEFAULT hover:bg-gold-DEFAULT/20 transition-all"
                          title="Lancer l'arcane"
                        >
                          <Dices size={14} />
                        </button>
                      )}
                      {skill.type === 'passive_toggle' && (
                        <button 
                          onClick={(e) => handleToggleSkill(e, skill.id)}
                          className={`p-1.5 rounded-lg transition-all ${skill.is_active ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/5 text-white/20 hover:text-white/40'}`}
                          title={skill.is_active ? "Désactiver l'Aura" : "Activer l'Aura"}
                        >
                          <Power size={14} />
                        </button>
                      )}
                      {isMJ && (
                        <button onClick={(e) => handleRemoveFromCharacter(e, skill.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredArchiveSkills.map((skill: any) => (
              <div key={skill.id} onClick={() => setSelectedSkill(skill)} className="group cursor-pointer relative rounded-xl p-3 bg-white/[0.03] border border-white/[0.05] hover:border-gold-DEFAULT/40 transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-gold-DEFAULT/40 group-hover:text-gold-bright transition-colors shrink-0 overflow-hidden">
                  {skill.image_url ? (
                    <img src={skill.image_url} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-80" />
                  ) : (
                    <BookOpen size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-cinzel font-black text-xs uppercase tracking-widest text-white/90 truncate">{skill.name}</span>
                    <span className="text-[7px] border border-white/10 bg-black/40 px-2 py-0.5 rounded text-white/30 uppercase font-cinzel tracking-widest">{skill.type}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skill.tags?.map((tagId: string) => {
                      const tag = tags.find(t => t.id === tagId);
                      return (
                        <span key={tagId} className="text-[7px] font-black uppercase px-1.5 py-px rounded border" style={{ borderColor: tag?.color || '#d4af37', color: tag?.color || '#d4af37', backgroundColor: (tag?.color || '#d4af37') + '10' }}>
                          {tag?.name || 'Signe'}
                        </span>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pr-2 shrink-0">
                  {character && isMJ && (
                    <button 
                      onClick={(e) => handleLearnSkill(e, skill)}
                      className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all shadow-lg"
                      title="Offrir au codex actif"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  {isMJ && (
                    <>
                      <button 
                        onClick={(e) => handleEditArchiveSkill(e, skill)}
                        className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                        title="Modifier"
                      >
                        <Zap size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteArchiveSkill(e, skill.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500/40 hover:text-red-500 transition-all"
                        title="Détruire"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {filteredArchiveSkills.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-10 grayscale">
                <Hammer size={48} className="mb-4" />
                <span className="text-xs font-cinzel font-black tracking-[0.3em] italic">LES ARCHIVES SONT VIDES...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
