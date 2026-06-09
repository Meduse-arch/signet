import React, { useState } from 'react';
import { useItemsStore } from '../../store/items';
import { Package, Plus, Trash2, Search, Info, Shield, Sword, FlaskConical, Sparkles, Hammer, Upload, Loader2 } from 'lucide-react';
import { useAssetUpload } from '../../hooks/useAssetUpload';

const CATEGORIES = ['Arme', 'Armure', 'Consommable', 'Artéfact', 'Divers'];

export function AdminItemsView({ sessionId }: { sessionId: string }) {
 const { items, addItem, removeItem } = useItemsStore();
 const [search, setSearch] = useState('');
 
 // State for Forge
 const [newItemName, setNewItemName] = useState('');
 const [newItemDesc, setNewItemDesc] = useState('');
 const [newItemCat, setNewItemCat] = useState('Divers');
 const [newItemImg, setNewItemImg] = useState('');

 const { isUploading, fileInputRef, handleFileUpload } = useAssetUpload(
 newItemImg,
 (url) => setNewItemImg(url)
 );

 const handleCreateForgeItem = async () => {
 if (!newItemName.trim()) return;
 const newItem = {
 id: crypto.randomUUID(),
 name: newItemName,
 description: newItemDesc || 'Un objet mystérieux...',
 category: newItemCat,
 image_url: newItemImg,
 modifiers: [],
 effects: [],
 stats: []
 };
 await addItem(sessionId, newItem);
 setNewItemName('');
 setNewItemDesc('');
 setNewItemImg('');
 };

 const handleDeleteForgeItem = async (id: string) => {
 if (!window.confirm("Supprimer cet artefact de la forge ?")) return;
 await removeItem(sessionId, id);
 };

 const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

 return (
 <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500 max-w-6xl mx-auto w-full p-8">
 
 <div className="flex items-center justify-between mb-2">
 <h2 className="text-2xl font-black text-glacier-bright tracking-[0.2em] uppercase flex items-center gap-3">
 <Hammer size={24} /> Forge de l'Univers
 </h2>
 </div>

 {/* Création d'Objet */}
 <div className="bg-black/60 p-6 rounded-2xl border border-silver-DEFAULT/20 flex flex-col gap-4 shadow-xl">
 <h3 className="text-xs font-quantico font-bold text-silver-bright uppercase tracking-widest flex items-center gap-2">
 Nouvel Artéfact Global
 </h3>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <input 
 type="text" 
 placeholder="Nom de l'artéfact" 
 value={newItemName} 
 onChange={e => setNewItemName(e.target.value)} 
 className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-silver-DEFAULT/50 outline-none transition-colors" 
 />
 <select 
 value={newItemCat} 
 onChange={e => setNewItemCat(e.target.value)} 
 className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/70 outline-none transition-colors"
 >
 {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 <input 
 type="text" 
 placeholder="Description (historique, effets, etc.)" 
 value={newItemDesc} 
 onChange={e => setNewItemDesc(e.target.value)} 
 className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-silver-DEFAULT/50 outline-none transition-colors" 
 />
 <div className="flex gap-2">
 <input 
 type="text" 
 placeholder="URL de l'image (optionnel)" 
 value={newItemImg} 
 onChange={e => setNewItemImg(e.target.value)} 
 className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-silver-DEFAULT/50 outline-none transition-colors min-w-0" 
 />
 <button 
 type="button"
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading}
 className="p-2.5 rounded-xl bg-glacier-DEFAULT/10 border border-silver-DEFAULT/20 text-glacier-bright hover:bg-glacier-DEFAULT/20 transition-all flex items-center justify-center min-w-[44px]"
 title="Importer un fichier local"
 >
 {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
 </button>
 <input 
 type="file" 
 ref={fileInputRef} 
 className="hidden" 
 accept="image/*"
 onChange={handleFileUpload}
 />
 </div>
 </div>

 <button 
 onClick={handleCreateForgeItem} 
 className="mt-2 w-full py-3 bg-glacier-DEFAULT/10 hover:bg-glacier-DEFAULT/20 border border-silver-DEFAULT/30 text-glacier-bright text-xs font-quantico font-bold tracking-widest rounded-xl transition-all flex justify-center items-center gap-2 group shadow-lg"
 >
 <Plus size={16} className="group-hover:scale-110 transition-transform" /> FORGER L'OBJET
 </button>
 </div>
 
 {/* Recherche et Liste */}
 <div className="flex flex-col gap-4 flex-1 min-h-0">
 <div className="relative shrink-0">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-bright/40" />
 <input 
 type="text" 
 placeholder="Rechercher un artéfact dans les archives mondiales..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-black/40 border border-silver-DEFAULT/20 rounded-xl py-3 pl-11 pr-4 text-xs font-quantico text-glacier-bright placeholder:text-silver-bright/40 focus:outline-none focus:border-silver-DEFAULT/50 transition-all shadow-inner"
 />
 </div>

 <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredItems.map((item) => (
 <div key={item.id} className="group relative bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-silver-DEFAULT/40 hover:bg-white/10 transition-all flex flex-col justify-between shadow-lg">
 <div className="flex items-start gap-4 mb-4">
 <div className="w-14 h-14 shrink-0 rounded-xl bg-black/60 border border-white/5 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-silver-DEFAULT/30 transition-colors">
 {item.image_url ? (
 <img src={item.image_url} alt="" className="w-full h-full object-cover" />
 ) : (
 <Package size={28} className="text-silver-bright/20 group-hover:text-silver-bright/40 transition-colors" />
 )}
 </div>
 <div className="flex-1 min-w-0 pt-1">
 <div className="flex flex-col gap-1">
 <h4 className="text-xs font-quantico font-black text-glacier-bright truncate uppercase tracking-wider">{item.name}</h4>
 <span className="inline-block w-fit text-[11px] font-bold border border-white/10 bg-black/40 px-2 py-0.5 rounded-md text-white/50 uppercase tracking-widest">{item.category}</span>
 </div>
 </div>
 </div>
 
 <p className="text-xs text-white/60 italic line-clamp-3 mb-4 leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5 flex-1">{item.description}</p>
 
 <div className="flex justify-end pt-3 border-t border-white/5 mt-auto">
 <button 
 onClick={() => handleDeleteForgeItem(item.id)} 
 className="p-2 rounded-lg bg-red-500/10 text-red-500/80 hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center gap-2 group-hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]"
 title="Détruire"
 >
 <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
 </button>
 </div>
 </div>
 ))}
 </div>

 {filteredItems.length === 0 && (
 <div className="flex flex-col items-center justify-center py-20 opacity-30">
 <Hammer size={48} className="mb-4 text-silver-bright/30" />
 <span className="text-sm font-quantico italic tracking-widest text-silver-bright">Aucun artéfact forgé pour l'instant...</span>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
