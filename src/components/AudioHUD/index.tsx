import { useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, Repeat } from 'lucide-react';
import { useAudioSync } from '../../hooks/useAudioSync';
import { useAuthStore } from '../../store/auth';
import { audioService } from '../../services/audio.service';
import { JukeboxManager } from './JukeboxManager';

interface AudioHUDProps {
  sessionId: string;
}

export function AudioHUD({ sessionId }: AudioHUDProps) {
  const { user } = useAuthStore();
  const isMJ = !!user && user.role >= 1;
  
  const audioSync = useAudioSync();
  
  const [showManager, setShowManager] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!audioSync.isPlaying) return;
    const interval = setInterval(() => {
      if (!isDragging) {
        setPosition(audioService.getAmbiancePosition());
        setDuration(audioService.getAmbianceDuration());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [audioSync.isPlaying, isDragging]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const newMuted = (val > 0 && isMuted) ? false : isMuted;
    if (newMuted !== isMuted) setIsMuted(newMuted);
    
    const effectiveVolume = newMuted ? 0 : val;
    audioService.setMasterVolume(effectiveVolume);
    if (audioSync.mseState.audioRef.current) {
      audioSync.mseState.audioRef.current.volume = effectiveVolume;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    const effectiveVolume = newMuted ? 0 : volume;
    audioService.setMasterVolume(effectiveVolume);
    if (audioSync.mseState.audioRef.current) {
      audioSync.mseState.audioRef.current.volume = effectiveVolume;
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center pb-4">
      
      {/* Jukebox Manager (MJ only) */}
      {showManager && isMJ && (
        <JukeboxManager onClose={() => setShowManager(false)} audioSync={audioSync} />
      )}

      {/* Élément audio pour le rendu du buffer MSE (doit être dans le DOM pour l'autoplay) */}
      <audio ref={audioSync.mseState.audioRef} style={{ display: 'none' }} />

      {/* Ultra Minimalist Bar - Vertical Layout */}
      <div className="pointer-events-auto flex flex-col items-center gap-2 px-6 py-2 w-full max-w-lg group">
        
        {/* Top Row: Controls */}
        <div className="flex justify-between items-center w-full opacity-60 group-hover:opacity-100 transition-opacity">
          
          {/* Left: Music Logo (MJ tools) */}
          <div className="flex-1 flex justify-start">
            {isMJ ? (
              <button 
                onClick={() => setShowManager(!showManager)}
                className={`transition-colors ${showManager ? 'text-gold-DEFAULT drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]' : 'text-white/40 hover:text-white'}`}
                title="Gérer la musique"
              >
                <Music size={18} />
              </button>
            ) : (
              <div className="text-white/20">
                <Music size={18} />
              </div>
            )}
          </div>

          {/* Center: Play/Pause & Title */}
          <div className="flex flex-col items-center flex-[2]">
            {isMJ ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => audioSync.isPlaying ? audioSync.pauseAmbiance() : (audioSync.currentHash && audioSync.playAmbiance(audioSync.currentHash, audioSync.currentTrackTitle!))}
                  disabled={!audioSync.currentHash || !audioSync.isTrackReady(audioSync.currentHash)}
                  className="text-white hover:text-gold-DEFAULT hover:scale-110 transition-all disabled:opacity-30 disabled:hover:text-white disabled:hover:scale-100"
                  title={!audioSync.currentHash ? '' : (!audioSync.isTrackReady(audioSync.currentHash) ? "En attente de transfert..." : (audioSync.isPlaying ? "Pause" : "Play"))}
                >
                  {audioSync.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
                <button
                  onClick={audioSync.toggleLoop}
                  className={`transition-all ${audioSync.isLooping ? 'text-gold-DEFAULT drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]' : 'text-white/40 hover:text-white'}`}
                  title="Boucler"
                >
                  <Repeat size={14} />
                </button>
              </div>
            ) : (
               <div className="flex items-center gap-2">
                 <button 
                    onClick={() => window.location.reload()} 
                    className="text-white/40 hover:text-red-500 transition-colors"
                    title="Quitter la session"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                 </button>
                 <div className="text-gold-DEFAULT flex h-5 items-end gap-[2px]">
                   {audioSync.isPlaying && (
                      <>
                        <div className="w-1 bg-current h-full animate-[pulse_1s_ease-in-out_infinite]" />
                        <div className="w-1 bg-current h-2/3 animate-[pulse_1.2s_ease-in-out_infinite_0.2s]" />
                        <div className="w-1 bg-current h-4/5 animate-[pulse_0.8s_ease-in-out_infinite_0.4s]" />
                      </>
                   )}
                 </div>
               </div>
            )}
            
            <span className="text-[10px] text-white/40 font-cinzel tracking-[0.2em] uppercase mt-1 group-hover:text-white/80 transition-colors drop-shadow-md">
              {audioSync.currentTrackTitle || 'Silence'}
            </span>
          </div>

          {/* Right: Volume Slider (Always Visible) */}
          <div className="flex-1 flex justify-end items-center gap-2">
            <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={isMuted ? 0 : volume} 
              onChange={handleVolumeChange}
              className="w-16 h-1 appearance-none bg-white/20 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer cursor-pointer hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
            />
          </div>

        </div>

        {/* Bottom Row: Progress Bar */}
        <div className="flex items-center gap-3 w-full opacity-60 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-white/50 font-mono w-8 text-right">{formatTime(position)}</span>
          
          <div className="flex-1 flex items-center relative group-hover:h-2 h-1 transition-all">
            {isMJ ? (
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={position}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPosition(val);
                }}
                onMouseUp={(e) => {
                  setIsDragging(false);
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  audioSync.seekAudio(val);
                }}
                onTouchEnd={(e) => {
                  setIsDragging(false);
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  audioSync.seekAudio(val);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            ) : null}
            <div className="w-full h-0.5 group-hover:h-1 bg-white/20 rounded-full overflow-hidden transition-all pointer-events-none">
              <div 
                className="h-full bg-white transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
          
          <span className="text-[10px] text-white/50 font-mono w-8">{formatTime(duration)}</span>
        </div>

      </div>
    </div>
  );
}
