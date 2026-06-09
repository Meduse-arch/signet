import { useEffect, useState, useRef } from 'react';
import { RefreshCcw } from 'lucide-react';

interface MapTransitionOverlayProps {
 progress: {
 loaded: number;
 total: number;
 active: boolean;
 status: 'idle' | 'waiting_manifest' | 'loading_chunks' | 'painting_cache' | 'complete' | 'error';
 error?: string;
 };
 onRetry: () => void;
}

export function MapTransitionOverlay({ progress, onRetry }: MapTransitionOverlayProps) {
 const [isVisible, setIsVisible] = useState(false);
 const [showOverlay, setShowOverlay] = useState(false);

 useEffect(() => {
 if (progress.active) {
 setIsVisible(true);
 setShowOverlay(true);
 } else {
 // Le brouillard se retire légèrement (300ms) après que les chunks soient dessinés
 const timer = setTimeout(() => setShowOverlay(false), 300);
 return () => clearTimeout(timer);
 }
 }, [progress.active]);

 useEffect(() => {
 if (!showOverlay && isVisible) {
 const timer = setTimeout(() => setIsVisible(false), 800); // 800ms fade out duration
 return () => clearTimeout(timer);
 }
 }, [showOverlay, isVisible]);

 if (!showOverlay && !isVisible) return null;
 const percentage = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
 
 let message = '';
 if (progress.status === 'waiting_manifest') {
 message = 'Demande au Maître du Jeu...';
 } else if (progress.status === 'loading_chunks') {
 message = `Invocation en cours... ${percentage}%`;
 } else if (progress.status === 'error') {
 message = progress.error || 'Une erreur est survenue';
 } else if (progress.status === 'painting_cache') {
 message = ''; // Pas de texte pour le cache
 } else if (!progress.active) {
 message = ''; // Pas de texte en se dissipant
 }

 return (
 <div 
 className={`absolute inset-0 pointer-events-none z-[10] transition-all ease-in-out flex items-center justify-center bg-[#050508]/60
 ${showOverlay ? 'opacity-100 backdrop-blur-md duration-[300ms]' : 'opacity-0 backdrop-blur-none duration-[800ms]'}
 `}
 >
 {/* Filtre SVG pour le bruit fractal (Brouillard) */}
 <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none', overflow: 'hidden' }}>
 <defs>
 <filter id="fog-noise">
 <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" result="noise" />
 <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" xChannelSelector="R" yChannelSelector="G" />
 </filter>
 </defs>
 </svg>

 {/* Couches de brume procédurale animées via CSS et SVG */}
 <div className="absolute inset-[-50%] opacity-60 mix-blend-screen animate-fog-1 pointer-events-none" style={{ filter: 'url(#fog-noise)' }}>
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,_rgba(200,200,210,0.4)_0%,_transparent_60%)]" />
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_60%,_rgba(180,180,190,0.3)_0%,_transparent_50%)]" />
 </div>
 <div className="absolute inset-[-50%] opacity-40 mix-blend-screen animate-fog-2 pointer-events-none" style={{ filter: 'url(#fog-noise)' }}>
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,_rgba(220,220,230,0.5)_0%,_transparent_55%)]" />
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,_rgba(190,190,200,0.4)_0%,_transparent_50%)]" />
 </div>
 <div className="absolute inset-[-50%] opacity-50 mix-blend-screen animate-fog-3 pointer-events-none" style={{ filter: 'url(#fog-noise)' }}>
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_rgba(255,255,255,0.3)_0%,_transparent_60%)]" />
 </div>

 {/* Contenu central de chargement */}
 <div className={`z-20 flex flex-col items-center gap-6 p-10 rounded-2xl bg-[#0D0D0F]/80 border border-silver-DEFAULT/30 shadow-[0_0_40px_rgba(0,0,0,0.9)] transition-all duration-1000
 ${showOverlay ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
 `}>
 {progress.status === 'error' ? (
 <div className="flex flex-col items-center gap-4 pointer-events-auto">
 <div className="text-red-500 mb-2">
 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
 </svg>
 </div>
 <p className="text-red-400 font-quantico text-lg text-center max-w-sm">
 {message}
 </p>
 <button 
 onClick={onRetry}
 className="mt-4 flex items-center gap-2 px-6 py-2 rounded bg-glacier-DEFAULT/20 text-glacier-bright border border-silver-DEFAULT/50 hover:bg-glacier-DEFAULT/40 transition-all font-quantico uppercase text-sm tracking-widest active:scale-95"
 >
 <RefreshCcw size={16} />
 <span>Forcer la synchronisation</span>
 </button>
 </div>
 ) : (
 <>
 <div className="relative w-24 h-24 flex items-center justify-center">
 <div className="absolute inset-0 border-4 border-silver-DEFAULT/10 rounded-full"></div>
 <div className="absolute inset-0 border-4 border-silver-DEFAULT rounded-full border-t-transparent animate-spin"></div>
 <div className="absolute inset-2 border-2 border-gold-bright/30 rounded-full border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
 {progress.status !== 'waiting_manifest' && (
 <span className="text-glacier-bright font-quantico font-bold text-lg">{percentage}%</span>
 )}
 </div>
 <div className="flex flex-col items-center gap-2 text-center">
 <p className="text-white font-quantico text-2xl tracking-widest uppercase ">
 {message}
 </p>
 {progress.status !== 'waiting_manifest' && progress.total > 0 && (
 <p className="text-white/60 font-inter text-sm">
 ({progress.loaded} / {progress.total} fragments mémorisés)
 </p>
 )}
 </div>
 </>
 )}
 </div>
 </div>
 );
}
