import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Minus, X } from 'lucide-react';
import { itemsService, Item } from '../../services/items.service';

interface GiveItemModalProps {
  sessionId: string;
  targetCharacterName: string;
  onClose: () => void;
  onGive: (item: Item, quantity: number) => void;
}

export function GiveItemModal({ sessionId, targetCharacterName, onClose, onGive }: GiveItemModalProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const loadItems = async () => {
      const allItems = await itemsService.getItems(sessionId);
      setItems(allItems);
    };
    loadItems();
  }, [sessionId]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleGive = () => {
    if (selectedItem && quantity > 0) {
      onGive(selectedItem, quantity);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200" style={{ boxShadow: 'inset 0 0 20px rgba(212, 175, 55, 0.1), 0 20px 50px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gold-DEFAULT/10 bg-black/20">
          <h3 className="text-gold-DEFAULT font-cinzel font-black uppercase tracking-widest text-xs">
            Transférer à {targetCharacterName}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gold-DEFAULT/10 rounded-full transition-colors text-gold-DEFAULT/60 hover:text-gold-bright">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Liste des items */}
          <div className="w-2/3 border-r border-gold-DEFAULT/10 flex flex-col bg-black/20">
            <div className="p-4 border-b border-gold-DEFAULT/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-DEFAULT/40" />
                <input 
                  type="text" 
                  placeholder="Chercher un artefact..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/40 border border-gold-DEFAULT/20 rounded-xl py-2 pl-9 pr-4 text-xs font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/40 focus:outline-none focus:border-gold-DEFAULT/50 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedItem?.id === item.id 
                      ? 'bg-gold-DEFAULT/20 border-gold-DEFAULT shadow-[0_0_15px_rgba(212,175,55,0.2)]' 
                      : 'bg-white/5 border-transparent hover:border-gold-DEFAULT/30 hover:bg-white/10'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-black/60 border border-gold-DEFAULT/20 flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package size={20} className="text-gold-DEFAULT/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-cinzel font-black text-gold-bright truncate uppercase">{item.name}</div>
                    <div className="text-xs text-white/60 italic truncate">{item.category}</div>
                  </div>
                </button>
              ))}
              {filteredItems.length === 0 && (
                <div className="text-center py-8 text-white/50 text-xs italic font-serif">Aucun artefact trouvé dans la bibliothèque de session.</div>
              )}
            </div>
          </div>

          {/* Détails et Transfert */}
          <div className="w-1/3 flex flex-col bg-[#0D0D0F]">
            {selectedItem ? (
              <div className="flex flex-col h-full p-6">
                <div className="flex-1">
                  <div className="w-20 h-20 mx-auto rounded-xl bg-black/60 border border-gold-DEFAULT/30 flex items-center justify-center mb-4 shadow-[inset_0_0_20px_rgba(212,175,55,0.1)]">
                    {selectedItem.image_url ? (
                      <img src={selectedItem.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Package size={32} className="text-gold-DEFAULT/50" />
                    )}
                  </div>
                  <h3 className="text-sm font-cinzel font-black text-gold-bright text-center uppercase tracking-widest mb-1">{selectedItem.name}</h3>
                  <div className="text-xs text-center text-white/60 italic mb-4">{selectedItem.category}</div>
                  
                  <p className="text-xs text-white/60 font-serif leading-relaxed line-clamp-4">
                    {selectedItem.description}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gold-DEFAULT/20">
                  <label className="block text-xs font-cinzel text-gold-DEFAULT/70 uppercase tracking-widest text-center mb-2">Quantité à transférer</label>
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-cinzel font-black text-lg text-white w-8 text-center">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button 
                    onClick={handleGive}
                    className="w-full py-3 rounded-xl bg-gold-DEFAULT hover:bg-gold-bright text-black font-cinzel font-black text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] active:scale-95"
                  >
                    Confirmer le Transfert
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-white/60 p-6 text-center">
                <Package size={48} className="mb-4 opacity-50" />
                <span className="font-cinzel text-xs uppercase tracking-widest">Sélectionnez un artefact</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
