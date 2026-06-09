import { useState, useRef, useEffect } from 'react';
import { MousePointer2, Ruler, RadioReceiver, Eye, EyeOff, Hash } from 'lucide-react';
import { useToolsStore } from '../../store/tools';

export type ToolType = 'cursor' | 'ruler' | 'ping';

interface ToolboxHUDProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  className?: string;
  isMJ?: boolean;
  sessionId?: string;
}

export function ToolboxHUD({ currentTool, onToolChange, className }: ToolboxHUDProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRadiusInputOpen, setIsRadiusInputOpen] = useState(false);
  
  const { shareRuler, sharePing, pingRadius, setShareRuler, setSharePing, setPingRadius } = useToolsStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const tools: { id: ToolType; icon: any; label: string }[] = [
    { id: 'cursor', icon: MousePointer2, label: 'Curseur' },
    { id: 'ruler', icon: Ruler, label: 'Règle' },
    { id: 'ping', icon: RadioReceiver, label: 'Ping' }
  ];

  const activeTool = tools.find(t => t.id === currentTool) || tools[0];
  const ActiveIcon = activeTool.icon;

  // Auto-focus the input when it opens
  useEffect(() => {
    if (isRadiusInputOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRadiusInputOpen]);

  return (
    <div className={`pointer-events-auto flex flex-col items-start gap-2 ${className || ''}`}>
      
      <div className="flex items-center gap-2">
        {/* Container du bouton principal avec son badge */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`w-10 h-10 rounded-xl bg-[#0D0D0F]/80 backdrop-blur-xl border flex items-center justify-center transition-all ${
              isOpen ? 'border-silver-DEFAULT shadow-[0_0_15px_rgba(79,164,184,0.3)] text-silver-bright' : 'border-silver-DEFAULT/40 hover:border-silver-DEFAULT/80 text-silver-bright/70 hover:text-silver-bright'
            }`}
            title="Boîte à outils"
          >
            <ActiveIcon size={18} />
          </button>

          {/* Badge de partage (Top Right) */}
          {(currentTool === 'ping' || currentTool === 'ruler') && (
            <button
              onClick={() => currentTool === 'ping' ? setSharePing(!sharePing) : setShareRuler(!shareRuler)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0D0D0F] border border-silver-DEFAULT/50 flex items-center justify-center text-glacier-bright hover:border-glacier-bright hover:shadow-[0_0_10px_rgba(79,164,184,0.5)] transition-all z-10"
              title={currentTool === 'ping' ? (sharePing ? "Ping public" : "Ping privé") : (shareRuler ? "Règle publique" : "Règle privée")}
            >
              {(currentTool === 'ping' ? sharePing : shareRuler) ? <Eye size={10} /> : <EyeOff size={10} className="text-silver-dim" />}
            </button>
          )}

          {/* Option additionnelle à côté (Rayon du Ping) - En bas à droite */}
          {currentTool === 'ping' && (
            <div className="absolute -bottom-2 -right-2 z-10">
              {isRadiusInputOpen ? (
                <input
                  ref={inputRef}
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={pingRadius}
                  onChange={(e) => setPingRadius(parseFloat(e.target.value) || 1)}
                  onBlur={() => setIsRadiusInputOpen(false)}
                  onKeyDown={(e) => {
                    e.stopPropagation(); // Évite de déplacer la caméra avec ZQSD
                    if (e.key === 'Enter') setIsRadiusInputOpen(false);
                  }}
                  className="w-10 h-10 rounded-full bg-[#0a1128] border border-glacier-DEFAULT text-glacier-bright text-center font-quantico font-bold outline-none shadow-[0_0_15px_rgba(79,164,184,0.5)] appearance-none"
                  style={{ MozAppearance: 'textfield' }} // Masque les flèches sur Firefox
                />
              ) : (
                <button
                  onClick={() => setIsRadiusInputOpen(true)}
                  className="w-6 h-6 rounded-full bg-[#0D0D0F] border border-silver-DEFAULT/50 flex items-center justify-center text-glacier-bright hover:border-glacier-bright transition-all shadow-md"
                  title="Rayon du Ping"
                >
                  <Hash size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Menu déployé */}
      {isOpen && (
        <div className="flex flex-col bg-[#0D0D0F]/80 backdrop-blur-xl border border-silver-DEFAULT/40 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] w-10">
          {tools.map(tool => {
            const Icon = tool.icon;
            const isActive = currentTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  onToolChange(tool.id);
                  setIsOpen(false);
                  setIsRadiusInputOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 py-3 transition-all border-b border-silver-DEFAULT/20 last:border-b-0 ${
                  isActive 
                    ? 'bg-glacier-DEFAULT/20 text-glacier-bright shadow-[inset_0_0_10px_rgba(79,164,184,0.2)]' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title={tool.label}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
