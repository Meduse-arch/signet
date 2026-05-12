import React from 'react';
import { useCharactersStore } from '../../store/characters';
import { useAuthStore } from '../../store/auth';
import { useSessionStore } from '../../store/session';
import { DEFAULT_STATS, DEFAULT_BARS } from '../../systems/seal/constants';
import { Activity, Heart, Shield, Zap } from 'lucide-react';

interface CharacterSheetContentProps {
  sessionId: string;
}

export function CharacterSheetContent({ sessionId }: CharacterSheetContentProps) {
  const user = useAuthStore(state => state.user);
  const characters = useCharactersStore(state => state.characters);
  const session = useSessionStore(state => state.sessions.find(s => s.id === sessionId));
  
  const character = characters.find(c => c.user_id === user?.id);

  console.log('[CharacterSheetContent] User:', user?.id);
  console.log('[CharacterSheetContent] Characters:', characters.map(c => ({ id: c.id, user_id: c.user_id, name: c.name })));
  console.log('[CharacterSheetContent] Found character:', character?.name);

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <p className="text-gold-DEFAULT/60 font-cinzel text-sm uppercase tracking-widest">
          Aucun personnage lié à cette session
        </p>
      </div>
    );
  }

  const { name, stats, bars, image_url } = character;
  const statDefs = session?.settings?.stats || DEFAULT_STATS;
  const barDefs = session?.settings?.bars || DEFAULT_BARS;

  return (
    <div className="space-y-8 p-2">
      <header className="flex flex-col items-center text-center space-y-2">
        <div className="w-24 h-24 rounded-full bg-black/40 border-2 border-gold-DEFAULT/40 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.1)] overflow-hidden">
          {image_url ? (
            <img src={image_url} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-cinzel text-gold-bright drop-shadow-md">
              {name.substring(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-cinzel font-black text-gold-bright tracking-widest uppercase drop-shadow-md">
            {name}
          </h2>
          <p className="text-[10px] font-cinzel text-gold-DEFAULT/50 tracking-[0.3em] uppercase">
            Voyageur de l'Archive
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {/* Attributs */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 tracking-widest uppercase border-b border-gold-DEFAULT/10 pb-2">
            Attributs
          </h3>
          <div className="space-y-2">
            {statDefs.map(stat => (
              <div key={stat.id} className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded-lg border border-white/5">
                <span className="text-[10px] font-cinzel text-white/70 uppercase tracking-widest">{stat.name}</span>
                <span className="font-cinzel font-black text-gold-bright">{stats[stat.id] || 0}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Vitalités */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-cinzel font-black text-gold-DEFAULT/60 tracking-widest uppercase border-b border-gold-DEFAULT/10 pb-2">
            Vitalités
          </h3>
          <div className="space-y-4">
            {barDefs.map(bar => {
              const Icon = bar.id === 'hp' ? Heart : bar.id === 'mana' ? Zap : bar.id === 'stam' ? Shield : Activity;
              const maxVal = bars[`max${bar.id.charAt(0).toUpperCase()}${bar.id.slice(1)}`] || bars[bar.id] || 1;
              const currentVal = bars[bar.id] || 0;
              const percent = Math.min(100, Math.max(0, (currentVal / maxVal) * 100));

              return (
                <div key={bar.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-cinzel uppercase tracking-widest" style={{ color: bar.color }}>
                    <span className="flex items-center gap-2"><Icon className="w-3 h-3" /> {bar.name}</span>
                    <span className="font-mono font-black">{Math.floor(currentVal)} / {Math.floor(maxVal)}</span>
                  </div>
                  <div className="h-2 w-full bg-black/60 rounded-full border border-white/5 overflow-hidden">
                    <div 
                      className="h-full transition-all duration-500" 
                      style={{ 
                        width: `${percent}%`, 
                        backgroundColor: bar.color, 
                        boxShadow: `0 0 10px ${bar.color}44` 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="pt-4 border-t border-gold-DEFAULT/10">
        <p className="text-[9px] font-serif italic text-gold-DEFAULT/40 text-center leading-relaxed">
          "Chaque trait est une promesse faite au destin, chaque souffle un écho dans le Vide."
        </p>
      </footer>
    </div>
  );
}
