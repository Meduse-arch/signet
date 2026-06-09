import React from 'react';
import { Loader2 } from 'lucide-react';
import SealEngine from '../seal';

interface SystemRouterProps {
 system: string;
 isMJ: boolean;
 isHost: boolean;
 onPause: () => void;
 sessionId: string;
 imageUrl?: string;
 players: { peer_id: string; pseudo: string; role?: number }[];
 lobbyMode?: boolean;
}

export function SystemRouter({ system, isMJ, isHost, onPause, sessionId, imageUrl, players, lobbyMode }: SystemRouterProps) {
 const safeSystem = typeof system === 'string' ? system.toLowerCase() : 'unknown';

 const renderSystem = () => {
 if (safeSystem === 'seal') {
 return <SealEngine sessionId={sessionId} onPause={onPause} players={players} imageUrl={imageUrl} lobbyMode={lobbyMode} isHost={isHost} />;
 }
 return (
 <div className="flex-1 flex flex-col items-center justify-center bg-black text-glacier-bright font-quantico">
 <h2 className="text-xl tracking-widest uppercase mb-4">Système Inconnu: {String(system)}</h2>
 <p className="text-xs italic opacity-50">Aucun moteur n'a été trouvé pour cette arcane.</p>
 </div>
 );
 };

 return (
 <div className="relative w-full h-full flex flex-col overflow-hidden">
 {renderSystem()}
 </div>
 );
}
