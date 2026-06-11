import { useState, useRef, useEffect } from 'react';
import { MousePointer2, Ruler, RadioReceiver, Eye, EyeOff, Hash, Paintbrush, Eraser, BrickWall, CloudRain, Wind, Snowflake, Skull, Flame, Tornado, Sparkles } from 'lucide-react';
import { useToolsStore, PaintType, PAINT_TYPE_COLORS } from '../../store/tools';

export type ToolType = 'cursor' | 'ruler' | 'ping' | 'brush';

interface ToolboxHUDProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  className?: string;
  isMJ?: boolean;
  sessionId?: string;
}

const PAINT_TYPES: { id: PaintType; icon: any; label: string }[] = [
  { id: 'wall',   icon: BrickWall, label: 'Mur'         },
  { id: 'rain',   icon: CloudRain, label: 'Pluie'       },
  { id: 'fog',    icon: Wind,      label: 'Brouillard'  },
  { id: 'snow',   icon: Snowflake, label: 'Neige'       },
  { id: 'poison', icon: Skull,     label: 'Poison'      },
  { id: 'fire',   icon: Flame,     label: 'Feu'         },
  { id: 'sand',   icon: Tornado,   label: 'Sable'       },
  { id: 'magic',  icon: Sparkles,  label: 'Magie'       },
];

