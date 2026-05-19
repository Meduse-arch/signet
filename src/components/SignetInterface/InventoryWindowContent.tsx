import React, { useState, useMemo, useEffect } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useUIStore } from '../../store/ui';
import { usePeer } from '../../hooks/usePeer';
import { Package, Plus, Trash2, Search, Hammer, User, Shield, Star } from 'lucide-react';
import { addSessionCharacter } from '../../services/characters.service';
import { Item, ItemModifier } from '../../services/items.service';
import { DEFAULT_STATS } from '../../systems/seal/constants';
import { parseAndRoll } from '../../services/des.service';

interface InventoryWindowContentProps {
  sessionId: string;
}

export function InventoryWindowContent({ sessionId }: InventoryWindowContentProps) {
  const user = useAuthStore(state => state.user);
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const { items, removeItem } = useItemsStore();
  const { setShowCreateModal } = useUIStore();
  const { broadcast } = usePeer();

  const [activeTab, setActiveTab] = useState<'inventory' | 'forge'>('inventory');
  const [search, setSearch] = useState('');

  const character = useMemo(() => {
    if (controlledCharacterId) return characters.find(c => c.id === controlledCharacterId);
    return characters.find(c => c.user_id === user?.id);
  }, [characters, controlledCharacterId, user?.id]);

  // If MJ has no character controlled, force the tab to forge
  useEffect(() => {
    if (isMJ && !character && activeTab === 'inventory') {
      setActiveTab('forge');
    }
  }, [isMJ, character, activeTab]);

  const handleGiveItemToCharacter = async (item: any) => {
    if (!character || !isMJ) return;
    const clonedItem = { ...item, instanceId: crypto.randomUUID(), equipped: false };
    const updatedChar = {
      ...character,
      inventory: [...(character.inventory || []), clonedItem]
    };
    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleRemoveFromInventory = async (instanceId: string) => {
    if (!character || !isMJ || !window.confirm("Détruire cet artefact de l'inventaire ?")) return;

    const updatedChar = {
      ...character,
      inventory: (character.inventory || []).filter((i: any) => i.instanceId !== instanceId && i.id !== instanceId)
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleToggleEquip = async (instanceId: string) => {
    if (!character) return;
    const updatedChar = {
      ...character,
      inventory: (character.inventory || []).map((i: any) => {
        if (i.instanceId === instanceId || i.id === instanceId) {
          const isEquipping = !i.equipped;
          let rolledValues = i.rolledValues || {};
          
          if (isEquipping && i.modifiers) {
            // Roll dice for 'dice' mode modifiers
            i.modifiers.forEach((m: any, idx: number) => {
              if (m.mode === 'dice' && m.formula) {
                rolledValues[idx] = parseAndRoll(m.formula);
              }
            });
          }
          
          return { ...i, equipped: isEquipping, rolledValues };
        }
        return i;
      })
    };
    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
  };

  const handleDeleteForgeItem = async (id: string) => {
    if (!isMJ || !window.confirm("Supprimer cet artefact de la forge ?")) return;
    await removeItem(sessionId, id);
  };

  if (!character && !isMJ) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-20">
        <Package size={40} className="mb-2" />
        <span className="text-[10px] font-cinzel">Aucun coffre lié</span>
      </div>
    );
  }

  const effectiveTab = (!character && isMJ) ? 'forge' : activeTab;
  const inventory = character?.inventory || [];
  const filteredInventory = inventory.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));
  const filteredForgeItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const openForgeModal = () => {
    setShowCreateModal(true, 'forge');
  };

  const openInventoryModal = () => {
    if (character) setShowCreateModal(true, 'inventory', character.id);
  };

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500 relative">

      {isMJ && character && (
        <div className="flex gap-2 mb-2 bg-black/40 p-1 rounded-xl border border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-cinzel font-bold tracking-widest flex items-center justify-center gap-2 transition-all ${
              effectiveTab === 'inventory' 
              ? 'bg-gold-DEFAULT text-black shadow-[0_0_10px_rgba(212,175,55,0.5)]' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <User size={14} /> {character.name ? `INVENTAIRE (${character.name})` : 'INVENTAIRE'}
          </button>
          <button
            onClick={() => setActiveTab('forge')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-cinzel font-bold tracking-widest flex items-center justify-center gap-2 transition-all ${
              effectiveTab === 'forge' 
              ? 'bg-gold-DEFAULT text-black shadow-[0_0_10px_rgba(212,175,55,0.5)]' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Hammer size={14} /> ARCHIVES (OBJETS)
          </button>
        </div>
      )}

      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-DEFAULT/40" />
          <input 
            type="text" 
            placeholder={effectiveTab === 'inventory' ? "RECHERCHER DANS LE COFFRE..." : "RECHERCHER DANS LES ARCHIVES..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-gold-DEFAULT/20 rounded-xl py-2 pl-9 pr-4 text-[10px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-all"
          />
        </div>
        {effectiveTab === 'forge' && isMJ && (
          <button 
            onClick={openForgeModal}
            className="px-3 py-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all flex items-center justify-center"
            title="Forger un nouvel objet"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
        {effectiveTab === 'inventory' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {filteredInventory.map((item: any, idx: number) => (
                <div key={item.instanceId || item.id || idx} className="group relative bg-white/5 border border-white/10 rounded-xl p-3 hover:border-gold-DEFAULT/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/5 flex items-center justify-center group-hover:border-gold-DEFAULT/20 transition-colors">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package size={20} className="text-gold-DEFAULT/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[10px] font-cinzel font-black text-gold-bright truncate uppercase">{item.name}</h4>
                        {item.equipped && (
                          <Star size={10} className="text-gold-bright animate-pulse shrink-0" />
                        )}
                      </div>
                      <p className="text-[8px] text-white/30 italic truncate">{item.description}</p>
                      
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.modifiers.map((m: any, i: number) => {
                            const label = m.target === 'stat' 
                              ? (DEFAULT_STATS.find(s => s.id === m.targetId)?.name || m.targetId)
                              : (DEFAULT_BARS.find(b => b.id === m.targetId)?.name || m.targetId) + (m.targetProperty === 'max' ? ' Max' : '');
                            
                            let valueDisplay = '';
                            if (m.mode === 'dice') {
                              valueDisplay = item.rolledValues?.[i] ? `+${item.rolledValues[i]}` : m.formula;
                            } else {
                              valueDisplay = `${m.value >= 0 ? '+' : ''}${m.value}${m.mode === 'percent' ? '%' : ''}`;
                            }

                            return (
                              <span key={i} className="text-[7px] px-1 bg-white/5 border border-white/5 rounded text-gold-DEFAULT/60 whitespace-nowrap">
                                {valueDisplay} {label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button 
                      onClick={() => handleToggleEquip(item.instanceId || item.id)} 
                      className={`p-1 rounded transition-colors ${item.equipped ? 'bg-gold-DEFAULT/20 text-gold-bright' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                      title={item.equipped ? "Déséquiper" : "Équiper"}
                    >
                      <Shield size={10} />
                    </button>
                    {isMJ && (
                      <button onClick={() => handleRemoveFromInventory(item.instanceId || item.id)} className="p-1 rounded bg-red-500/10 text-red-500/60 hover:bg-red-500/20 transition-colors" title="Supprimer">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredInventory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 opacity-20">
                <span className="text-[10px] font-cinzel italic">Le coffre est vide...</span>
              </div>
            )}
          </>
        ) : (
          <>
            {!isMJ && !character && (
               <div className="flex flex-col items-center justify-center py-12 opacity-20">
                 <span className="text-[10px] font-cinzel italic">Veuillez contrôler un personnage pour utiliser la forge.</span>
               </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-2">
              {filteredForgeItems.map((item) => (
                <div key={item.id} className="group relative bg-white/5 border border-white/10 rounded-xl p-3 hover:border-gold-DEFAULT/30 transition-all flex flex-col justify-between">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-black/60 border border-white/5 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package size={20} className="text-gold-DEFAULT/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-[10px] font-cinzel font-black text-gold-bright truncate uppercase">{item.name}</h4>
                        <span className="text-[7px] border border-white/10 bg-black/40 px-1 py-0.5 rounded text-white/50 uppercase shrink-0">{item.category}</span>
                      </div>
                      <p className="text-[8px] text-white/30 italic line-clamp-2 mt-0.5 leading-tight">{item.description}</p>
                      
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.modifiers.map((m: any, i: number) => {
                            const label = m.target === 'stat' 
                              ? (DEFAULT_STATS.find(s => s.id === m.targetId)?.name || m.targetId)
                              : (DEFAULT_BARS.find(b => b.id === m.targetId)?.name || m.targetId) + (m.targetProperty === 'max' ? ' Max' : '');
                            
                            const valueDisplay = m.mode === 'dice' ? m.formula : `${m.value >= 0 ? '+' : ''}${m.value}${m.mode === 'percent' ? '%' : ''}`;

                            return (
                              <span key={i} className="text-[7px] px-1 bg-white/5 border border-white/5 rounded text-gold-DEFAULT/40 whitespace-nowrap">
                                {valueDisplay} {label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
                    {character && (
                      <button onClick={() => handleGiveItemToCharacter(item)} className="flex-1 py-1 rounded bg-green-500/10 text-green-400 text-[9px] font-bold hover:bg-green-500/20 transition-colors uppercase">
                        Donner
                      </button>
                    )}
                    {isMJ && (
                      <button onClick={() => handleDeleteForgeItem(item.id)} className="px-2 py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredForgeItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 opacity-20">
                <span className="text-[10px] font-cinzel italic">La forge est vide...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
