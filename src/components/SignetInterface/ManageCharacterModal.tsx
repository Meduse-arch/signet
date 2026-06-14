import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, User, Sword, Heart, Package, Save, Trash2, Search, Hammer, Plus, ArrowLeft, Zap, Upload, Loader2, MapPin, Target } from 'lucide-react';
import { useCharactersStore } from '../../store/characters';
import { useItemsStore } from '../../store/items';
import { useSkillsStore } from '../../store/skills';
import { useQuestsStore } from '../../store/quests';
import { useSessionStore } from '../../store/session';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { usePeer } from '../../hooks/usePeer';
import { updateSessionCharacter } from '../../services/characters.service';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { useAssetUrl } from '../../hooks/useAssetUrl';
import { useAssetUpload } from '../../hooks/useAssetUpload';
import { useMapStore } from '../../store/map';
import { parseAndRoll } from '../../services/des.service';
import { AssetImage } from '../AssetImage';
import { useTranslation } from 'react-i18next';

interface ManageCharacterModalProps {
 sessionId: string;
 characterId: string;
 onClose: () => void;
}

type Tab = 'profil' | 'stats' | 'ressources' | 'inventaire' | 'competences' | 'quetes';

const ENTITY_TYPES = [
 { id: 'Joueur', label: 'Joueur', icon: User, color: 'text-blue-400' },
 { id: 'PNJ', label: 'PNJ', icon: Zap, color: 'text-green-400' },
 { id: 'Monstre', label: 'Monstre', icon: Zap, color: 'text-orange-400' },
 { id: 'Boss', label: 'Boss', icon: Zap, color: 'text-red-400' },
];

