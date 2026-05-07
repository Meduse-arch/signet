import { useState } from 'react';
import { Search, Grid, X, Map as MapIcon, Image as ImageIcon } from 'lucide-react';
import { SecurityLevel, useAuthStore } from '../../store/auth';

export interface MapAsset {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
}

interface MapGalleryProps {
  maps: MapAsset[];
  currentMapId: string;
  onSelectMap: (id: string) => void;
  onSearch?: (query: string) => void;
}

export function MapGallery({ maps, currentMapId, onSelectMap }: MapGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();
  
  const isMJ = user && user.role >= SecurityLevel.MJ;
  const currentMap = maps.find(m => m.id === currentMapId);

  const filteredMaps = maps.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute bottom-6 right-8 flex flex-col items-end gap-4 z-30">
      {/* GALLERY POPUP (Foundry style) */}
      {isOpen && (
        <div className="mb-2 w-80 max-h-[400px] bg-black/80 backdrop-blur-xl border border-gold-DEFAULT/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-gold-bright" />
              <span className="text-[10px] font-cinzel font-black text-gold-bright tracking-widest uppercase">Galerie des Cartes</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          <div className="p-3 border-b border-white/5 bg-black/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input 
                type="text"
                placeholder="Rechercher une archive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-gold-DEFAULT/30 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-3 scrollbar-none">
            {filteredMaps.map((map) => (
              <button
                key={map.id}
                onClick={() => {
                  onSelectMap(map.id);
                  if (!isMJ) setIsOpen(false); // Close for players on select
                }}
                className={`relative group aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                  currentMapId === map.id 
                    ? 'border-gold-DEFAULT shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                {map.thumbnail || map.url ? (
                  <img src={map.thumbnail || map.url} alt={map.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white/10" />
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity ${currentMapId === map.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="block text-[8px] font-bold text-white uppercase tracking-wider truncate">{map.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* COMPACT HUD CARD */}
      <div className="flex items-center gap-3">
        {/* Search HUD (Integrated) */}
        <div className="h-12 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl flex items-center px-4 gap-3 group hover:border-white/10 transition-all">
          <Search className="w-4 h-4 text-white/30 group-focus-within:text-gold-bright transition-colors" />
          <input 
            type="text"
            placeholder={currentMap?.name || 'Explorer...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-white/80 placeholder:text-white/40 w-32 group-focus-within:w-48 transition-all duration-300"
          />
          <div className="h-4 w-px bg-white/10" />
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2 rounded-xl transition-all ${isOpen ? 'bg-gold-DEFAULT text-black' : 'hover:bg-white/5 text-white/50 hover:text-gold-bright'}`}
            title="Galerie des Cartes"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Current Map Indicator */}
        <div className="h-12 px-5 bg-black/60 backdrop-blur-xl border border-gold-DEFAULT/20 rounded-2xl flex items-center gap-3 shadow-2xl">
          <div className="relative">
            <div className="absolute inset-0 bg-gold-DEFAULT/20 blur-md rounded-full animate-pulse" />
            <MapIcon className="w-4 h-4 text-gold-bright relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-gold-dim uppercase tracking-[0.2em] leading-none mb-1">Localisation</span>
            <span className="text-[10px] font-cinzel font-black text-white tracking-widest uppercase">
              {currentMap?.name || 'Hub Spirituel'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
