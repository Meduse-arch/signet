import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, system: string, imageUrl?: string) => void;
  initialData?: { name: string; system: string; imageUrl?: string };
  title?: string;
  submitLabel?: string;
}

export function CreateSessionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData,
  title = "Nouvelle Archive",
  submitLabel = "Invoquer"
}: SessionModalProps) {
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setSystem(initialData?.system || '');
      setImageUrl(initialData?.imageUrl || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-md p-4">
      <div className="bg-[#111115] border border-gold-DEFAULT/20 rounded-[2rem] p-8 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden group">
        {/* Texture Grimoire */}
        <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none" />
        
        {/* Décorations de coins */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-gold-DEFAULT/30 rounded-tl-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-gold-DEFAULT/30 rounded-br-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-gold-bright tracking-[0.2em] uppercase text-glow-gold">
              {title}
            </h2>
            <button onClick={onClose} className="text-gold-dim hover:text-gold-bright transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-xs font-serif italic text-gold-dim/80 mb-8 leading-relaxed">
            {initialData 
              ? "Altérez les runes de cette archive pour modifier le cours du destin." 
              : "Inscrivez les premiers mots de cette nouvelle épopée dans le grand grimoire."}
          </p>
          
          <div className="space-y-6 mb-10">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase ml-1">Titre de l'Archive</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Le Tombeau des Anciens"
                className="w-full bg-black/40 border border-gold-DEFAULT/10 rounded-xl py-3 px-4 text-sm text-gold-bright focus:outline-none focus:border-gold-DEFAULT/50 focus:ring-1 focus:ring-gold-DEFAULT/30 transition-all placeholder:text-gold-dim/30 font-serif italic"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase ml-1">Arcane / Système</label>
              <input
                type="text"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder="Ex: D&D 5e, Chroniques Oubliées"
                className="w-full bg-black/40 border border-gold-DEFAULT/10 rounded-xl py-3 px-4 text-sm text-gold-bright focus:outline-none focus:border-gold-DEFAULT/50 focus:ring-1 focus:ring-gold-DEFAULT/30 transition-all placeholder:text-gold-dim/30 font-serif italic"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase ml-1">Vision / URL Image</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.ritual..."
                className="w-full bg-black/40 border border-gold-DEFAULT/10 rounded-xl py-3 px-4 text-sm text-gold-bright focus:outline-none focus:border-gold-DEFAULT/50 focus:ring-1 focus:ring-gold-DEFAULT/30 transition-all placeholder:text-gold-dim/30 font-mono text-[10px]"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-[10px] font-cinzel font-black tracking-widest border border-gold-DEFAULT/10 rounded-xl text-gold-dim hover:text-gold-bright hover:bg-white/5 transition-all"
            >
              ANNULER
            </button>
            <button
              onClick={() => onSubmit(name || 'Chronique sans nom', system || 'Arcane Inconnue', imageUrl)}
              disabled={!name.trim()}
              className="flex-1 py-3 text-[10px] font-cinzel font-black tracking-widest bg-gold-DEFAULT/10 hover:bg-gold-DEFAULT/20 text-gold-bright rounded-xl border border-gold-DEFAULT/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-rune-gold"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}