const fs = require('fs');

// 1. BoardScene.ts - Add zoomToToken
let boardScene = fs.readFileSync('src/pixi/BoardScene.ts', 'utf8');
if (!boardScene.includes('zoomToToken(')) {
    const zoomLogic = `
  zoomToToken(id: string) {
    const token = this.tokens.get(id);
    if (!token) return;
    
    const scale = 1.5;
    this.scale.set(scale);
    
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;
    
    this.x = screenW / 2 - (token.x * scale);
    this.y = screenH / 2 - (token.y * scale);
    
    this.constrainPan();
  }
`;
    // Insert before 'override destroy('
    boardScene = boardScene.replace('override destroy(options?: any)', zoomLogic + '\n  override destroy(options?: any)');
    fs.writeFileSync('src/pixi/BoardScene.ts', boardScene);
    console.log("Patched BoardScene.ts");
}

// 2. useBoard.ts - Add event listener
let useBoard = fs.readFileSync('src/hooks/useBoard.ts', 'utf8');
if (!useBoard.includes('ZOOM_TO_TOKEN')) {
    const listener = `
  useEffect(() => {
    const handleZoom = (e: CustomEvent<{ id: string }>) => {
      if (boardRef.current) {
        boardRef.current.zoomToToken(e.detail.id);
      }
    };
    window.addEventListener('ZOOM_TO_TOKEN', handleZoom as EventListener);
    return () => window.removeEventListener('ZOOM_TO_TOKEN', handleZoom as EventListener);
  }, []);
`;
    // Insert before `return { addToken, ...`
    useBoard = useBoard.replace('return { addToken, removeToken', listener + '\n  return { addToken, removeToken');
    fs.writeFileSync('src/hooks/useBoard.ts', useBoard);
    console.log("Patched useBoard.ts");
}

// 3. PlayerWindowContent.tsx - Rewrite completely
const playerWindowContent = `import { useState, useMemo } from 'react';
import { useCharactersStore } from '../../store/characters';
import { useMapStore } from '../../store/map';
import { AssetImage } from '../AssetImage';
import { User, Target } from 'lucide-react';

interface PlayerWindowContentProps {
  players?: any[];
  sessionId: string;
}

export function PlayerWindowContent({ sessionId }: PlayerWindowContentProps) {
  const characters = useCharactersStore(state => state.characters);
  const tokenStatuses = useMapStore(state => state.tokenStatuses);

  const tokensOnMap = useMemo(() => {
    return characters.filter(c => tokenStatuses[c.id]);
  }, [characters, tokenStatuses]);

  const handleZoom = (id: string) => {
    window.dispatchEvent(new CustomEvent('ZOOM_TO_TOKEN', { detail: { id } }));
  };

  return (
    <div className="flex flex-col gap-4">
      {tokensOnMap.map((char) => (
        <div 
          key={char.id} 
          onClick={() => handleZoom(char.id)}
          className="group relative p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-gold-DEFAULT/40 transition-all duration-300 cursor-pointer flex items-center gap-4 shadow-lg"
        >
          <div className="w-14 h-14 rounded-2xl border-2 border-white/10 group-hover:border-gold-DEFAULT/40 flex items-center justify-center overflow-hidden bg-black transition-colors">
            {char.image_url ? (
              <AssetImage src={char.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="text-white/60" size={24} />
            )}
          </div>
          
          <div className="flex flex-col flex-1">
            <span className="font-cinzel font-black text-sm uppercase tracking-widest text-gold-bright">
              {char.name}
            </span>
            <span className="text-xs font-mono text-white/50 uppercase tracking-tighter">
              {char.type || 'Entité'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 text-white/60 group-hover:bg-gold-DEFAULT/10 group-hover:text-gold-DEFAULT transition-all">
             <Target size={20} />
          </div>
        </div>
      ))}
      {tokensOnMap.length === 0 && (
        <p className="text-xs text-center text-gold-DEFAULT/50 font-serif italic py-8">
          Aucune entité sur la carte...
        </p>
      )}
    </div>
  );
}
`;
fs.writeFileSync('src/components/SignetInterface/PlayerWindowContent.tsx', playerWindowContent);
console.log("Patched PlayerWindowContent.tsx");
