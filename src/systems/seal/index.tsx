import React from 'react';
import { BoardCanvas } from '../../components/BoardCanvas';

interface SealEngineProps {
  sessionId: string;
  imageUrl?: string;
}

export default function SealEngine({ sessionId, imageUrl }: SealEngineProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0D0D0F] relative w-full h-full overflow-hidden">
      <BoardCanvas sessionId={sessionId} imageUrl={imageUrl} />
      
      {/* UI Overlay pour Seal */}
      <div className="absolute top-4 right-4 z-10 text-center space-y-2 pointer-events-none">
        <div className="px-4 py-2 rounded-xl border border-gold-DEFAULT/20 bg-black/40 backdrop-blur-xl">
          <span className="text-sm font-black text-gold-bright tracking-widest uppercase italic">Seal Engine</span>
        </div>
      </div>
    </div>
  );
}