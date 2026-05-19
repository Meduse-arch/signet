import React, { useState } from 'react';
import { Hammer, Package, Plus, X, Minus } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { useItemsStore } from '../../store/items';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Item, ItemModifier } from '../../services/items.service';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { addSessionCharacter } from '../../services/characters.service';
import { useSessionStore } from '../../store/session';

interface ItemCreationModalProps {
  sessionId: string;
}

const CATEGORIES = ['Arme', 'Armure', 'Consommable', 'Artéfact', 'Divers'];

export function ItemCreationModal({ sessionId }: ItemCreationModalProps) {
  const { showCreateModal, itemCreationType, itemCreationCharacterId, setShowCreateModal } = useUIStore();
  const { addItem } = useItemsStore();
  const { characters, addOrUpdateCharacter } = useCharactersStore();
  const { user } = useAuthStore();
  const { broadcast } = usePeer();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Divers');
  const [imageUrl, setImageUrl] = useState('');
  const [modifiers, setModifiers] = useState<ItemModifier[]>([]);

  const statDefs = session?.settings?.stats || DEFAULT_STATS;
  const barDefs = session?.settings?.bars || DEFAULT_BARS;

  if (!showCreateModal || !isMJ) return null;

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('Divers');
    setImageUrl('');
    setModifiers([]);
  };

  const handleClose = () => {
    resetForm();
    setShowCreateModal(false);
  };

  const addModifier = () => {
    setModifiers([...modifiers, { 
      target: 'stat', 
      targetId: statDefs[0].id, 
      mode: 'flat', 
      value: 1 
    }]);
  };

  const updateModifier = (index: number, updates: Partial<ItemModifier>) => {
    const updated = [...modifiers];
    updated[index] = { ...updated[index], ...updates } as ItemModifier;
    
    // Default values when switching target
    if (updates.target === 'bar') {
      updated[index].targetId = barDefs[0]?.id || '';
      updated[index].targetProperty = 'max';
    } else if (updates.target === 'stat') {
      updated[index].targetId = statDefs[0]?.id || '';
      delete updated[index].targetProperty;
    }

    setModifiers(updated);
  };

  const removeModifier = (index: number) => {
    setModifiers(modifiers.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const newItem: Item = {
      id: crypto.randomUUID(),
      name,
      description: description || 'Un objet mystérieux...',
      category,
      image_url: imageUrl,
      effects: [],
      modifiers
    };

    if (itemCreationType === 'forge') {
      await addItem(sessionId, newItem);
    } else if (itemCreationType === 'inventory' && itemCreationCharacterId) {
      const character = characters.find(c => c.id === itemCreationCharacterId);
      if (character) {
        const clonedItem = { ...newItem, instanceId: crypto.randomUUID(), equipped: false };
        const updatedChar = {
          ...character,
          inventory: [...(character.inventory || []), clonedItem]
        };
        addOrUpdateCharacter(updatedChar);
        if (window.electronAPI) await addSessionCharacter(updatedChar);
        broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
      }
    }

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-xl p-5 w-full max-w-sm shadow-[0_0_50px_rgba(212,175,55,0.25)] flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <h3 className="text-xs font-cinzel font-bold text-gold-DEFAULT uppercase tracking-widest flex items-center gap-2">
            {itemCreationType === 'forge' ? <><Hammer size={14} /> FORGER (ARCHIVES)</> : <><Package size={14} /> NOUVEL OBJET (INVENTAIRE)</>}
          </h3>
          <button onClick={handleClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Nom de l'objet" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-gold-DEFAULT/50 outline-none" 
              autoFocus 
            />
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)} 
              className="w-1/3 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea 
            placeholder="Description" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-gold-DEFAULT/50 outline-none resize-none h-20" 
          />
          <input 
            type="text" 
            placeholder="URL de l'image (optionnel)" 
            value={imageUrl} 
            onChange={e => setImageUrl(e.target.value)} 
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-gold-DEFAULT/50 outline-none" 
          />
          
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-cinzel text-gold-DEFAULT/60 uppercase tracking-widest">Modificateurs</span>
              <button onClick={addModifier} className="p-1 rounded bg-gold-DEFAULT/10 text-gold-DEFAULT hover:bg-gold-DEFAULT/20 transition-all">
                <Plus size={12} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {modifiers.map((m, i) => (
                <div key={i} className="flex flex-col gap-2 p-2 bg-white/5 border border-white/10 rounded-lg animate-in slide-in-from-left-1 duration-200">
                  <div className="flex gap-2">
                    <select 
                      value={m.target} 
                      onChange={e => updateModifier(i, { target: e.target.value as any })}
                      className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-gold-DEFAULT/80 outline-none"
                    >
                      <option value="stat">STAT</option>
                      <option value="bar">JAUGÉ</option>
                    </select>
                    
                    <select 
                      value={m.targetId} 
                      onChange={e => updateModifier(i, { targetId: e.target.value })}
                      className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-white/80 outline-none"
                    >
                      {m.target === 'stat' ? (
                        statDefs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                      ) : (
                        barDefs.map(b => <option key={b.id} value={b.id}>{b.name}</option>)
                      )}
                    </select>
                    
                    <button onClick={() => removeModifier(i)} className="text-red-500/50 hover:text-red-500 transition-colors">
                      <Minus size={14} />
                    </button>
                  </div>

                  <div className="flex gap-2 items-center">
                    {m.target === 'bar' && (
                      <select 
                        value={m.targetProperty} 
                        onChange={e => updateModifier(i, { targetProperty: e.target.value as any })}
                        className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-white/60 outline-none"
                      >
                        <option value="max">MAX</option>
                        <option value="value">ACTU</option>
                      </select>
                    )}
                    
                    <select 
                      value={m.mode} 
                      onChange={e => updateModifier(i, { mode: e.target.value as any })}
                      className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-white/60 outline-none"
                    >
                      <option value="flat">FIXE (+/-)</option>
                      <option value="percent">POURCENT (%)</option>
                      <option value="dice">DÉ (À L'ÉQUIP.)</option>
                    </select>

                    {m.mode === 'dice' ? (
                      <input 
                        type="text" 
                        placeholder="1d6+2"
                        value={m.formula || ''} 
                        onChange={e => updateModifier(i, { formula: e.target.value })}
                        className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-white text-center outline-none placeholder:text-white/20"
                      />
                    ) : (
                      <input 
                        type="number" 
                        value={m.value} 
                        onChange={e => updateModifier(i, { value: parseInt(e.target.value) || 0 })}
                        className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-white text-center outline-none"
                      />
                    )}
                  </div>
                </div>
              ))}
              {modifiers.length === 0 && (
                <span className="text-[9px] text-white/20 italic text-center py-2">Aucun modificateur</span>
              )}
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleSubmit} 
          className="w-full py-2.5 bg-gold-DEFAULT text-black text-[10px] font-cinzel font-bold tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all flex justify-center items-center gap-2 mt-2"
        >
          <Plus size={14} /> {itemCreationType === 'forge' ? "CRÉER DANS LES ARCHIVES" : "AJOUTER AU COFFRE"}
        </button>
      </div>
    </div>
  );
}
