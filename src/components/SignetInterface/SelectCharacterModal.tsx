import React, { useState } from 'react';
import { useCharactersStore } from '../../store/characters';
import { X, User, Plus, Minus } from 'lucide-react';

interface SelectCharacterModalProps {
  onClose: () => void;
  onSelect: (character: any, quantity: number) => void;
  itemName: string;
}

export function SelectCharacterModal({ onClose, onSelect, itemName }: SelectCharacterModalProps) {
  const characters = useCharactersStore(state => state.characters);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const handleConfirm = () => {
    if (selectedCharId && quantity > 0) {
      const char = characters.find(c => c.id === selectedCharId);
      if (char) onSelect(char, quantity);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gold-DEFAULT/20 bg-black/40">
          <h2 className="text-sm font-cinzel font-black text-gold-DEFAULT tracking-widest uppercase">
            Transférer {itemName}
          </h2>
          <button onClick={onClose} className="p-2 text-gold-DEFAULT/50 hover:text-gold-bright transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {characters.map(char => (
              <button
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  selectedCharId === char.id 
                    ? 'bg-gold-DEFAULT/20 border-gold-DEFAULT shadow-[0_0_15px_rgba(212,175,55,0.2)]' 
                    : 'bg-white/5 border-transparent hover:border-gold-DEFAULT/30 hover:bg-white/10'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-black/60 border border-gold-DEFAULT/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {char.image_url ? (
                    <img src={char.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} className="text-gold-DEFAULT/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-cinzel font-black text-white truncate uppercase tracking-widest">{char.name}</div>
                  <div className="text-[9px] text-white/40 italic truncate">{char.type || 'Joueur'}</div>
                </div>
              </button>
            ))}
            {characters.length === 0 && (
              <div className="text-center py-4 text-white/30 text-xs italic font-serif">Aucun voyageur dans l'archive.</div>
            )}
          </div>

          <div className="flex flex-col items-center border-t border-gold-DEFAULT/20 pt-6">
            <label className="block text-[10px] font-cinzel text-gold-DEFAULT/70 uppercase tracking-widest text-center mb-3">Quantité à transférer</label>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all text-white/70 hover:text-white"
              >
                <Minus size={16} />
              </button>
              <span className="font-cinzel font-black text-2xl text-gold-bright w-12 text-center drop-shadow-md">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all text-white/70 hover:text-white"
              >
                <Plus size={16} />
              </button>
            </div>

            <button 
              onClick={handleConfirm}
              disabled={!selectedCharId || quantity < 1}
              className={`w-full py-3 rounded-xl font-cinzel font-black text-xs tracking-widest uppercase transition-all shadow-lg active:scale-95 ${
                selectedCharId && quantity > 0 
                ? 'bg-gold-DEFAULT hover:bg-gold-bright text-black shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)]'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              Transférer l'Artefact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
