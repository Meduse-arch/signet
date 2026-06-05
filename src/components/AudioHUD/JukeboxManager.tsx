import { useState, useRef, useEffect } from 'react';
import { Upload, Play, Square, Volume2, X, Music, RadioReceiver } from 'lucide-react';
import { useAudioSync } from '../../hooks/useAudioSync';
import { dbStorage } from '../../services/db.storage';
import { calculateHash } from '../../services/transfer.service';
import { usePeersStore } from '../../store/peers';

interface JukeboxManagerProps {
  sessionId: string;
  onClose: () => void;
  audioSync: ReturnType<typeof useAudioSync>;
}

interface AudioFile {
  hash: string;
  title: string;
  mime: string;
  size: number;
}

export function JukeboxManager({ sessionId, onClose, audioSync }: JukeboxManagerProps) {
  const [tracks, setTracks] = useState<AudioFile[]>([]);
  const [sfxs, setSfxs] = useState<AudioFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingState, setUploadingState] = useState<{type: 'track' | 'sfx', name: string} | null>(null);
  
  const { connections } = usePeersStore();

  useEffect(() => {
    // Load from IndexedDB
    const loadAssets = async () => {
      // Pour l'instant, on liste tout ce qui est audio. On pourrait filtrer par nom.
      // Mais on n'a pas de getAll() complet dans dbStorage pour assets. On va devoir gérer une liste locale (ex: dans un store ou localStorage).
      const savedTracks = localStorage.getItem(`signet_tracks_${sessionId}`);
      if (savedTracks) setTracks(JSON.parse(savedTracks));
      
      const savedSfx = localStorage.getItem(`signet_sfx_${sessionId}`);
      if (savedSfx) setSfxs(JSON.parse(savedSfx));
    };
    loadAssets();
  }, []);

  const saveToLocal = (t: AudioFile[], s: AudioFile[]) => {
    localStorage.setItem(`signet_tracks_${sessionId}`, JSON.stringify(t));
    localStorage.setItem(`signet_sfx_${sessionId}`, JSON.stringify(s));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSfx: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.replace(/\.[^/.]+$/, "");
    setUploadingState({ type: isSfx ? 'sfx' : 'track', name });
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          console.error("Buffer vide !");
          setUploadingState(null);
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
      setUploadingState(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      console.error("Erreur FileReader");
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadingState(null);
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
              <input type="file" ref={fileInputRef} accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, false)} disabled={!!uploadingState} />
            </label>
          </div>
          
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {uploadingState?.type === 'track' && (
               <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 opacity-70">
                 <div className="flex items-center gap-3 overflow-hidden">
                   <div className="w-2 h-2 shrink-0 border border-white/50 border-t-transparent rounded-full animate-spin" title="Préparation..." />
                   <div className="w-8 h-8 shrink-0 rounded-md bg-gold-DEFAULT/10 flex items-center justify-center">
                     <Music size={14} className="text-gold-DEFAULT" />
                   </div>
                   <div className="flex flex-col min-w-0">
                     <span className="text-xs text-white/90 font-cinzel truncate tracking-wide">{uploadingState.name}</span>
                     <span className="text-[10px] text-white/50 tracking-widest uppercase">Préparation...</span>
                   </div>
                 </div>
               </div>
            )}
            {tracks.length === 0 && uploadingState?.type !== 'track' && <span className="text-xs text-white/30 italic">Aucune musique</span>}
            {tracks.map(t => {
              const readyCount = Object.keys(audioSync.syncStatus[t.hash] || {}).length;
              const isReady = readyCount >= connections.length || connections.length === 0;

              return (
              <div key={t.hash} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-gold-DEFAULT/30 transition-all group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse'}`} title={isReady ? "Prêt pour tous" : "Transfert en cours..."} />
                  <div className="w-8 h-8 rounded-md bg-gold-DEFAULT/10 flex items-center justify-center shrink-0 border border-gold-DEFAULT/20 group-hover:bg-gold-DEFAULT/20 transition-colors">
                    <Music size={14} className="text-gold-DEFAULT" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white/90 truncate">{t.title}</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">{(t.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleDelete(t.hash, false)}
                    className="text-white/30 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <X size={14} />
                  </button>
                  <button 
                    onClick={() => audioSync.playAmbiance(t.hash, t.title)}
                    disabled={!isReady}
                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${isReady ? 'bg-gold-DEFAULT/20 text-gold-DEFAULT hover:bg-gold-DEFAULT hover:text-black' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                    title={isReady ? "Jouer" : "Attendez la fin du transfert..."}
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Soundboard (SFX) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs text-white/60 font-bold uppercase tracking-widest flex items-center gap-1"><RadioReceiver size={14}/> Soundboard</h4>
            <label className="cursor-pointer text-cyan-400/70 hover:text-cyan-400 flex items-center gap-1 text-xs">
              <Upload size={14} /> Importer
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(e, true)} disabled={!!uploadingState} />
            </label>
          </div>
          
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
             {uploadingState?.type === 'sfx' && (
                <div className="col-span-2 flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 opacity-70">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-2 h-2 shrink-0 border border-white/50 border-t-transparent rounded-full animate-spin" title="Préparation..." />
                    <div className="w-8 h-8 shrink-0 rounded-md bg-cyan-500/10 flex items-center justify-center">
                      <RadioReceiver size={14} className="text-cyan-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-white/90 font-cinzel truncate tracking-wide">{uploadingState.name}</span>
                      <span className="text-[10px] text-white/50 tracking-widest uppercase">Préparation...</span>
                    </div>
                  </div>
                </div>
             )}
             {sfxs.length === 0 && uploadingState?.type !== 'sfx' && <span className="text-xs text-white/30 italic col-span-2">Aucun son</span>}
             {sfxs.map(s => {
               const readyCount = Object.keys(audioSync.syncStatus[s.hash] || {}).length;
               const isReady = readyCount >= connections.length || connections.length === 0;
               return (
               <div key={s.hash} className="relative group flex items-center gap-1">
                 <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isReady ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                 <button
                   onClick={() => audioSync.playSFX(s.hash)}
                   disabled={!isReady}
                   className={`w-full text-left text-xs py-1.5 px-2 rounded truncate transition-colors ${isReady ? 'bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/20 text-cyan-100' : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'}`}
                   title={isReady ? s.title : "Transfert..."}
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
             )})}
          </div>
        </div>

      </div>
    </div>
  );
}
