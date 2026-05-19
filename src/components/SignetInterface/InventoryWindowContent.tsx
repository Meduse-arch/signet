import React, { useState, useMemo, useEffect } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useUIStore } from '../../store/ui';
import { usePeer } from '../../hooks/usePeer';
import { Package, Plus, Trash2, Search, Hammer, User, Shield, Star, Sword, ShieldAlert, Sparkles, Gem, FlaskConical, ChevronRight } from 'lucide-react';
import { addSessionCharacter } from '../../services/characters.service';
import { Item, ItemModifier } from '../../services/items.service';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { parseAndRoll } from '../../services/des.service';

interface InventoryWindowContentProps {
  sessionId: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Arme': Sword,
  'Armure': Shield,
  'Consommable': FlaskConical,
  'Artéfact': Sparkles,
  'Bijou': Gem,
  'Divers': Package
};

export function InventoryWindowContent({ sessionId }: InventoryWindowContentProps) {
  const user = useAuthStore(state => state.user);
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const { items, removeItem } = useItemsStore();
  const { setShowCreateModal, setSelectedItem } = useUIStore();
  const { broadcast } = usePeer();

  const [activeTab, setActiveTab] = useState<'inventory' | 'forge'>('inventory');
  const [search, setSearch] = useState('');

  const character = useMemo(() => {
    if (controlledCharacterId) return characters.find(c => c.id === controlledCharacterId);
    return characters.find(c => c.user_id === user?.id);
  }, [characters, controlledCharacterId, user?.id]);

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

  const getIcon = (cat: string) => CATEGORY_ICONS[cat] || Package;

  return (
    <div className="flex flex-col h-full gap-4 animate-in fade-in duration-500 relative bg-[#0D0D0F]">

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

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1.5 pb-4">
        {effectiveTab === 'inventory' ? (
          <>
            {filteredInventory.map((item: any, idx: number) => {
              const Icon = getIcon(item.category);
              return (
                <div 
                  key={item.instanceId || item.id || idx} 
                  onClick={() => setSelectedItem(item)}
                  className="group relative bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 hover:border-gold-DEFAULT/40 hover:bg-white/[0.05] transition-all cursor-pointer flex items-center gap-4 overflow-hidden"
                >
                  <div className={`w-12 h-12 rounded-lg bg-black/60 border border-white/5 flex items-center justify-center transition-all ${item.equipped ? 'border-gold-DEFAULT/50 shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'group-hover:border-white/20'}`}>
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className={`w-full h-full object-cover rounded-lg ${item.equipped ? 'opacity-100' : 'opacity-40 group-hover:opacity-60 transition-opacity'}`} />
                    ) : (
                      <Icon size={24} className={item.equipped ? 'text-gold-DEFAULT' : 'text-white/10 group-hover:text-white/20'} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-cinzel font-black tracking-widest truncate uppercase ${item.equipped ? 'text-gold-bright' : 'text-white/60 group-hover:text-white transition-colors'}`}>
                        {item.name}
                      </h4>
                      {item.equipped && <Star size={10} className="text-gold-bright animate-pulse shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-cinzel text-white/20 uppercase tracking-widest">{item.category}</span>
                       <div className="w-1 h-1 rounded-full bg-white/5" />
                       <p className="text-[9px] font-garamond italic text-white/30 truncate group-hover:text-white/40 transition-colors">
                         {item.description}
                       </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                    {isMJ && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromInventory(item.instanceId || item.id); }} 
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500/40 hover:text-red-500 transition-all"
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

            {filteredInventory.length === 0 && (
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
                return (
                  <div key={item.id} className="group relative bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 hover:border-gold-DEFAULT/30 hover:bg-white/[0.04] transition-all flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-lg bg-black/60 border border-white/5 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                      ) : (
                        <Icon size={24} className="text-white/10 group-hover:text-white/20" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-cinzel font-black text-white/60 group-hover:text-gold-bright truncate uppercase tracking-widest transition-colors">{item.name}</h4>
                        <span className="text-[7px] border border-white/10 bg-black/40 px-2 py-0.5 rounded-lg text-white/30 uppercase shrink-0 font-cinzel tracking-widest">{item.category}</span>
                      </div>
                      <p className="text-[9px] font-garamond italic text-white/20 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {character && (
                        <button 
                          onClick={() => handleGiveItemToCharacter(item)} 
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-cinzel font-black hover:bg-green-500/20 transition-all uppercase tracking-widest shadow-lg"
                        >
                          <Plus size={12} /> OFFRIR
                        </button>
                      )}
                      {isMJ && (
                        <button 
                          onClick={() => handleDeleteForgeItem(item.id)} 
                          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500/40 hover:text-red-500 transition-all shadow-lg"
                        >
                          <Trash2 size={14} />
                        </button>
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
  );
}