export function ManageCharacterModal({ sessionId, characterId, onClose }: ManageCharacterModalProps) {
 const { t } = useTranslation();
 const { characters, addOrUpdateCharacter } = useCharactersStore();
 const { items } = useItemsStore();
 const { skills } = useSkillsStore();
 const { quests } = useQuestsStore();
 const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId || s.hostPeerId === sessionId));
 const { broadcast } = usePeer();
 const { user } = useAuthStore();
 const isMJ = !!user && user.role >= SecurityLevel.MJ;

 const [activeTab, setActiveTab] = useState<Tab>('profil');
 const [editedChar, setEditedChar] = useState<any>(null);
 const [hasChanges, setHasChanges] = useState(false);
 const [showForge, setShowForge] = useState(false);
 const [showSkillArchive, setShowSkillArchive] = useState(false);
 const [showQuestArchive, setShowQuestArchive] = useState(false);
 const [searchQuestArchive, setSearchQuestArchive] = useState('');
 const [searchForge, setSearchForge] = useState('');
 const [searchSkillArchive, setSearchSkillArchive] = useState('');
 const [forgeQuantities, setForgeQuantities] = useState<Record<string, number>>({});
 const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

 const tokenStatuses = useMapStore(state => state.tokenStatuses);
 const isTokenOnMap = !!tokenStatuses[characterId];

 const { isUploading, fileInputRef, previewUrl, handleFileUpload } = useAssetUpload(
 editedChar?.image_url || '',
 (url) => {
 setEditedChar((p: any) => ({ ...p, image_url: url }));
 setHasChanges(true);
 }
 );

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

 const filteredArchiveQuests = useMemo(() => {
 return quests.filter(quest => 
 quest.title.toLowerCase().includes(searchQuestArchive.toLowerCase()) ||
 quest.description.toLowerCase().includes(searchQuestArchive.toLowerCase())
 );
 }, [quests, searchQuestArchive]);

 const filteredArchiveSkills = useMemo(() => {
 return skills.filter(skill => 
 skill.name.toLowerCase().includes(searchSkillArchive.toLowerCase()) ||
 skill.description.toLowerCase().includes(searchSkillArchive.toLowerCase())
 );
 }, [skills, searchSkillArchive]);

 const groupedInventory = useMemo(() => {
 if (!editedChar) return [];
 const inv = editedChar.inventory || [];
 const groups: any[] = [];
 const unequippedStacks: Record<string, any> = {};

 inv.forEach((item: any) => {
 if (item.equipped) {
 groups.push({ ...item, quantity: 1, isStack: false });
 } else {
 if (!unequippedStacks[item.id]) {
 unequippedStacks[item.id] = { ...item, quantity: 0, isStack: true, instances: [] };
 groups.push(unequippedStacks[item.id]);
 }
 unequippedStacks[item.id].quantity += 1;
 unequippedStacks[item.id].instances.push(item.instanceId);
 }
 });

 return groups;
 }, [editedChar]);

 if (!editedChar) return null;

 const handleSave = async () => {
 if (!editedChar) return;
 
 // ✅ Convertir l'image en asset:// P2P au moment de la sauvegarde
 const { assetSyncService } = await import('../../services/asset-sync.service');
 const finalImageUrl = await assetSyncService.resolveLocalImage(editedChar.image_url);

 // ✅ Utiliser l'ID de session actuel pour l'entité si non défini
 const finalChar = { ...editedChar, session_id: sessionId, image_url: finalImageUrl };
 
 addOrUpdateCharacter(finalChar);
 
 if (window.electronAPI) {
 await updateSessionCharacter(
 sessionId,
 finalChar.id,
 finalChar.name,
 finalChar.stats,
 finalChar.skills,
 finalChar.bars,
 finalChar.image_url,
 finalChar.inventory,
 finalChar.custom_skills,
 finalChar.type,
 finalChar.is_template
 );
 }
 
 broadcast({ type: 'CHAR_UPDATE', payload: finalChar });
 
 // La synchro locale est déjà gérée en interne par addOrUpdateCharacter

 setHasChanges(false);
 onClose();
 };

 const updateStat = (id: string, val: number) => {
  setEditedChar((prev: any) => {
    const newStats = { ...prev.stats, [id]: Math.max(0, val) };
    const newBars = { ...(prev.bars || {}) };
    
    const statDefs = session?.settings?.stats || DEFAULT_STATS;
    const barDefs = session?.settings?.bars || DEFAULT_BARS;

    barDefs.forEach((bar: any) => {
      if (!bar.formula) return;
      try {
        let expr = bar.formula.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        statDefs.forEach((s: any) => {
          const statVal = newStats[s.id] || 0;
          if (s.id) {
            const idRegex = new RegExp(`\\b${s.id.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}\\b`, 'g');
            expr = expr.replace(idRegex, statVal.toString());
          }
          if (s.name) {
            const nameRegex = new RegExp(`\\b${s.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}\\b`, 'g');
            expr = expr.replace(nameRegex, statVal.toString());
          }
        });
        
        const res = parseAndRoll(expr);
        if (res.total > 0) {
          const newMax = Math.floor(res.total);
          const maxKey = `max${bar.id.charAt(0).toUpperCase()}${bar.id.slice(1)}`;
          const oldMax = newBars[maxKey] || 100;
          newBars[maxKey] = newMax;
          
          if ((newBars[bar.id] || 0) >= oldMax || (newBars[bar.id] || 0) === 0) {
             newBars[bar.id] = newMax;
          } else {
             newBars[bar.id] = Math.max(0, Math.min(newMax, (newBars[bar.id] || 0)));
          }
        }
      } catch (e) {
        // ignore
      }
    });

    return {
      ...prev,
      stats: newStats,
      bars: newBars
    };
  });
  setHasChanges(true);
  };

 const updateBar = (id: string, val: number) => {
 setEditedChar((prev: any) => ({
 ...prev,
 bars: { ...prev.bars, [id]: Math.max(0, val) }
 }));
 setHasChanges(true);
 };

 const handleAddFromForge = (item: any) => {
 const qty = forgeQuantities[item.id] || 1;
 const newInstances = Array.from({ length: qty }).map(() => ({
 ...item,
 instanceId: crypto.randomUUID(),
 equipped: false
 }));

 setEditedChar((prev: any) => ({
 ...prev,
 inventory: [...(prev.inventory || []), ...newInstances]
 }));
 setHasChanges(true);
 setAddedFeedback(item.id);
 setTimeout(() => setAddedFeedback(null), 1000);
 };

 const handleAddSkillFromArchive = (skill: any) => {
 // Éviter les doublons
 if (editedChar.custom_skills?.some((s: any) => s.id === skill.id)) return;
 
 setEditedChar((prev: any) => ({
 ...prev,
 custom_skills: [...(prev.custom_skills || []), { ...skill, instanceId: crypto.randomUUID(), level: 20 }]
 }));
 setHasChanges(true);
 setAddedFeedback(skill.id);
 setTimeout(() => setAddedFeedback(null), 1000);
 };

 const handleRemoveInstance = (instanceId: string) => {
 setEditedChar((prev: any) => ({
 ...prev,
 inventory: prev.inventory.filter((i: any) => i.instanceId !== instanceId)
 }));
 setHasChanges(true);
 };

 const handleRemoveStack = (itemId: string) => {
 setEditedChar((prev: any) => ({
 ...prev,
 inventory: prev.inventory.filter((i: any) => i.id !== itemId || i.equipped)
 }));
 setHasChanges(true);
 };

 const handleAddQuestFromArchive = (quest: any) => {
 const existingQuests = editedChar.quests || [];
 if (!existingQuests.find((q: any) => q.id === quest.id)) {
 setEditedChar((prev: any) => ({
 ...prev,
 quests: [...existingQuests, { ...quest, customId: crypto.randomUUID() }]
 }));
 setHasChanges(true);
 setAddedFeedback(quest.id);
 setTimeout(() => setAddedFeedback(null), 1000);
 }
 };

 const handleRemoveQuest = (questId: string) => {
 setEditedChar((prev: any) => ({
 ...prev,
 quests: (prev.quests || []).filter((q: any) => q.id !== questId)
 }));
 setHasChanges(true);
 };

 const handleRemoveSkill = (skillId: string) => {
 setEditedChar((prev: any) => ({
 ...prev,
 custom_skills: (prev.custom_skills || []).filter((s: any) => s.id !== skillId)
 }));
 setHasChanges(true);
 };

 const handleUpdateQuantity = (itemId: string, newQty: number) => {
 if (newQty < 0) return;
 
 setEditedChar((prev: any) => {
 const otherItems = prev.inventory.filter((i: any) => i.id !== itemId || i.equipped);
 const itemToClone = prev.inventory.find((i: any) => i.id === itemId && !i.equipped);
 
 if (!itemToClone && newQty > 0) return prev;

 const newInstances = Array.from({ length: newQty }).map(() => ({
 ...itemToClone,
 instanceId: crypto.randomUUID()
 }));

 return {
 ...prev,
 inventory: [...otherItems, ...newInstances]
 };
 });
 setHasChanges(true);
 };

 const statDefs = session?.settings?.stats || DEFAULT_STATS;
 const barDefs = session?.settings?.bars || DEFAULT_BARS;

 return (
 <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
 <div className="relative w-full max-w-4xl bg-[#0D0D0F]/95 border border-silver-DEFAULT/30 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
 <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-silver-DEFAULT/50 rounded-tl-[2rem] pointer-events-none" />
 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-silver-DEFAULT/50 rounded-br-[2rem] pointer-events-none" />
 
 <header className="flex items-center justify-between p-6 border-b border-silver-DEFAULT/10 shrink-0">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-glacier-DEFAULT/10 border border-silver-DEFAULT/30 flex items-center justify-center overflow-hidden shadow-lg">
 {previewUrl ? (
 <AssetImage src={previewUrl} alt="" className="w-full h-full object-cover" />
 ) : (
 <User size={24} className="text-glacier-bright" />
 )}
 </div>
 <div>
 <h2 className="text-xl font-quantico font-black text-glacier-bright tracking-[0.2em] uppercase">
 {editedChar.name}
 </h2>
 <div className="flex items-center gap-3 mt-0.5">
 <span className="text-xs font-quantico text-silver-bright/60 tracking-widest uppercase">{t('context.manageEntity', "GÉRER L'ENTITÉ")}</span>
 <div className="w-1 h-1 rounded-full bg-glacier-DEFAULT/20" />
 <div className="flex items-center gap-1.5">
 <div className={`w-1.5 h-1.5 rounded-full ${isTokenOnMap ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 opacity-50'}`} />
 <span className={`text-xs font-quantico font-black uppercase tracking-tighter ${isTokenOnMap ? 'text-green-400' : 'text-white/60'}`}>
 {isTokenOnMap ? t('context.onMap', 'Sur la carte') : t('context.offMap', 'Hors carte')}
 </span>
 </div>
 </div>
 </div>
 </div>
 <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gold-dim hover:text-glacier-bright transition-colors">
 <X size={24} />
 </button>
 </header>

 <div className="flex-1 flex overflow-hidden">
 <aside className="w-16 md:w-48 border-r border-white/5 bg-black/20 p-2 md:p-4 flex flex-col gap-1 shrink-0">
 {[
 { id: 'profil', label: 'PROFIL', icon: User },
 { id: 'stats', label: 'ATTRIBUTS', icon: Sword },
 { id: 'ressources', label: 'RESSOURCES', icon: Heart },
 { id: 'inventaire', label: 'INVENTAIRE', icon: Package },
 ...(isMJ ? [
 { id: 'competences', label: 'SKILLS', icon: Zap },
 { id: 'quetes', label: 'QUÊTES', icon: Target }
 ] : [])
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => { setActiveTab(tab.id as Tab); setShowForge(false); setShowSkillArchive(false); setShowQuestArchive(false); }}
 className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-quantico text-xs font-black tracking-widest transition-all ${activeTab === tab.id ? 'bg-glacier-DEFAULT text-black shadow-lg translate-x-1' : 'text-white/60 hover:text-white/60 hover:bg-white/5'}`}
 >
 <tab.icon size={14} className="shrink-0" />
 <span className="hidden md:inline">
 {tab.id === 'profil' ? t('context.profile', "PROFIL") :
 tab.id === 'stats' ? t('context.attributes', "ATTRIBUTS") :
 tab.id === 'ressources' ? t('context.resources', "RESSOURCES") :
 tab.id === 'inventaire' ? t('context.inventory', "INVENTAIRE") :
 tab.id === 'competences' ? t('context.skills', "SKILLS") :
 tab.id === 'quetes' ? t('context.quests', "QUÊTES") : tab.label}
 </span>
 </button>
 ))}
 </aside>

 <main className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-black/40">
 {activeTab === 'profil' && (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-4">
 <label className="text-xs font-quantico font-black text-silver-bright/60 uppercase tracking-widest ml-1">{t('context.entityName', "Appellation de l'Entité")}</label>
 <input 
 type="text" 
 value={editedChar.name} 
 onChange={e => { setEditedChar((prev: any) => ({ ...prev, name: e.target.value })); setHasChanges(true); }}
 className="w-full bg-white/5 border border-silver-DEFAULT/20 rounded-xl px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:border-silver-DEFAULT/50 transition-colors font-inter italic text-lg shadow-inner"
 />
 </div>
 <div className="space-y-4">
 <label className="text-xs font-quantico font-black text-silver-bright/60 uppercase tracking-widest ml-1">{t('context.entityType', "Type d'Existence")}</label>
 <div className="grid grid-cols-2 gap-2">
 {ENTITY_TYPES.map(entityType => (
 <button
 key={entityType.id}
 onClick={() => { setEditedChar((p: any) => ({ ...p, type: entityType.id })); setHasChanges(true); }}
 className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[11px] font-quantico font-black uppercase transition-all ${editedChar.type === entityType.id ? 'bg-glacier-DEFAULT/10 border-silver-DEFAULT text-glacier-bright shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}
 >
 <entityType.icon size={12} className={entityType.color} />
 {entityType.id === 'Joueur' ? t('context.player', "Joueur") :
 entityType.id === 'PNJ' ? t('context.npc', "PNJ") :
 entityType.id === 'Monstre' ? t('context.monster', "Monstre") :
 entityType.id === 'Boss' ? t('context.boss', "Boss") : entityType.label}
 </button>
 ))}
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <label className="text-xs font-quantico font-black text-silver-bright/60 uppercase tracking-widest ml-1">{t('context.illustration', "Illustration")}</label>
 <div className="flex gap-4">
 <div className="w-16 h-16 rounded-2xl border border-white/10 bg-black/40 flex items-center justify-center overflow-hidden shrink-0">
 {previewUrl ? (
 <AssetImage src={previewUrl} className="w-full h-full object-cover" alt="Portrait" />
 ) : (
 <User className="text-white/60" size={24} />
 )}
 </div>
 <div className="flex-1 flex flex-col gap-2">
 <div className="flex gap-2">
 <input 
 type="text" 
 value={editedChar.image_url || ''} 
 onChange={e => { setEditedChar((p: any) => ({ ...p, image_url: e.target.value })); setHasChanges(true); }}
 placeholder={t('context.urlOrAssetPlaceholder', "URL ou asset://...")}
 className="flex-1 bg-white/5 border border-silver-DEFAULT/20 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-silver-DEFAULT/50 transition-colors font-mono shadow-inner"
 />
 <button 
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading}
 className="p-2 rounded-xl bg-glacier-DEFAULT/10 border border-silver-DEFAULT/20 text-glacier-bright hover:bg-glacier-DEFAULT/20 transition-all flex items-center justify-center min-w-[40px]"
 >
 {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
 </button>
 <input 
 type="file" 
 ref={fileInputRef} 
 className="hidden" 
 accept="image/*"
 onChange={handleFileUpload}
 />
 </div>
 <p className="text-[11px] font-quantico text-white/60 uppercase tracking-widest px-1">{t('context.importLocalPortrait', "Importez un portrait local (P2P)")}</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'stats' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
 {statDefs.map((stat: any) => (
 <div key={stat.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-silver-DEFAULT/20 transition-all group">
 <div className="flex flex-col">
 <span className="font-quantico font-black uppercase text-xs text-white/60 tracking-widest group-hover:text-silver-bright transition-colors">{stat.name}</span>
 </div>
 <div className="flex items-center gap-3">
 <button onClick={() => updateStat(stat.id, (editedChar.stats?.[stat.id] || 0) - 1)} className="w-8 h-8 rounded-lg border border-white/20 hover:bg-white/10 text-white/60 transition-colors flex items-center justify-center font-bold">-</button>
 <input 
 type="number" 
 value={editedChar.stats?.[stat.id] || 0} 
 onChange={e => updateStat(stat.id, parseInt(e.target.value) || 0)}
 className="w-16 bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-center font-mono text-lg text-glacier-bright outline-none focus:border-silver-DEFAULT transition-all shadow-inner"
 />
 <button onClick={() => updateStat(stat.id, (editedChar.stats?.[stat.id] || 0) + 1)} className="w-8 h-8 rounded-lg border border-white/20 hover:bg-white/10 text-white/60 transition-colors flex items-center justify-center font-bold">+</button>
 </div>
 </div>
 ))}
 </div>
 )}

 {activeTab === 'ressources' && (
 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
 {barDefs.map((bar: any) => (
 <div key={bar.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-silver-DEFAULT/20 transition-all">
 <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: bar.color + '20' }}>
 <Heart size={16} style={{ color: bar.color }} />
 </div>
 <div className="flex flex-col flex-1 min-w-0">
 <span className="font-quantico font-black uppercase text-xs text-white/80 tracking-widest truncate">{bar.name}</span>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <button onClick={() => updateBar(bar.id, (editedChar.bars?.[bar.id] || 0) - 1)} className="w-8 h-8 rounded-lg border border-white/20 hover:bg-white/10 text-white/60 transition-colors flex items-center justify-center font-bold">-</button>
 <input 
 type="number" 
 value={editedChar.bars?.[bar.id] || 0} 
 onChange={e => updateBar(bar.id, parseInt(e.target.value) || 0)}
 className="w-16 bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-center font-mono text-white outline-none focus:border-silver-DEFAULT transition-all shadow-inner"
 />
 <button onClick={() => updateBar(bar.id, (editedChar.bars?.[bar.id] || 0) + 1)} className="w-8 h-8 rounded-lg border border-white/20 hover:bg-white/10 text-white/60 transition-colors flex items-center justify-center font-bold">+</button>
 </div>
 </div>
 ))}
 </div>
 )}

 {activeTab === 'inventaire' && (
 <div className="flex flex-col gap-4">
 {!showForge ? (
 <>
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-quantico font-black text-silver-bright/60 uppercase tracking-widest">{t('context.currentInventory', "Inventaire Actuel")}</h3>
 <button 
 onClick={() => setShowForge(true)}
 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glacier-DEFAULT text-black border border-silver-DEFAULT hover:bg-glacier-bright transition-all font-quantico text-xs font-black uppercase tracking-widest group shadow-lg"
 >
 <Plus size={14} className="group-hover:rotate-90 transition-transform" />
 {t('common.add', "Ajouter")}
 </button>
 </div>

 <div className="flex flex-col gap-2">
 {groupedInventory.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 opacity-40">
 <Package size={48} className="mb-4 text-silver-bright" />
 <span className="font-quantico text-xs uppercase tracking-widest">{t('context.emptyInventory', "INVENTAIRE VIDE")}</span>
 </div>
 ) : (
 groupedInventory.map((item: any, i: number) => (
 <div key={item.instanceId || `stack-${item.id}-${i}`} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-silver-DEFAULT/20 transition-all">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
 {item.image_url ? (
 <InventoryItemImage url={item.image_url} />
 ) : (
 <Package size={16} className="text-white/60" />
 )}
 {item.quantity > 1 && (
 <div className="absolute bottom-0 right-0 bg-glacier-DEFAULT text-black text-xs font-black px-1 rounded-tl">
 x{item.quantity}
 </div>
 )}
 </div>
 <div className="flex flex-col min-w-0">
 <div className="flex items-center gap-2">
 <span className="font-quantico font-black text-xs uppercase tracking-widest text-white/90 truncate">{item.name}</span>
 {item.equipped && <span className="text-[11px] font-quantico font-black uppercase bg-glacier-DEFAULT/20 text-glacier-bright px-1.5 py-0.5 rounded border border-silver-DEFAULT/30 shrink-0">Équipé</span>}
 </div>
 <span className="text-[11px] font-mono text-white/50 uppercase">{item.category}</span>
 </div>
 </div>

 <div className="flex items-center gap-4">
 {item.isStack && (
 <div className="flex items-center gap-2 bg-black/40 rounded-lg border border-white/10 p-1 opacity-30 group-hover:opacity-100 transition-opacity">
 <button 
 onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item.id, item.quantity - 1); }}
 className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
 >
 -
 </button>
 <input 
 type="number" 
 value={item.quantity} 
 onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
 className="w-8 bg-transparent text-center font-mono text-xs text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
 />
 <button 
 onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item.id, item.quantity + 1); }}
 className="w-6 h-6 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
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
 className="p-2 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-colors opacity-30 group-hover:opacity-100"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </>
 ) : (
 <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
 <div className="flex items-center justify-between">
 <button 
 onClick={() => setShowForge(false)}
 className="flex items-center gap-2 text-white/60 hover:text-glacier-bright transition-colors text-xs font-quantico font-black uppercase tracking-widest"
 >
 <ArrowLeft size={14} /> {t('context.backToInventory', "Retour à l'Inventaire")}
 </button>
 <div className="relative w-48">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-silver-bright/40" />
 <input 
 type="text" 
 value={searchForge}
 onChange={e => setSearchForge(e.target.value)}
 placeholder={t('common.search', "Rechercher...")}
 className="w-full bg-black/60 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:border-silver-DEFAULT/50 outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-2">
 {filteredForgeItems.map(item => (
 <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-silver-DEFAULT/20 transition-all">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
 {item.image_url ? (
 <InventoryItemImage url={item.image_url} />
 ) : (
 <Package size={16} className="text-white/60" />
 )}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="font-quantico font-black text-xs uppercase tracking-widest text-white/90 truncate">{item.name}</span>
 <span className="text-[11px] font-mono text-white/50 uppercase">{item.category}</span>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <input 
 type="number" 
 min="1" 
 max="99" 
 value={forgeQuantities[item.id] || 1}
 onChange={e => setForgeQuantities(prev => ({ ...prev, [item.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
 className="w-10 bg-black/40 border border-white/10 rounded-lg py-1 text-center font-mono text-xs text-white"
 />
 <button 
 onClick={() => handleAddFromForge(item)}
 className={`p-2 rounded-lg transition-all ${addedFeedback === item.id ? 'bg-green-500 text-white' : 'bg-glacier-DEFAULT text-black hover:scale-105'}`}
 >
 {addedFeedback === item.id ? <Plus size={14} className="animate-ping" /> : <Plus size={14} />}
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {activeTab === 'competences' && (
 <div className="flex flex-col gap-4">
 {!showSkillArchive ? (
 <>
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-quantico font-black text-silver-bright/60 uppercase tracking-widest">{t('context.assignedSkills', "Compétences Assignées")}</h3>
 <button 
 onClick={() => setShowSkillArchive(true)}
 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glacier-DEFAULT text-black border border-silver-DEFAULT hover:bg-glacier-bright transition-all font-quantico text-xs font-black uppercase tracking-widest group shadow-lg"
 >
 <Plus size={14} className="group-hover:rotate-90 transition-transform" />
 {t('common.add', "Ajouter")}
 </button>
 </div>

 <div className="flex flex-col gap-2">
 {(editedChar.custom_skills || []).length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 opacity-40">
 <Zap size={48} className="mb-4 text-silver-bright" />
 <span className="font-quantico text-xs uppercase tracking-widest">{t('context.noSkills', "AUCUNE COMPÉTENCE")}</span>
 </div>
 ) : (
 editedChar.custom_skills.map((skill: any) => (
 <div key={skill.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-silver-DEFAULT/20 transition-all">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
 {skill.image_url ? (
 <SkillItemImage url={skill.image_url} />
 ) : (
 <Zap size={18} className="text-silver-bright/40" />
 )}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="font-quantico font-black text-xs uppercase tracking-widest text-white/90 truncate">{skill.name}</span>
 <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">Compétence</span>
 </div>
 </div>
 <button 
 onClick={() => handleRemoveSkill(skill.id)}
 className="p-2 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-colors opacity-30 group-hover:opacity-100"
 >
 <Trash2 size={14} />
 </button>
 </div>
 ))
 )}
 </div>
 </>
 ) : (
 <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
 <div className="flex items-center justify-between">
 <button 
 onClick={() => setShowSkillArchive(false)}
 className="flex items-center gap-2 text-white/60 hover:text-glacier-bright transition-colors text-xs font-quantico font-black uppercase tracking-widest"
 >
 <ArrowLeft size={14} /> {t('common.back', "Retour")}
 </button>
 <div className="relative w-48">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-silver-bright/40" />
 <input 
 type="text" 
 value={searchSkillArchive}
 onChange={e => setSearchSkillArchive(e.target.value)}
 placeholder={t('common.search', "Rechercher...")}
 className="w-full bg-black/60 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:border-silver-DEFAULT/50 outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-2">
 {filteredArchiveSkills.map(skill => (
 <div key={skill.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-silver-DEFAULT/20 transition-all">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
 {skill.image_url ? (
 <SkillItemImage url={skill.image_url} />
 ) : (
 <Zap size={18} className="text-silver-bright/40" />
 )}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="font-quantico font-black text-xs uppercase tracking-widest text-white/90 truncate">{skill.name}</span>
 <span className="text-[11px] font-mono text-white/50 uppercase">Type: {skill.type}</span>
 </div>
 </div>

 <button 
 onClick={() => handleAddSkillFromArchive(skill)}
 className={`p-2 rounded-lg transition-all ${addedFeedback === skill.id ? 'bg-green-500 text-white' : 'bg-glacier-DEFAULT text-black hover:scale-105'}`}
 >
 {addedFeedback === skill.id ? <Plus size={14} className="animate-ping" /> : <Plus size={14} />}
 </button>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {activeTab === 'quetes' && (
 <div className="flex flex-col gap-4">
 {!showQuestArchive ? (
 <>
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-quantico font-black text-silver-bright/60 uppercase tracking-widest">{t('context.assignedQuests', "Quêtes Assignées")}</h3>
 <button 
 onClick={() => setShowQuestArchive(true)}
 className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glacier-DEFAULT text-black border border-silver-DEFAULT hover:bg-glacier-bright transition-all font-quantico text-xs font-black uppercase tracking-widest group shadow-lg"
 >
 <Plus size={14} className="group-hover:rotate-90 transition-transform" />
 {t('common.add', "Ajouter")}
 </button>
 </div>

 <div className="flex flex-col gap-2">
 {(editedChar.quests || []).length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 opacity-40">
 <Target size={48} className="mb-4 text-silver-bright" />
 <span className="font-quantico text-xs uppercase tracking-widest">{t('context.noQuests', "AUCUNE QUÊTE")}</span>
 </div>
 ) : (
 editedChar.quests.map((quest: any) => (
 <div key={quest.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-silver-DEFAULT/20 transition-all">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
 {quest.image_url ? (
 <SkillItemImage url={quest.image_url} />
 ) : (
 <Target size={18} className="text-silver-bright/40" />
 )}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="font-quantico font-black text-xs uppercase tracking-widest text-white/90 truncate">{quest.title}</span>
 <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">Quête</span>
 </div>
 </div>
 <button 
 onClick={() => handleRemoveQuest(quest.id)}
 className="p-2 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-colors opacity-30 group-hover:opacity-100"
 >
 <Trash2 size={14} />
 </button>
 </div>
 ))
 )}
 </div>
 </>
 ) : (
 <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
 <div className="flex items-center justify-between">
 <button 
 onClick={() => setShowQuestArchive(false)}
 className="flex items-center gap-2 text-white/60 hover:text-glacier-bright transition-colors text-xs font-quantico font-black uppercase tracking-widest"
 >
 <ArrowLeft size={14} /> {t('common.back', "Retour")}
 </button>
 <div className="relative w-48">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-silver-bright/40" />
 <input 
 type="text" 
 value={searchQuestArchive}
 onChange={e => setSearchQuestArchive(e.target.value)}
 placeholder={t('common.search', "Rechercher...")}
 className="w-full bg-black/60 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:border-silver-DEFAULT/50 outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-2">
 {filteredArchiveQuests.map(quest => (
 <div key={quest.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-silver-DEFAULT/20 transition-all">
 <div className="flex items-center gap-4 flex-1 min-w-0">
 <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
 {quest.image_url ? (
 <SkillItemImage url={quest.image_url} />
 ) : (
 <Target size={18} className="text-silver-bright/40" />
 )}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="font-quantico font-black text-xs uppercase tracking-widest text-white/90 truncate">{quest.title}</span>
 <span className="text-[11px] font-mono text-white/50 uppercase">Quête {quest.status}</span>
 </div>
 </div>

 <button 
 onClick={() => handleAddQuestFromArchive(quest)}
 className={`p-2 rounded-lg transition-all ${addedFeedback === quest.id ? 'bg-green-500 text-white' : 'bg-glacier-DEFAULT text-black hover:scale-105'}`}
 >
 {addedFeedback === quest.id ? <Plus size={14} className="animate-ping" /> : <Plus size={14} />}
 </button>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </main>
 </div>

 <footer className="p-6 border-t border-silver-DEFAULT/10 flex justify-between items-center bg-black/40 shrink-0">
 <div className="flex items-center gap-4">
 {hasChanges && (
 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-glacier-DEFAULT/10 border border-silver-DEFAULT/30 animate-pulse">
 <div className="w-1.5 h-1.5 rounded-full bg-glacier-DEFAULT" />
 <span className="text-xs font-quantico font-black text-glacier-bright uppercase tracking-widest">{t('context.unsavedChanges', "Changements non enregistrés")}</span>
 </div>
 )}
 </div>
 <div className="flex gap-4">
 <button 
 onClick={onClose}
 className="px-8 py-3 rounded-full text-xs font-quantico font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
 >
 {t('common.cancel', "Annuler")}
 </button>
 <button 
 onClick={handleSave}
 className="flex items-center gap-3 px-12 py-3 rounded-full bg-glacier-DEFAULT text-black hover:shadow-[0_0_30px_rgba(79,164,184,0.4)] hover:scale-105 transition-all group font-quantico font-black text-xs uppercase tracking-[0.2em]"
 >
 <Save size={14} className="group-hover:rotate-12 transition-transform" />
 {t('common.save', "Enregistrer")}
 </button>
 </div>
 </footer>
 </div>
 </div>
 );
}

// Composants internes pour gérer la résolution des URLs d'assets
function InventoryItemImage({ url }: { url: string }) {
 const resolved = useAssetUrl(url);
 return <AssetImage src={resolved || undefined} alt="" className="w-full h-full object-contain p-1 opacity-60" />;
}

function SkillItemImage({ url }: { url: string }) {
 const resolved = useAssetUrl(url);
 return <AssetImage src={resolved || undefined} alt="" className="w-full h-full object-cover opacity-60" />;
}
