import { useState, useRef, useEffect } from 'react';
import { Upload, Play, Square, Volume2, X, Music, RadioReceiver } from 'lucide-react';
import { useAudioSync } from '../../hooks/useAudioSync';
import { dbStorage } from '../../services/db.storage';
import { calculateHash } from '../../services/transfer.service';

interface JukeboxManagerProps {
  onClose: () => void;
  audioSync: ReturnType<typeof useAudioSync>;
}

interface AudioFile {
  hash: string;
  title: string;
  mime: string;
  size: number;
}

export function JukeboxManager({ onClose, audioSync }: JukeboxManagerProps) {
  const [tracks, setTracks] = useState<AudioFile[]>([]);
  const [sfxs, setSfxs] = useState<AudioFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Load from IndexedDB
    const loadAssets = async () => {
      // Pour l'instant, on liste tout ce qui est audio. On pourrait filtrer par nom.
      // Mais on n'a pas de getAll() complet dans dbStorage pour assets. On va devoir gérer une liste locale (ex: dans un store ou localStorage).
      const savedTracks = localStorage.getItem('sigil_tracks');
      if (savedTracks) setTracks(JSON.parse(savedTracks));
      
      const savedSfx = localStorage.getItem('sigil_sfx');
      if (savedSfx) setSfxs(JSON.parse(savedSfx));
    };
    loadAssets();
  }, []);

  const saveToLocal = (t: AudioFile[], s: AudioFile[]) => {
    localStorage.setItem('sigil_tracks', JSON.stringify(t));
    localStorage.setItem('sigil_sfx', JSON.stringify(s));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isSfx: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          console.error("Buffer vide !");
          setIsUploading(false);
          return;
        }

        const hash = await calculateHash(buffer);
        
        const newFile: AudioFile = {
          hash,
          title: file.name.replace(/\.[^/.]+$/, ""),
          mime: file.type || 'audio/mp3',
          size: buffer.byteLength
        };

        // Save to IndexedDB
        await dbStorage.putAsset({
          hash,
          data: buffer,
          mime: newFile.mime,
          size: newFile.size,
          last_accessed: Date.now()
        });

        if (isSfx) {
          const newSfxs = [...sfxs.filter(s => s.hash !== hash), newFile];
          setSfxs(newSfxs);
          saveToLocal(tracks, newSfxs);
          audioSync.preloadAudio(hash, true); // Preload SFX
        } else {
          const newTracks = [...tracks.filter(t => t.hash !== hash), newFile];
          setTracks(newTracks);
          saveToLocal(newTracks, sfxs);
          audioSync.preloadAudio(hash, false); // Preload Ambiance
        }
      } catch (err) {
        console.error("Erreur upload audio", err);
      }
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      console.error("Erreur FileReader");
      setIsUploading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDelete = async (hash: string, isSfx: boolean) => {
    try {
       audioSync.deleteAudio(hash); // This handles dbStorage.deleteAsset(hash) and network sync
       
       if (isSfx) {
         const newSfxs = sfxs.filter(s => s.hash !== hash);
         setSfxs(newSfxs);
         saveToLocal(tracks, newSfxs);
       } else {
         const newTracks = tracks.filter(t => t.hash !== hash);
         setTracks(newTracks);
         saveToLocal(newTracks, sfxs);
       }
    } catch (e) {
       console.error("Erreur suppression", e);
    }
  };

  return (
    <div className="absolute bottom-16 left-6 w-80 max-h-96 bg-[#0D0D0F]/95 backdrop-blur-xl border border-gold-DEFAULT/30 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden pointer-events-auto">
      
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40">
        <h3 className="font-cinzel text-gold-DEFAULT font-bold tracking-wider flex items-center gap-2">
          <Music size={16} /> Jukebox
        </h3>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar flex flex-col gap-4">
        
        {/* Musiques (Ambiance) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs text-white/60 font-bold uppercase tracking-widest">Ambiance</h4>
            <label className="cursor-pointer text-gold-DEFAULT/70 hover:text-gold-DEFAULT flex items-center gap-1 text-xs">
              <Upload size={14} /> Importer
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, false)} disabled={isUploading} />
            </label>
          </div>
          
          <div className="flex flex-col gap-1">
            {tracks.length === 0 && <span className="text-xs text-white/30 italic">Aucune musique</span>}
            {tracks.map(t => (
              <div key={t.hash} className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-2 rounded transition-colors group">
                <span className="text-sm text-white/80 truncate pr-2" title={t.title}>{t.title}</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDelete(t.hash, false)}
                    className="text-white/30 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <X size={14} />
                  </button>
                  <button 
                    onClick={() => audioSync.playAmbiance(t.hash, t.title)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gold-DEFAULT/20 text-gold-DEFAULT hover:bg-gold-DEFAULT hover:text-black transition-all"
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Soundboard (SFX) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs text-white/60 font-bold uppercase tracking-widest flex items-center gap-1"><RadioReceiver size={14}/> Soundboard</h4>
            <label className="cursor-pointer text-cyan-400/70 hover:text-cyan-400 flex items-center gap-1 text-xs">
              <Upload size={14} /> Importer
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, true)} disabled={isUploading} />
            </label>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
             {sfxs.length === 0 && <span className="text-xs text-white/30 italic col-span-2">Aucun son</span>}
             {sfxs.map(s => (
               <div key={s.hash} className="relative group">
                 <button
                   onClick={() => audioSync.playSFX(s.hash)}
                   className="w-full bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-100 text-xs py-1.5 px-2 rounded truncate transition-colors"
                   title={s.title}
                 >
                   {s.title}
                 </button>
                 <button
                   onClick={(e) => { e.stopPropagation(); handleDelete(s.hash, true); }}
                   className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <X size={10} />
                 </button>
               </div>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
}
