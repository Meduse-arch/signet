import { useState, useMemo, useEffect } from 'react';
import { Shield, Zap, Heart, Plus, Activity, Layout, Ghost } from 'lucide-react';
import { useCharactersStore } from '../../store/characters';
import { usePeersStore } from '../../store/peers';
import { useSessionStore } from '../../store/session';
import { usePeer } from '../../hooks/usePeer';
import { CreateCharacterModal } from '../CreateCharacterModal';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { addSessionCharacter, Character } from '../../services/characters.service';
import { DEFAULT_BARS } from '../../systems/seal/constants';
import { useSignetStore } from '../../store/signet';
import { useMapStore } from '../../store/map';
import { AssetImage } from '../AssetImage';

interface CharacterHUDProps {
  sessionId: string;
}

export function CharacterHUD({ sessionId }: CharacterHUDProps) {
  const user = useAuthStore(state => state.user);
  const peerId = usePeersStore(state => state.peerId);
  const { characters, controlledCharacterId } = useCharactersStore();
  const addOrUpdateCharacter = useCharactersStore(state => state.addOrUpdateCharacter);
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  const { broadcast, onData } = usePeer();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const tokenStatuses = useMapStore(state => state.tokenStatuses);
  const setStoreTokenStatus = useMapStore(state => state.setTokenStatus);

  const openWindow = useSignetStore(state => state.openWindow);
  const isMJ = !!user && user.role >= SecurityLevel.MJ;

// Trouver le personnage de l'utilisateur actuel OU celui qu'il contrôle (PNJ)
const myCharacter = useMemo(() => {
  if (controlledCharacterId) {
    return characters.find(c => c.id === controlledCharacterId);
  }
  // Si c'est un MJ, il n'a pas de perso par défaut (sauf s'il s'en crée un explicitement avec son user_id)
  return characters.find(c => c.user_id === user?.id);
}, [characters, controlledCharacterId, user?.id]);

  const tokenStatus = useMemo(() => {
    return myCharacter ? !!tokenStatuses[myCharacter.id] : false;
  }, [myCharacter, tokenStatuses]);

  // Sync token status via network and store
  useEffect(() => {
    // Écouter les changements de tokens pour tout le monde
    const unsub = onData((data: any) => {
        if (data.type === 'TOKEN_ADD') {
            setStoreTokenStatus(data.payload.id, true);
        }
        if (data.type === 'TOKEN_REMOVE') {
            setStoreTokenStatus(data.payload.id, false);
        }
        if (data.type === 'INITIAL_SYNC_REPLY') {
            // ... handle initial token list if needed
        }
    });

    return () => unsub();
  }, [onData, setStoreTokenStatus]);

  const handleToggleToken = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!myCharacter) return;
    
    // Si on retire, on peut le faire optimiste. Si on ajoute, on demande au MJ.
    const isCurrentlyOnMap = !!tokenStatuses[myCharacter.id];

    if (isMJ) {
        const channel = new BroadcastChannel(`board_actions_${sessionId}`);
        channel.postMessage({ type: 'TOGGLE_TOKEN', payload: { id: myCharacter.id } });
        channel.close();
        setStoreTokenStatus(myCharacter.id, !isCurrentlyOnMap);
    } else {
        broadcast({ type: 'TOGGLE_TOKEN_REQUEST', payload: { id: myCharacter.id } });
        // Pour les joueurs, on attend le retour du MJ (BoardCanvas)
    }
  };

  const handleCreateSave = async (data: { 
    name: string; 
    image_url?: string;
    stats: Record<string, number>; 
    skills: Record<string, number>;
    bars: Record<string, number>;
    type?: 'Joueur' | 'PNJ' | 'Monstre' | 'Boss';
  }) => {
    const newChar: Character = {
      id: myCharacter?.id || crypto.randomUUID(),
      session_id: sessionId,
      user_id: user?.id,
      name: data.name,
      image_url: data.image_url,
      stats: data.stats,
      skills: data.skills,
      bars: data.bars,
      type: data.type
    };

    // Persistence locale (si Electron et MJ)
    if (window.electronAPI) {
      await addSessionCharacter(newChar);
    }

    // Mise à jour store local
    addOrUpdateCharacter(newChar);
    
    // Broadcast via P2P (sera reçu par le MJ ou les autres joueurs via SealEngine)
    broadcast({ type: 'CHAR_UPDATE', payload: newChar });
    
    // La synchro locale est gérée par le store Zustand
    
    setIsModalOpen(false);
  };

