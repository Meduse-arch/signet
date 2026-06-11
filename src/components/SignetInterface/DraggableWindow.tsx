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
 initialWidth = '750px';
 initialHeight = '550px';
 } else {
 switch (id) {
 case 'character':
 initialWidth = '500px';
 initialHeight = '550px';
 break;
 case 'bestiary':
 initialWidth = '400px';
 initialHeight = '500px';
 break;
 case 'scenes':
 initialWidth = '350px';
 initialHeight = '450px';
 break;
 case 'inventory':
 initialWidth = '380px';
 initialHeight = '480px';
 break;
 case 'skills':
 initialWidth = '380px';
 initialHeight = '480px';
 break;
 case 'quests':
 initialWidth = '380px';
 initialHeight = '480px';
 break;
 case 'combat':
 initialWidth = '350px';
 initialHeight = '550px';
 break;
 default:
 initialWidth = '350px';
 initialHeight = '450px';
 break;
 }
 }

 const windowContent = (
 <div 
 ref={isExternal ? null : nodeRef}
 className={`${className} bg-[#0D0D0F]/90 backdrop-blur-2xl rounded-sm border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col group pointer-events-auto overflow-hidden ${isExternal ? 'w-full h-full' : 'resize both min-w-[min(380px,100vw-16px)] min-h-[min(250px,100vh-16px)]'}`}
 style={{ 
 zIndex: isExternal ? 1 : zIndex, 
 position: isExternal ? 'relative' : 'absolute', 
 width: isExternal ? '100%' : `min(${initialWidth}, 100vw - 16px)`,
 height: isExternal ? '100%' : `min(${initialHeight}, 100vh - 16px)`
 }}
 onClick={onFocus}
 >
 <div className="animate-page-enter flex flex-col h-full relative">
 {/* Golden Corners */}
 <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-silver-DEFAULT/50 pointer-events-none z-20" />
 <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-silver-DEFAULT/50 pointer-events-none z-20" />

 {/* Header */}
 <div className={`window-header relative flex items-center justify-between px-4 py-2 bg-gradient-to-r from-transparent via-gold-DEFAULT/10 to-transparent border-b border-silver-DEFAULT/20 select-none overflow-hidden shrink-0 ${isExternal ? '' : 'cursor-grab active:cursor-grabbing'}`}>
 {/* Effet lumineux de ligne façon Jarvis */}
 <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-glacier-bright to-transparent opacity-50" />
 
 <span className="text-xs font-quantico font-black text-silver-bright tracking-[0.3em] uppercase pointer-events-none">
 {title}
 </span>
 <div className="flex items-center gap-2 relative z-10">
 {headerActions}
 {onReintegrate && (
 <button 
 type="button"
 onClick={(e) => { e.stopPropagation(); onReintegrate(); }}
 className="p-1 hover:bg-glacier-DEFAULT/20 rounded border border-transparent hover:border-silver-DEFAULT/40 transition-all text-silver-bright hover:text-glacier-bright drop-shadow-md"
 title="Réintégrer dans l'application"
 >
 <ArrowDownToLine size={14} />
 </button>
 )}
 {onPopOut && (
 <button 
 type="button"
 onClick={(e) => { e.stopPropagation(); onPopOut(); }}
 className="p-1 hover:bg-glacier-DEFAULT/20 rounded border border-transparent hover:border-silver-DEFAULT/40 transition-all text-silver-bright hover:text-glacier-bright drop-shadow-md"
 title="Détacher la fenêtre"
 >
 <ExternalLink size={12} />
 </button>
 )}
 <button 
 type="button"
 onClick={(e) => { e.stopPropagation(); onClose(); }}
 className="p-1 hover:bg-red-500/20 rounded border border-transparent hover:border-red-500/40 transition-all text-silver-bright hover:text-red-400 drop-shadow-md"
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
 <div className="absolute bottom-0 right-0 w-full h-[1px] bg-glacier-DEFAULT rotate-[-45deg] origin-bottom-right" />
 <div className="absolute bottom-0 right-0 w-2/3 h-[1px] bg-glacier-DEFAULT rotate-[-45deg] origin-bottom-right mb-1 mr-1" />
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
 bounds="parent"
 onStart={onFocus}
 onStop={(_e, data) => onPositionChange?.(data.x, data.y)}
 >
 {windowContent}
 </Draggable>
 );
}
