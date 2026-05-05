import { useRef } from 'react';
import { useBoard } from '../../hooks/useBoard';
import { usePeersStore } from '../../store/peers';
import { useAuthStore } from '../../store/auth';

interface BoardCanvasProps {
  sessionId: string;
}

export function BoardCanvas({ sessionId }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToken } = useBoard(containerRef, sessionId);
  const { isHost } = usePeersStore();
  const { user } = useAuthStore();

  const handleAddToken = () => {
    const id = Math.random().toString(36).substring(2, 9);
    addToken({
      id,
      name: user?.pseudo || 'Joueur',
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      {isHost && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-auto">
          <button
            onClick={handleAddToken}
            className="px-4 py-2 rounded-lg bg-gold-DEFAULT/20 hover:bg-gold-DEFAULT/40 text-gold-DEFAULT text-xs font-bold border border-gold-DEFAULT/30 backdrop-blur-md transition-all uppercase tracking-widest"
          >
            Invoquer Pion
          </button>
        </div>
      )}
    </div>
  );
}