if (!myCharacter) {
  if (user?.role && user.role >= SecurityLevel.MJ) {
     if (!controlledCharacterId) return null;
     return (
       <div className="fixed bottom-10 left-10 flex items-center gap-4 animate-in slide-in-from-left duration-700 pointer-events-auto">
         <div 
           className="relative group/avatar cursor-pointer"
           onClick={(e) => {
             if (controlledCharacterId) {
                const rect = e.currentTarget.getBoundingClientRect();
                openWindow('character', { x: rect.right + 20, y: Math.max(20, rect.top - 350) });
             } else {
                openWindow('bestiary');
             }
           }}
           title={controlledCharacterId ? "Ouvrir la fiche de l'entité possédée" : "Ouvrir le Bestiaire"}
         >
           <div className="absolute inset-[-6px] rounded-full border border-gold-DEFAULT/30 bg-[#0D0D0F]/80 backdrop-blur-xl group-hover/avatar:border-gold-DEFAULT/60 shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-500 ease-linear" />
           <div className="relative w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-gold-DEFAULT/40 flex items-center justify-center shadow-[inset_0_0_15px_rgba(212,175,55,0.2)] overflow-hidden">
             {controlledCharacterId ? (
               characters.find(c => c.id === controlledCharacterId)?.image_url ? (
                 <AssetImage src={characters.find(c => c.id === controlledCharacterId)?.image_url} alt="" className="w-full h-full object-cover" />
               ) : (
                 <Ghost className="w-8 h-8 text-gold-DEFAULT/60 animate-pulse" />
               )
             ) : (
               <Shield className="w-8 h-8 text-gold-DEFAULT/40" />
             )}
           </div>
           
           {/* Token Toggle Button for controlled character */}
           {controlledCharacterId && (
                <button 
                    onClick={handleToggleToken}
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0D0D0F] shadow-sm transition-colors z-20 ${
                        tokenStatus
                        ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' 
                        : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                    }`}
                    title={tokenStatus ? "Retirer de la carte" : "Placer sur la carte"}
                />
            )}

           <div className="absolute -top-1 -right-1 bg-gold-DEFAULT text-black text-xs font-cinzel font-black px-1.5 py-0.5 rounded shadow-lg">MJ</div>
         </div>
       </div>
     );
  }

  // Si c'est un joueur sans personnage
  return (
    <>
      <div className="absolute bottom-10 left-10 z-[60] pointer-events-auto">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/40 hover:border-gold-DEFAULT/80 hover:bg-[#0D0D0F]/90 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
        >
          <div className="w-8 h-8 rounded-full bg-gold-DEFAULT/10 border border-gold-DEFAULT/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4 text-gold-DEFAULT drop-shadow-md group-hover:text-gold-bright" />
          </div>
          <span className="text-gold-DEFAULT drop-shadow-md group-hover:text-gold-bright text-xs font-cinzel font-black tracking-widest uppercase transition-colors">
            Créer Personnage
          </span>
        </button>
      </div>
      {isModalOpen && (
        <CreateCharacterModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleCreateSave} 
          settings={session?.settings}
        />
      )}
    </>
  );
}

  const { name, image_url } = myCharacter;

  return (
    <div className="absolute bottom-10 left-10 z-[60] pointer-events-auto group">
      {/* Avatar / Profile */}
      <div 
        className="relative group/avatar cursor-pointer" 
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          openWindow('character', { x: rect.right + 20, y: Math.max(20, rect.top - 350) });
        }}
        title="Ouvrir la fiche de personnage"
      >
        <div className="absolute inset-[-6px] rounded-full border border-gold-DEFAULT/30 bg-[#0D0D0F]/80 backdrop-blur-xl group-hover/avatar:border-gold-DEFAULT/60 shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-500 ease-linear" />
        <div className="relative w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-gold-DEFAULT/40 flex items-center justify-center shadow-[inset_0_0_15px_rgba(212,175,55,0.2)] overflow-hidden">
          {image_url ? (
            <AssetImage src={image_url} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-cinzel text-gold-bright drop-shadow-md">{name.substring(0, 1).toUpperCase()}</span>
          )}
        </div>

        {/* Token Toggle Button */}
        <button 
            onClick={handleToggleToken}
            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0D0D0F] shadow-lg transition-all z-20 flex items-center justify-center ${
                tokenStatus
                ? 'bg-gold-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                : 'bg-black/80 text-gold-DEFAULT border-gold-DEFAULT/40 hover:border-gold-DEFAULT'
            }`}
            title={tokenStatus ? "Retirer de la carte" : "Placer sur la carte"}
        >
            <Plus size={12} className={`transition-transform duration-500 ${tokenStatus ? 'rotate-45' : ''}`} />
        </button>
        
        {/* Open Sheet Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/avatar:opacity-100 rounded-full transition-opacity">
          <Layout className="w-5 h-5 text-gold-bright" />
        </div>
      </div>
    </div>
  );
}
