import React, { useState, useMemo, useEffect } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useSkillsStore } from '../../store/skills';
import { useTagsStore } from '../../store/tags';
import { useUIStore } from '../../store/ui';
import { usePeer } from '../../hooks/usePeer';
import { useSessionStore } from '../../store/session';
import { Sparkles, Plus, Trash2, Search, Zap, Dices, User, BookOpen, Hammer, ChevronRight } from 'lucide-react';
import { addSessionCharacter } from '../../services/characters.service';
import { DEFAULT_SKILLS } from '../../systems/seal/constants';
import { Skill } from '../../services/skills.service';

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
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();
  
  const [activeTab, setActiveTab] = useState<'skills' | 'archives'>('skills');
  const [search, setSearch] = useState('');

  const character = useMemo(() => {
    if (controlledCharacterId) return characters.find(c => c.id === controlledCharacterId);
    return characters.find(c => c.user_id === user?.id);
  }, [characters, controlledCharacterId, user?.id]);

  useEffect(() => {
    if (isMJ && !character && activeTab === 'skills') {
      setActiveTab('archives');
    }
  }, [isMJ, character, activeTab]);

  const handleLearnSkill = async (skill: Skill) => {
    if (!character || !isMJ) return;

    const updatedChar = {
      ...character,
      custom_skills: [...(character.custom_skills || []), skill]
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleRemoveFromCharacter = async (skillId: string) => {
    if (!character || !isMJ || !window.confirm("Oublier cette maîtrise ?")) return;

    const updatedChar = {
      ...character,
      custom_skills: (character.custom_skills || []).filter((s: any) => s.id !== skillId)
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleDeleteArchiveSkill = async (id: string) => {
    if (!isMJ || !window.confirm("Supprimer cette maîtrise des archives ?")) return;
    await removeSkill(sessionId, id);
  };

  const handleEditArchiveSkill = (skill: Skill) => {
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
                  <div key={skill.id} className="group relative rounded-xl p-3 bg-white/[0.03] border border-white/[0.05] hover:border-gold-DEFAULT/40 transition-all flex items-center gap-4">
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
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-gold-bright/60 font-mono">D{skill.value}</span>
                        <div className="flex gap-1">
                          {skill.tags?.map((tagId: string) => (
                            <div key={tagId} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getTagColor(tagId) }} />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                      <button className="p-1.5 rounded-lg bg-gold-DEFAULT/10 text-gold-DEFAULT hover:bg-gold-DEFAULT/20 transition-all">
                        <Dices size={14} />
                      </button>
                      {isMJ && (
                        <button onClick={() => handleRemoveFromCharacter(skill.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                      <button className="p-1 hover:bg-white/10 rounded transition-colors text-gold-DEFAULT/30">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredArchiveSkills.map((skill: any) => (
              <div key={skill.id} className="group relative rounded-xl p-3 bg-white/[0.03] border border-white/[0.05] hover:border-gold-DEFAULT/40 transition-all flex items-center gap-4">
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
                      onClick={() => handleLearnSkill(skill)}
                      className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all shadow-lg"
                      title="Offrir au codex actif"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  {isMJ && (
                    <>
                      <button 
                        onClick={() => handleEditArchiveSkill(skill)}
                        className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all"
                        title="Modifier"
                      >
                        <Zap size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteArchiveSkill(skill.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500/40 hover:text-red-500 transition-all"
                        title="Détruire"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  <button className="p-1 hover:bg-white/10 rounded transition-colors text-gold-DEFAULT/30">
                    <ChevronRight size={16} />
                  </button>
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
