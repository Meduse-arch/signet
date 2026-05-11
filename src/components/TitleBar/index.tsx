import { useState, useEffect } from 'react';
import { X, Minus, Square, LogIn } from 'lucide-react';
import logo from '../../assets/logo.png';

export function TitleBar() {
  const isElectron = !!window.electronAPI;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [title, setTitle] = useState("SIGIL VTT");
  const [externalInfo, setExternalInfo] = useState<{ type: string, sessionId: string } | null>(null);

  useEffect(() => {
    // Vérifier si l'URL contient "external" pour adapter le titre
    const hash = window.location.hash;
    if (hash.includes('/external/')) {
      const parts = hash.split('/');
      const typeIndex = parts.indexOf('external') + 1;
      if (typeIndex < parts.length) {
        const type = parts[typeIndex];
        const sessionId = parts[typeIndex + 1];
        setExternalInfo({ type, sessionId });
        const translatedType = type === 'scenes' ? 'SCÈNES' : 
                               type === 'story' ? 'HISTOIRE' : 
                               type === 'dice' ? 'DÉS' : 
                               type === 'assets' ? 'COFFRE' : 
                               type === 'players' ? 'VOYAGEURS' : type.toUpperCase();
        setTitle(`SIGIL - ${translatedType}`);
      }
    }

    const checkFullscreen = () => {
      // Détection native navigateur (fallback si pas Electron)
      if (!isElectron) {
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    const handleFullscreenChange = () => {
      checkFullscreen();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    checkFullscreen(); // Initial check

    let unsubFullscreen: (() => void) | undefined;
    if (isElectron && window.electronAPI?.onFullscreen) {
      unsubFullscreen = window.electronAPI.onFullscreen((isFS: boolean) => {
        setIsFullscreen(isFS);
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault(); // Empêche le comportement par défaut (si présent)
        if (isElectron && window.electronAPI) {
          window.electronAPI.toggleFullscreen();
        } else {
          // Fallback navigateur classique
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      if (unsubFullscreen) unsubFullscreen();
    };
  }, [isElectron]);

  // Si on est dans le navigateur (pas Electron), on affiche quand même la barre pour le design 
  // mais sans les boutons de contrôle de fenêtre.
  if (isFullscreen) return null;

    return (
    <div className="relative flex items-center justify-between h-8 bg-[#0D0D0F] border-b border-gold-DEFAULT/30 select-none z-[9999] overflow-hidden shrink-0" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Effet lumineux de ligne façon Jarvis */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold-bright to-transparent opacity-50" />      <div className="flex items-center gap-2 px-3 relative z-10">
        <img src={logo} alt="Sigil" className="w-4 h-4 object-contain" />
        <span className="text-[10px] font-cinzel font-black tracking-widest text-gold-DEFAULT drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]">
          {title}
        </span>
      </div>

      <div className="flex h-full relative z-10" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {externalInfo && (
          <button 
            onClick={() => window.electronAPI.reDock(externalInfo.type, externalInfo.sessionId)} 
            className="px-4 hover:bg-gold-DEFAULT/20 text-gold-DEFAULT hover:text-gold-bright transition-all flex items-center justify-center gap-2 text-[8px] font-cinzel font-bold border-r border-gold-DEFAULT/20 drop-shadow-md"
            title="Réintégrer l'application"
          >
            <LogIn size={12} className="rotate-180" />
            <span className="tracking-[0.2em] uppercase pt-0.5">Réintégrer</span>
          </button>
        )}
        <button 
          onClick={() => window.electronAPI.minimizeWindow()} 
          className="px-3 hover:bg-white/10 text-gold-DEFAULT hover:text-gold-bright transition-colors flex items-center justify-center drop-shadow-md"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={() => window.electronAPI.maximizeWindow()} 
          className="px-3 hover:bg-white/10 text-gold-DEFAULT hover:text-gold-bright transition-colors flex items-center justify-center drop-shadow-md"
        >
          <Square size={12} />
        </button>
        <button 
          onClick={() => window.electronAPI.closeWindow()} 
          className="px-3 hover:bg-red-500/20 text-gold-DEFAULT hover:text-red-400 transition-colors flex items-center justify-center drop-shadow-md"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
