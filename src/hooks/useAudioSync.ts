import { useEffect, useState } from 'react';
import { usePeer } from './usePeer';
import { audioService } from '../services/audio.service';
import { dbStorage } from '../services/db.storage';
import { peerService } from '../services/peer.service';
import { transferService } from '../services/transfer.service';

export function useAudioSync() {
  const { broadcast, onData, sendTo, isHost } = usePeer();
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const unsubData = onData(async (data, fromPeerId) => {
      // Joueur reçoit PLAY
      if (data.type === 'AUDIO_PLAY') {
        const { hash, title, startTime, mime } = data.payload;
        setCurrentTrackTitle(title);
        setIsPlaying(true);
        
        const asset = await dbStorage.getAsset(hash);
        if (asset) {
          // Cache hit
          const latency = (Date.now() - startTime) / 1000;
          audioService.playAmbiance(hash, asset.data, asset.mime, latency);
        } else {
          // Cache miss
          sendTo(fromPeerId, { type: 'AUDIO_REQUEST', payload: { hash } });
        }
      } 
      
      // Joueur reçoit PAUSE
      else if (data.type === 'AUDIO_PAUSE') {
        audioService.pauseAmbiance();
        setIsPlaying(false);
      }
      
      // Joueur reçoit DELETE
      else if (data.type === 'AUDIO_DELETE') {
        const { hash } = data.payload;
        await dbStorage.deleteAsset(hash);
        if (audioService.getAmbianceHash() === hash) {
          audioService.pauseAmbiance();
          setIsPlaying(false);
          setCurrentTrackTitle(null);
        }
      }
      
      // Joueur reçoit PRELOAD
      else if (data.type === 'AUDIO_PRELOAD') {
        const { hash, isSfx } = data.payload;
        if (!isHost) {
          dbStorage.getAsset(hash).then(asset => {
            if (!asset) {
              sendTo(session?.hostPeerId || '', { 
                type: isSfx ? 'AUDIO_REQUEST_SFX' : 'AUDIO_REQUEST', 
                payload: { hash } 
              });
            }
          });
        }
      }
      
      // MJ reçoit REQUEST
      else if (isHost && data.type === 'AUDIO_REQUEST') {
        const { hash } = data.payload;
        const asset = await dbStorage.getAsset(hash);
        if (asset) {
          transferService.sendChunkPaced(`audio_${hash}`, asset.data, hash, fromPeerId);
        }
      }
      
      // SFX Play
      else if (data.type === 'AUDIO_SFX') {
         const { hash, mime } = data.payload;
         const asset = await dbStorage.getAsset(hash);
         if (asset) {
            audioService.playSFX(hash, asset.data, asset.mime);
         } else {
            // Optional: Request SFX if missing
            sendTo(fromPeerId, { type: 'AUDIO_REQUEST_SFX', payload: { hash, mime } });
         }
      }

      // MJ reçoit REQUEST_SFX
      else if (isHost && data.type === 'AUDIO_REQUEST_SFX') {
         const { hash } = data.payload;
         const asset = await dbStorage.getAsset(hash);
         if (asset) {
            transferService.sendChunkPaced(`sfx_${hash}`, asset.data, hash, fromPeerId);
         }
      }
    });

    // Écoute de l'assemblage des transferts
    const unsubTransfer = transferService.onChunkAssembled(async (chunkId, data) => {
      if (chunkId.startsWith('audio_')) {
        const hash = chunkId.replace('audio_', '');
        // On sauvegarde
        await dbStorage.putAsset({
          hash,
          data,
          mime: 'audio/mp3', // Simplification, l'idéal serait de le passer dans le header
          size: data.byteLength,
          last_accessed: Date.now()
        });
        
        // On joue si c'est la piste en cours
        const currentHash = audioService.getAmbianceHash();
        if (!currentHash || currentHash !== hash) {
            // On a reçu la piste, on suppose qu'elle doit être jouée.
            audioService.playAmbiance(hash, data, 'audio/mp3', 0); // Latence brute ici car on n'a plus le startTime initial facilement
            setIsPlaying(true);
        }
      } else if (chunkId.startsWith('sfx_')) {
        const hash = chunkId.replace('sfx_', '');
        await dbStorage.putAsset({
          hash,
          data,
          mime: 'audio/mp3',
          size: data.byteLength,
          last_accessed: Date.now()
        });
        audioService.playSFX(hash, data, 'audio/mp3');
      }
    });

    return () => {
      unsubData();
      unsubTransfer();
    };
  }, [onData, sendTo, isHost]);

  const playAmbiance = async (hash: string, title: string, fileData?: ArrayBuffer, mime?: string) => {
    if (!isHost) return;
    
    // Si c'est un nouveau fichier, on le save
    if (fileData && mime) {
      await dbStorage.putAsset({ hash, data: fileData, mime, size: fileData.byteLength, last_accessed: Date.now() });
    }

    const asset = await dbStorage.getAsset(hash);
    if (!asset) return;

    setCurrentTrackTitle(title);
    setIsPlaying(true);
    
    const startTime = Date.now();
    audioService.playAmbiance(hash, asset.data, asset.mime, 0);
    
    broadcast({ type: 'AUDIO_PLAY', payload: { hash, title, startTime, mime: asset.mime } });
  };

  const pauseAmbiance = () => {
    if (!isHost) return;
    audioService.pauseAmbiance();
    setIsPlaying(false);
    broadcast({ type: 'AUDIO_PAUSE', payload: {} });
  };

  const playSFX = async (hash: string, fileData?: ArrayBuffer, mime?: string) => {
     if (!isHost) return;
     if (fileData && mime) {
       await dbStorage.putAsset({ hash, data: fileData, mime, size: fileData.byteLength, last_accessed: Date.now() });
     }
     const asset = await dbStorage.getAsset(hash);
     if (!asset) return;
     audioService.playSFX(hash, asset.data, asset.mime);
     broadcast({ type: 'AUDIO_SFX', payload: { hash, mime: asset.mime } });
  };

  const deleteAudio = (hash: string) => {
    if (!isHost) return;
    dbStorage.deleteAsset(hash);
    if (audioService.getAmbianceHash() === hash) {
      pauseAmbiance();
    }
    broadcast({ type: 'AUDIO_DELETE', payload: { hash } });
  };

  const preloadAudio = (hash: string, isSfx: boolean = false) => {
    if (!isHost) return;
    broadcast({ type: 'AUDIO_PRELOAD', payload: { hash, isSfx } });
  };

  return {
    playAmbiance,
    pauseAmbiance,
    playSFX,
    deleteAudio,
    preloadAudio,
    currentTrackTitle,
    isPlaying
  };
}
