import { useState, useMemo, useEffect } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { useUIStore } from '../../store/ui';
import { usePeer } from '../../hooks/usePeer';
import { Ghost, User, Plus, Search, Trash2, Shield, Heart, Zap, Settings, Sword, Skull, BookOpen, X, ChevronRight } from 'lucide-react';
import { addSessionCharacter, updateSessionCharacter, removeSessionCharacter, Character } from '../../services/characters.service';
import { CreateCharacterModal } from '../CreateCharacterModal';
import { CharacterSheetContent } from './CharacterSheetContent';
import { DEFAULT_BARS, DEFAULT_STATS } from '../../systems/seal/constants';

interface BestiaryWindowContentProps {
  sessionId: string;
}

export function BestiaryWindowContent({ sessionId }: BestiaryWindowContentProps) {
  const { characters, controlledCharacterId, setPnjControle, removeCharacter, addOrUpdateCharacter } = useCharactersStore();
  const { user } = useAuthStore();
  const { setCharacterManagement } = useUIStore();
  const isMJ = !!user && Number(user.role) >= SecurityLevel.MJ;
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();
  
  const [activeTab, setActiveTab] = useState<'pnj' | 'mobs' | 'boss' | 'models' | 'players'>('pnj');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingNPC, setEditingNPC] = useState<Character | null>(null);
  const [creationMode, setCreationMode] = useState<'manual' | 'roll'>('roll');
  const [tokenStatus, setTokenStatus] = useState<Record<string, boolean>>({});
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  // Écouter le status des tokens depuis le Board
  useEffect(() => {
    if (!isMJ) return;
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    
    // 1. Demander l'état initial
    const askStatus = () => {
        characters.forEach(c => {
            if (!c.is_template) {
                channel.postMessage({ type: 'GET_TOKEN_STATUS', payload: { id: c.id } });
            }
        });
    };

    askStatus();

    // 2. Écouter les réponses et les mises à jour automatiques
    channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'TOKEN_STATUS_RESPONSE') {
            setTokenStatus(prev => ({ ...prev, [payload.id]: payload.isOnMap }));
        } else if (type === 'TOKEN_LIST_UPDATE') {
            // Mise à jour massive (après un fetch du board)
            const newStatus: Record<string, boolean> = {};
            characters.forEach(c => {
                newStatus[c.id] = payload.tokens.includes(c.id);
            });
            setTokenStatus(newStatus);
        }
    };

    // Poll léger au cas où (plus fiable que onData dans des fenêtres détachées)
    const interval = setInterval(askStatus, 5000); 

    return () => {
        clearInterval(interval);
        channel.close();
    };
  }, [sessionId, isMJ, characters]);

  const handleToggleToken = (charId: string) => {
    const channel = new BroadcastChannel(`board_actions_${sessionId}`);
    channel.postMessage({ type: 'TOGGLE_TOKEN', payload: { id: charId } });
    // Optimistic update
    setTokenStatus(prev => ({ ...prev, [charId]: !prev[charId] }));
    channel.close();
  };

  const handleCreateNewTemplate = () => {
    const stats: Record<string, number> = {};
    const statIds = session?.settings?.stats?.map((s: any) => s.id) || DEFAULT_STATS.map(s => s.id);
    statIds.forEach((id: string) => stats[id] = 10); // Neutral default

    setEditingNPC({
      id: '',
      session_id: sessionId,
      name: 'Nouveau Modèle',
      stats,
      skills: {},
      bars: {},
      image_url: '',
      type: undefined,
      is_template: true
    });
    setCreationMode('manual');
    setShowCreateModal(true);
  };

  const handleCreateFromTemplate = (template: Character) => {
    setEditingNPC({
      ...template,
      id: '',
      is_template: false,
      user_id: undefined,
      type: 'PNJ'
    });
    setCreationMode('manual');
    setShowCreateModal(true);
    setShowTemplateSelector(false);
  };

  const handleEditNPC = (npc: Character) => {
    setEditingNPC(npc);
    setCreationMode('manual');
    setShowCreateModal(true);
  };

  const handleSaveNPC = async (data: any) => {
    const updatedNPC: Character = {
      id: editingNPC?.id || crypto.randomUUID(),
      session_id: sessionId,
      name: data.name,
      image_url: data.image_url,
      stats: data.stats,
      skills: data.skills,
      bars: data.bars,
      type: data.type || 'PNJ',
      is_template: data.is_template || false,
      inventory: editingNPC?.inventory || []
    };

    // Persist to DB if in electron
    if (window.electronAPI) {
      await updateSessionCharacter(
        sessionId,
        updatedNPC.id,
        updatedNPC.name,
        updatedNPC.stats,
        updatedNPC.skills,
        updatedNPC.bars,
        updatedNPC.image_url,
        updatedNPC.inventory,
        updatedNPC.custom_skills,
        updatedNPC.type,
        updatedNPC.is_template
      );
    }

    // Update local store
    addOrUpdateCharacter(updatedNPC);
    
    // Broadcast via P2P
    broadcast({ type: 'CHAR_UPDATE', payload: updatedNPC });

    setShowCreateModal(false);
    setEditingNPC(null);
  };

  const handleDeleteNPC = async (npc: Character) => {
    if (!confirm(`Dissoudre définitivement ${npc.name} ?`)) return;

    if (window.electronAPI) {
      await removeSessionCharacter(sessionId, npc.id);
    }
    removeCharacter(sessionId, npc.id);
    broadcast({ type: 'CHAR_DELETE', payload: { id: npc.id } });
  };

  const handlePossess = (charId: string | null) => {
    setPnjControle(sessionId, charId);
  };

  const filteredPNJs = useMemo(() => {
    return characters.filter(c => 
      !c.is_template && 
      (activeTab === 'players' ? c.type === 'Joueur' : (activeTab === 'boss' ? c.type === 'Boss' : (activeTab === 'mobs' ? c.type === 'Monstre' : c.type === 'PNJ'))) &&
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [characters, activeTab, search]);

  const templates = useMemo(() => {
    return characters.filter(c => c.is_template);
  }, [characters]);

  if (!isMJ) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 opacity-40">
        <Ghost size={64} className="mb-6 text-gold-DEFAULT" />
        <h2 className="font-cinzel text-xl uppercase tracking-widest mb-2">Accès Restreint</h2>
        <p className="text-xs font-garamond italic text-center">Seul le Maître de Jeu peut consulter le Bestiaire de l'Archive.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search & Action Bar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-DEFAULT/40 group-focus-within:text-gold-DEFAULT transition-colors" />
          <input 
            type="text" 
            placeholder="RECHERCHER DANS LE BESTIAIRE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-gold-DEFAULT/20 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-all uppercase tracking-widest shadow-inner"
          />
        </div>
        <button 
          onClick={() => setShowTemplateSelector(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all font-cinzel text-[10px] font-black uppercase tracking-widest shadow-lg group"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform" />
          Créer
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-black/20 p-1 rounded-xl border border-white/5 shrink-0 shadow-inner">
        {[
          { id: 'pnj', label: 'PNJ', icon: User },
          { id: 'mobs', label: 'Monstres', icon: Sword },
          { id: 'boss', label: 'Boss', icon: Skull },
          { id: 'players', label: 'Joueurs', icon: Ghost },
          { id: 'models', label: 'Modèles', icon: BookOpen },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-cinzel text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-gold-DEFAULT/20 text-gold-bright shadow-lg border border-gold-DEFAULT/30' : 'text-white/40 hover:text-white/60 hover:bg-white/5'}`}
          >
            <tab.icon size={12} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {activeTab === 'models' ? (
          <div className="grid grid-cols-1 gap-2">
            <button 
                onClick={handleCreateNewTemplate}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-purple-500/20 rounded-2xl hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
            >
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus size={24} className="text-purple-400" />
                </div>
                <span className="font-cinzel text-[10px] font-black uppercase tracking-widest text-purple-400">Nouveau Modèle</span>
            </button>

            {templates.map(template => (
              <div key={template.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-purple-500/10 hover:border-purple-500/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center overflow-hidden">
                    {template.image_url ? (
                      <img src={template.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <BookOpen size={20} className="text-purple-400/40" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-cinzel font-black text-xs uppercase tracking-widest text-purple-300">{template.name}</span>
                    <span className="text-[9px] text-purple-400/60 uppercase font-mono">Modèle Neutre</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditNPC(template)}
                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteNPC(template)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filteredPNJs.map(npc => (
              <div key={npc.id} className="flex flex-col rounded-2xl overflow-hidden border border-white/5 bg-black/40 hover:border-gold-DEFAULT/20 transition-all">
                <div 
                    className="flex items-center justify-between p-3 cursor-pointer group"
                    onClick={() => setSelectedCharId(selectedCharId === npc.id ? null : npc.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-black border border-gold-DEFAULT/20 overflow-hidden shadow-lg group-hover:border-gold-DEFAULT/40 transition-colors">
                        {npc.image_url ? (
                            <img src={npc.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gold-DEFAULT/30 font-cinzel font-black text-lg">?</div>
                        )}
                        </div>
                        {tokenStatus[npc.id] && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0D0D0F] shadow-[0_0_8px_#22c55e]" title="Présent sur la carte" />
                        )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-cinzel font-black text-xs uppercase tracking-widest text-gold-bright/80 group-hover:text-gold-bright transition-colors">{npc.name}</span>
                      <div className="flex items-center gap-2">
                         {npc.type === 'Joueur' && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase font-black tracking-widest border border-blue-500/30">Joueur</span>}
                         <div className="flex gap-2">
                             {Object.entries(npc.bars).filter(([key]) => !key.startsWith('max')).map(([key, val]) => {
                                 const barDef = session?.settings?.bars?.find((b: any) => b.id === key) || DEFAULT_BARS.find((b: any) => b.id === key);
                                 if (!barDef) return null;
                                 return (
                                     <div key={key} className="flex items-center gap-1">
                                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: barDef.color }} />
                                         <span className="text-[9px] font-mono text-white/40">{val}</span>
                                     </div>
                                 );
                             })}
                         </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleToggleToken(npc.id);
                      }}
                      className={`p-2 rounded-lg transition-all ${tokenStatus[npc.id] ? 'bg-gold-DEFAULT text-black' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                      title={tokenStatus[npc.id] ? "Retirer de la carte" : "Placer sur la carte"}
                    >
                      <Plus size={16} className={`transition-transform duration-500 ${tokenStatus[npc.id] ? 'rotate-45' : ''}`} />
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        setCharacterManagement(npc.id);
                      }}
                      className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      title="Configurer l'entité"
                    >
                      <Settings size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setPnjControle(sessionId, controlledCharacterId === npc.id ? null : npc.id); }}
                      className={`p-2 rounded-lg transition-all ${controlledCharacterId === npc.id ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-white/5 text-white/40 hover:bg-purple-500/20 hover:text-purple-400'}`}
                      title={controlledCharacterId === npc.id ? "Libérer l'entité" : "Prendre possession"}
                    >
                      <Zap size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteNPC(npc); }}
                      className="p-2 rounded-lg bg-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/20 transition-colors"
                      title="Bannir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedCharId === npc.id && (
                    <div className="border-t border-white/5 bg-black/60 p-4 animate-in slide-in-from-top-2 duration-300">
                        <CharacterSheetContent sessionId={sessionId} forceCharacterId={npc.id} />
                    </div>
                )}
              </div>
            ))}

            {filteredPNJs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 bg-black/20 rounded-2xl border border-dashed border-white/5">
                <Search size={48} className="mb-4 text-gold-DEFAULT" />
                <span className="font-cinzel text-[10px] uppercase tracking-widest">AUCUNE ENTITÉ TROUVÉE</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Selector Overlay */}
      {showTemplateSelector && (
        <div className="absolute inset-0 z-50 bg-[#0D0D0F]/95 backdrop-blur-md flex flex-col p-6 animate-in fade-in duration-300 border border-gold-DEFAULT/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <h3 className="text-gold-bright font-cinzel font-black uppercase tracking-widest text-sm">Créer une Entité</h3>
              <p className="text-[9px] text-gold-DEFAULT/40 uppercase tracking-wider font-mono">Choisissez un modèle ou commencez de zéro</p>
            </div>
            <button onClick={() => setShowTemplateSelector(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => {
                setEditingNPC({
                  id: '',
                  session_id: sessionId,
                  name: 'Nouvelle Entité',
                  stats: {},
                  skills: {},
                  bars: {},
                  image_url: '',
                  type: 'PNJ'
                });
                setCreationMode('manual');
                setShowCreateModal(true);
                setShowTemplateSelector(false);
              }}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 rounded-2xl hover:bg-gold-DEFAULT/10 hover:border-gold-DEFAULT/40 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-gold-DEFAULT/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={32} className="text-gold-bright" />
              </div>
              <div className="text-center">
                <span className="block font-cinzel font-black text-xs uppercase tracking-[0.2em] text-gold-bright">Page Blanche</span>
                <span className="text-[8px] text-gold-DEFAULT/40 uppercase font-mono mt-1 block">Création manuelle complète</span>
              </div>
            </button>

            {templates.map(t => (
              <button 
                key={t.id}
                onClick={() => handleCreateFromTemplate(t)}
                className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-purple-500/30 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center overflow-hidden shrink-0">
                  {t.image_url ? (
                    <img src={t.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <BookOpen size={20} className="text-purple-400/40" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-cinzel font-black text-[10px] uppercase tracking-widest text-purple-300 truncate">{t.name}</span>
                  <span className="text-[8px] text-purple-400/40 uppercase font-mono mt-0.5">Utiliser ce modèle</span>
                </div>
                <ChevronRight size={16} className="ml-auto text-purple-500/40 group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="mt-12 text-center py-8 opacity-20">
                <p className="font-cinzel text-[10px] tracking-widest uppercase">AUCUN MODÈLE DISPONIBLE</p>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateCharacterModal 
          onClose={() => { setShowCreateModal(false); setEditingNPC(null); }}
          onSave={handleSaveNPC}
          initialName={editingNPC?.name}
          initialImageUrl={editingNPC?.image_url}
          initialStats={editingNPC?.stats}
          initialType={editingNPC?.type}
          initialIsTemplate={editingNPC?.is_template}
          initialMode={creationMode}
          title={editingNPC ? (editingNPC.is_template ? "Façonner le Modèle" : "Façonner l'Entité") : (activeTab === 'models' ? "Éveiller un Nouveau Modèle" : "Éveiller une Entité")}
          settings={session?.settings}
        />
      )}
    </div>
  );
}