import { useEffect, useState, useRef, useCallback } from 'react';
import { usePeer } from './usePeer';
import { audioService } from '../services/audio.service';
import { dbStorage } from '../services/db.storage';
import { transferService } from '../services/transfer.service';
import { usePeersStore } from '../store/peers';
import { useMseAudioPlayer } from './useMseAudioPlayer';
import {
  buildStreamPlan,
  AudioStreamProvider,
  validateAudioFormat,
} from '../services/audio-stream.provider';
import type { AudioChunkMessage, AudioReadyMessage } from '../services/audio-stream.provider';

// Seuil en bytes au-delà duquel on bascule en MSE streaming (~5 min à 128kbps)
const LONG_TRACK_THRESHOLD_BYTES = 5 * 60 * (128_000 / 8); // ~4.8 Mo

// Référence au provider actif côté MJ (pour pouvoir l'annuler si on change de piste)
let activeStreamProvider: AudioStreamProvider | null = null;

export function useAudioSync() {
  const { broadcast, onData, sendTo, isHost } = usePeer();
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string | null>(null);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [syncStatus, setSyncStatus] = useState<Record<string, Record<string, boolean>>>({});

  const targetTrackRef = useRef<{ hash: string; isPlaying: boolean; position: number } | null>(null);

  // Hook MSE — actif côté joueur uniquement pour les pistes longues
  const msePlayer = useMseAudioPlayer();
  // On stocke si la piste courante est gérée par MSE ou par Howler
  const isMseTrackRef = useRef(false);

  useEffect(() => {
    const unsubData = onData(async (data, fromPeerId) => {

      // ── Joueur reçoit PLAY ──────────────────────────────────────────────────
      if (data.type === 'AUDIO_PLAY') {
        const { hash, title, position, mime, isLong } = data.payload;
        setCurrentTrackTitle(title);
        setCurrentHash(hash);
        setIsPlaying(true);
        targetTrackRef.current = { hash, isPlaying: true, position: position || 0 };

        if (isLong) {
          // Piste longue : MSE prend en charge — on attend AUDIO_MSE_READY
          isMseTrackRef.current = true;
          // Rien à faire ici : le streaming arrive via AUDIO_MSE_READY + AUDIO_CHUNK
        } else {
          // Piste courte : Howler classique
          isMseTrackRef.current = false;
          const asset = await dbStorage.getAsset(hash);
          if (asset) {
            audioService.playAmbiance(hash, asset.data, asset.mime, position || 0);
          } else {
            sendTo(fromPeerId, { type: 'AUDIO_REQUEST', payload: { hash } });
          }
        }
      }

      // ── Joueur reçoit PAUSE ─────────────────────────────────────────────────
      else if (data.type === 'AUDIO_PAUSE') {
        if (isMseTrackRef.current) {
          msePlayer.pause();
        } else {
          audioService.pauseAmbiance();
        }
        setIsPlaying(false);
        if (targetTrackRef.current) targetTrackRef.current.isPlaying = false;
      }

      // ── Joueur reçoit SEEK ──────────────────────────────────────────────────
      else if (data.type === 'AUDIO_SEEK') {
        if (!isHost) {
          const { position } = data.payload;
          // Le seek n'est pertinent que pour Howler (MSE = ambiance, pas de seek attendu)
          if (!isMseTrackRef.current) {
            audioService.seekAmbiance(position);
          }
          if (targetTrackRef.current) targetTrackRef.current.position = position;
        }
      }

      // ── Joueur reçoit LOOP ──────────────────────────────────────────────────
      else if (data.type === 'AUDIO_LOOP') {
        const { loop } = data.payload;
        audioService.setLoopAmbiance(loop);
        setIsLooping(loop);
      }

      // ── Joueur reçoit DELETE ────────────────────────────────────────────────
      else if (data.type === 'AUDIO_DELETE') {
        const { hash } = data.payload;
        await dbStorage.deleteAsset(hash);
        if (audioService.getAmbianceHash() === hash) {
          audioService.pauseAmbiance();
          setIsPlaying(false);
          setCurrentTrackTitle(null);
        }
        if (isMseTrackRef.current && targetTrackRef.current?.hash === hash) {
          msePlayer.stop();
          isMseTrackRef.current = false;
        }
      }

      // ── Joueur reçoit PRELOAD (pistes courtes uniquement) ───────────────────
      else if (data.type === 'AUDIO_PRELOAD') {
        const { hash, isSfx } = data.payload;
        if (!isHost) {
          dbStorage.getAsset(hash).then(asset => {
            if (!asset) {
              sendTo(fromPeerId, {
                type: isSfx ? 'AUDIO_REQUEST_SFX' : 'AUDIO_REQUEST',
                payload: { hash },
              });
            } else {
              sendTo(fromPeerId, { type: 'AUDIO_READY', payload: { hash } });
            }
          });
        }
      }

      // ── MJ reçoit REQUEST (piste courte — Howler) ───────────────────────────
      else if (isHost && data.type === 'AUDIO_REQUEST') {
        const { hash } = data.payload;
        const asset = await dbStorage.getAsset(hash);
        if (asset) {
          transferService.sendChunkPaced(`audio_${hash}`, asset.data, hash, fromPeerId);
        }
      }

      // ── Joueur reçoit AUDIO_MSE_READY — annonce d'une piste longue MSE ──────
      else if (!isHost && data.type === 'AUDIO_MSE_READY') {
        const msg = data.payload as AudioReadyMessage;
        isMseTrackRef.current = true;
        await msePlayer.onAudioReady(msg);
      }

      // ── Joueur reçoit AUDIO_CHUNK — chunk MSE ───────────────────────────────
      else if (!isHost && data.type === 'AUDIO_CHUNK') {
        const msg = data.payload as AudioChunkMessage;
        msePlayer.onAudioChunk(msg);
      }

      // ── SFX ─────────────────────────────────────────────────────────────────
      else if (data.type === 'AUDIO_SFX') {
        const { hash, mime } = data.payload;
        const asset = await dbStorage.getAsset(hash);
        if (asset) {
          audioService.playSFX(hash, asset.data, asset.mime);
        } else {
          sendTo(fromPeerId, { type: 'AUDIO_REQUEST_SFX', payload: { hash, mime } });
        }
      }

      else if (isHost && data.type === 'AUDIO_REQUEST_SFX') {
        const { hash } = data.payload;
        const asset = await dbStorage.getAsset(hash);
        if (asset) {
          transferService.sendChunkPaced(`sfx_${hash}`, asset.data, hash, fromPeerId);
        }
      }

      // ── Sync initial joueur qui rejoint ─────────────────────────────────────
      else if (isHost && data.type === 'INITIAL_SYNC_REQUEST') {
        const savedTracks = localStorage.getItem('signet_tracks');
        if (savedTracks) {
          const tracks = JSON.parse(savedTracks);
          // Ne précharge que les pistes courtes via PRELOAD — les longues arrivent à la demande
          tracks
            .filter((t: any) => t.size < LONG_TRACK_THRESHOLD_BYTES)
            .forEach((t: any) => {
              sendTo(fromPeerId, { type: 'AUDIO_PRELOAD', payload: { hash: t.hash, isSfx: false } });
            });
        }
        const savedSfx = localStorage.getItem('signet_sfx');
        if (savedSfx) {
          const sfxs = JSON.parse(savedSfx);
          sfxs.forEach((t: any) => {
            sendTo(fromPeerId, { type: 'AUDIO_PRELOAD', payload: { hash: t.hash, isSfx: true } });
          });
        }
        // Sync état de lecture actuel
        const curHash = audioService.getAmbianceHash();
        if (curHash && isPlaying) {
          sendTo(fromPeerId, {
            type: 'AUDIO_PLAY',
            payload: {
              hash: curHash,
              title: currentTrackTitle,
              position: audioService.getAmbiancePosition(),
              mime: 'audio/mp3',
              isLong: false,
            },
          });
        }
      }

      // ── MJ reçoit AUDIO_READY (confirmation joueur a la piste courte) ───────
      else if (isHost && data.type === 'AUDIO_READY') {
        const { hash } = data.payload;
        setSyncStatus(prev => ({
          ...prev,
          [hash]: { ...(prev[hash] || {}), [fromPeerId]: true },
        }));
      }
    });

    // ── Assemblage transferts Howler (pistes courtes) ───────────────────────
    const unsubTransfer = transferService.onChunkAssembled(async (chunkId, data) => {
      if (chunkId.startsWith('audio_')) {
        const hash = chunkId.replace('audio_', '');
        await dbStorage.putAsset({
          hash, data, mime: 'audio/mp3', size: data.byteLength, last_accessed: Date.now(),
        });
        if (!isHost) {
          const hostId = usePeersStore.getState().connections[0];
          if (hostId) sendTo(hostId, { type: 'AUDIO_READY', payload: { hash } });
        }
        const target = targetTrackRef.current;
        if (target && target.hash === hash && target.isPlaying && !isMseTrackRef.current) {
          audioService.playAmbiance(hash, data, 'audio/mp3', target.position);
        }
      } else if (chunkId.startsWith('sfx_')) {
        const hash = chunkId.replace('sfx_', '');
        await dbStorage.putAsset({
          hash, data, mime: 'audio/mp3', size: data.byteLength, last_accessed: Date.now(),
        });
        if (!isHost) {
          const hostId = usePeersStore.getState().connections[0];
          if (hostId) sendTo(hostId, { type: 'AUDIO_READY', payload: { hash } });
        }
        audioService.playSFX(hash, data, 'audio/mp3');
      }
    });

    return () => {
      unsubData();
      unsubTransfer();
    };
  }, [onData, sendTo, isHost, msePlayer, currentTrackTitle, isPlaying]);

  // ── Actions MJ ─────────────────────────────────────────────────────────────

  const playAmbiance = useCallback(async (
    hash: string,
    title: string,
    fileData?: ArrayBuffer,
    mime?: string,
    file?: File, // nécessaire pour MSE (buildStreamPlan a besoin du File)
  ) => {
    if (!isHost) return;

    if (fileData && mime) {
      await dbStorage.putAsset({ hash, data: fileData, mime, size: fileData.byteLength, last_accessed: Date.now() });
    }

    const asset = await dbStorage.getAsset(hash);
    if (!asset) return;

    setCurrentTrackTitle(title);
    setCurrentHash(hash);
    setIsPlaying(true);
    targetTrackRef.current = { hash, isPlaying: true, position: 0 };

    const isLong = asset.size >= LONG_TRACK_THRESHOLD_BYTES;

    // ── ASTUCE : Reconstruire l'objet File si manquant ─────────────────────
    // Si on clique sur "Play" depuis l'UI, on a perdu l'objet File original.
    // Mais on a le buffer et le mime dans IndexedDB ! On recrée un objet File
    // virtuel pour tromper buildStreamPlan et éviter le fallback Howler.
    let streamFile = file;
    if (isLong && !streamFile) {
      const ext = asset.mime === 'audio/wav' ? 'wav' : 'mp3';
      const safeMime = asset.mime === 'audio/mp3' ? 'audio/mpeg' : asset.mime;
      streamFile = new File([asset.data], `track.${ext}`, { type: safeMime });
    }

    if (isLong && streamFile) {
      // ── Piste longue : MSE streaming ──────────────────────────────────────
      const validation = validateAudioFormat(streamFile);
      if (!validation.valid) {
        // Format non supporté pour MSE → fallback Howler avec avertissement
        console.warn(`[AudioSync] ${validation.error} — fallback Howler.`);
        audioService.playAmbiance(hash, asset.data, asset.mime, 0);
        broadcast({ type: 'AUDIO_PLAY', payload: { hash, title, position: 0, mime: asset.mime, isLong: false } });
        return;
      }

      // Annule le streaming précédent si existant
      if (activeStreamProvider) {
        activeStreamProvider.abort();
        activeStreamProvider = null;
      }

      // Joue localement via Howler (le MJ a le fichier complet)
      audioService.playAmbiance(hash, asset.data, asset.mime, 0);

      // Annonce aux joueurs qu'une piste longue MSE arrive
      broadcast({ type: 'AUDIO_PLAY', payload: { hash, title, position: 0, mime: asset.mime, isLong: true } });

      // Construit le plan et streame
      try {
        const plan = await buildStreamPlan(streamFile, hash);
        console.log(`[AudioSync] Plan MSE : ${plan.chunks.length} chunks pour "${title}"`);

        const connections = usePeersStore.getState().connections
          .map(id => (window as any).__peerConnections?.[id])
          .filter(Boolean);

        // Envoie AUDIO_MSE_READY aux joueurs via le wrapper PeerJS existant
        const readyMsg: AudioReadyMessage = {
          type: 'AUDIO_READY',
          trackId: hash,
          totalChunks: plan.chunks.length,
          mimeType: plan.mimeType,
          durationSeconds: plan.chunks.length * 30,
        };
        broadcast({ type: 'AUDIO_MSE_READY', payload: readyMsg });

        // Stream les chunks via broadcast (enveloppés pour le router onData)
        const buffer = await streamFile.arrayBuffer();
        for (let i = 0; i < plan.chunks.length; i++) {
          const chunk = plan.chunks[i];
          const data = buffer.slice(chunk.byteStart, chunk.byteEnd);
          broadcast({
            type: 'AUDIO_CHUNK',
            payload: {
              type: 'AUDIO_CHUNK',
              trackId: hash,
              chunkIndex: i,
              totalChunks: plan.chunks.length,
              data,
              mimeType: plan.mimeType,
            } as AudioChunkMessage,
          });
          if (i === 0) await sleep(50); // priorité absolue au chunk 0
          else await sleep(200);
        }
      } catch (e) {
        console.error('[AudioSync] Erreur MSE streaming:', e);
        // Fallback silencieux : le joueur aura peut-être déjà le fichier en cache
      }

    } else {
      // ── Piste courte : Howler classique ───────────────────────────────────
      audioService.playAmbiance(hash, asset.data, asset.mime, 0);
      broadcast({ type: 'AUDIO_PLAY', payload: { hash, title, position: 0, mime: asset.mime, isLong: false } });
    }
  }, [isHost, broadcast]);

  const pauseAmbiance = useCallback(() => {
    if (!isHost) return;
    audioService.pauseAmbiance();
    setIsPlaying(false);
    if (targetTrackRef.current) targetTrackRef.current.isPlaying = false;
    broadcast({ type: 'AUDIO_PAUSE', payload: {} });
  }, [isHost, broadcast]);

  const playSFX = useCallback(async (hash: string, fileData?: ArrayBuffer, mime?: string) => {
    if (!isHost) return;
    if (fileData && mime) {
      await dbStorage.putAsset({ hash, data: fileData, mime, size: fileData.byteLength, last_accessed: Date.now() });
    }
    const asset = await dbStorage.getAsset(hash);
    if (!asset) return;
    audioService.playSFX(hash, asset.data, asset.mime);
    broadcast({ type: 'AUDIO_SFX', payload: { hash, mime: asset.mime } });
  }, [isHost, broadcast]);

  const deleteAudio = useCallback((hash: string) => {
    if (!isHost) return;
    dbStorage.deleteAsset(hash);
    if (audioService.getAmbianceHash() === hash) pauseAmbiance();
    broadcast({ type: 'AUDIO_DELETE', payload: { hash } });
  }, [isHost, broadcast, pauseAmbiance]);

  const preloadAudio = useCallback((hash: string, isSfx: boolean = false) => {
    if (!isHost) return;
    broadcast({ type: 'AUDIO_PRELOAD', payload: { hash, isSfx } });
  }, [isHost, broadcast]);

  const seekAudio = useCallback((position: number) => {
    if (!isHost) return;
    audioService.seekAmbiance(position);
    broadcast({ type: 'AUDIO_SEEK', payload: { position } });
  }, [isHost, broadcast]);

  const toggleLoop = useCallback(() => {
    if (!isHost) return;
    const newLoop = !isLooping;
    setIsLooping(newLoop);
    audioService.setLoopAmbiance(newLoop);
    broadcast({ type: 'AUDIO_LOOP', payload: { loop: newLoop } });
  }, [isHost, isLooping, broadcast]);

  const isTrackReady = useCallback((hash: string) => {
    if (!isHost) return true;
    const connections = usePeersStore.getState().connections;
    const readyCount = Object.keys(syncStatus[hash] || {}).length;
    return readyCount >= connections.length || connections.length === 0;
  }, [isHost, syncStatus]);

  // État MSE exposé pour l'UI joueur (optionnel)
  const mseState = {
    state: msePlayer.state,
    bufferedChunks: msePlayer.bufferedChunks,
    totalChunks: msePlayer.totalChunks,
  };

  return {
    currentTrackTitle,
    currentHash,
    isPlaying,
    isLooping,
    syncStatus,
    mseState,
    playAmbiance,
    pauseAmbiance,
    seekAudio,
    playSFX,
    deleteAudio,
    preloadAudio,
    toggleLoop,
    isTrackReady,
  };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
