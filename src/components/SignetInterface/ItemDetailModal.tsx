import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useCharactersStore } from '../../store/characters';
import { usePeer } from '../../hooks/usePeer';
import { addSessionCharacter } from '../../services/characters.service';
import { ItemDetailContent } from './ItemDetailContent';

export function ItemDetailModal({ sessionId }: { sessionId: string }) {
  const { selectedItem, itemDetailOpen, setSelectedItem } = useUIStore();
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const { broadcast } = usePeer();

  if (!itemDetailOpen || !selectedItem) return null;

  const character = characters.find(c => controlledCharacterId ? c.id === controlledCharacterId : c.user_id === user?.id);

  const handleToggleEquip = async () => {
    if (!character) return;
    const updatedChar = {
      ...character,
      inventory: (character.inventory || []).map((i: any) => 
        (i.instanceId === selectedItem.instanceId || i.id === selectedItem.id) ? { ...i, equipped: !i.equipped } : i
      )
    };
    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
    setSelectedItem({ ...selectedItem, equipped: !selectedItem.equipped });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-2xl w-full max-w-sm shadow-[0_0_50px_rgba(212,175,55,0.2)] overflow-hidden flex flex-col relative h-[70vh]">
        <button 
          onClick={() => setSelectedItem(null)} 
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white/60 hover:text-white transition-colors border border-white/10 backdrop-blur-sm z-50"
        >
          <X size={18} />
        </button>

        <ItemDetailContent 
          item={selectedItem}
          character={character}
          onToggleEquip={handleToggleEquip}
          isMJ={isMJ}
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
