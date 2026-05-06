import React from 'react';

export default function SealEngine() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0D0D0F] relative overflow-hidden">
      <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1f_0%,_#0D0D0F_100%)]" />
      
      <div className="relative z-10 text-center space-y-6 animate-page-enter">
        <div className="w-32 h-32 mx-auto rounded-full border-2 border-gold-DEFAULT/20 flex items-center justify-center bg-black/40 backdrop-blur-xl">
          <span className="text-4xl font-black text-gold-bright tracking-widest uppercase italic">Seal</span>
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-[0.3em] uppercase">Chroniques de l'Équilibre</h2>
          <p className="text-gold-dim/60 font-serif italic mt-2">Le moteur SEAL est actif. En attente des ordres du destin.</p>
        </div>
      </div>
    </div>
  );
}