import React, { useState } from 'react';
import logo from '../../assets/logo.png';
import { 
  Image as ImageIcon, 
  ScrollText, 
  Dices, 
  Package,
  Users,
  X
} from 'lucide-react';

interface SignetLauncherProps {
  onOpenWindow: (type: 'scenes' | 'story' | 'dice' | 'assets' | 'players') => void;
}

export function SignetLauncher({ onOpenWindow }: SignetLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { type: 'scenes' as const, icon: <ImageIcon size={18} />, label: 'Scènes' },
    { type: 'story' as const, icon: <ScrollText size={18} />, label: 'Histoire' },
    { type: 'dice' as const, icon: <Dices size={18} />, label: 'Dés' },
    { type: 'assets' as const, icon: <Package size={18} />, label: 'Coffre' },
    { type: 'players' as const, icon: <Users size={18} />, label: 'Voyageurs' },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-center gap-4">
      {/* Menu items */}
      <div className={`flex flex-col gap-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        {menuItems.map((item, index) => (
          <button
            key={item.type}
            onClick={() => {
              onOpenWindow(item.type);
              setIsOpen(false);
            }}
            className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-black/60 backdrop-blur-xl border border-gold-DEFAULT/30 text-gold-dim hover:text-gold-bright hover:border-gold-DEFAULT transition-all shadow-xl hover:scale-110"
            style={{ transitionDelay: `${index * 50}ms` }}
          >
             <div className="absolute right-full mr-4 px-2 py-1 rounded bg-black/80 text-[10px] font-cinzel text-gold-bright opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gold-DEFAULT/20 whitespace-nowrap tracking-widest">
              {item.label}
            </div>
            {item.icon}
          </button>
        ))}
      </div>

      {/* Main Orb */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] ${isOpen ? 'rotate-90' : 'rotate-0'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gold-DEFAULT/20 to-black/80 rounded-full border border-gold-DEFAULT/30 backdrop-blur-xl" />
        <div className="absolute inset-0 rounded-full border-2 border-gold-DEFAULT/10 animate-pulse" />
        
        {isOpen ? (
          <X className="text-gold-bright relative z-20 animate-page-enter" size={24} />
        ) : (
          <img 
            src={logo} 
            alt="Signet" 
            className="w-8 h-8 object-contain relative z-10 transition-transform hover:scale-110" 
          />
        )}
      </button>
    </div>
  );
}
