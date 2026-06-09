import { usePeersStore } from '../../store/peers';
import { useAuthStore, SecurityLevel } from '../../store/auth';
import { useCharactersStore } from '../../store/characters';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { AssetImage } from '../AssetImage';

interface Player {
 peer_id: string;
 pseudo: string;
 role?: number;
}

interface PlayerHUDProps {
 players: Player[];
 className?: string;
 sessionId: string;
}

export function PlayerHUD({ players, className, sessionId }: PlayerHUDProps) {
 const peerId = usePeersStore(state => state.peerId);
 const isHost = usePeersStore(state => state.isHost);
 const user = useAuthStore(state => state.user);
 const characters = useCharactersStore(state => state.characters);
 const [tokenStatus, setTokenStatus] = useState<Record<string, boolean>>({});

 const isMJ = user && user.role >= SecurityLevel.MJ;

 // Sync token status
 useEffect(() => {
 if (!isMJ) return;
 const channel = new BroadcastChannel(`board_actions_${sessionId}`);
 
 const askStatus = () => {
 characters.forEach(c => {
 if (!c.is_template) {
 channel.postMessage({ type: 'GET_TOKEN_STATUS', payload: { id: c.id } });
 }
 });
 };

 askStatus();

 channel.onmessage = (event) => {
 const { type, payload } = event.data;
 if (type === 'TOKEN_STATUS_RESPONSE') {
 setTokenStatus(prev => ({ ...prev, [payload.id]: payload.isOnMap }));
 } else if (type === 'TOKEN_LIST_UPDATE') {
 const newStatus: Record<string, boolean> = {};
 characters.forEach(c => {
 newStatus[c.id] = payload.tokens.includes(c.id);
 });
 setTokenStatus(newStatus);
 }
 };

 const interval = setInterval(askStatus, 5000);
 return () => {
 clearInterval(interval);
 channel.close();
 };
 }, [sessionId, isMJ, characters]);

 const handleToggleToken = (charId: string) => {
 const channel = new BroadcastChannel(`board_actions_${sessionId}`);
 channel.postMessage({ type: 'TOGGLE_TOKEN', payload: { id: charId } });
 setTokenStatus(prev => ({ ...prev, [charId]: !prev[charId] }));
 channel.close();
 };

 // On filtre les autres joueurs (ceux qui ne sont pas nous)
 const otherPlayers = players.filter(p => p.peer_id !== peerId);
 const selfChar = characters.find(c => c.user_id === user?.id);

 return (
 <div className={className || "absolute top-8 left-8 flex flex-col gap-4 z-10 pointer-events-none"}>
 {/* Self (Moi) */}
 <div className="flex items-center gap-4 pointer-events-auto group">
 <div className="relative">
 {/* Anneau rotatif façon Jarvis/HUD */}
 <div className="absolute inset-[-4px] rounded-full border border-silver-DEFAULT/40 group-hover:border-silver-DEFAULT/50 group-hover:rotate-180 transition-all duration-1000 ease-linear" />
 
 <div className="w-12 h-12 rounded-full bg-[#0D0D0F]/80 backdrop-blur-xl border border-silver-DEFAULT/40 flex items-center justify-center text-glacier-bright text-lg font-quantico font-black shadow-[0_0_20px_rgba(212,175,55,0.15)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all overflow-hidden">
 {selfChar?.image_url ? (
 <AssetImage src={selfChar.image_url} alt="" className="w-full h-full object-cover" />
 ) : (
 user?.pseudo.substring(0, 1).toUpperCase() || 'M'
 )}
 </div>

 {/* MJ Toggle Button on Self (Top Right) */}
 {isMJ && selfChar && (
 <button 
 onClick={() => handleToggleToken(selfChar.id)}
 className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0D0D0F] shadow-lg transition-all z-20 flex items-center justify-center ${
 tokenStatus[selfChar.id]
 ? 'bg-glacier-DEFAULT text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
 : 'bg-black/80 text-silver-bright border-silver-DEFAULT/40 hover:border-silver-DEFAULT'
 }`}
 title={tokenStatus[selfChar.id] ? "Retirer votre figurine du plateau" : "Placer votre figurine sur la carte"}
 >
 <Plus size={10} className={`transition-transform duration-500 ${tokenStatus[selfChar.id] ? 'rotate-45' : ''}`} />
 </button>
 )}

 {/* Online indicator (Bottom Right) - Restored */}
 <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0D0D0F] flex items-center justify-center border border-silver-DEFAULT/40 z-10">
 <div className="w-2 h-2 rounded-full bg-[#8ab040] shadow-[0_0_8px_#8ab040] animate-pulse" />
 </div>
 </div>
 <div className="flex flex-col opacity-90 group-hover:opacity-100 transition-opacity">
 <div className="flex items-center gap-2">
 <span className="text-sm text-silver-bright font-quantico tracking-widest uppercase drop-shadow-md">{user?.pseudo}</span>
 {isHost && (
 <span className="text-[11px] bg-glacier-DEFAULT text-black px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest shadow-[0_0_10px_rgba(212,175,55,0.4)]">MJ</span>
 )}
 </div>
 <div className="flex items-center gap-2 mt-0.5">
 <div className="h-[1px] w-8 bg-glacier-DEFAULT/50" />
 <span className="text-xs text-white/70 font-sans tracking-widest drop-shadow-md">
 ID: {peerId?.split('-').slice(-1)[0] || 'INIT'} • SEC: {user?.role ?? 0}
 </span>
 </div>
 </div>
 </div>

 {/* Ligne séparatrice optionnelle si d'autres joueurs retirée */}
 {/* Autres joueurs retirés pour laisser place à la Boîte à Outils */}
 </div>
 );
}
