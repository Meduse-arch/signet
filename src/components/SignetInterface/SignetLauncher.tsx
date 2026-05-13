import React, { useState } from 'react';
import logo from '../../assets/logo.png';
import { 
  Image as ImageIcon, 
  ScrollText, 
  Dices, 
  Package,
  Users,
  X,
  Sparkles,
  Ghost
} from 'lucide-react';

import { SecurityLevel } from '../../store/auth';

interface SignetLauncherProps {
  onOpenWindow: (type: 'scenes' | 'story' | 'dice' | 'assets' | 'players' | 'bestiary') => void;
  securityLevel?: SecurityLevel;
}

export function SignetLauncher({ onOpenWindow, securityLevel = SecurityLevel.PLAYER }: SignetLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { type: 'scenes' as const, icon: <ImageIcon size={18} />, label: 'Scènes', minSecurity: SecurityLevel.MJ },
    { type: 'bestiary' as const, icon: <Ghost size={18} />, label: 'Bestiaire', minSecurity: SecurityLevel.MJ },
    { type: 'story' as const, icon: <ScrollText size={18} />, label: 'Histoire', minSecurity: SecurityLevel.PLAYER },
    { type: 'dice' as const, icon: <Dices size={18} />, label: 'Dés', minSecurity: SecurityLevel.PLAYER },
    { type: 'assets' as const, icon: <Package size={18} />, label: 'Coffre', minSecurity: SecurityLevel.PLAYER },
    { type: 'players' as const, icon: <Users size={18} />, label: 'Voyageurs', minSecurity: SecurityLevel.PLAYER },
  ].filter(item => securityLevel >= item.minSecurity);

  // Calcul pour une disposition en quart de cercle (arc)
  const radius = 90; // Distance des boutons par rapport au centre

  return (
    <div className="fixed bottom-10 right-10 z-[100] flex items-center justify-center">
      {/* Menu items (Radial/Arc) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {menuItems.map((item, index) => {
          // Angle entre 180° (gauche) et 270° (haut) car on est en bas à droite
          const angle = 180 + (90 / (menuItems.length - 1)) * index;
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
              className={`absolute top-0 left-0 -ml-5 -mt-5 flex items-center justify-center w-10 h-10 rounded-full bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/40 text-gold-DEFAULT hover:text-gold-bright hover:bg-[#0D0D0F]/90 hover:border-gold-bright hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'pointer-events-auto' : ''}`}
            >
              {item.icon}
              {/* Tooltip Alchemy-style */}
              <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-black/90 backdrop-blur-md border border-gold-DEFAULT/30 text-[9px] font-cinzel text-gold-bright drop-shadow-md whitespace-nowrap tracking-widest pointer-events-none">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Orb / Jarvis Core */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-500 z-10 group"
      >
        {/* Cercles holographiques rotatifs (Jarvis effect) */}
        <div className={`absolute inset-[-10px] rounded-full border-t-2 border-l-2 border-gold-DEFAULT/40 transition-transform duration-[3000ms] ease-linear ${isOpen ? 'rotate-[360deg] scale-110' : 'rotate-0 scale-100'}`} />
        <div className={`absolute inset-[-4px] rounded-full border-b-2 border-r-2 border-gold-bright/30 transition-transform duration-[2000ms] ease-linear ${isOpen ? '-rotate-[360deg] scale-105' : 'rotate-0 scale-100'}`} />
        
        {/* Cœur de l'orbe */}
        <div className="absolute inset-0 bg-[#0D0D0F]/80 backdrop-blur-2xl rounded-full border border-gold-DEFAULT/30 shadow-[0_0_20px_rgba(212,175,55,0.1)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] group-hover:border-gold-DEFAULT/60 transition-all duration-500" />
        
        <div className={`relative flex items-center justify-center w-full h-full transition-all duration-500 ${isOpen ? 'rotate-90' : 'rotate-0'}`}>
          {isOpen ? (
            <X className="text-gold-bright animate-in zoom-in duration-300" size={26} />
          ) : (
            <img 
              src={logo} 
              alt="Signet" 
              className="w-9 h-9 object-contain animate-rune-pulse transition-transform group-hover:scale-110" 
            />
          )}
        </div>
      </button>
    </div>
  );
}
