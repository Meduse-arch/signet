import React, { useState, useMemo, useEffect } from 'react';
import { useSkillsStore } from '../../store/skills';
import { useCharactersStore } from '../../store/characters';
import { useTagsStore } from '../../store/tags';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useUIStore } from '../../store/ui';
import { usePeer } from '../../hooks/usePeer';
import { 
  Sparkles, 
  Search, 
  Plus, 
  Trash2, 
  Zap, 
  BookOpen,
  X,
  PenTool,
  Hammer,
  User,
  Power,
  ChevronRight
} from 'lucide-react';
import { SkillCreationModal } from './SkillCreationModal';
import { SkillDetailContent } from './SkillDetailContent';
import { addSessionCharacter } from '../../services/characters.service';

interface SkillsWindowContentProps {
  sessionId: string;
  variant?: 'default' | 'codex';
}

export function SkillsWindowContent({ sessionId, variant = 'default' }: SkillsWindowContentProps) {
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const character = characters.find(c => controlledCharacterId ? c.id === controlledCharacterId : c.user_id === user?.id);
  const { skills, removeSkill } = useSkillsStore();
  const { tags } = useTagsStore();
  const { setShowSkillCreateModal, setSelectedSkill, selectedSkill } = useUIStore();
  const { broadcast } = usePeer();

  const [activeTab, setActiveTab] = useState<'inventory' | 'forge'>('inventory');
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isWideView, setIsWideView] = useState(variant === 'codex');

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsWideView(entry.contentRect.width > 650);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isMJ && !character && activeTab === 'inventory') {
      setActiveTab('forge');
    }
  }, [isMJ, character, activeTab]);

  const filteredLibrary = useMemo(() => {
    return skills.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          (s.description && s.description.toLowerCase().includes(search.toLowerCase()));
      const matchesTag = !selectedTag || (s.tags && s.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
  }, [skills, search, selectedTag]);

  const characterSkills = useMemo(() => {
    const sList = character?.custom_skills || [];
    return sList.filter((s: any) => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !selectedTag || (s.tags && s.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
  }, [character?.custom_skills, search, selectedTag]);

  const handleToggleSkillActive = async (skillToToggle: any) => {
    if (!character) return;
    const updatedChar = {
      ...character,
      custom_skills: (character.custom_skills || []).map((s: any) => 
        (s.id === skillToToggle.id) ? { ...s, is_active: !s.is_active } : s
      )
    };
    addOrUpdateCharacter(updatedChar, false);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleGiveSkillToCharacter = async (skill: any) => {
    if (!character || !isMJ) return;
    if (character.custom_skills?.some((s: any) => s.id === skill.id)) {
        alert("Ce voyageur maîtrise déjà cet arcane.");
        return;
    }
    const updatedChar = {
      ...character,
      custom_skills: [...(character.custom_skills || []), { ...skill, is_active: false }]
    };
    addOrUpdateCharacter(updatedChar, false);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleRemoveFromCharacter = async (skill: any) => {
    if (!character || !isMJ || !window.confirm(`Oublier ${skill.name} ?`)) return;
    const updatedChar = {
      ...character,
      custom_skills: (character.custom_skills || []).filter((s: any) => s.id !== skill.id)
    };
    addOrUpdateCharacter(updatedChar, false);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
    if (selectedSkill?.id === skill.id) setSelectedSkill(null);
  };

  const handleDeleteSkillTemplate = async (id: string) => {
    if (!isMJ || !window.confirm("Supprimer cette maîtrise du codex ?")) return;
    await removeSkill(sessionId, id);
    if (selectedSkill?.id === id) setSelectedSkill(null);
  };

  const effectiveTab = (!character && isMJ) ? 'forge' : activeTab;

  return (
    <div ref={containerRef} className="flex flex-col h-full animate-in fade-in duration-500 relative bg-[#0D0D0F]">
      
      {/* ─── MODALE DÉTAIL (Mode Mobile) ─── */}
      {!isWideView && selectedSkill && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-md" onClick={() => setSelectedSkill(null)}>
          <div className="w-full max-w-sm bg-[#0D0D0F]/95 border border-gold-DEFAULT/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
            <SkillDetailContent 
              skill={selectedSkill} 
              isMJ={isMJ}
              onEdit={effectiveTab === 'forge' && isMJ ? () => setShowSkillCreateModal(true, selectedSkill, 'forge') : (effectiveTab === 'inventory' ? () => setShowSkillCreateModal(true, selectedSkill, 'inventory') : undefined)}
              onDelete={effectiveTab === 'forge' && isMJ ? () => handleDeleteSkillTemplate(selectedSkill.id) : (effectiveTab === 'inventory' && isMJ ? () => handleRemoveFromCharacter(selectedSkill) : undefined)}
              showActions={false}
            />
            <button 
              onClick={() => setSelectedSkill(null)} 
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white/60 hover:text-white transition-colors z-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <SkillCreationModal sessionId={sessionId} />

      <div className="flex-1 flex overflow-hidden">
        {/* ─── LISTE DES MAÎTRISES (Panneau Gauche) ─── */}
        <div className={`flex-1 flex flex-col p-4 gap-4 min-w-0 transition-all duration-500 ${isWideView && selectedSkill ? 'border-r border-white/5 max-w-[45%]' : 'max-w-full'}`}>
            {isMJ && character && (
            <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5 shrink-0 shadow-inner">
                <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 py-2 rounded-lg text-xs font-cinzel font-black tracking-widest flex items-center justify-center gap-2 transition-all ${
                    effectiveTab === 'inventory' 
                    ? 'bg-gold-DEFAULT text-black shadow-lg' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                >
                <User size={10} /> {character.name.toUpperCase()}
                </button>
                <button
                onClick={() => setActiveTab('forge')}
                className={`flex-1 py-2 rounded-lg text-xs font-cinzel font-black tracking-widest flex items-center justify-center gap-2 transition-all ${
                    effectiveTab === 'forge' 
                    ? 'bg-gold-DEFAULT text-black shadow-lg' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                >
                <Hammer size={10} /> ARCHIVES
                </button>
            </div>
            )}

            <div className="flex gap-2 shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gold-DEFAULT/40" />
                    <input 
                    type="text" 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="CHERCHER..."
                    className="w-full bg-black/60 border border-gold-DEFAULT/10 rounded-xl py-2 pl-9 pr-3 text-[11px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/40 focus:outline-none focus:border-gold-DEFAULT/30 transition-all shadow-inner uppercase tracking-widest"
                    />
                </div>
                {effectiveTab === 'forge' && isMJ && (
                    <button 
                    onClick={() => setShowSkillCreateModal(true, null, 'forge')}
                    className="p-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all flex items-center justify-center group"
                    >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                )}
            </div>

            {/* Barre de Tags Compacte */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
                <button 
                    onClick={() => setSelectedTag(null)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-cinzel font-black uppercase tracking-widest border transition-all whitespace-nowrap ${!selectedTag ? 'bg-gold-DEFAULT text-black border-gold-DEFAULT' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'}`}
                >
                    TOUT
                </button>
                {tags.map(tag => (
                    <button 
                    key={tag.id}
                    onClick={() => setSelectedTag(tag.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-cinzel font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedTag === tag.id ? 'bg-gold-DEFAULT text-black border-gold-DEFAULT' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'}`}
                    style={selectedTag === tag.id ? {} : { borderLeftColor: tag.color, borderLeftWidth: '2px' }}
                    >
                    {tag.name}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1.5 pb-4 min-h-0">
                {(effectiveTab === 'inventory' ? characterSkills : filteredLibrary).map((skill) => {
                    const isActive = selectedSkill?.id === skill.id;
                    const isEquipped = effectiveTab === 'inventory' && skill.is_active;
                    
                    return (
                    <div 
                        key={skill.id}
                        className={`group relative rounded-xl p-2.5 transition-all flex items-center gap-3 overflow-hidden ${
                        isActive ? 'border-gold-bright bg-gold-DEFAULT/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-white/[0.05] bg-white/[0.02] hover:border-gold-DEFAULT/30'
                        }`}
                    >
                        <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
                        {skill.image_url ? (
                            <img src={skill.image_url} alt="" className={`w-full h-full object-cover ${isEquipped ? 'opacity-100' : 'opacity-40 group-hover:opacity-100 transition-opacity'}`} />
                        ) : (
                            <Zap size={18} className={isEquipped ? 'text-gold-DEFAULT' : 'text-white/10 group-hover:text-gold-DEFAULT/40 transition-colors'} />
                        )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className={`text-xs font-cinzel font-black tracking-widest truncate uppercase transition-colors ${isEquipped ? 'text-gold-bright drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : (isActive ? 'text-gold-DEFAULT' : 'text-white/60 group-hover:text-white')}`}>
                                {skill.name}
                            </h4>
                            <span className="text-[11px] font-mono text-white/60 uppercase tracking-tighter truncate">{skill.type || 'Compétence'}</span>
                        </div>

                        {/* ─── ACTIONS SUR LA BARRE ─── */}
                        <div className="flex items-center gap-1 shrink-0 z-10">
                            {effectiveTab === 'inventory' ? (
                                <>
                                    <div className={`transition-all duration-300 ${isEquipped ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}`}>
                                        {skill.type === 'passive_toggle' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleToggleSkillActive(skill); }}
                                                className={`p-1.5 rounded-lg transition-all ${isEquipped ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/40' : 'bg-gold-DEFAULT text-black group-hover:bg-gold-bright transition-colors'}`}
                                                title={isEquipped ? "Désactiver" : "Activer"}
                                            >
                                                <Power size={10} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Bouton Détails (Chevron) */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedSkill(skill, false); }}
                                        className="p-1.5 rounded-lg text-white/60 hover:text-gold-bright hover:bg-white/5 transition-all opacity-30 group-hover:opacity-100"
                                        title="Voir les détails"
                                    >
                                        <ChevronRight size={14} />
                                    </button>

                                    {isMJ && (
                                        <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity ml-0.5 pl-0.5 border-l border-white/5">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRemoveFromCharacter(skill); }}
                                                className="p-1.5 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {isMJ && (
                                        <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                                            {character && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleGiveSkillToCharacter(skill); }}
                                                    className="p-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all"
                                                    title="Offrir"
                                                >
                                                    <Plus size={10} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setShowSkillCreateModal(true, skill, 'forge'); }}
                                                className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
                                                title="Modifier"
                                            >
                                                <PenTool size={10} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteSkillTemplate(skill.id); }}
                                                className="p-1.5 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 transition-colors"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedSkill(skill, false); }}
                                        className="p-1.5 rounded-lg text-white/60 hover:text-gold-bright hover:bg-white/5 transition-all opacity-30 group-hover:opacity-100"
                                        title="Voir les détails"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                        
                        {isEquipped && (
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gold-DEFAULT shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                        )}
                    </div>
                    );
                })}

                {(effectiveTab === 'inventory' ? characterSkills : filteredLibrary).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-10 grayscale">
                        <BookOpen size={32} className="mb-2" />
                        <span className="text-xs font-cinzel tracking-widest italic">VIDE...</span>
                    </div>
                )}
            </div>
        </div>

        {/* ─── PANNEAU DE DÉTAIL (Mode Codex) ─── */}
        {isWideView && (
          <div className={`transition-all duration-500 overflow-hidden bg-black/20 ${selectedSkill ? 'flex-1 opacity-100' : 'w-0 opacity-0'}`}>
            {selectedSkill ? (
              <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-500 relative">
                 <div className="p-3 border-b border-white/5 flex justify-between items-center bg-black/40 shrink-0">
                    <span className="text-[11px] font-cinzel font-black text-gold-DEFAULT tracking-[0.3em] uppercase">Détails de la Maîtrise</span>
                    <button onClick={() => setSelectedSkill(null)} className="p-1 rounded hover:bg-white/5 text-white/60 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <SkillDetailContent 
                      skill={selectedSkill} 
                      isMJ={isMJ}
                      onEdit={effectiveTab === 'forge' && isMJ ? () => setShowSkillCreateModal(true, selectedSkill, 'forge') : (effectiveTab === 'inventory' ? () => setShowSkillCreateModal(true, selectedSkill, 'inventory') : undefined)}
                      onDelete={effectiveTab === 'forge' && isMJ ? () => handleDeleteSkillTemplate(selectedSkill.id) : (effectiveTab === 'inventory' && isMJ ? () => handleRemoveFromCharacter(selectedSkill) : undefined)}
                    />
                 </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-10 pointer-events-none">
                 <Sparkles size={64} className="mb-4 text-gold-DEFAULT" />
                 <span className="text-xs font-cinzel font-black tracking-[0.4em] uppercase">Codex des Maîtrises</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
