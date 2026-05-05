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
  title = "Nouvelle Session",
  submitLabel = "Créer"
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
    <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-surface-card border border-[#2a2015] rounded-xl p-6 w-80 shadow-2xl">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm text-[#e8d5a0] font-medium">{title}</h2>
          <button onClick={onClose} className="text-gold-dim hover:text-gold-bright transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gold-dim mb-4">
          {initialData ? "Modifiez les détails de votre aventure." : "Définissez les détails de votre nouvelle aventure."}
        </p>
        
        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-[11px] font-medium text-gold-dim mb-1">Titre de la session</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: La Mine Oubliée"
              className="w-full bg-surface-sidebar border border-border-dark rounded-lg py-2 px-3 text-sm text-[#e8d5a0] focus:outline-none focus:ring-1 focus:ring-gold-DEFAULT focus:border-gold-DEFAULT placeholder:text-gold-dim/50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gold-dim mb-1">Système de jeu (Optionnel)</label>
            <input
              type="text"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="Ex: D&D 5e, Pathfinder..."
              className="w-full bg-surface-sidebar border border-border-dark rounded-lg py-2 px-3 text-sm text-[#e8d5a0] focus:outline-none focus:ring-1 focus:ring-gold-DEFAULT focus:border-gold-DEFAULT placeholder:text-gold-dim/50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gold-dim mb-1">URL de l'image (Optionnel)</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-surface-sidebar border border-border-dark rounded-lg py-2 px-3 text-sm text-[#e8d5a0] focus:outline-none focus:ring-1 focus:ring-gold-DEFAULT focus:border-gold-DEFAULT placeholder:text-gold-dim/50"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-medium border border-border-dark rounded-lg text-gold-dim hover:text-gold-bright transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSubmit(name || 'Session sans titre', system || 'Système inconnu', imageUrl)}
            disabled={!name.trim()}
            className="flex-1 py-2 text-xs font-medium bg-[#3a2800] hover:bg-[#4a3500] text-[#e8c060] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}