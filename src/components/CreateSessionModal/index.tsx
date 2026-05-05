import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, system: string) => void;
}

export function CreateSessionModal({ isOpen, onClose, onCreate }: CreateSessionModalProps) {
  const [name, setName] = useState('');
  const [system, setSystem] = useState('');

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-surface-card border border-[#2a2015] rounded-xl p-6 w-80 shadow-2xl">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm text-[#e8d5a0] font-medium">Nouvelle Session</h2>
          <button onClick={onClose} className="text-gold-dim hover:text-gold-bright transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gold-dim mb-4">
          Définissez les détails de votre nouvelle aventure.
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
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-medium border border-border-dark rounded-lg text-gold-dim hover:text-gold-bright transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onCreate(name || 'Nouvelle Session', system || 'Système inconnu')}
            disabled={!name.trim()}
            className="flex-1 py-2 text-xs font-medium bg-[#3a2800] hover:bg-[#4a3500] text-[#e8c060] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
}