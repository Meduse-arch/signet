import React, { useState, useMemo } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { useSessionStore } from '../../store/session';
import { Sparkles, Plus, Trash2, Search, Zap, Dices } from 'lucide-react';
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
  
  const [search, setSearch] = useState('');

  const character = useMemo(() => {
    if (controlledCharacterId) return characters.find(c => c.id === controlledCharacterId);
    return characters.find(c => c.user_id === user?.id);
  }, [characters, controlledCharacterId, user?.id]);

  const handleAddSkill = async () => {
    if (!character || !isMJ) return;
    const name = prompt("Nom de la maîtrise runique :");
    if (!name) return;

    const newSkill = {
      id: crypto.randomUUID(),
      name,
      description: 'Une maîtrise occulte...',
      level: 20
    };

    const updatedChar = {
      ...character,
      custom_skills: [...(character.custom_skills || []), newSkill]
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
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

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-20">
        <Sparkles size={40} className="mb-2" />
        <span className="text-[10px] font-cinzel">Aucune maîtrise liée</span>
      </div>
    );
  }

  const skillDefs = session?.settings?.skills || DEFAULT_SKILLS;
  const customSkills = character.custom_skills || [];
  
  const allSkills = [
    ...skillDefs.map((s: any) => ({ ...s, value: character.skills?.[s.id] || 20, isDefault: true })),
    ...customSkills.map((s: any) => ({ ...s, value: s.level || 20, isDefault: false }))
  ];

  const filteredSkills = allSkills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-DEFAULT/40" />
          <input 
            type="text" 
            placeholder="RECHERCHER UNE MAÎTRISE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-gold-DEFAULT/20 rounded-xl py-2 pl-9 pr-4 text-[10px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-all"
          />
        </div>
        {isMJ && (
          <button 
            onClick={handleAddSkill}
            className="p-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="grid grid-cols-1 gap-2">
          {filteredSkills.map((skill: any) => (
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

        {filteredSkills.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 opacity-20">
            <span className="text-[10px] font-cinzel italic">Aucune maîtrise apprise...</span>
          </div>
        )}
      </div>
    </div>
  );
}
