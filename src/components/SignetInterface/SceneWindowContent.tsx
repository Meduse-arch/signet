import { useRef, useState } from 'react';
import { Plus, Check, X } from 'lucide-react';

interface SceneItem {
  id: string;
  name: string;
  url: string;
}

interface SceneWindowContentProps {
  scenes: SceneItem[];
  currentSceneId: string;
  onSelectScene: (scene: SceneItem) => void;
  onAddScene?: (name: string, url: string) => void;
}

export function SceneWindowContent({ scenes, currentSceneId, onSelectScene, onAddScene }: SceneWindowContentProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newUrl && onAddScene) {
      onAddScene(newName, newUrl);
      setNewName('');
      setNewUrl('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* List of scenes */}
      <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            onDoubleClick={() => onSelectScene(scene)}
            className={`group relative h-16 w-full rounded-lg overflow-hidden cursor-pointer border transition-all ${
              currentSceneId === scene.id 
                ? 'border-gold-DEFAULT shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-[1.02]' 
                : 'border-white/10 hover:border-gold-DEFAULT/50 hover:scale-[1.01]'
            }`}
          >
            {/* Map Image Background */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ 
                backgroundImage: `url(${scene.url})`,
                filter: currentSceneId === scene.id ? 'brightness(0.6) saturate(1)' : 'brightness(0.3) saturate(0.5)' 
              }}
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />

            {/* Content */}
            <div className="relative h-full flex items-center px-4 gap-4">
              <span className={`text-[10px] font-cinzel font-black transition-colors ${
                currentSceneId === scene.id ? 'text-gold-bright' : 'text-gold-dim/50'
              }`}>
                {(index + 1).toString().padStart(2, '0')}
              </span>
              <span className="text-xs font-cinzel font-bold text-white tracking-widest uppercase truncate pr-8">
                {scene.name}
              </span>
            </div>

            {/* Sceau d'activation (Active state glow) */}
            {currentSceneId === scene.id && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-gold-DEFAULT/50 flex items-center justify-center">
                 <div className="w-4 h-4 rounded-full bg-gold-DEFAULT/40 animate-ping absolute" />
                 <div className="w-4 h-4 rounded-full bg-gold-DEFAULT/60 relative z-10" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Scene Button or Form */}
      {onAddScene && (
        <>
          {isAdding ? (
            <form onSubmit={handleAddSubmit} className="p-3 rounded-lg border border-gold-DEFAULT/20 bg-black/40 space-y-3 animate-in fade-in zoom-in-95 duration-200">
               <div className="space-y-1">
                  <label className="text-[8px] font-cinzel text-gold-muted uppercase tracking-widest">Nom du lieu</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: Forêt d'Émeraude"
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-gold-DEFAULT/50 outline-none"
                  />
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] font-cinzel text-gold-muted uppercase tracking-widest">URL de l'image</label>
                  <input 
                    type="text" 
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-gold-DEFAULT/50 outline-none"
                  />
               </div>
               <div className="flex gap-2 pt-1">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-1.5 rounded bg-white/5 text-[9px] font-cinzel text-white/50 hover:bg-white/10"
                  >
                    ANNULER
                  </button>
                  <button 
                    type="submit"
                    disabled={!newName || !newUrl}
                    className="flex-1 py-1.5 rounded bg-gold-DEFAULT/20 text-[9px] font-cinzel text-gold-bright border border-gold-DEFAULT/30 hover:bg-gold-DEFAULT/30 disabled:opacity-30"
                  >
                    SCELLER
                  </button>
               </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3 rounded-lg border border-dashed border-gold-DEFAULT/30 bg-gold-DEFAULT/5 hover:bg-gold-DEFAULT/10 text-gold-dim hover:text-gold-bright transition-all flex items-center justify-center gap-2 group"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />
              <span className="text-[10px] font-cinzel font-black tracking-widest uppercase">Nouvelle Scène</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
