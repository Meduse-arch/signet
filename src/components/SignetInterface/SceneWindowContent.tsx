import { useRef, useState, useEffect } from 'react';
import { Plus, Check, X, Eye, EyeOff, Settings2, Trash2 } from 'lucide-react';
import { MapItem } from '../BoardCanvas';
import { SecurityLevel, useAuthStore } from '../../store/auth';

interface SceneWindowContentProps {
  sessionId: string;
  scenes: MapItem[];
  currentSceneId: string;
  onSelectScene: (scene: MapItem, global?: boolean) => void;
  onAddScene?: (name: string, url: string) => void;
  onUpdateScene?: (id: string, updates: Partial<MapItem>) => void;
  onToggleHide?: (id: string, hidden: boolean) => void;
  onRemoveScene?: (id: string) => void;
}

export function SceneWindowContent({ sessionId, scenes, currentSceneId, onSelectScene, onAddScene, onUpdateScene, onToggleHide, onRemoveScene }: SceneWindowContentProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [gridSize, setGridSize] = useState(50);

  const { user } = useAuthStore();
  const isMJ = user && user.role >= SecurityLevel.MJ;

  useEffect(() => {
    if (editingId) {
        const scene = scenes.find(s => s.id === editingId);
        if (scene) {
            setNewName(scene.name);
            setNewUrl(scene.url);
            setGridSize(scene.grid_size || 50);
        }
    }
  }, [editingId, scenes]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newUrl && onAddScene) {
      onAddScene(newName, newUrl);
      resetForm();
      setIsAdding(false);
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && onUpdateScene) {
        onUpdateScene(editingId, { name: newName, url: newUrl, grid_size: gridSize });
        setEditingId(null);
        resetForm();
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewUrl('');
    setGridSize(50);
  };

  // Filtrer les scènes cachées pour les joueurs
  const visibleScenes = isMJ ? scenes : scenes.filter(s => !s.is_hidden || s.id === 'initial-scene');

  return (
    <div className="space-y-3">
      {/* List of scenes */}
      <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
        {visibleScenes.map((scene, index) => (
          <div
            key={scene.id}
            onClick={() => onSelectScene(scene, false)}
            onDoubleClick={() => isMJ && onSelectScene(scene, true)}
            className={`group relative h-16 w-full rounded-lg overflow-hidden cursor-pointer border transition-all ${
              currentSceneId === scene.id 
                ? 'border-gold-DEFAULT shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-[1.02]' 
                : 'border-white/10 hover:border-gold-DEFAULT/50 hover:scale-[1.01]'
            } ${scene.is_hidden && scene.id !== 'initial-scene' ? 'opacity-60 grayscale-[0.5]' : ''}`}
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
              <span className={`text-xs font-cinzel font-black transition-colors ${
                currentSceneId === scene.id ? 'text-gold-bright' : 'text-gold-DEFAULT drop-shadow-md/50'
              }`}>
                {(index + 1).toString().padStart(2, '0')}
              </span>
              <div className="flex flex-col flex-1 truncate">
                <span className="text-xs font-cinzel font-bold text-white tracking-widest uppercase truncate pr-8">
                  {scene.name}
                </span>
                <div className="flex gap-2 items-center">
                    {isMJ && scene.is_hidden && scene.id !== 'initial-scene' && (
                        <span className="text-[11px] font-cinzel font-black text-red-500 uppercase tracking-widest">Cachée</span>
                    )}
                    <span className="text-[11px] font-cinzel font-black text-white/50 uppercase tracking-widest">Grille: {scene.grid_size || 50}px</span>
                </div>
              </div>
            </div>

            {/* MJ Actions */}
            {isMJ && (
              <div className="absolute right-12 top-1/2 -translate-y-1/2 flex gap-1 opacity-30 group-hover:opacity-100 z-20 transition-all">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(scene.id);
                    }}
                    className="p-2 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-gold-bright hover:border-gold-DEFAULT/40 transition-all"
                    title="Modifier les paramètres"
                >
                    <Settings2 size={14} />
                </button>
                {scene.id !== 'initial-scene' && (
                  <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleHide?.(scene.id, !scene.is_hidden);
                        }}
                        className="p-2 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-gold-bright hover:border-gold-DEFAULT/40 transition-all"
                        title={scene.is_hidden ? "Rendre visible" : "Cacher aux joueurs"}
                    >
                        {scene.is_hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Supprimer définitivement ce plan ?')) {
                                onRemoveScene?.(scene.id);
                            }
                        }}
                        className="p-2 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-red-500 hover:border-red-500/40 transition-all"
                        title="Supprimer le plan"
                    >
                        <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            )}

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

      {/* Forms for Add or Update */}
      {(isAdding || editingId) && isMJ && (
        <form onSubmit={editingId ? handleUpdateSubmit : handleAddSubmit} className="p-3 rounded-lg border border-gold-DEFAULT/40 bg-[#0D0D0F]/80 space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-xs font-cinzel font-black text-gold-bright uppercase tracking-widest border-b border-white/5 pb-1">
                {editingId ? "Paramètres du Plan" : "Nouveau Plan"}
            </h4>
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1 col-span-2">
                  <label className="text-xs font-cinzel text-gold-muted uppercase tracking-widest">Nom du lieu</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ex: Forêt d'Émeraude"
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-gold-DEFAULT/50 outline-none"
                  />
               </div>
               <div className="space-y-1 col-span-2">
                  <label className="text-xs font-cinzel text-gold-muted uppercase tracking-widest">URL de l'image</label>
                  <input 
                    type="text" 
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-gold-DEFAULT/50 outline-none"
                  />
               </div>
               <div className="space-y-1 col-span-2">
                  <label className="text-xs font-cinzel text-gold-muted uppercase tracking-widest">Taille de la Grille (Pixels)</label>
                  <div className="flex items-center gap-3">
                    <input 
                        type="range"
                        min="20"
                        max="200"
                        step="5"
                        value={gridSize}
                        onChange={e => setGridSize(parseInt(e.target.value))}
                        className="flex-1 accent-gold-DEFAULT"
                    />
                    <span className="text-xs font-mono text-gold-bright w-8 text-right">{gridSize}</span>
                  </div>
               </div>
            </div>
            <div className="flex gap-2 pt-1">
               <button 
                 type="button"
                 onClick={() => { setIsAdding(false); setEditingId(null); resetForm(); }}
                 className="flex-1 py-1.5 rounded bg-white/5 text-[11px] font-cinzel text-white/80 hover:bg-white/10"
               >
                 ANNULER
               </button>
               <button 
                 type="submit"
                 disabled={!newName || !newUrl}
                 className="flex-1 py-1.5 rounded bg-gold-DEFAULT/20 text-[11px] font-cinzel text-gold-bright border border-gold-DEFAULT/30 hover:bg-gold-DEFAULT/30 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {editingId ? "APPLIQUER" : "SCELLER"}
               </button>
            </div>
        </form>
      )}

      {/* Add Scene Button */}
      {!isAdding && !editingId && onAddScene && isMJ && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-3 rounded-lg border border-dashed border-gold-DEFAULT/30 bg-gold-DEFAULT/5 hover:bg-gold-DEFAULT/10 text-gold-DEFAULT drop-shadow-md hover:text-gold-bright transition-all flex items-center justify-center gap-2 group"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-cinzel font-black tracking-widest uppercase">Nouvelle Scène</span>
        </button>
      )}
    </div>
  );
}
