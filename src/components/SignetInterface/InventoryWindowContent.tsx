import React, { useState, useMemo, useEffect } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { Package, Plus, Trash2, Search, Hammer, User, X } from 'lucide-react';
import { addSessionCharacter } from '../../services/characters.service';

interface InventoryWindowContentProps {
  sessionId: string;
}

const CATEGORIES = ['Arme', 'Armure', 'Consommable', 'Artéfact', 'Divers'];

export function InventoryWindowContent({ sessionId }: InventoryWindowContentProps) {
  const user = useAuthStore(state => state.user);
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const { characters, controlledCharacterId, addOrUpdateCharacter } = useCharactersStore();
  const { items, addItem, removeItem } = useItemsStore();
  const { broadcast } = usePeer();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'forge'>('inventory');
  const [search, setSearch] = useState('');
  
  // State for Forge Modal (Global Items)
  const [isForgeModalOpen, setIsForgeModalOpen] = useState(false);
  
  // State for Inventory Modal (Direct Character Items)
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  // Common Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemCat, setNewItemCat] = useState('Divers');
  const [newItemImg, setNewItemImg] = useState('');

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
    const clonedItem = { ...item, instanceId: crypto.randomUUID() };
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

  const handleCreateForgeItem = async () => {
    if (!newItemName.trim() || !isMJ) return;
    const newItem = {
      id: crypto.randomUUID(),
      name: newItemName,
      description: newItemDesc || 'Un objet mystérieux...',
      category: newItemCat,
      image_url: newItemImg,
      effects: [],
      stats: []
    };
    await addItem(sessionId, newItem);
    resetForm();
    setIsForgeModalOpen(false);
  };

  const handleCreateInventoryItem = async () => {
    if (!newItemName.trim() || !isMJ || !character) return;
    const newItem = {
      id: crypto.randomUUID(),
      name: newItemName,
      description: newItemDesc || 'Un objet mystérieux...',
      category: newItemCat,
      image_url: newItemImg,
      effects: [],
      stats: []
    };
    const clonedItem = { ...newItem, instanceId: crypto.randomUUID() };
    const updatedChar = {
      ...character,
      inventory: [...(character.inventory || []), clonedItem]
    };
    addOrUpdateCharacter(updatedChar);
    if (window.electronAPI) await addSessionCharacter(updatedChar);
    broadcast({ type: 'CHAR_UPDATE', payload: updatedChar });
    
    resetForm();
    setIsInventoryModalOpen(false);
  };

  const resetForm = () => {
    setNewItemName('');
    setNewItemDesc('');
    setNewItemImg('');
    setNewItemCat('Divers');
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
    resetForm();
    setIsForgeModalOpen(true);
  };

  const openInventoryModal = () => {
    resetForm();
    setIsInventoryModalOpen(true);
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

      {/* Creation Modal Overlay */}
      {(isForgeModalOpen || isInventoryModalOpen) && isMJ && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-[#0D0D0F] border border-gold-DEFAULT/30 rounded-xl p-5 w-full max-w-sm shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-xs font-cinzel font-bold text-gold-DEFAULT uppercase tracking-widest flex items-center gap-2">
                {isForgeModalOpen ? <><Hammer size={14} /> FORGER (ARCHIVES)</> : <><Package size={14} /> NOUVEL OBJET (INVENTAIRE)</>}
              </h3>
              <button onClick={() => { setIsForgeModalOpen(false); setIsInventoryModalOpen(false); }} className="text-white/40 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input type="text" placeholder="Nom de l'objet" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-gold-DEFAULT/50 outline-none" autoFocus />
                <select value={newItemCat} onChange={e => setNewItemCat(e.target.value)} className="w-1/3 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <textarea placeholder="Description" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-gold-DEFAULT/50 outline-none resize-none h-20" />
              <input type="text" placeholder="URL de l'image (optionnel)" value={newItemImg} onChange={e => setNewItemImg(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-gold-DEFAULT/50 outline-none" />
            </div>
            
            <button onClick={isForgeModalOpen ? handleCreateForgeItem : handleCreateInventoryItem} className="w-full py-2.5 bg-gold-DEFAULT text-black text-[10px] font-cinzel font-bold tracking-widest rounded-lg hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all flex justify-center items-center gap-2 mt-2">
              <Plus size={14} /> {isForgeModalOpen ? "CRÉER DANS LES ARCHIVES" : "AJOUTER AU COFFRE"}
            </button>
          </div>
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
        {effectiveTab === 'inventory' && isMJ && (
          <button 
            onClick={openInventoryModal}
            className="px-3 py-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all flex items-center justify-center"
            title="Créer un objet directement dans l'inventaire"
          >
            <Plus size={16} />
          </button>
        )}
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
                      <h4 className="text-[10px] font-cinzel font-black text-gold-bright truncate uppercase">{item.name}</h4>
                      <p className="text-[8px] text-white/30 italic truncate">{item.description}</p>
                    </div>
                  </div>
                  
                  {isMJ && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button onClick={() => handleRemoveFromInventory(item.instanceId || item.id)} className="p-1 rounded bg-red-500/10 text-red-500/60 hover:bg-red-500/20 transition-colors">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
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