import React, { useState, useEffect } from 'react';
import { Hammer, Package, Plus, X, Minus, Sparkles, Sword, Shield, Gem, FlaskConical, Save } from 'lucide-react';
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

const CATEGORIES = [
  { id: 'Arme', icon: Sword },
  { id: 'Armure', icon: Shield },
  { id: 'Consommable', icon: FlaskConical },
  { id: 'Artéfact', icon: Sparkles },
  { id: 'Bijou', icon: Gem },
  { id: 'Divers', icon: Package }
];

export function ItemCreationModal({ sessionId }: ItemCreationModalProps) {
  const { showCreateModal, itemCreationType, itemCreationCharacterId, setShowCreateModal, itemToEdit } = useUIStore();
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

  useEffect(() => {
    if (showCreateModal && itemToEdit) {
      setName(itemToEdit.name || '');
      setDescription(itemToEdit.description || '');
      setCategory(itemToEdit.category || 'Divers');
      setImageUrl(itemToEdit.image_url || '');
      setModifiers(itemToEdit.modifiers || []);
    } else if (showCreateModal) {
      resetForm();
    }
  }, [showCreateModal, itemToEdit]);

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
      id: itemToEdit?.id || crypto.randomUUID(),
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
        const itemInstanceId = itemToEdit?.instanceId || crypto.randomUUID();
        const equipped = itemToEdit ? itemToEdit.equipped : false;
        const clonedItem = { ...newItem, instanceId: itemInstanceId, equipped };
        
        let newInventory = [...(character.inventory || [])];
        if (itemToEdit) {
          newInventory = newInventory.map((i: any) => i.instanceId === itemInstanceId ? clonedItem : i);
        } else {
          newInventory.push(clonedItem);
        }

        const updatedChar = {
          ...character,
          inventory: newInventory
        };
        addOrUpdateCharacter(updatedChar);
        if (window.electronAPI) await addSessionCharacter(updatedChar);
        broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
      }
    }

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#0D0D0F] border border-gold-DEFAULT/40 rounded-2xl w-full max-w-lg shadow-[0_0_80px_rgba(212,175,55,0.15)] flex flex-col overflow-hidden">
        
        {/* Header Noble */}
        <div className="bg-gradient-to-r from-gold-DEFAULT/20 to-transparent p-6 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              {itemCreationType === 'forge' ? <Hammer size={24} /> : <Package size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-cinzel font-black text-white uppercase tracking-widest leading-tight">
                {itemCreationType === 'forge' ? "FORGER UNE RELIQUE" : "NOUVEL ARTEFACT"}
              </h3>
              <p className="text-[10px] font-cinzel text-gold-DEFAULT/60 uppercase tracking-[0.2em]">
                {itemCreationType === 'forge' ? "Archives Éternelles" : "Inventaire du Voyageur"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
          {/* Main Info */}
          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-cinzel font-black text-gold-DEFAULT/50 uppercase tracking-widest ml-1">Dénomination</label>
              <input 
                type="text" 
                placeholder="Nom de l'objet..." 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-gold-DEFAULT/50 focus:bg-white/10 outline-none transition-all shadow-inner" 
                autoFocus 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-cinzel font-black text-gold-DEFAULT/50 uppercase tracking-widest ml-1">Nature de l'objet</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => setCategory(c.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-cinzel text-[10px] font-bold transition-all ${category === c.id ? 'bg-gold-DEFAULT text-black border-gold-DEFAULT shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white'}`}
                  >
                    <c.icon size={14} />
                    {c.id.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-cinzel font-black text-gold-DEFAULT/50 uppercase tracking-widest ml-1">Légende & Description</label>
              <textarea 
                placeholder="Racontez l'histoire de cet objet..." 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 focus:border-gold-DEFAULT/50 focus:bg-white/10 outline-none transition-all resize-none h-24 shadow-inner custom-scrollbar" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-cinzel font-black text-gold-DEFAULT/50 uppercase tracking-widest ml-1">Apparence (URL Image)</label>
              <input 
                type="text" 
                placeholder="https://..." 
                value={imageUrl} 
                onChange={e => setImageUrl(e.target.value)} 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-gold-DEFAULT/50 focus:bg-white/10 outline-none transition-all shadow-inner" 
              />
            </div>
          </div>
          
          {/* Modifiers Section */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex justify-between items-center border-b border-gold-DEFAULT/20 pb-2">
              <div className="flex flex-col">
                <span className="text-xs font-cinzel font-black text-gold-DEFAULT uppercase tracking-widest">Modificateurs</span>
                <span className="text-[8px] font-cinzel text-white/30 uppercase">Bonus d'attributs et de ressources</span>
              </div>
              <button onClick={addModifier} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold-DEFAULT/10 text-gold-DEFAULT hover:bg-gold-DEFAULT/20 border border-gold-DEFAULT/30 transition-all font-cinzel text-[10px] font-black">
                <Plus size={14} /> AJOUTER
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {modifiers.map((m, i) => (
                <div key={i} className="flex flex-col gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl animate-in slide-in-from-left-2 duration-300 relative group">
                  <div className="flex gap-3">
                    <select 
                      value={m.target} 
                      onChange={e => updateModifier(i, { target: e.target.value as any })}
                      className="flex-1 bg-black/60 border border-gold-DEFAULT/30 rounded-xl px-3 py-2 text-[10px] text-gold-DEFAULT font-cinzel font-black outline-none appearance-none cursor-pointer text-center"
                    >
                      <option value="stat">ATTRIBUT</option>
                      <option value="bar">RESSOURCE</option>
                    </select>
                    
                    <select 
                      value={m.targetId} 
                      onChange={e => updateModifier(i, { targetId: e.target.value })}
                      className="flex-[2] bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/80 font-cinzel outline-none appearance-none cursor-pointer"
                    >
                      {m.target === 'stat' ? (
                        statDefs.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)
                      ) : (
                        barDefs.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)
                      )}
                    </select>
                  </div>

                  <div className="flex gap-3 items-center">
                    {m.target === 'bar' && (
                      <select 
                        value={m.targetProperty} 
                        onChange={e => updateModifier(i, { targetProperty: e.target.value as any })}
                        className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/50 font-cinzel outline-none appearance-none cursor-pointer text-center"
                      >
                        <option value="max">MAX</option>
                        <option value="value">ACTUEL</option>
                      </select>
                    )}
                    
                    <select 
                      value={m.mode} 
                      onChange={e => updateModifier(i, { mode: e.target.value as any })}
                      className="flex-[2] bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/50 font-cinzel outline-none appearance-none cursor-pointer text-center"
                    >
                      <option value="flat">FIXE (+/-)</option>
                      <option value="percent">POURCENT (%)</option>
                      <option value="dice">JET DE DÉS</option>
                    </select>

                    <div className="flex-1">
                      {m.mode === 'dice' ? (
                        <input 
                          type="text" 
                          placeholder="1d6+2"
                          value={m.formula || ''} 
                          onChange={e => updateModifier(i, { formula: e.target.value })}
                          className="w-full bg-white/10 border border-gold-DEFAULT/30 rounded-xl px-2 py-2 text-[10px] text-white text-center font-mono outline-none focus:border-gold-DEFAULT"
                        />
                      ) : (
                        <input 
                          type="number" 
                          value={m.value} 
                          onChange={e => updateModifier(i, { value: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/10 border border-gold-DEFAULT/30 rounded-xl px-2 py-2 text-[10px] text-white text-center font-mono outline-none focus:border-gold-DEFAULT"
                        />
                      )}
                    </div>
                  </div>

                  <button onClick={() => removeModifier(i)} className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {modifiers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                  <span className="text-[10px] font-cinzel text-white/20 italic uppercase tracking-widest text-center px-8">Cet objet ne possède aucun enchantement particulier...</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer / Save Button */}
        <div className="p-8 pt-4 border-t border-white/5 bg-black/40">
          <button 
            onClick={handleSubmit} 
            disabled={!name.trim()}
            className="w-full py-4 bg-gold-DEFAULT text-black text-xs font-cinzel font-black tracking-[0.3em] rounded-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] disabled:opacity-20 disabled:grayscale transition-all flex justify-center items-center gap-3"
          >
            <Save size={18} />
            {itemCreationType === 'forge' ? "INSCRIRE DANS LES ARCHIVES" : "LIER À L'INVENTAIRE"}
          </button>
        </div>
      </div>
    </div>
  );
}
