import React, { useState, useEffect, useCallback } from 'react';
import { SignetLogo } from '../ui/SignetLogo';
import { 
 Image as ImageIcon, 
 ScrollText, 
 Dices, 
 Package,
 Users,
 List,
 X,
 Sparkles,
 Ghost,
 Plus,
 BookOpen
} from 'lucide-react';

import { SecurityLevel, useAuthStore } from '../../store/auth';
import { useCharactersStore } from '../../store/characters';

interface SignetLauncherProps {
 onOpenWindow: (type: 'scenes' | 'quests' | 'dice' | 'inventaire' | 'players' | 'bestiary' | 'skills' | 'logs') => void;
 securityLevel?: SecurityLevel;
 sessionId: string;
}

export function SignetLauncher({ onOpenWindow, securityLevel = SecurityLevel.PLAYER, sessionId }: SignetLauncherProps) {
 const [isOpen, setIsOpen] = useState(false);
 const { user } = useAuthStore();
 const characters = useCharactersStore(state => state.characters);
 const [tokenStatus, setTokenStatus] = useState(false);
 
 const isMJ = securityLevel >= SecurityLevel.MJ;
 const selfChar = characters.find(c => c.user_id === user?.id);

 // Sync token status
 useEffect(() => {
 if (!isMJ || !selfChar) return;
 const channel = new BroadcastChannel(`board_actions_${sessionId}`);
 
 const askStatus = () => {
 channel.postMessage({ type: 'GET_TOKEN_STATUS', payload: { id: selfChar.id } });
 };

 askStatus();

 channel.onmessage = (event) => {
 const { type, payload } = event.data;
 if (type === 'TOKEN_STATUS_RESPONSE' && payload.id === selfChar.id) {
 setTokenStatus(payload.isOnMap);
 } else if (type === 'TOKEN_LIST_UPDATE') {
 setTokenStatus(payload.tokens.includes(selfChar.id));
 }
 };

 const interval = setInterval(askStatus, 5000);
 return () => {
 clearInterval(interval);
 channel.close();
 };
 }, [sessionId, isMJ, selfChar]);

 const handleToggleToken = () => {
 if (!selfChar) return;
 const channel = new BroadcastChannel(`board_actions_${sessionId}`);
 channel.postMessage({ type: 'TOGGLE_TOKEN', payload: { id: selfChar.id } });
 setTokenStatus(!tokenStatus);
 channel.close();
 };

 const menuItems = [
 { type: 'scenes' as const, icon: <ImageIcon size={18} />, label: 'Scènes', minSecurity: SecurityLevel.PLAYER },
 { type: 'players' as const, icon: <List size={18} />, label: 'Liste', minSecurity: SecurityLevel.PLAYER },
 { type: 'quests' as const, icon: <ScrollText size={18} />, label: 'Quêtes', minSecurity: SecurityLevel.PLAYER },
 { type: 'inventaire' as const, icon: <Package size={18} />, label: 'Inventaire', minSecurity: SecurityLevel.PLAYER },
 { type: 'skills' as const, icon: <Sparkles size={18} />, label: 'Compétences', minSecurity: SecurityLevel.PLAYER },
 { type: 'dice' as const, icon: <Dices size={18} />, label: 'Dés', minSecurity: SecurityLevel.PLAYER },
 { type: 'bestiary' as const, icon: <Ghost size={18} />, label: 'Bestiaire', minSecurity: SecurityLevel.MJ },
 { type: 'logs' as const, icon: <BookOpen size={18} />, label: 'Annales', minSecurity: SecurityLevel.MJ },
 ].filter(item => securityLevel >= item.minSecurity);

 // Calcul pour une disposition en quart de cercle (arc) étendu
 // On ajuste dynamiquement le rayon et l'angle en fonction du nombre de boutons
 const maxAngle = 120; // On s'étale sur 120° maximum pour ne pas trop s'éloigner du centre
 const baseAngle = 90;
 const angleSpread = Math.min(maxAngle, baseAngle + Math.max(0, menuItems.length - 4) * 10);
 const startAngle = 180 - (angleSpread - baseAngle) / 2;
 
 const MIN_ARC_SPACING = 42; // Espacement minimal sur l'arc (taille du bouton + marge plus faible)
 const requiredArcLength = Math.max(0, menuItems.length - 1) * MIN_ARC_SPACING;
 const radius = Math.max(90, requiredArcLength / (angleSpread * Math.PI / 180));

 return (
 <div className="fixed bottom-10 right-10 z-[100] flex items-center justify-center">
 {/* MJ Token Toggle (External to menu) */}
 {isMJ && selfChar && (
 <button
 onClick={handleToggleToken}
 className={`absolute -top-4 -left-4 w-6 h-6 rounded-full border-2 border-[#0D0D0F] shadow-lg transition-all z-20 hover:scale-110 flex items-center justify-center ${
 tokenStatus
 ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' 
 : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'
 }`}
 title={tokenStatus ? "Retirer votre figurine du plateau" : "Placer votre figurine sur le plateau"}
 >
 <Plus size={12} className={`text-white transition-transform ${tokenStatus ? 'rotate-45' : ''}`} />
 </button>
 )}

 {/* Menu items (Radial/Arc) */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
 {menuItems.map((item, index) => {
 // Angle calculé dynamiquement pour s'étaler si nécessaire
 const angle = startAngle + (angleSpread / Math.max(1, menuItems.length - 1)) * index;
 const radian = (angle * Math.PI) / 180;
 const tx = Math.cos(radian) * radius;
 const ty = Math.sin(radian) * radius;

 return (
 <button
 key={item.type}
 onClick={() => {
 onOpenWindow(item.type);
 setIsOpen(false);
 }}
 style={{
 transform: isOpen ? `translate(${tx}px, ${ty}px) scale(1)` : `translate(0px, 0px) scale(0)`,
 opacity: isOpen ? 1 : 0,
 transitionDelay: `${index * 40}ms`,
 }}
 className={`absolute top-0 left-0 -ml-5 -mt-5 flex items-center justify-center w-10 h-10 rounded-full bg-[#0D0D0F]/80 backdrop-blur-xl border border-silver-DEFAULT/40 text-silver-bright hover:text-glacier-bright hover:bg-[#0D0D0F]/90 hover:border-glacier-bright hover:shadow-[0_0_20px_rgba(79,164,184,0.4)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'pointer-events-auto' : ''}`}
 >
 {item.icon}
 {/* Tooltip Alchemy-style */}
 <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-black/90 backdrop-blur-md border border-silver-DEFAULT/30 text-[11px] font-quantico text-glacier-bright drop-shadow-md whitespace-nowrap tracking-widest pointer-events-none">
 {item.label}
 </div>
 </button>
 );
 })}
 </div>

 {/* Main Button - Just the logo */}
 <button
 onClick={() => setIsOpen(!isOpen)}
 className="relative w-[55px] h-16 flex items-center justify-center z-10 group outline-none"
 >
 {/* Fond du bouton (Hexagone Suspendu) */}
 <div className="absolute inset-0 transition-all duration-500 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_0_15px_rgba(79,164,184,0.4)]">
 {/* Liseré extérieur (Bordure) */}
 <div className="absolute inset-0 bg-silver/30 group-hover:bg-glacier/80 transition-colors duration-500 [clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]" />
 {/* Cœur en verre fumé */}
 <div className="absolute inset-[1px] bg-[#0D0D0F]/80 backdrop-blur-2xl [clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]" />
 </div>
 
 <div className={`relative flex items-center justify-center w-full h-full transition-transform duration-500 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
 <SignetLogo mode="hover" imgClassName="w-10 h-10 drop-shadow-[0_0_15px_rgba(79,164,184,0.6)] group-hover:drop-shadow-[0_0_25px_rgba(79,164,184,0.8)] transition-all" />
 </div>
 </button>
 </div>
 );
}
