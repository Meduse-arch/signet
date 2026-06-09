import { useState } from 'react';
import { TitleBar } from '../../components/TitleBar';

export function SwarmSimulationPage() {
 const [sessionKey, setSessionKey] = useState('');
 const [peerCount, setPeerCount] = useState(4);
 const [isSimulating, setIsSimulating] = useState(false);

 const startSim = () => {
 if (!sessionKey) return alert("Clé de session requise");
 setIsSimulating(true);
 };

 if (isSimulating) {
 return (
 <div className="w-full h-screen bg-[#050507] flex flex-wrap content-start overflow-auto">
 {Array.from({ length: peerCount }).map((_, i) => {
 const url = `${window.location.origin}${window.location.pathname}?sim_user=sim_player_${Date.now()}_${i}&sim_session=${sessionKey}#/`;
 return (
 <div key={i} className="flex-1 min-w-[400px] h-[50vh] border border-silver-DEFAULT/20 relative">
 <div className="absolute top-0 left-0 bg-black/80 text-silver-bright text-xs px-2 py-1 z-10 pointer-events-none rounded-br-md">
 Sim Player {i + 1}
 </div>
 <iframe src={url} className="w-full h-full border-none" allow="autoplay" />
 </div>
 );
 })}
 </div>
 );
 }

 return (
 <div className="w-full h-screen bg-[#050507] flex flex-col items-center justify-center text-white">
 <TitleBar />
 <div className="bg-[#0D0D0F] p-8 rounded-xl border border-silver-DEFAULT/40 shadow-[0_0_20px_rgba(79,164,184,0.1)] w-96 flex flex-col items-center z-10">
 <h1 className="text-2xl font-quantico text-silver-bright mb-6 uppercase tracking-widest text-center">Swarm Simulation</h1>
 
 <div className="w-full mb-4">
 <label className="text-[10px] font-quantico text-white/50 uppercase tracking-widest mb-1 block">Clé de session cible</label>
 <input 
 className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-sm text-white focus:border-silver-DEFAULT outline-none transition-colors"
 placeholder="Ex: signet_..."
 value={sessionKey}
 onChange={e => setSessionKey(e.target.value)}
 />
 </div>

 <div className="w-full mb-8">
 <label className="text-[10px] font-quantico text-white/50 uppercase tracking-widest mb-1 block">Nombre de Joueurs (Peers)</label>
 <input 
 type="number"
 min="1" max="16"
 className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-sm text-white focus:border-silver-DEFAULT outline-none transition-colors"
 value={peerCount}
 onChange={e => setPeerCount(parseInt(e.target.value) || 1)}
 />
 </div>

 <button 
 onClick={startSim}
 className="w-full bg-glacier-DEFAULT text-black font-bold uppercase tracking-widest px-6 py-3 rounded-md hover:bg-glacier-bright transition-colors"
 >
 Lancer la Simulation
 </button>
 </div>
 </div>
 );
}
