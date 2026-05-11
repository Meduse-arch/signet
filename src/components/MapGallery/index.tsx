import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Plus, Grid, X, Check } from 'lucide-react';

interface MapItem {
  id: string;
  name: string;
  url: string;
}

interface MapGalleryProps {
  maps: MapItem[];
  currentMapId?: string;
  onSelectMap: (map: MapItem) => void;
  onAddMap: (name: string, url: string) => void;
}

export function MapGallery({ maps, currentMapId, onSelectMap, onAddMap }: MapGalleryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="fixed bottom-6 right-8 flex flex-col items-end gap-3 z-30 pointer-events-none">
      {/* Scrollable Banner Container */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div 
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory max-w-[400px] p-2 bg-[#0D0D0F]/80 backdrop-blur-md rounded-2xl border border-gold-DEFAULT/40"
        >
          {maps.map((map) => (
            <button
              key={map.id}
              onClick={() => onSelectMap(map)}
              className={`relative shrink-0 w-24 h-14 rounded-lg overflow-hidden snap-start border-2 transition-all group ${
                currentMapId === map.id ? 'border-gold-bright shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'border-transparent hover:border-gold-DEFAULT/50'
              }`}
            >
              <img src={map.url} alt={map.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                <span className="text-[8px] font-cinzel text-white truncate w-full">{map.name}</span>
              </div>
              {currentMapId === map.id && (
                <div className="absolute top-1 right-1 bg-gold-bright rounded-full p-0.5">
                  <Check className="w-2 h-2 text-black" />
                </div>
              )}
            </button>
          ))}
          
          {maps.length === 0 && (
            <div className="w-24 h-14 rounded-lg bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-white/20" />
            </div>
          )}
        </div>

        {/* Gallery Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-3 rounded-2xl bg-gold-DEFAULT text-black shadow-lg hover:shadow-gold-DEFAULT/20 transition-all active:scale-95 group"
        >
          <Grid className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>

      {/* Gallery Modal */}
      {isModalOpen && (
        <MapGalleryModal 
          maps={maps} 
          currentMapId={currentMapId}
          onClose={() => setIsModalOpen(false)}
          onSelect={(map) => {
            onSelectMap(map);
            setIsModalOpen(false);
          }}
          onAdd={onAddMap}
        />
      )}
    </div>
  );
}

interface ModalProps {
  maps: MapItem[];
  currentMapId?: string;
  onClose: () => void;
  onSelect: (map: MapItem) => void;
  onAdd: (name: string, url: string) => void;
}

function MapGalleryModal({ maps, currentMapId, onClose, onSelect, onAdd }: ModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newUrl) {
      onAdd(newName, newUrl);
      setNewName('');
      setNewUrl('');
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[#0D0D0F] border border-gold-DEFAULT/40 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-8 border-b border-gold-DEFAULT/30 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gold-bright tracking-widest uppercase">Galerie des Cartographies</h2>
            <p className="text-gold-DEFAULT drop-shadow-md/60 font-serif italic">Sélectionnez ou invoquez un nouveau royaume</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6 text-gold-DEFAULT drop-shadow-md" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Add Map Trigger */}
            <button 
              onClick={() => setIsAdding(true)}
              className="aspect-video rounded-2xl border-2 border-dashed border-gold-DEFAULT/40 hover:border-gold-DEFAULT/50 hover:bg-gold-DEFAULT/5 transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <Plus className="w-8 h-8 text-gold-DEFAULT drop-shadow-md group-hover:text-gold-bright transition-colors" />
              <span className="text-[10px] font-cinzel font-bold text-gold-DEFAULT drop-shadow-md group-hover:text-gold-bright tracking-widest">NOUVEL ANCRAGE</span>
            </button>

            {maps.map((map) => (
              <div 
                key={map.id}
                onClick={() => onSelect(map)}
                className={`group relative aspect-video rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                  currentMapId === map.id ? 'border-gold-bright' : 'border-transparent hover:border-gold-DEFAULT/30'
                }`}
              >
                <img src={map.url} alt={map.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity ${
                  currentMapId === map.id ? 'opacity-90' : 'opacity-40 group-hover:opacity-80'
                }`} />
                
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <span className="text-xs font-cinzel font-bold text-white tracking-widest uppercase truncate">{map.name}</span>
                  {currentMapId === map.id && (
                    <span className="text-[8px] text-gold-bright font-black tracking-[0.2em] mt-1">CARTE ACTIVE</span>
                  )}
                </div>

                {currentMapId === map.id && (
                  <div className="absolute top-3 right-3 bg-gold-bright text-black p-1 rounded-full">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Map Overlay */}
      {isAdding && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#0D0D0F]/80 backdrop-blur-sm" onClick={() => setIsAdding(false)} />
          <form 
            onSubmit={handleSubmit}
            className="relative w-full max-w-md bg-[#16161A] border border-gold-DEFAULT/30 rounded-3xl p-8 shadow-2xl space-y-6"
          >
            <h3 className="text-lg font-black text-gold-bright tracking-widest uppercase text-center">Invoquer une Image</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT drop-shadow-md tracking-widest uppercase ml-1">Nom du Lieu</label>
                <input 
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ex: Donjon des Ombres"
                  className="w-full bg-[#0D0D0F]/80 border border-gold-DEFAULT/40 rounded-xl px-4 py-3 text-sm focus:border-gold-DEFAULT/50 outline-none transition-all placeholder:text-white/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-cinzel font-black text-gold-DEFAULT drop-shadow-md tracking-widest uppercase ml-1">Lien du Grimoire (URL)</label>
                <input 
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#0D0D0F]/80 border border-gold-DEFAULT/40 rounded-xl px-4 py-3 text-sm focus:border-gold-DEFAULT/50 outline-none transition-all placeholder:text-white/10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-[10px] font-cinzel font-bold hover:bg-white/5 transition-all"
              >
                ANNULER
              </button>
              <button 
                type="submit"
                disabled={!newName || !newUrl}
                className="flex-2 px-8 py-3 rounded-xl bg-gold-DEFAULT text-black text-[10px] font-cinzel font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50 disabled:grayscale"
              >
                LIER LA CARTE
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
