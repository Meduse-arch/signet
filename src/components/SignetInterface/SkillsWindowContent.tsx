import React, { useState, useMemo, useEffect } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { useSessionStore } from '../../store/session';
import { Sparkles, Plus, Trash2, Search, Zap, Dices, User, BookOpen, X } from 'lucide-react';
import { addSessionCharacter } from '../../services/characters.service';
import { DEFAULT_SKILLS } from '../../systems/seal/constants';

interface SkillsWindowContentProps {
  sessionId: string;
}

export function SkillsWindowContent({ sessionId }: SkillsWindowContentProps) {
  const user = useAuthStore(state => state.user);
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();
  
  const [activeTab, setActiveTab] = useState<'skills' | 'archives'>('skills');
  const [search, setSearch] = useState('');

  // Form state
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');

  const character = useMemo(() => {
    if (controlledCharacterId) return characters.find(c => c.id === controlledCharacterId);
    return characters.find(c => c.user_id === user?.id);
  }, [characters, controlledCharacterId, user?.id]);

  useEffect(() => {
    if (isMJ && !character && activeTab === 'skills') {
      setActiveTab('archives');
    }
  }, [isMJ, character, activeTab]);

  const handleAddSkill = async () => {
    if (!newSkillName.trim() || !character || !isMJ) return;

    const newSkill = {
      id: crypto.randomUUID(),
      name: newSkillName,
      description: newSkillDesc || 'Une maîtrise occulte...',
      level: 20
    };

    const updatedChar = {
      ...character,
      custom_skills: [...(character.custom_skills || []), newSkill]
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
    
    setNewSkillName('');
    setNewSkillDesc('');
    setIsSkillModalOpen(false);
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!character || !isMJ || !window.confirm("Oublier cette maîtrise ?")) return;

    const updatedChar = {
      ...character,
      custom_skills: (character.custom_skills || []).filter((s: any) => s.id !== skillId)
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const effectiveTab = (!character && isMJ) ? 'archives' : activeTab;
  const skillDefs = session?.settings?.skills || DEFAULT_SKILLS;
  const customSkills = character?.custom_skills || [];
  
  const characterSkills = [
    ...skillDefs.map((s: any) => ({ ...s, value: character?.skills?.[s.id] || 20, isDefault: true })),
    ...customSkills.map((s: any) => ({ ...s, value: s.level || 20, isDefault: false }))
  ];

  const filteredCharacterSkills = characterSkills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredArchiveSkills = skillDefs.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));

  const openSkillModal = () => {
    setNewSkillName('');
    setNewSkillDesc('');
    setIsSkillModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500 relative">
      
      {isMJ && character && (
        <div className="flex gap-2 mb-2 bg-black/40 p-1 rounded-xl border border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab('skills')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-cinzel font-bold tracking-widest flex items-center justify-center gap-2 transition-all ${
              effectiveTab === 'skills' 
              ? 'bg-gold-DEFAULT text-black shadow-[0_0_10px_rgba(212,175,55,0.5)]' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <User size={14} /> {character.name ? `COMPÉTENCES (${character.name})` : 'COMPÉTENCES'}
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-cinzel font-bold tracking-widest flex items-center justify-center gap-2 transition-all ${
              effectiveTab === 'archives' 
              ? 'bg-gold-DEFAULT text-black shadow-[0_0_10px_rgba(212,175,55,0.5)]' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={14} /> ARCHIVES
          </button>
        </div>
      )}

      {/* Creation Modal Overlay */}
      {isSkillModalOpen && isMJ && effectiveTab === 'skills' && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-xl p-5 w-full max-w-sm shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-xs font-cinzel font-bold text-gold-DEFAULT uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} /> NOUVELLE MAÎTRISE
              </h3>
              <button onClick={() => setIsSkillModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <input type="text" placeholder="Nom de la maîtrise" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-gold-DEFAULT/50 outline-none" autoFocus />
              <textarea placeholder="Description" value={newSkillDesc} onChange={e => setNewSkillDesc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-gold-DEFAULT/50 outline-none resize-none h-20" />
            </div>
            
            <button onClick={handleAddSkill} className="w-full py-2.5 bg-gold-DEFAULT text-black text-[10px] font-cinzel font-bold tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all flex justify-center items-center gap-2 mt-2">
              <Plus size={14} /> AJOUTER LA MAÎTRISE
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-DEFAULT/40" />
          <input 
            type="text" 
            placeholder={effectiveTab === 'skills' ? "RECHERCHER UNE MAÎTRISE..." : "RECHERCHER DANS LES ARCHIVES..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-gold-DEFAULT/20 rounded-xl py-2 pl-9 pr-4 text-[10px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-all"
          />
        </div>
        {effectiveTab === 'skills' && isMJ && (
          <button 
            onClick={openSkillModal}
            className="p-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all"
            title="Ajouter une maîtrise"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {effectiveTab === 'skills' ? (
          <>
            {!character ? (
              <div className="flex flex-col items-center justify-center h-full opacity-20">
                <Sparkles size={40} className="mb-2" />
                <span className="text-[10px] font-cinzel">Aucune maîtrise liée</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {filteredCharacterSkills.map((skill: any) => (
                    <div key={skill.id} className="group relative flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 hover:border-gold-DEFAULT/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 flex items-center justify-center text-gold-DEFAULT group-hover:text-gold-bright transition-colors">
                          <Zap size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-cinzel font-black text-gold-bright uppercase tracking-widest">{skill.name}</span>
                          <span className="text-[8px] text-white/30 font-mono">D{skill.value}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg bg-gold-DEFAULT/10 text-gold-DEFAULT hover:bg-gold-DEFAULT/20 transition-all">
                          <Dices size={14} />
                        </button>
                        {isMJ && !skill.isDefault && (
                          <button onClick={() => handleRemoveSkill(skill.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-500/60 hover:bg-red-500/20 transition-all">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredCharacterSkills.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 opacity-20">
                    <span className="text-[10px] font-cinzel italic">Aucune maîtrise trouvée...</span>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2">
              {filteredArchiveSkills.map((skill: any) => (
                <div key={skill.id} className="group relative flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 hover:border-gold-DEFAULT/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 flex items-center justify-center text-gold-DEFAULT group-hover:text-gold-bright transition-colors">
                      <BookOpen size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-cinzel font-black text-gold-bright uppercase tracking-widest">{skill.name}</span>
                      <span className="text-[8px] text-white/30 font-mono italic">Modèle de session</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredArchiveSkills.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 opacity-20">
                <span className="text-[10px] font-cinzel italic">Aucun modèle de maîtrise global...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
