import React, { useState, useEffect } from 'react';
import { X, User, Sword, Heart, Package, BookOpen, Save, Trash2, ScrollText, Image as ImageIcon } from 'lucide-react';
import { useCharactersStore } from '../../store/characters';
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
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

  const [activeTab, setActiveTab] = useState<Tab>('profil');
  const [editedChar, setEditedChar] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const char = characters.find(c => c.id === characterId);
    if (char) {
      setEditedChar(JSON.parse(JSON.stringify(char))); // Deep copy for editing
    }
  }, [characterId, characters]);

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
              <div className="flex flex-col gap-3">
                {(!editedChar.inventory || editedChar.inventory.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20">
                    <Package size={48} className="mb-4 text-gold-DEFAULT" />
                    <span className="font-cinzel text-[10px] uppercase tracking-widest">INVENTAIRE VIDE</span>
                  </div>
                ) : (
                  editedChar.inventory.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-gold-DEFAULT/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-contain p-1 opacity-60" />
                          ) : (
                            <Package size={16} className="text-white/20" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-cinzel font-black text-xs uppercase tracking-widest text-white/90">{item.name}</span>
                            {item.equipped && <span className="text-[7px] font-cinzel font-black uppercase bg-gold-DEFAULT/20 text-gold-bright px-1.5 py-0.5 rounded border border-gold-DEFAULT/30">Équipé</span>}
                          </div>
                          <span className="text-[9px] font-mono text-white/30 uppercase">{item.category}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const newInv = editedChar.inventory.filter((_: any, idx: number) => idx !== i);
                          updateField('inventory', newInv);
                        }}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                        title="Retirer de l'inventaire"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
                <p className="text-[10px] font-garamond italic text-white/40 mt-4 text-center">Pour ajouter des objets, utilisez les archives de la Forge depuis l'interface du Coffre.</p>
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
