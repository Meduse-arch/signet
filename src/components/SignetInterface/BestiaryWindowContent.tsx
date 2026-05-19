import { useState, useMemo, useEffect } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { usePeer } from '../../hooks/usePeer';
import { Ghost, User, Plus, Search, Trash2, Shield, Heart, Zap, Settings, Sword, Skull, BookOpen, X } from 'lucide-react';
import { addSessionCharacter, updateSessionCharacter, removeSessionCharacter, Character } from '../../services/characters.service';
import { CreateCharacterModal } from '../CreateCharacterModal';

interface BestiaryWindowContentProps {
  sessionId: string;
}

export function BestiaryWindowContent({ sessionId }: BestiaryWindowContentProps) {
  const { characters, controlledCharacterId, setPnjControle, removeCharacter, addOrUpdateCharacter } = useCharactersStore();
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= SecurityLevel.MJ;
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast } = usePeer();
  
  const [activeTab, setActiveTab] = useState<'pnj' | 'mobs' | 'boss' | 'templates'>('pnj');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingNPC, setEditingNPC] = useState<Character | null>(null);
  const [creationMode, setCreationMode] = useState<'manual' | 'roll'>('roll');
  const [tokenStatus, setTokenStatus] = useState<Record<string, boolean>>({});

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
    const statIds = session?.settings?.stats?.map((s: any) => s.id) || ['FOR', 'AGI', 'INT', 'CHA', 'PER'];
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

  const handleCreateNewInstance = () => {
    const stats: Record<string, number> = {};
    const statIds = session?.settings?.stats?.map((s: any) => s.id) || ['FOR', 'AGI', 'INT', 'CHA', 'PER'];
    statIds.forEach((id: string) => stats[id] = activeTab === 'mobs' ? 12 : activeTab === 'boss' ? 18 : 10);

    setEditingNPC({
      id: '',
      session_id: sessionId,
      name: activeTab === 'mobs' ? 'Nouveau Monstre' : activeTab === 'boss' ? 'Nouveau Boss' : 'Nouveau PNJ',
      stats,
      skills: {},
      bars: {},
      image_url: '',
      type: activeTab === 'mobs' ? 'Monstre' : activeTab === 'boss' ? 'Boss' : 'PNJ',
      is_template: false
    });
    setCreationMode('manual');
    setShowCreateModal(true);
  };

  const handleInstantiateFromTemplate = (template: Character) => {
    setEditingNPC({
      ...template,
      id: '',
      is_template: false,
      type: activeTab === 'mobs' ? 'Monstre' : activeTab === 'boss' ? 'Boss' : 'PNJ'
    });
    setCreationMode('manual');
    setShowTemplateSelector(false);
    setShowCreateModal(true);
  };

  const handleSaveNPC = async (data: any) => {
    const qty = data.quantity || 1;
    for(let i = 0; i < qty; i++) {
      const npc: Character = {
        id: (qty === 1 && editingNPC?.id) ? editingNPC.id : crypto.randomUUID(),
        session_id: sessionId,
        name: qty > 1 ? `${data.name} ${i + 1}` : data.name,
        image_url: data.image_url,
        stats: data.stats,
        skills: data.skills,
        bars: data.bars,
        type: data.type || (data.is_template ? undefined : 'PNJ'),
        is_template: data.is_template || false
      };

      if (window.electronAPI) {
        if (qty === 1 && editingNPC?.id) {
          await updateSessionCharacter(npc.id, npc.name, npc.stats, npc.skills, npc.bars, npc.image_url, npc.inventory, npc.custom_skills, npc.type, npc.is_template);
        } else {
          await addSessionCharacter(npc);
        }
      }

      addOrUpdateCharacter(npc);
      broadcast({ type: 'CHAR_UPDATE', payload: npc });
    }
    
    setShowCreateModal(false);
    setEditingNPC(null);
  };

  const handleDelete = async (id: string) => {
    if (window.electronAPI) {
      await removeSessionCharacter(id);
    }
    removeCharacter(id);
    broadcast({ type: 'CHAR_DELETE', payload: { id } });
  };

  const templates = useMemo(() => characters.filter(c => c.is_template), [characters]);

  const filteredCharacters = useMemo(() => {
    return characters.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Filter by user_id to exclude player characters from Bestiary
      if (c.user_id && c.type === 'Joueur') return false;

      if (activeTab === 'templates') return c.is_template;
      if (c.is_template) return false;

      if (activeTab === 'pnj') return c.type === 'PNJ' || (!c.type && !c.is_template);
      if (activeTab === 'mobs') return c.type === 'Monstre';
      if (activeTab === 'boss') return c.type === 'Boss';

      return true;
    });
  }, [characters, search, activeTab]);

  return (
    <div className="flex flex-col gap-6 p-1 h-full relative">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-black/40 border border-gold-DEFAULT/20 rounded-xl shrink-0 overflow-x-auto custom-scrollbar">
        {(['pnj', 'mobs', 'boss', 'templates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap py-2 px-3 rounded-lg text-[9px] font-cinzel font-black tracking-widest uppercase transition-all ${
              activeTab === tab 
                ? 'bg-gold-DEFAULT text-black shadow-lg' 
                : 'text-gold-DEFAULT/40 hover:text-gold-DEFAULT hover:bg-white/5'
            }`}
          >
            {tab === 'pnj' ? 'PNJ' : tab === 'mobs' ? 'MONSTRES' : tab === 'boss' ? 'BOSS' : 'BESTIAIRE'}
          </button>
        ))}
      </div>

      {/* Templates & Add */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-DEFAULT/40" />
            <input 
              type="text" 
              placeholder={activeTab === 'templates' ? "RECHERCHER MODÈLE..." : "RECHERCHER ENTITÉ..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-gold-DEFAULT/20 rounded-xl py-2 pl-9 pr-4 text-[10px] font-cinzel text-gold-bright placeholder:text-gold-DEFAULT/20 focus:outline-none focus:border-gold-DEFAULT/50 transition-all"
            />
          </div>
        </div>

        {activeTab === 'templates' ? (
          <button 
            onClick={handleCreateNewTemplate}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all shadow-[0_0_15px_rgba(212,175,55,0.1)] group"
          >
            <Plus size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-cinzel font-black tracking-widest uppercase">Créer</span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowTemplateSelector(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all group"
            >
              <BookOpen size={14} className="group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-cinzel font-black tracking-widest uppercase">Depuis un modèle</span>
            </button>
            <button 
              onClick={handleCreateNewInstance}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 text-gold-bright hover:bg-gold-DEFAULT/20 transition-all group"
            >
              <Plus size={14} className="group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-cinzel font-black tracking-widest uppercase">Créer</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 snap-y snap-mandatory">
        {filteredCharacters.map((npc) => (
          <div 
            key={npc.id}
            className={`snap-start relative group bg-[#0D0D0F]/60 border border-gold-DEFAULT/10 rounded-2xl p-4 hover:border-gold-DEFAULT/30 transition-all ${controlledCharacterId === npc.id ? 'ring-2 ring-gold-bright border-gold-bright' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-xl bg-black/40 border border-gold-DEFAULT/20 flex items-center justify-center overflow-hidden shrink-0">
                {npc.image_url ? (
                  <img src={npc.image_url} alt={npc.name} className="w-full h-full object-cover" />
                ) : (
                  <Ghost className="w-6 h-6 text-gold-DEFAULT/20" />
                )}
                {controlledCharacterId === npc.id && (
                  <div className="absolute inset-0 bg-gold-bright/20 animate-pulse" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-[11px] font-cinzel font-black text-gold-bright uppercase tracking-widest truncate" title={npc.name}>{npc.name}</h4>
                  <span className={`text-[7px] px-1.5 py-0.5 rounded border font-cinzel font-black uppercase tracking-tighter shrink-0 ${
                    npc.is_template ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' :
                    npc.type === 'Boss' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                    npc.type === 'Monstre' ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
                    'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  }`}>
                    {npc.is_template ? 'Modèle' : (npc.type || 'PNJ')}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 overflow-hidden">
                  {session?.settings?.bars?.map((bar: any) => (
                    <div key={bar.id} className="flex items-center gap-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor] shrink-0" style={{ backgroundColor: bar.color, color: bar.color }} />
                      <span className="text-[9px] font-mono text-white/40 truncate" title={`${npc.bars[bar.id] || 0}`}>{npc.bars[bar.id] || 0}</span>
                    </div>
                  )) || (
                    <div className="flex items-center gap-3 min-w-0">
                       <div className="flex items-center gap-1.5 min-w-0">
                        <Heart className="w-2.5 h-2.5 text-red-500 shrink-0" />
                        <span className="text-[9px] font-mono text-white/40 truncate" title={`${npc.bars.hp || 0}`}>{npc.bars.hp || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Zap className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                        <span className="text-[9px] font-mono text-white/40 truncate" title={`${npc.bars.mana || 0}`}>{npc.bars.mana || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isMJ && !npc.is_template && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleToken(npc.id); }}
                    className={`p-2 rounded-lg transition-all flex items-center justify-center ${
                        tokenStatus[npc.id]
                          ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                          : 'bg-white/5 text-white/20 hover:bg-white/10 hover:text-white/40'
                      }`}
                    title={tokenStatus[npc.id] ? "Bannir la figurine du plateau" : "Invoquer sur le plateau"}
                  >
                    <Plus size={14} className={`transition-transform duration-500 ${tokenStatus[npc.id] ? 'rotate-45' : ''}`} />
                  </button>
                )}
                {!npc.is_template && (
                  <button 
                    onClick={() => setPnjControle(controlledCharacterId === npc.id ? null : npc.id)}
                    className={`p-2 rounded-lg transition-colors ${controlledCharacterId === npc.id ? 'bg-gold-bright text-black' : 'bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20'}`}
                    title={controlledCharacterId === npc.id ? "Libérer l'entité" : "Prendre possession"}
                  >
                    <User size={14} />
                  </button>
                )}
                
                <button 
                  onClick={() => { 
                    setEditingNPC(npc); 
                    setCreationMode('manual');
                    setShowCreateModal(true); 
                  }}
                  className="p-2 rounded-lg bg-gold-DEFAULT/10 text-gold-bright hover:bg-gold-DEFAULT/20 transition-colors"
                  title="Configurer"
                >
                  <Settings size={14} />
                </button>

                <button 
                  onClick={() => handleDelete(npc.id)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCharacters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Ghost className="w-12 h-12 text-gold-DEFAULT mb-4" />
            <p className="text-[10px] font-cinzel italic tracking-widest">
              {activeTab === 'templates' ? "Aucun modèle dans les archives..." : "Aucune entité n'a été éveillée..."}
            </p>
          </div>
        )}
      </div>

      {showTemplateSelector && (
        <div className="absolute inset-0 z-50 bg-[#0D0D0F]/95 backdrop-blur-md flex flex-col p-4 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gold-DEFAULT/20">
            <h3 className="font-cinzel font-black text-gold-bright tracking-widest uppercase text-sm">
              Invoquer depuis un modèle
            </h3>
            <button 
              onClick={() => setShowTemplateSelector(false)}
              className="p-1 hover:bg-white/10 rounded-lg text-gold-DEFAULT/60 hover:text-gold-bright transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-2 custom-scrollbar">
            {templates.map(t => (
              <button 
                key={t.id} 
                onClick={() => handleInstantiateFromTemplate(t)}
                className="flex items-center gap-3 p-3 bg-white/[0.02] border border-gold-DEFAULT/10 rounded-xl text-left hover:bg-gold-DEFAULT/10 hover:border-gold-DEFAULT/30 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-black/40 border border-gold-DEFAULT/20 flex items-center justify-center shrink-0">
                  {t.image_url ? (
                    <img src={t.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <BookOpen size={14} className="text-gold-DEFAULT/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-cinzel font-black text-[11px] text-gold-bright block truncate">{t.name}</span>
                  <div className="flex gap-2 text-[8px] font-mono text-white/40 mt-1">
                    <span>HP {t.bars.hp || 0}</span>
                    <span>MP {t.bars.mana || 0}</span>
                  </div>
                </div>
                <Plus size={14} className="text-gold-DEFAULT/40 group-hover:text-gold-bright transition-colors" />
              </button>
            ))}
            {templates.length === 0 && (
              <div className="text-center py-10 opacity-40">
                <BookOpen className="w-8 h-8 mx-auto mb-2" />
                <p className="font-cinzel text-[10px]">Aucun modèle disponible</p>
              </div>
            )}
          </div>
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
          title={editingNPC ? (editingNPC.is_template ? "Façonner le Modèle" : "Façonner l'Entité") : (activeTab === 'templates' ? "Éveiller un Nouveau Modèle" : "Éveiller une Entité")}
          settings={session?.settings}
        />
      )}
    </div>
  );
}
