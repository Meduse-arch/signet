import { useRef } from 'react';
import Draggable from 'react-draggable';
import { X, ExternalLink, ArrowDownToLine } from 'lucide-react';

interface DraggableWindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onPopOut?: () => void;
  onReintegrate?: () => void;
  defaultPosition?: { x: number; y: number };
  onFocus?: () => void;
  onPositionChange?: (x: number, y: number) => void;
  zIndex?: number;
  className?: string;
  variant?: 'default' | 'codex';
  isExternal?: boolean;
  headerActions?: React.ReactNode;
}

export function DraggableWindow({ 
  id,
  title, 
  children, 
  onClose, 
  onPopOut,
  onReintegrate,
  defaultPosition = { x: 100, y: 100 },
  onFocus,
  onPositionChange,
  zIndex = 50,
  className = "",
  variant = 'default',
  isExternal = false,
  headerActions
}: DraggableWindowProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  
  let initialWidth = '400px';
  let initialHeight = '450px';

  if (variant === 'codex') {
    initialWidth = '850px';
    initialHeight = '600px';
  } else {
    switch (id) {
      case 'character':
        initialWidth = '720px';
        initialHeight = '560px';
        break;
      case 'bestiary':
        initialWidth = '620px';
        initialHeight = '500px';
        break;
      case 'scenes':
        initialWidth = '520px';
        initialHeight = '420px';
        break;
      case 'inventory':
        initialWidth = '480px';
        initialHeight = '450px';
        break;
      case 'skills':
        initialWidth = '580px';
        initialHeight = '480px';
        break;
      case 'quests':
        initialWidth = '500px';
        initialHeight = '450px';
        break;
      default:
        initialWidth = '400px';
        initialHeight = '450px';
        break;
    }
  }

  const windowContent = (
    <div 
        ref={isExternal ? null : nodeRef}
        className={`${className} bg-[#0D0D0F]/90 backdrop-blur-2xl rounded-sm border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col group pointer-events-auto overflow-hidden ${isExternal ? 'w-full h-full' : 'resize both min-w-[380px] min-h-[250px]'}`}
        style={{ 
            zIndex: isExternal ? 1 : zIndex, 
            position: isExternal ? 'relative' : 'absolute', 
            width: isExternal ? '100%' : initialWidth,
            height: isExternal ? '100%' : initialHeight
        }}
        onClick={onFocus}
      >
        <div className="animate-page-enter flex flex-col h-full relative">
          {/* Golden Corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gold-DEFAULT/50 pointer-events-none z-20" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gold-DEFAULT/50 pointer-events-none z-20" />

          {/* Header */}
          <div className={`window-header relative flex items-center justify-between px-4 py-2 bg-gradient-to-r from-transparent via-gold-DEFAULT/10 to-transparent border-b border-gold-DEFAULT/20 select-none overflow-hidden shrink-0 ${isExternal ? '' : 'cursor-grab active:cursor-grabbing'}`}>
            {/* Effet lumineux de ligne façon Jarvis */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold-bright to-transparent opacity-50" />
            
            <span className="text-xs font-cinzel font-black text-gold-DEFAULT drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] tracking-[0.3em] uppercase pointer-events-none">
              {title}
            </span>
            <div className="flex items-center gap-2 relative z-10">
              {headerActions}
              {onReintegrate && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onReintegrate(); }}
                  className="p-1 hover:bg-gold-DEFAULT/20 rounded border border-transparent hover:border-gold-DEFAULT/40 transition-all text-gold-DEFAULT hover:text-gold-bright drop-shadow-md"
                  title="Réintégrer dans l'application"
                >
                  <ArrowDownToLine size={14} />
                </button>
              )}
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
          <div className="flex-1 p-4 custom-scrollbar overflow-y-auto relative z-10">
            {children}
          </div>

          {/* Resize Handle Visual Indicator (Bottom Right) */}
          {!isExternal && (
            <div className="absolute bottom-1 right-1 w-3 h-3 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity z-30">
                <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gold-DEFAULT rotate-[-45deg] origin-bottom-right" />
                <div className="absolute bottom-0 right-0 w-2/3 h-[1px] bg-gold-DEFAULT rotate-[-45deg] origin-bottom-right mb-1 mr-1" />
            </div>
          )}
        </div>
      </div>
  );

  if (isExternal) return windowContent;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".window-header"
      defaultPosition={defaultPosition}
      onStart={onFocus}
      onStop={(_e, data) => onPositionChange?.(data.x, data.y)}
    >
      {windowContent}
    </Draggable>
  );
}
