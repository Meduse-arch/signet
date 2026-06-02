import { useState } from 'react';
import { MousePointer2, Ruler, RadioReceiver } from 'lucide-react';

export type ToolType = 'cursor' | 'ruler' | 'ping';

interface ToolboxHUDProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  className?: string;
}

export function ToolboxHUD({ currentTool, onToolChange, className }: ToolboxHUDProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tools: { id: ToolType; icon: any; label: string }[] = [
    { id: 'cursor', icon: MousePointer2, label: 'Curseur' },
    { id: 'ruler', icon: Ruler, label: 'Règle' },
    { id: 'ping', icon: RadioReceiver, label: 'Ping' }
  ];

  const activeTool = tools.find(t => t.id === currentTool) || tools[0];
  const ActiveIcon = activeTool.icon;

  return (
    <div className={`pointer-events-auto flex flex-col items-center gap-2 ${className || ''}`}>
      {/* Bouton Principal */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-xl bg-[#0D0D0F]/80 backdrop-blur-xl border flex items-center justify-center transition-all ${
          isOpen ? 'border-gold-DEFAULT shadow-[0_0_15px_rgba(212,175,55,0.3)] text-gold-DEFAULT' : 'border-gold-DEFAULT/40 hover:border-gold-DEFAULT/80 text-gold-DEFAULT/70 hover:text-gold-DEFAULT'
        }`}
        title="Boîte à outils"
      >
        <ActiveIcon size={18} />
      </button>

      {/* Menu déployé */}
      {isOpen && (
        <div className="flex flex-col bg-[#0D0D0F]/80 backdrop-blur-xl border border-gold-DEFAULT/40 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] w-full">
          {tools.map(tool => {
            const Icon = tool.icon;
            const isActive = currentTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  onToolChange(tool.id);
                  setIsOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 p-2 transition-all border-b border-gold-DEFAULT/20 last:border-b-0 ${
                  isActive 
                    ? 'bg-gold-DEFAULT/20 text-gold-bright shadow-[inset_0_0_10px_rgba(212,175,55,0.2)]' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title={tool.label}
              >
                <Icon size={16} />
                <span className="text-[10px] font-cinzel tracking-wider uppercase font-bold">{tool.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
