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

  const handleJoin = () => {
    let finalKey = keyInput.trim().toUpperCase();
    if (finalKey && !finalKey.startsWith('SIGNET-')) {
      finalKey = `SIGNET-${finalKey}`;
    }
    onJoin(finalKey);
  };

  return (
    <div className="absolute inset-0 z-20 bg-[#0D0D0F]/80 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-surface-card border border-[#2a2015] rounded-xl p-6 w-80 shadow-2xl">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm text-[#e8d5a0] font-medium uppercase font-cinzel tracking-widest">Rejoindre une Table</h2>
          <button onClick={onClose} className="text-gold-DEFAULT drop-shadow-md hover:text-gold-bright transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gold-DEFAULT/60 mb-4 font-cinzel uppercase tracking-tighter">
          Entrez la clé de connexion (ex: SIGNET-1234-ABCD)
        </p>

        <input
          type="text"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="CLÉ-DE-CONNEXION"
          className="w-full bg-surface-sidebar border border-border-dark rounded-lg py-3 px-3 text-sm text-[#e8d5a0] mb-4 focus:outline-none focus:ring-1 focus:ring-gold-DEFAULT focus:border-gold-DEFAULT placeholder:text-gold-DEFAULT/40 drop-shadow-md uppercase tracking-[0.2em] text-center font-mono shadow-inner"
        />

        <div className="flex gap-2 font-cinzel">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs font-black border border-border-dark rounded-lg text-gold-DEFAULT drop-shadow-md hover:bg-white/5 transition-all uppercase tracking-widest"
          >
            Annuler
          </button>
          <button
            onClick={handleJoin}
            disabled={!keyInput}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest border ${
              !keyInput
                ? 'bg-black/20 text-white/40 border-white/15 cursor-not-allowed'
                : 'bg-gold-DEFAULT text-black border-gold-DEFAULT hover:bg-gold-bright shadow-lg'
            }`}
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}