export function ToolboxHUD({ currentTool, onToolChange, className, isMJ }: ToolboxHUDProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPaintOpen, setIsPaintOpen] = useState(false);
  const [isBrushRadiusInputOpen, setIsBrushRadiusInputOpen] = useState(false);
  const [isPingRadiusInputOpen, setIsPingRadiusInputOpen] = useState(false);

  const { shareRuler, sharePing, pingRadius, paintType, isEraserActive, paintRadius,
          setShareRuler, setSharePing, setPingRadius, setPaintType, setIsEraserActive, setPaintRadius } = useToolsStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const tools: { id: ToolType; icon: any; label: string }[] = [
    { id: 'cursor', icon: MousePointer2, label: 'Curseur' },
    { id: 'ruler',  icon: Ruler,         label: 'Règle'   },
    { id: 'ping',   icon: RadioReceiver, label: 'Ping'    },
    ...(isMJ ? [{ id: 'brush', icon: Paintbrush, label: 'Pinceau' } as const] : []),
  ];

  const activeTool = tools.find(t => t.id === currentTool) || tools[0];
  const ActiveIcon = activeTool.icon;
  const activePaintType = PAINT_TYPES.find(p => p.id === paintType) || PAINT_TYPES[0];
  const ActivePaintIcon = activePaintType.icon;

  // Close paint menu when switching away from brush
  useEffect(() => {
    if (currentTool !== 'brush') {
      setIsPaintOpen(false);
      setIsBrushRadiusInputOpen(false);
    }
  }, [currentTool]);

  // Auto-focus ping radius input
  useEffect(() => {
    if (isPingRadiusInputOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPingRadiusInputOpen]);

  const handleToolChange = (tool: ToolType) => {
    onToolChange(tool);
    setIsOpen(false);
    setIsPingRadiusInputOpen(false);
    setIsBrushRadiusInputOpen(false);
    setIsPaintOpen(false);
  };

  return (
    <div className={`pointer-events-auto flex flex-col items-start gap-2 ${className || ''}`}>

      {/* ── Bouton principal ── */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => { setIsOpen(!isOpen); setIsPaintOpen(false); }}
            className={`w-10 h-10 rounded-xl bg-[#0D0D0F]/80 backdrop-blur-xl border flex items-center justify-center transition-all ${
              isOpen
                ? 'border-silver-DEFAULT shadow-[0_0_15px_rgba(79,164,184,0.3)] text-silver-bright'
                : 'border-silver-DEFAULT/40 hover:border-silver-DEFAULT/80 text-silver-bright/70 hover:text-silver-bright'
            }`}
            title="Boîte à outils"
          >
            <ActiveIcon size={18} />
          </button>

          {/* Badge partage — Ping / Règle (Top Right) */}
          {(currentTool === 'ping' || currentTool === 'ruler') && (
            <button
              onClick={() => currentTool === 'ping' ? setSharePing(!sharePing) : setShareRuler(!shareRuler)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0D0D0F] border border-silver-DEFAULT/50 flex items-center justify-center text-glacier-bright hover:border-glacier-bright hover:shadow-[0_0_10px_rgba(79,164,184,0.5)] transition-all z-10"
              title={currentTool === 'ping' ? (sharePing ? 'Ping public' : 'Ping privé') : (shareRuler ? 'Règle publique' : 'Règle privée')}
            >
              {(currentTool === 'ping' ? sharePing : shareRuler) ? <Eye size={10} /> : <EyeOff size={10} className="text-silver-dim" />}
            </button>
          )}

          {/* Gomme — Pinceau (Top Right) */}
          {currentTool === 'brush' && (
            <button
              onClick={() => setIsEraserActive(!isEraserActive)}
              className={`absolute -top-2 -right-2 w-5 h-5 rounded-full border flex items-center justify-center transition-all z-10 ${
                isEraserActive
                  ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                  : 'bg-[#0D0D0F] border-silver-DEFAULT/50 text-silver-bright hover:border-glacier-bright hover:text-glacier-bright'
              }`}
              title={isEraserActive ? 'Gomme activée' : 'Activer la gomme'}
            >
              <Eraser size={10} />
            </button>
          )}

          {/* Taille du pinceau (Top Left) */}
          {currentTool === 'brush' && (
            <div className="absolute -top-2 -left-2 z-10">
              {isBrushRadiusInputOpen ? (
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={paintRadius}
                  onChange={(e) => setPaintRadius(parseInt(e.target.value) || 1)}
                  onBlur={() => setIsBrushRadiusInputOpen(false)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') setIsBrushRadiusInputOpen(false);
                  }}
                  className="w-6 h-6 rounded-full bg-[#0a1128] border border-glacier-DEFAULT text-glacier-bright text-center text-xs font-quantico font-bold outline-none shadow-[0_0_15px_rgba(79,164,184,0.5)] appearance-none"
                  style={{ MozAppearance: 'textfield' }}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setIsBrushRadiusInputOpen(true)}
                  className="w-5 h-5 rounded-full bg-[#0D0D0F] border border-silver-DEFAULT/50 flex items-center justify-center text-glacier-bright hover:border-glacier-bright transition-all shadow-md text-[9px] font-quantico"
                  title="Taille du pinceau"
                >
                  x{paintRadius}
                </button>
              )}
            </div>
          )}

          {/* Rayon du Ping (Bottom Right) */}
          {currentTool === 'ping' && (
            <div className="absolute -bottom-2 -right-2 z-10">
              {isPingRadiusInputOpen ? (
                <input
                  ref={inputRef}
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={pingRadius}
                  onChange={(e) => setPingRadius(parseFloat(e.target.value) || 1)}
                  onBlur={() => setIsPingRadiusInputOpen(false)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') setIsPingRadiusInputOpen(false);
                  }}
                  className="w-10 h-10 rounded-full bg-[#0a1128] border border-glacier-DEFAULT text-glacier-bright text-center font-quantico font-bold outline-none shadow-[0_0_15px_rgba(79,164,184,0.5)] appearance-none"
                  style={{ MozAppearance: 'textfield' }}
                />
              ) : (
                <button
                  onClick={() => setIsPingRadiusInputOpen(true)}
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

      {/* ── Dropdown Boîte à outils ── */}
      {isOpen && (
        <div className="flex flex-col bg-[#0D0D0F]/80 backdrop-blur-xl border border-silver-DEFAULT/40 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] w-10">
          {tools.map(tool => {
            const Icon = tool.icon;
            const isActive = currentTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => handleToolChange(tool.id)}
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

      {/* ── Bouton Type de Peinture (visible seulement quand Pinceau actif) ── */}
      {currentTool === 'brush' && !isEraserActive && (
        <button
          onClick={() => { setIsPaintOpen(!isPaintOpen); setIsOpen(false); }}
          className={`w-10 h-10 rounded-xl backdrop-blur-xl border flex items-center justify-center transition-all ${
            isPaintOpen
              ? 'border-silver-DEFAULT shadow-[0_0_15px_rgba(79,164,184,0.3)]'
              : 'border-silver-DEFAULT/40 hover:border-silver-DEFAULT/80'
          }`}
          style={{
            backgroundColor: PAINT_TYPE_COLORS[paintType] + '30',
            color: PAINT_TYPE_COLORS[paintType],
          }}
          title={`Type : ${activePaintType.label}`}
        >
          <ActivePaintIcon size={18} />
        </button>
      )}

      {/* ── Dropdown Type de Peinture (même format que la boîte à outils) ── */}
      {currentTool === 'brush' && !isEraserActive && isPaintOpen && (
        <div className="flex flex-col bg-[#0D0D0F]/80 backdrop-blur-xl border border-silver-DEFAULT/40 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] w-10">
          {PAINT_TYPES.map(pt => {
            const Icon = pt.icon;
            const isActive = paintType === pt.id;
            const color = PAINT_TYPE_COLORS[pt.id];
            return (
              <button
                key={pt.id}
                onClick={() => { setPaintType(pt.id); setIsPaintOpen(false); }}
                className={`flex flex-col items-center justify-center gap-1 py-3 transition-all border-b border-silver-DEFAULT/20 last:border-b-0 ${
                  isActive ? 'shadow-[inset_0_0_10px_rgba(0,0,0,0.3)]' : 'hover:bg-white/5'
                }`}
                style={isActive
                  ? { backgroundColor: color + '30', color }
                  : { color: color + 'AA' }
                }
                title={pt.label}
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
