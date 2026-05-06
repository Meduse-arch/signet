import { useState } from 'react';
import { X } from 'lucide-react';

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (key: string) => void;
}

export function KeyModal({ isOpen, onClose, onJoin }: KeyModalProps) {
  const [keyInput, setKeyInput] = useState('');

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-surface-card border border-[#2a2015] rounded-xl p-6 w-72 shadow-2xl">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm text-[#e8d5a0] font-medium">Rejoindre une session</h2>
          <button onClick={onClose} className="text-gold-dim hover:text-gold-bright transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gold-dim mb-4">
          Entrez la clé fournie par votre maître de jeu.
        </p>
        
        <input
          type="text"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
          placeholder="SIGNET-XXXX-YYYY"
          className="w-full bg-surface-sidebar border border-border-dark rounded-lg py-2 px-3 text-sm text-[#e8d5a0] mb-4 focus:outline-none focus:ring-1 focus:ring-gold-DEFAULT focus:border-gold-DEFAULT placeholder:text-gold-dim/50 uppercase tracking-widest text-center"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-medium border border-border-dark rounded-lg text-gold-dim hover:text-gold-bright transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onJoin(keyInput)}
            disabled={!keyInput}
            className="flex-1 py-2 text-xs font-medium bg-[#3a2800] hover:bg-[#4a3500] text-[#e8c060] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}