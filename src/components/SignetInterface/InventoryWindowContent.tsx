import React, { useState, useMemo, useEffect } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useUIStore } from '../../store/ui';
import { usePeer } from '../../hooks/usePeer';
import { Package, Plus, Trash2, Search, Hammer, User, Shield, Star, Sword, ShieldAlert, Sparkles, Gem, FlaskConical, ChevronRight, PenTool } from 'lucide-react';
import { addSessionCharacter } from '../../services/characters.service';
import { Item, ItemModifier } from '../../services/items.service';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { parseAndRoll } from '../../services/des.service';
import { ItemDetailContent } from './ItemDetailContent';

interface InventoryWindowContentProps {
  sessionId: string;
  variant?: 'default' | 'codex';
}

const CATEGORY_ICONS: Record<string, any> = {
  'Arme': Sword,
  'Armure': Shield,
  'Consommable': FlaskConical,
  'Artéfact': Sparkles,
  'Bijou': Gem,
  'Divers': Package
};

export function InventoryWindowContent({ sessionId, variant = 'default' }: InventoryWindowContentProps) {
  const user = useAuthStore(state => state.user);
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const character = characters.find(c => controlledCharacterId ? c.id === controlledCharacterId : c.user_id === user?.id);
  const { items, removeItem } = useItemsStore();
  const { setShowCreateModal, setSelectedItem, selectedItem } = useUIStore();
  const { broadcast } = usePeer();

  const [activeTab, setActiveTab] = useState<'inventory' | 'forge'>('inventory');
  const [search, setSearch] = useState('');

  // Responsive layout: auto-switch to codex side-panel if wide enough
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isWideView, setIsWideView] = useState(variant === 'codex');

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsWideView(entry.contentRect.width > 650);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const filteredInventory = useMemo(() => {
    const inv = character?.inventory || [];
    return inv.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [character?.inventory, search]);

  const groupedInventory = useMemo(() => {
    const groups: any[] = [];
    const unequippedStacks: Record<string, any> = {};

    filteredInventory.forEach((item: any) => {
      if (item.equipped) {
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
  }, [filteredInventory]);

  useEffect(() => {
    if (isMJ && !character && activeTab === 'inventory') {
      setActiveTab('forge');
    }
  }, [isMJ, character, activeTab]);

  const handleToggleEquip = async (itemToToggle?: any) => {
    const item = itemToToggle || selectedItem;
    if (!character || !item) return;

    // Use specific instanceId if provided, otherwise first instance of stack
    const targetInstanceId = item.instanceId || (item.isStack ? item.instances[0] : null);
    if (!targetInstanceId) return;

    const updatedChar = {
      ...character,
      inventory: (character.inventory || []).map((i: any) => 
        (i.instanceId === targetInstanceId) ? { ...i, equipped: !i.equipped } : i
      )
    };
    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
    
    // Update selected item state to reflect equip status
    const updatedItem = updatedChar.inventory.find((i: any) => i.instanceId === targetInstanceId);
    if (updatedItem) {
      setSelectedItem(updatedItem, false); // Don't force modal open on toggle
    }
  };

  const handleUseItem = async (itemToUse?: any) => {
    const item = itemToUse || selectedItem;
    if (!character || !item) return;

    const targetInstanceId = item.instanceId || (item.isStack ? item.instances[0] : null);
    if (!targetInstanceId) return;

    // Consuming an item = removing one instance from inventory
    const updatedChar = {
      ...character,
      inventory: (character.inventory || []).filter((i: any) => i.instanceId !== targetInstanceId)
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });

    // Deselect if it was the last instance
    if (selectedItem?.instanceId === targetInstanceId) {
      setSelectedItem(null);
    }
  };

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

  const handleRemoveFromInventory = async (item: any) => {
    if (!character || !isMJ || !window.confirm(`Détruire ${item.isStack ? 'tous les exemplaires de ' : ''}${item.name} ?`)) return;

    const updatedChar = {
      ...character,
      inventory: (character.inventory || []).filter((i: any) => 
        item.isStack ? i.id !== item.id || i.equipped : i.instanceId !== item.instanceId
      )
    };

    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
    if (selectedItem?.instanceId === item.instanceId || (item.isStack && selectedItem?.id === item.id)) {
      setSelectedItem(null);
    }
  };

  const handleDeleteForgeItem = async (id: string) => {
    if (!isMJ || !window.confirm("Supprimer cet artefact de la forge ?")) return;
    await removeItem(sessionId, id);
  };

  const handleEditForgeItem = (item: any) => {
    setShowCreateModal(true, 'forge', undefined, item);
  };

  const getTargetName = (m: any) => {
    if (m.target === 'stat') return DEFAULT_STATS.find(s => s.id === m.targetId)?.name || m.targetId;
    return (DEFAULT_BARS.find(b => b.id === m.targetId)?.name || m.targetId) + (m.targetProperty === 'max' ? ' Max' : '');
  };

  if (!character && !isMJ) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
        <Package size={40} className="mb-2" />
        <span className="text-[10px] font-cinzel">Aucun coffre lié</span>
      </div>
    );
  }

  const effectiveTab = (!character && isMJ) ? 'forge' : activeTab;
  const filteredForgeItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const openForgeModal = () => {
    setShowCreateModal(true, 'forge');
  };

  const getIcon = (cat: string) => CATEGORY_ICONS[cat] || Package;

  return (
    <div ref={containerRef} className={`flex flex-col lg:flex-row h-full gap-6 animate-in fade-in duration-500 relative bg-[#0D0D0F] ${variant === 'codex' ? 'min-h-[500px]' : ''}`}>
      
      {/* LISTE CODEX */}
      <div className="flex-1 flex flex-col gap-4 h-full min-w-0">
        {isMJ && character && (
          <div className="flex gap-2 mb-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 shrink-0 shadow-inner">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-cinzel font-black tracking-widest flex items-center justify-center gap-3 transition-all ${
                effectiveTab === 'inventory' 
                ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <User size={14} /> {character.name ? `COFFRE DE ${character.name.toUpperCase()}` : 'INVENTAIRE'}
            </button>
            <button
              onClick={() => setActiveTab('forge')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-cinzel font-black tracking-widest flex items-center justify-center gap-3 transition-all ${
                effectiveTab === 'forge' 
                ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Hammer size={14} /> ARCHIVES DES RELIQUES
            </button>
          </div>
        )}

        <div className="flex gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-DEFAULT/40" />
            <input 
              type="text" 
              placeholder={effectiveTab === 'inventory' ? "MURMURER LE NOM D'UNE RELIQUE..." : "INTERROGER LES ARCHIVES..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/60 border border-gold-DEFAULT/10 rounded-2xl py-3 pl-11 pr-4 text-[10px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/10 focus:outline-none focus:border-gold-DEFAULT/30 transition-all shadow-inner uppercase tracking-widest"
            />
          </div>
          {effectiveTab === 'forge' && isMJ && (
            <button 
              onClick={openForgeModal}
              className="px-4 py-3 rounded-2xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all flex items-center justify-center shadow-lg group"
              title="Forger une nouvelle relique"
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1.5 pb-4 min-h-0">
          {effectiveTab === 'inventory' ? (
            <>
              {groupedInventory.map((item: any, idx: number) => {
                const Icon = getIcon(item.category);
                const isActive = selectedItem?.instanceId === item.instanceId || (item.isStack && selectedItem?.id === item.id && !selectedItem.equipped);
                return (
                  <div 
                    key={item.instanceId || `stack-${item.id}-${idx}`} 
                    onClick={() => setSelectedItem(item, !isWideView)}
                    className={`group relative rounded-xl p-3 transition-all cursor-pointer flex items-center gap-4 overflow-hidden ${
                      isActive ? 'border-gold-bright shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'border-white/[0.05] hover:border-gold-DEFAULT/40'
                    }`}
                    style={{
                      background: isActive ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(8px)',
                      borderTop: isActive ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
                      borderLeft: isActive ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.03)',
                      boxShadow: isActive ? 'inset 0 1px 0 rgba(255,215,0,0.1), 0 8px 16px rgba(0,0,0,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                    }}
                  >
                    <div 
                      className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all overflow-hidden relative shrink-0 ${item.equipped ? 'border-gold-DEFAULT/50 shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'group-hover:border-white/20'}`}
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                      }}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className={`w-full h-full object-contain p-1 ${item.equipped ? 'opacity-100' : 'opacity-40 group-hover:opacity-60 transition-opacity'}`} />
                      ) : (
                        <Icon size={24} className={item.equipped ? 'text-gold-DEFAULT' : 'text-white/10 group-hover:text-white/20'} />
                      )}
                      <div className={`absolute bottom-0 right-0 ${item.equipped ? 'bg-gold-DEFAULT text-black' : 'bg-white/10 text-white/70'} text-[8px] font-black px-1.5 py-0.5 rounded-tl-lg shadow-lg border-t border-l border-white/10 z-20`}>
                        x{item.quantity || 1}
                      </div>
                      {/* Subtil glass shine on icon */}
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-30" />
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-xs font-cinzel font-black tracking-widest truncate uppercase ${item.equipped ? 'text-gold-bright' : (isActive ? 'text-gold-DEFAULT' : 'text-white/60 group-hover:text-white transition-colors')}`}>
                          {item.name}
                        </h4>
                        {item.equipped && <Star size={10} className="text-gold-bright animate-pulse shrink-0" />}
                      </div>
                      
                      {/* Modifier Preview */}
                      {item.modifiers && item.modifiers.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {item.modifiers.slice(0, 2).map((m: any, i: number) => (
                            <span key={i} className="text-[8px] font-cinzel font-black uppercase px-1.5 py-0.5 border bg-gold-DEFAULT/10 text-gold-bright border-gold-DEFAULT/20 rounded shadow-[0_0_8px_rgba(212,175,55,0.1)]">
                              {m.mode === 'dice' ? m.formula : `${m.value >= 0 ? '+' : ''}${m.value}${m.mode === 'percent' ? '%' : ''}`} {getTargetName(m)}
                            </span>
                          ))}
                          {item.modifiers.length > 2 && (
                            <span className="text-[8px] font-cinzel opacity-40 uppercase px-1.5 py-0.5 border border-white/10 rounded">
                              +{item.modifiers.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-cinzel text-white/20 uppercase tracking-widest">{item.category}</span>
                           <div className="w-1 h-1 rounded-full bg-white/5" />
                           <p className="text-[9px] font-garamond italic text-white/30 truncate group-hover:text-white/40 transition-colors">
                             {item.description}
                           </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleEquip(item); }} 
                        className={`p-1.5 rounded-lg transition-all ${item.equipped ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-gold-DEFAULT/10 text-gold-DEFAULT hover:bg-gold-DEFAULT/20'}`}
                        title={item.equipped ? "Déséquiper" : "Équiper"}
                      >
                        <Shield size={14} />
                      </button>
                      {isMJ && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemoveFromInventory(item); }} 
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500/40 hover:text-red-500 transition-all"
                          title="Détruire"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <ChevronRight size={16} className="text-gold-DEFAULT/30" />
                    </div>

                    {item.equipped && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-DEFAULT shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                    )}
                  </div>
                );
              })}

              {groupedInventory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-10 grayscale">
                  <Package size={48} className="mb-4" />
                  <span className="text-xs font-cinzel font-black tracking-[0.3em] italic">LE COFFRE EST VIDE...</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2">
                {filteredForgeItems.map((item) => {
                  const Icon = getIcon(item.category);
                  const isActive = selectedItem?.id === item.id;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedItem(item, !isWideView)}
                      className={`group relative rounded-xl p-3 transition-all flex items-center gap-4 cursor-pointer ${
                        isActive ? 'border-gold-bright shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'border-white/[0.05] hover:border-gold-DEFAULT/30'
                      }`}
                      style={{
                        background: isActive ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        backdropFilter: 'blur(8px)',
                        borderTop: isActive ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
                        borderLeft: isActive ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.03)',
                        boxShadow: isActive ? 'inset 0 1px 0 rgba(255,215,0,0.1), 0 8px 16px rgba(0,0,0,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                      }}
                    >
                      <div 
                        className="w-12 h-12 shrink-0 rounded-lg flex items-center justify-center relative overflow-hidden transition-all group-hover:border-white/20"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                        }}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-contain p-1 opacity-40 group-hover:opacity-60 transition-opacity" />
                        ) : (
                          <Icon size={24} className="text-white/10 group-hover:text-white/20" />
                        )}
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent opacity-30" />
                      </div>                      
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className={`text-xs font-cinzel font-black truncate uppercase tracking-widest transition-colors ${isActive ? 'text-gold-bright' : 'text-white/60 group-hover:text-gold-bright'}`}>{item.name}</h4>
                          <span className="text-[7px] border border-white/10 bg-black/40 px-2 py-0.5 rounded-lg text-white/30 uppercase shrink-0 font-cinzel tracking-widest">{item.category}</span>
                        </div>
                        {/* Modifier Preview */}
                        {item.modifiers && item.modifiers.length > 0 ? (
                          <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
                            {item.modifiers.slice(0, 1).map((m: any, i: number) => (
                              <span key={i} className="text-[8px] font-cinzel font-black uppercase px-1.5 py-0.5 border bg-gold-DEFAULT/10 text-gold-bright border-gold-DEFAULT/20 rounded shadow-[0_0_8px_rgba(212,175,55,0.1)] truncate max-w-[140px] shrink-0">
                                {m.mode === 'dice' ? m.formula : `${m.value >= 0 ? '+' : ''}${m.value}${m.mode === 'percent' ? '%' : ''}`} {getTargetName(m)}
                              </span>
                            ))}
                            {item.modifiers.length > 1 && (
                              <span className="text-[8px] font-cinzel opacity-40 uppercase px-1.5 py-0.5 border border-white/10 rounded shrink-0">
                                +{item.modifiers.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[9px] font-garamond italic text-white/20 line-clamp-1 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {character && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleGiveItemToCharacter(item); }} 
                            className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all shadow-lg"
                            title="Offrir à l'inventaire actif"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                        {isMJ && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEditForgeItem(item); }} 
                              className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all shadow-lg"
                              title="Modifier"
                            >
                              <PenTool size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteForgeItem(item.id); }} 
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500/40 hover:text-red-500 transition-all shadow-lg"
                              title="Détruire"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredForgeItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-10 grayscale">
                  <Hammer size={48} className="mb-4" />
                  <span className="text-xs font-cinzel font-black tracking-[0.3em] italic">LES ARCHIVES SONT VIDES...</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* PANNEAU DE DETAIL CODEX */}
      {isWideView && (
        <div className="flex flex-col w-[350px] shrink-0 border border-gold-DEFAULT/10 bg-black/40 backdrop-blur-md rounded-2xl h-full shadow-2xl relative overflow-hidden">
          <ItemDetailContent 
            item={selectedItem}
            character={character}
            onToggleEquip={effectiveTab === 'inventory' ? handleToggleEquip : undefined}
            isMJ={isMJ}
          />
        </div>
      )}
    </div>
  );
}