import { useState, useMemo } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useMapStore } from '../../store/map';
import { AssetImage } from '../AssetImage';
import { User, Target } from 'lucide-react';

interface PlayerWindowContentProps {
 players?: any[];
 sessionId: string;
}

export function PlayerWindowContent({ sessionId }: PlayerWindowContentProps) {
 const characters = useCharactersStore(state => state.characters);
 const tokenStatuses = useMapStore(state => state.tokenStatuses);

 const tokensOnMap = useMemo(() => {
 return characters.filter(c => tokenStatuses[c.id]);
 }, [characters, tokenStatuses]);

 const handleZoom = (id: string) => {
 window.dispatchEvent(new CustomEvent('ZOOM_TO_TOKEN', { detail: { id } }));
 };

 return (
 <div className="flex flex-col gap-4">
 {tokensOnMap.map((char) => (
 <div 
 key={char.id} 
 onClick={() => handleZoom(char.id)}
 className="group relative p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-silver-DEFAULT/40 transition-all duration-300 cursor-pointer flex items-center gap-4 shadow-lg"
 >
 <div className="w-14 h-14 rounded-2xl border-2 border-white/10 group-hover:border-silver-DEFAULT/40 flex items-center justify-center overflow-hidden bg-black transition-colors">
 {char.image_url ? (
 <AssetImage src={char.image_url} alt="" className="w-full h-full object-cover" />
 ) : (
 <User className="text-white/60" size={24} />
 )}
 </div>
 
 <div className="flex flex-col flex-1">
 <span className="font-quantico font-black text-sm uppercase tracking-widest text-glacier-bright">
 {char.name}
 </span>
 <span className="text-xs font-mono text-white/50 uppercase tracking-tighter">
 {char.type || 'Entité'}
 </span>
 </div>

 <div className="p-3 rounded-xl bg-white/5 text-white/60 group-hover:bg-glacier-DEFAULT/10 group-hover:text-silver-bright transition-all">
 <Target size={20} />
 </div>
 </div>
 ))}
 {tokensOnMap.length === 0 && (
 <p className="text-xs text-center text-silver-bright/50 font-inter italic py-8">
 Aucune entité sur la carte...
 </p>
 )}
 </div>
 );
}
