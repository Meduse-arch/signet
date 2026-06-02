import { useEffect, useState, useRef } from 'react';
import { usePeer } from './usePeer';
import { audioService } from '../services/audio.service';
import { dbStorage } from '../services/db.storage';
import { peerService } from '../services/peer.service';
import { transferService } from '../services/transfer.service';
import { usePeersStore } from '../store/peers';

export function useAudioSync() {
  const { broadcast, onData, sendTo, isHost } = usePeer();
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [syncStatus, setSyncStatus] = useState<Record<string, Record<string, boolean>>>({});
  
  const targetTrackRef = useRef<{hash: string, isPlaying: boolean, position: number} | null>(null);

  // Reset le syncStatus d'un pair s'il se déconnecte (Optionnel mais recommandé)
  // On ne gère pas les déconnexions ici directement mais le status indique juste qui l'a.

  useEffect(() => {
    const unsubData = onData(async (data, fromPeerId) => {
      // Joueur reçoit PLAY
      if (data.type === 'AUDIO_PLAY') {
        const { hash, title, position, mime } = data.payload;
        setCurrentTrackTitle(title);
        setCurrentHash(hash);
        setIsPlaying(true);
        targetTrackRef.current = { hash, isPlaying: true, position: position || 0 };
        
        const asset = await dbStorage.getAsset(hash);
        if (asset) {
          audioService.playAmbiance(hash, asset.data, asset.mime, position || 0);
        } else {
          sendTo(fromPeerId, { type: 'AUDIO_REQUEST', payload: { hash } });
        }
      } 
      
      // Joueur reçoit PAUSE
      else if (data.type === 'AUDIO_PAUSE') {
        audioService.pauseAmbiance();
        setIsPlaying(false);
        if (targetTrackRef.current) targetTrackRef.current.isPlaying = false;
      }
      
      // Joueur reçoit SEEK
      else if (data.type === 'AUDIO_SEEK') {
        if (!isHost) {
          const { position } = data.payload;
          audioService.seekAmbiance(position);
          if (targetTrackRef.current) {
            targetTrackRef.current.position = position;
          }
        }
      }
      
      // Joueur reçoit LOOP
      else if (data.type === 'AUDIO_LOOP') {
        const { loop } = data.payload;
        audioService.setLoopAmbiance(loop);
        setIsLooping(loop);
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
              sendTo(fromPeerId, { 
                type: isSfx ? 'AUDIO_REQUEST_SFX' : 'AUDIO_REQUEST', 
                payload: { hash } 
              });
            } else {
              sendTo(fromPeerId, { type: 'AUDIO_READY', payload: { hash } });
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
      
      // Sync initial pour un joueur qui rejoint
      else if (isHost && data.type === 'INITIAL_SYNC_REQUEST') {
         const savedTracks = localStorage.getItem('sigil_tracks');
         if (savedTracks) {
             const tracks = JSON.parse(savedTracks);
             tracks.forEach((t: any) => {
                 sendTo(fromPeerId, { type: 'AUDIO_PRELOAD', payload: { hash: t.hash, isSfx: false } });
             });
         }
         const savedSfx = localStorage.getItem('sigil_sfx');
         if (savedSfx) {
             const sfxs = JSON.parse(savedSfx);
             sfxs.forEach((t: any) => {
                 sendTo(fromPeerId, { type: 'AUDIO_PRELOAD', payload: { hash: t.hash, isSfx: true } });
             });
         }
         // Sync l'état de lecture actuel si ça joue
         const currentHash = audioService.getAmbianceHash();
         if (currentHash && isPlaying) {
             sendTo(fromPeerId, { type: 'AUDIO_PLAY', payload: { hash: currentHash, title: currentTrackTitle, position: audioService.getAmbiancePosition(), mime: 'audio/mp3' } });
         }
      }

      // MJ reçoit AUDIO_READY
      else if (isHost && data.type === 'AUDIO_READY') {
         const { hash } = data.payload;
         setSyncStatus(prev => ({
             ...prev,
             [hash]: {
                 ...(prev[hash] || {}),
                 [fromPeerId]: true
             }
         }));
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
        
        if (!isHost) {
           const { usePeersStore } = await import('../store/peers');
           const hostId = usePeersStore.getState().connections[0]; // Le joueur n'a qu'une connexion (MJ)
           if (hostId) sendTo(hostId, { type: 'AUDIO_READY', payload: { hash } });
        }
        
        // On joue si c'est la piste en cours
        const target = targetTrackRef.current;
        if (target && target.hash === hash && target.isPlaying) {
            audioService.playAmbiance(hash, data, 'audio/mp3', target.position);
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
        
        if (!isHost) {
           const { usePeersStore } = await import('../store/peers');
           const hostId = usePeersStore.getState().connections[0]; // Le joueur n'a qu'une connexion (MJ)
           if (hostId) sendTo(hostId, { type: 'AUDIO_READY', payload: { hash } });
        }
        
        audioService.playSFX(hash, data, 'audio/mp3');
      }
    });

    return () => {
      unsubData();
      unsubTransfer();
    };
  }, [onData, sendTo, isHost]);

  // Plus de Heartbeat, on se repose sur la synchro NTP initiale

  const playAmbiance = async (hash: string, title: string, fileData?: ArrayBuffer, mime?: string) => {
    if (!isHost) return;
    
    // Si c'est un nouveau fichier, on le save
    if (fileData && mime) {
      await dbStorage.putAsset({ hash, data: fileData, mime, size: fileData.byteLength, last_accessed: Date.now() });
    }

    const asset = await dbStorage.getAsset(hash);
    if (!asset) return;

    setCurrentTrackTitle(title);
    setCurrentHash(hash);
    setIsPlaying(true);
    targetTrackRef.current = { hash, isPlaying: true, position: 0 };
    
    audioService.playAmbiance(hash, asset.data, asset.mime, 0);
    broadcast({ type: 'AUDIO_PLAY', payload: { hash, title, position: 0, mime: asset.mime } });
  };

  const pauseAmbiance = () => {
    if (!isHost) return;
    audioService.pauseAmbiance();
    setIsPlaying(false);
    if (targetTrackRef.current) targetTrackRef.current.isPlaying = false;
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

  const seekAudio = (position: number) => {
    if (!isHost) return;
    audioService.seekAmbiance(position);
    broadcast({ type: 'AUDIO_SEEK', payload: { position } });
  };

  const toggleLoop = () => {
    if (!isHost) return;
    const newLoop = !isLooping;
    setIsLooping(newLoop);
    audioService.setLoopAmbiance(newLoop);
    broadcast({ type: 'AUDIO_LOOP', payload: { loop: newLoop } });
  };

  const isTrackReady = (hash: string) => {
    if (!isHost) return true;
    const connections = usePeersStore.getState().connections;
    const readyCount = Object.keys(syncStatus[hash] || {}).length;
    return readyCount >= connections.length || connections.length === 0;
  };

  return {
    currentTrackTitle,
    currentHash,
    isPlaying,
    isLooping,
    syncStatus,
    playAmbiance,
    pauseAmbiance,
    seekAudio,
    playSFX,
    deleteAudio,
    preloadAudio,
    toggleLoop,
    isTrackReady
  };
}
