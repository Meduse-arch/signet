import React, { useState, useMemo } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Package, Plus, Trash2, Search, Info, Shield, Sword, FlaskConical, Sparkles } from 'lucide-react';
import { addSessionCharacter } from '../../services/characters.service';

interface InventoryWindowContentProps {
  sessionId: string;
}

export function InventoryWindowContent({ sessionId }: InventoryWindowContentProps) {
  const user = useAuthStore(state => state.user);
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const { broadcast } = usePeer();
  
  const [search, setSearch] = useState('');

  const character = useMemo(() => {
    if (controlledCharacterId) return characters.find(c => c.id === controlledCharacterId);
    return characters.find(c => c.user_id === user?.id);
  }, [characters, controlledCharacterId, user?.id]);

  const handleAddItem = async () => {
    if (!character || !isMJ) return;
    const name = prompt("Nom de l'artefact :");
    if (!name) return;

    const newItem = {
      id: crypto.randomUUID(),
      name,
      description: 'Un objet mystérieux...',
      image_url: '',
      type: 'divers'
    };

    const updatedChar = {
      ...character,
      inventory: [...(character.inventory || []), newItem]
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!character || !isMJ || !window.confirm("Détruire cet artefact ?")) return;

    const updatedChar = {
      ...character,
      inventory: (character.inventory || []).filter((i: any) => i.id !== itemId)
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-20">
        <Package size={40} className="mb-2" />
        <span className="text-[10px] font-cinzel">Aucun coffre lié</span>
      </div>
    );
  }

  const inventory = character.inventory || [];
  const filteredItems = inventory.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-DEFAULT/40" />
          <input 
            type="text" 
            placeholder="RECHERCHER DANS LE COFFRE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-gold-DEFAULT/20 rounded-xl py-2 pl-9 pr-4 text-[10px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-all"
          />
        </div>
        {isMJ && (
          <button 
            onClick={handleAddItem}
            className="p-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item: any) => (
            <div key={item.id} className="group relative bg-white/5 border border-white/10 rounded-xl p-3 hover:border-gold-DEFAULT/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/5 flex items-center justify-center group-hover:border-gold-DEFAULT/20 transition-colors">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package size={20} className="text-gold-DEFAULT/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-cinzel font-black text-gold-bright truncate uppercase">{item.name}</h4>
                  <p className="text-[8px] text-white/30 italic truncate">{item.description}</p>
                </div>
              </div>
              
              {isMJ && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => handleRemoveItem(item.id)} className="p-1 rounded bg-red-500/10 text-red-500/60 hover:bg-red-500/20 transition-colors">
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 opacity-20">
            <span className="text-[10px] font-cinzel italic">Le coffre est vide...</span>
          </div>
        )}
      </div>
    </div>
  );
}
