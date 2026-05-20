import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Sword, Heart, Package, BookOpen, Save, Trash2, ScrollText, Image as ImageIcon, Search, Hammer, Plus, ArrowLeft } from 'lucide-react';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useSessionStore } from '../../store/session';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { updateSessionCharacter } from '../../services/characters.service';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';

interface ManageCharacterModalProps {
  sessionId: string;
  characterId: string;
  onClose: () => void;
}

type Tab = 'profil' | 'stats' | 'ressources' | 'inventaire' | 'competences' | 'quetes';

export function ManageCharacterModal({ sessionId, characterId, onClose }: ManageCharacterModalProps) {
  const { characters, addOrUpdateCharacter } = useCharactersStore();
  const { items } = useItemsStore();
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const [activeTab, setActiveTab] = useState<Tab>('profil');
  const [editedChar, setEditedChar] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showForge, setShowForge] = useState(false);
  const [searchForge, setSearchForge] = useState('');
  const [forgeQuantities, setForgeQuantities] = useState<Record<string, number>>({});
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  useEffect(() => {
    const char = characters.find(c => c.id === characterId);
    if (char && !editedChar) {
      setEditedChar(JSON.parse(JSON.stringify(char))); // Initial load
    }
  }, [characterId, characters, editedChar]);

  const filteredForgeItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchForge.toLowerCase()) ||
      item.category.toLowerCase().includes(searchForge.toLowerCase())
    );
  }, [items, searchForge]);

  // Grouped inventory: items with same ID are grouped if NOT equipped
  const groupedInventory = useMemo(() => {
    if (!editedChar?.inventory) return [];
    
    const groups: any[] = [];
    const unequippedStacks: Record<string, any> = {};

    editedChar.inventory.forEach((item: any) => {
      if (item.equipped) {
        // Equipped items are always shown individually
        groups.push({ ...item, quantity: 1, isStack: false });
      } else {
        const itemId = item.id;
        if (!unequippedStacks[itemId]) {
          unequippedStacks[itemId] = { ...item, quantity: 0, isStack: true, instances: [] };
          groups.push(unequippedStacks[itemId]);
        }
        unequippedStacks[itemId].quantity += 1;
        unequippedStacks[itemId].instances.push(item.instanceId);
      }
    });

    return groups;
  }, [editedChar?.inventory]);

  if (!editedChar || !isMJ) return null;

  const statDefs = session?.settings?.stats || DEFAULT_STATS;
  const barDefs = session?.settings?.bars || DEFAULT_BARS;

  const updateField = (field: string, value: any) => {
    setEditedChar((prev: any) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateStat = (statId: string, value: number) => {
    setEditedChar((prev: any) => ({
      ...prev,
      stats: { ...prev.stats, [statId]: value }
    }));
    setHasChanges(true);
  };

  const updateBar = (barId: string, value: number) => {
    setEditedChar((prev: any) => ({
      ...prev,
      bars: { ...prev.bars, [barId]: value }
    }));
    setHasChanges(true);
  };

  const handleAddItem = (item: any) => {
    const qty = forgeQuantities[item.id] || 1;
    const newInstances = Array.from({ length: qty }).map(() => ({
      ...item,
      instanceId: crypto.randomUUID(),
      equipped: false
    }));
    
    setEditedChar((prev: any) => {
      const newInventory = [...(prev.inventory || []), ...newInstances];
      return { ...prev, inventory: newInventory };
    });
    setHasChanges(true);

    // Visual feedback
    setAddedFeedback(item.id);
    setTimeout(() => setAddedFeedback(null), 1000);
  };

  const handleUpdateQuantity = (itemId: string, newQty: number, currentQty: number) => {
    if (newQty < 0) return;
    
    setEditedChar((prev: any) => {
      let inventory = [...(prev.inventory || [])];
      
      if (newQty > currentQty) {
        // Add more
        const itemTemplate = items.find(i => i.id === itemId);
        if (!itemTemplate) return prev;
        const toAdd = newQty - currentQty;
        const newInstances = Array.from({ length: toAdd }).map(() => ({
          ...itemTemplate,
          instanceId: crypto.randomUUID(),
          equipped: false
        }));
        inventory = [...inventory, ...newInstances];
      } else if (newQty < currentQty) {
        // Remove some (prefer unequipped)
        let toRemove = currentQty - newQty;
        const resultInv = [];
        // We process backwards to remove recently added unequipped items first
        for (let i = inventory.length - 1; i >= 0; i--) {
          const item = inventory[i];
          if (item.id === itemId && !item.equipped && toRemove > 0) {
            toRemove--;
            continue;
          }
          resultInv.unshift(item);
        }
        inventory = resultInv;
      }
      return { ...prev, inventory };
    });
    setHasChanges(true);
  };

  const handleRemoveStack = (itemId: string) => {
    setEditedChar((prev: any) => {
      const newInventory = prev.inventory.filter((i: any) => i.id !== itemId || i.equipped);
      return { ...prev, inventory: newInventory };
    });
    setHasChanges(true);
  };

  const handleRemoveInstance = (instanceId: string) => {
    setEditedChar((prev: any) => {
      const newInventory = prev.inventory.filter((i: any) => i.instanceId !== instanceId);
      return { ...prev, inventory: newInventory };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (window.electronAPI) {
      await updateSessionCharacter(
        editedChar.id,
        editedChar.name,
        editedChar.stats,
        editedChar.skills,
        editedChar.bars,
        editedChar.image_url,
        editedChar.inventory,
        editedChar.custom_skills,
        editedChar.type,
        editedChar.is_template
      );
    }
    addOrUpdateCharacter(editedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: editedChar });
    setHasChanges(false);
  };

  const tabs = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'stats', label: 'Attributs', icon: Sword },
    { id: 'ressources', label: 'Ressources', icon: Heart },
    { id: 'inventaire', label: 'Inventaire', icon: Package },
    { id: 'competences', label: 'Compétences', icon: BookOpen },
    { id: 'quetes', label: 'Quêtes', icon: ScrollText },
  ] as const;

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-2xl w-full max-w-4xl h-[85vh] shadow-[0_0_80px_rgba(212,175,55,0.15)] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="shrink-0 border-b border-white/10 bg-black/40 flex items-center justify-between p-4 pl-6 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-gold-DEFAULT" />
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-lg bg-black border border-gold-DEFAULT/30 flex items-center justify-center overflow-hidden">
               {editedChar.image_url ? (
                 <img src={editedChar.image_url} alt="" className="w-full h-full object-cover opacity-80" />
               ) : (
                 <User className="text-gold-DEFAULT/40" size={20} />
               )}
             </div>
             <div className="flex flex-col">
               <h2 className="font-cinzel font-black text-xl tracking-widest uppercase text-white leading-none">
                 GÉRER L'ENTITÉ
               </h2>
               <span className="font-mono text-[10px] text-gold-DEFAULT/60">{editedChar.name}</span>
             </div>
          </div>
          
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-48 shrink-0 border-r border-white/5 bg-black/20 flex flex-col py-4 gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-3 font-cinzel font-black text-[10px] tracking-widest uppercase transition-all relative ${
                  activeTab === tab.id 
                  ? 'text-gold-bright bg-gold-DEFAULT/10' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {activeTab === tab.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gold-DEFAULT shadow-[0_0_10px_rgba(212,175,55,1)]" />}
                <tab.icon size={16} className={activeTab === tab.id ? 'text-gold-DEFAULT' : ''} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Panel */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gradient-to-br from-transparent to-black/40">
            {activeTab === 'profil' && (
              <div className="flex flex-col gap-6 max-w-xl">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest">Dénomination</label>
                  <input 
                    type="text" 
                    value={editedChar.name} 
                    onChange={e => updateField('name', e.target.value)} 
                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold-DEFAULT/50 outline-none transition-all shadow-inner" 
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest">Type d'entité</label>
                  <div className="flex gap-2">
                    {['PNJ', 'Monstre', 'Boss', 'Joueur'].map(type => (
                      <button
                        key={type}
                        onClick={() => updateField('type', type)}
                        className={`px-4 py-2 rounded-lg font-cinzel text-[10px] font-black uppercase tracking-widest transition-all ${
                          editedChar.type === type 
                          ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                          : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest">Portrait (URL)</label>
                  <div className="flex gap-3 items-center">
                    <div className="w-16 h-16 shrink-0 rounded-lg bg-black border border-white/10 flex items-center justify-center overflow-hidden">
                      {editedChar.image_url ? (
                        <img src={editedChar.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-white/20" size={24} />
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={editedChar.image_url || ''} 
                      onChange={e => updateField('image_url', e.target.value)} 
                      placeholder="https://..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold-DEFAULT/50 outline-none transition-all shadow-inner" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                  <input 
                    type="checkbox" 
                    id="is_template"
                    checked={editedChar.is_template}
                    onChange={e => updateField('is_template', e.target.checked)}
                    className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                  />
                  <label htmlFor="is_template" className="font-cinzel text-xs text-purple-400 uppercase tracking-widest cursor-pointer select-none">
                    Définir comme modèle réutilisable
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                {statDefs.map(stat => (
                  <div key={stat.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="flex flex-col">
                      <span className="font-cinzel font-black uppercase text-[11px] text-white/80 tracking-widest">{stat.name}</span>
                      <span className="font-mono text-[9px] text-white/30 uppercase">{stat.id}</span>
                    </div>
                    <input 
                      type="number" 
                      value={editedChar.stats?.[stat.id] || 0} 
                      onChange={e => updateStat(stat.id, parseInt(e.target.value) || 0)}
                      className="w-20 bg-black/60 border border-gold-DEFAULT/30 rounded-lg px-3 py-2 text-center font-mono text-gold-bright text-lg outline-none focus:border-gold-DEFAULT transition-all shadow-inner"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ressources' && (
              <div className="grid grid-cols-1 gap-4 max-w-xl">
                {barDefs.map(bar => (
                  <div key={bar.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: bar.color + '20' }}>
                      <Heart size={16} style={{ color: bar.color }} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-cinzel font-black uppercase text-xs text-white/80 tracking-widest truncate">{bar.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => updateBar(bar.id, (editedChar.bars?.[bar.id] || 0) - 1)} className="w-8 h-8 rounded-lg border border-white/20 hover:bg-white/10 text-white/60 transition-colors flex items-center justify-center font-bold">-</button>
                      <input 
                        type="number" 
                        value={editedChar.bars?.[bar.id] || 0} 
                        onChange={e => updateBar(bar.id, parseInt(e.target.value) || 0)}
                        className="w-16 bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-center font-mono text-white outline-none focus:border-gold-DEFAULT transition-all shadow-inner"
                        placeholder="0"
                      />
                      <button onClick={() => updateBar(bar.id, (editedChar.bars?.[bar.id] || 0) + 1)} className="w-8 h-8 rounded-lg border border-white/20 hover:bg-white/10 text-white/60 transition-colors flex items-center justify-center font-bold">+</button>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] font-garamond italic text-white/40 mt-4">Astuce : Ces valeurs modifient les ressources directes du personnage.</p>
              </div>
            )}

            {activeTab === 'inventaire' && (
              <div className="flex flex-col gap-4">
                {!showForge ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 uppercase tracking-widest">Inventaire Actuel</h3>
                      <button 
                        onClick={() => setShowForge(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all font-cinzel text-[10px] font-black uppercase tracking-widest group shadow-lg"
                      >
                        <Hammer size={14} className="group-hover:rotate-12 transition-transform" />
                        Ouvrir la Forge
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {groupedInventory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                          <Package size={48} className="mb-4 text-gold-DEFAULT" />
                          <span className="font-cinzel text-[10px] uppercase tracking-widest">INVENTAIRE VIDE</span>
                        </div>
                      ) : (
                        groupedInventory.map((item: any, i: number) => (
                          <div key={item.instanceId || `stack-${item.id}-${i}`} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-gold-DEFAULT/20 transition-all">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                                {item.image_url ? (
                                  <img src={item.image_url} alt="" className="w-full h-full object-contain p-1 opacity-60" />
                                ) : (
                                  <Package size={16} className="text-white/20" />
                                )}
                                {item.quantity > 1 && (
                                  <div className="absolute bottom-0 right-0 bg-gold-DEFAULT text-black text-[8px] font-black px-1 rounded-tl">
                                    x{item.quantity}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-cinzel font-black text-xs uppercase tracking-widest text-white/90 truncate">{item.name}</span>
                                  {item.equipped && <span className="text-[7px] font-cinzel font-black uppercase bg-gold-DEFAULT/20 text-gold-bright px-1.5 py-0.5 rounded border border-gold-DEFAULT/30 shrink-0">Équipé</span>}
                                </div>
                                <span className="text-[9px] font-mono text-white/30 uppercase">{item.category}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Quantity Controls for Stacks */}
                              {item.isStack && (
                                <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-white/10 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item.id, item.quantity - 1, item.quantity); }}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                  >
                                    -
                                  </button>
                                  <input 
                                    type="number" 
                                    value={item.quantity} 
                                    onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 0, item.quantity)}
                                    className="w-8 bg-transparent text-center font-mono text-[10px] text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item.id, item.quantity + 1, item.quantity); }}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                              )}

                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.isStack) handleRemoveStack(item.id);
                                  else handleRemoveInstance(item.instanceId);
                                }}
                                className="p-2 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                                title="Retirer de l'inventaire"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setShowForge(false)}
                        className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-DEFAULT/40" />
                        <input 
                          type="text" 
                          placeholder="RECHERCHER DANS LES ARCHIVES..."
                          value={searchForge}
                          onChange={(e) => setSearchForge(e.target.value)}
                          className="w-full bg-black/40 border border-gold-DEFAULT/20 rounded-xl py-2 pl-10 pr-4 text-[10px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-all uppercase tracking-widest"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {filteredForgeItems.map((item: any) => (
                        <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all group ${addedFeedback === item.id ? 'border-green-500/50 bg-green-500/10' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                              {item.image_url ? (
                                <img src={item.image_url} alt="" className="w-full h-full object-contain p-1 opacity-40 group-hover:opacity-60 transition-opacity" />
                              ) : (
                                <Package size={16} className="text-white/10 group-hover:text-white/20" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-cinzel font-black text-[11px] uppercase tracking-widest text-white/60 group-hover:text-white/90">{item.name}</span>
                              <span className="text-[8px] font-mono text-white/20 uppercase">{item.category}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-white/10 p-1">
                              <button 
                                onClick={() => setForgeQuantities(prev => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] || 1) - 1) }))}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                              >
                                -
                              </button>
                              <input 
                                type="number" 
                                value={forgeQuantities[item.id] || 1} 
                                onChange={(e) => setForgeQuantities(prev => ({ ...prev, [item.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                                className="w-8 bg-transparent text-center font-mono text-[10px] text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button 
                                onClick={() => setForgeQuantities(prev => ({ ...prev, [item.id]: (prev[item.id] || 1) + 1 }))}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                              >
                                +
                              </button>
                            </div>

                            <button 
                              onClick={() => handleAddItem(item)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-cinzel text-[9px] font-black uppercase tracking-widest ${addedFeedback === item.id ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-gold-DEFAULT/10 border border-gold-DEFAULT/20 text-gold-bright hover:bg-gold-DEFAULT/20'}`}
                            >
                              {addedFeedback === item.id ? <Package size={12} className="animate-bounce" /> : <Plus size={12} />}
                              {addedFeedback === item.id ? 'Ajouté !' : 'Ajouter'}
                            </button>
                          </div>
                        </div>
                      ))}

                      {filteredForgeItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                          <Search size={40} className="mb-4 text-gold-DEFAULT" />
                          <span className="font-cinzel text-[10px] uppercase tracking-widest text-center">AUCUN OBJET TROUVÉ</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'competences' || activeTab === 'quetes') && (
              <div className="flex flex-col items-center justify-center h-full opacity-30 py-20 grayscale">
                {activeTab === 'competences' ? <BookOpen size={64} className="mb-6 text-gold-DEFAULT" /> : <ScrollText size={64} className="mb-6 text-gold-DEFAULT" />}
                <h3 className="font-cinzel font-black text-xl uppercase tracking-widest mb-2">En développement</h3>
                <p className="text-xs font-garamond italic text-center max-w-sm">Le système de gestion avancée des {activeTab === 'competences' ? 'compétences' : 'quêtes'} sera bientôt tissé dans la trame de Sigil.</p>
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 p-4 border-t border-white/10 bg-black/40 flex justify-end gap-4">
           {hasChanges && (
             <span className="flex items-center text-xs font-cinzel text-gold-bright mr-auto ml-4 animate-pulse">
               Modifications non sauvegardées...
             </span>
           )}
           <button 
             onClick={onClose}
             className="px-6 py-2.5 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 hover:text-white transition-all font-cinzel text-[10px] font-black uppercase tracking-widest"
           >
             Annuler
           </button>
           <button 
             onClick={handleSave}
             disabled={!hasChanges}
             className="px-8 py-2.5 rounded-xl border border-gold-DEFAULT bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all font-cinzel text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
           >
             <Save size={14} />
             Appliquer
           </button>
        </div>
      </div>
    </div>
  );
}
