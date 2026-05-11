import { useRef } from 'react';
import Draggable from 'react-draggable';
import { X, ExternalLink } from 'lucide-react';

interface DraggableWindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onPopOut?: () => void;
  defaultPosition?: { x: number; y: number };
  onFocus?: () => void;
  onPositionChange?: (x: number, y: number) => void;
  zIndex?: number;
}

export function DraggableWindow({ 
  id: _id,
  title, 
  children, 
  onClose, 
  onPopOut,
  defaultPosition = { x: 100, y: 100 },
  onFocus,
  onPositionChange,
  zIndex = 50
}: DraggableWindowProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".window-header"
      defaultPosition={defaultPosition}
      onStart={onFocus}
      onStop={(_e, data) => onPositionChange?.(data.x, data.y)}
    >
      <div 
        ref={nodeRef}
        className="w-80 bg-[#0D0D0F]/80 backdrop-blur-2xl rounded-sm border border-white/5 shadow-2xl overflow-hidden flex flex-col group pointer-events-auto"
        style={{ zIndex, position: 'absolute' }}
        onClick={onFocus}
      >
        <div className="animate-page-enter flex flex-col h-full">
          {/* Golden Corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gold-DEFAULT/50 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gold-DEFAULT/50 pointer-events-none" />

          {/* Header */}
          <div className="window-header relative flex items-center justify-between px-4 py-2 bg-gradient-to-r from-transparent via-gold-DEFAULT/10 to-transparent cursor-grab active:cursor-grabbing border-b border-gold-DEFAULT/20 select-none overflow-hidden">
            {/* Effet lumineux de ligne façon Jarvis */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold-bright to-transparent opacity-50" />
            
            <span className="text-[10px] font-cinzel font-black text-gold-DEFAULT drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] tracking-[0.3em] uppercase pointer-events-none">
              {title}
            </span>
            <div className="flex items-center gap-2 relative z-10">
              {onPopOut && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onPopOut(); }}
                  className="p-1 hover:bg-gold-DEFAULT/20 rounded border border-transparent hover:border-gold-DEFAULT/40 transition-all text-gold-DEFAULT hover:text-gold-bright drop-shadow-md"
                  title="Détacher la fenêtre"
                >
                  <ExternalLink size={12} />
                </button>
              )}
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="p-1 hover:bg-red-500/20 rounded border border-transparent hover:border-red-500/40 transition-all text-gold-DEFAULT hover:text-red-400 drop-shadow-md"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 custom-scrollbar overflow-y-auto max-h-[60vh]">
            {children}
          </div>
        </div>
      </div>
    </Draggable>
  );
}
