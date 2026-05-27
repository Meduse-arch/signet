import React, { useState, useMemo, useEffect } from 'react';
import { useSkillsStore } from '../../store/skills';
import { useTagsStore } from '../../store/tags';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useUIStore } from '../../store/ui';
import { 
  Sparkles, 
  Search, 
  Plus, 
  Trash2, 
  Zap, 
  ChevronRight,
  BookOpen,
  X
} from 'lucide-react';
import { SkillCreationModal } from './SkillCreationModal';
import { SkillDetailContent } from './SkillDetailContent';

interface SkillsWindowContentProps {
  sessionId: string;
}

export function SkillsWindowContent({ sessionId }: SkillsWindowContentProps) {
  const { skills, removeSkill } = useSkillsStore();
  const { tags } = useTagsStore();
  const { user } = useAuthStore();
  const { setShowSkillCreateModal, setSelectedSkill, selectedSkill } = useUIStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isWideView, setIsWideView] = useState(false);

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

  const filteredSkills = useMemo(() => {
    return skills.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          (s.description && s.description.toLowerCase().includes(search.toLowerCase()));
      const matchesTag = !selectedTag || (s.tags && s.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    });
  }, [skills, search, selectedTag]);

  return (
    <div ref={containerRef} className="h-full flex flex-col relative bg-[#0D0D0F]">
      
      {/* ─── MODALE DÉTAIL (Mode Mobile) ─── */}
      {!isWideView && selectedSkill && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-md" onClick={() => setSelectedSkill(null)}>
          <div className="w-full max-w-sm bg-[#0D0D0F]/95 border border-gold-DEFAULT/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
            <SkillDetailContent 
              skill={selectedSkill} 
              isMJ={isMJ}
              onEdit={isMJ ? () => setShowSkillCreateModal(true, selectedSkill) : undefined}
              onDelete={isMJ ? () => { if(window.confirm("Oublier cette maîtrise ?")) removeSkill(sessionId, selectedSkill.id); setSelectedSkill(null); } : undefined}
              showActions={false}
            />
            <button 
              onClick={() => setSelectedSkill(null)} 
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white/40 hover:text-white transition-colors z-50"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <SkillCreationModal sessionId={sessionId} />

      <div className="flex-1 flex overflow-hidden">
        {/* ─── LISTE DES COMPÉTENCES (Panneau Gauche) ─── */}
        <div className={`flex-1 flex flex-col p-4 gap-4 min-w-0 transition-all duration-500 ${isWideView && selectedSkill ? 'border-r border-white/5 max-w-[45%]' : 'max-w-full'}`}>
            <div className="flex gap-2 shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gold-DEFAULT/40" />
                    <input 
                    type="text" 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="CHERCHER..."
                    className="w-full bg-black/60 border border-gold-DEFAULT/10 rounded-xl py-2 pl-9 pr-3 text-[9px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/10 focus:outline-none focus:border-gold-DEFAULT/30 transition-all shadow-inner uppercase tracking-widest"
                    />
                </div>
                {isMJ && (
                    <button 
                    onClick={() => setShowSkillCreateModal(true)}
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
                    className={`px-2.5 py-1 rounded-full text-[7px] font-cinzel font-black uppercase tracking-widest border transition-all whitespace-nowrap ${!selectedTag ? 'bg-gold-DEFAULT text-black border-gold-DEFAULT' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                >
                    TOUT
                </button>
                {tags.map(tag => (
                    <button 
                    key={tag.id}
                    onClick={() => setSelectedTag(tag.id)}
                    className={`px-2.5 py-1 rounded-full text-[7px] font-cinzel font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedTag === tag.id ? 'bg-gold-DEFAULT text-black border-gold-DEFAULT' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                    style={selectedTag === tag.id ? {} : { borderLeftColor: tag.color, borderLeftWidth: '2px' }}
                    >
                    {tag.name}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1.5 pb-4 min-h-0">
                {filteredSkills.map((skill) => {
                    const isActive = selectedSkill?.id === skill.id;
                    return (
                    <div 
                        key={skill.id}
                        onClick={() => setSelectedSkill(skill, false)}
                        className={`group relative rounded-xl p-2.5 transition-all cursor-pointer flex items-center gap-3 overflow-hidden ${
                        isActive ? 'border-gold-bright bg-gold-DEFAULT/10 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-white/[0.05] bg-white/[0.02] hover:border-gold-DEFAULT/30'
                        }`}
                    >
                        <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
                        {skill.image_url ? (
                            <img src={skill.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <Zap size={18} className="text-white/10 group-hover:text-gold-DEFAULT/40 transition-colors" />
                        )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className={`text-[10px] font-cinzel font-black tracking-widest truncate uppercase transition-colors ${isActive ? 'text-gold-bright' : 'text-white/60 group-hover:text-white'}`}>
                                {skill.name}
                            </h4>
                            <span className="text-[7px] font-mono text-white/20 uppercase tracking-tighter truncate">{skill.type || 'Compétence'}</span>
                        </div>

                        {/* ─── ACTIONS SUR LA BARRE (Apparaissent au hover) ─── */}
                        {isMJ && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 border-l border-white/10 pl-1 shrink-0">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowSkillCreateModal(true, skill); }}
                                    className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                                    title="Modifier"
                                >
                                    <PenTool size={10} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); if(window.confirm("Oublier cette maîtrise ?")) removeSkill(sessionId, skill.id); setSelectedSkill(null); }}
                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 transition-colors"
                                    title="Supprimer"
                                >
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        )}

                        {/* Chevron supprimé pour laisser place aux actions */}
                    </div>
                    );
                })}

                {filteredSkills.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-10 grayscale">
                        <BookOpen size={32} className="mb-2" />
                        <span className="text-[8px] font-cinzel tracking-widest italic">VIDE...</span>
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
                    <span className="text-[9px] font-cinzel font-black text-gold-DEFAULT tracking-[0.3em] uppercase">Détails de la Maîtrise</span>
                    <button onClick={() => setSelectedSkill(null)} className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white transition-colors">
                        <X size={14} />
                    </button>
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <SkillDetailContent 
                      skill={selectedSkill} 
                      isMJ={isMJ}
                      onEdit={isMJ ? () => setShowSkillCreateModal(true, selectedSkill) : undefined}
                      onDelete={isMJ ? () => { if(window.confirm("Oublier cette maîtrise ?")) removeSkill(sessionId, selectedSkill.id); setSelectedSkill(null); } : undefined}
                    />
                 </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-10 pointer-events-none">
                 <Sparkles size={64} className="mb-4 text-gold-DEFAULT" />
                 <span className="text-[10px] font-cinzel font-black tracking-[0.4em] uppercase">Codex des Maîtrises</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
