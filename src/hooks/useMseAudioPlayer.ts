/**
 * useMseAudioPlayer.ts
 * Côté joueur : consomme les chunks reçus via PeerJS et les injecte dans MSE.
 * Buffer glissant — la lecture démarre dès réception du chunk 0.
 */

import { useRef, useState, useCallback, useEffect, type RefObject } from "react";
import type { AudioChunkMessage, AudioReadyMessage } from "../services/audio-stream.provider";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlayerState = "idle" | "buffering" | "playing" | "paused" | "error";

export interface MsePlayerControls {
  state: PlayerState;
  bufferedChunks: number;
  totalChunks: number;
  error: string | null;
  volume: number;
  audioRef: RefObject<HTMLAudioElement | null>;
  setVolume: (v: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  /** Appelé par le service PeerJS quand un message AUDIO_READY arrive */
  onAudioReady: (msg: AudioReadyMessage) => void;
  /** Appelé par le service PeerJS quand un message AUDIO_CHUNK arrive */
  onAudioChunk: (msg: AudioChunkMessage) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMseAudioPlayer(): MsePlayerControls {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBufferWithQueue | null>(null);
  const currentTrackRef = useRef<string | null>(null);
  const pendingChunksRef = useRef<AudioChunkMessage[]>([]);

  const [state, setState] = useState<PlayerState>("idle");
  const [bufferedChunks, setBufferedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(1);

  // Nettoyage complet lors d'un changement de piste ou d'un stop
  const teardown = useCallback(() => {
    if (sourceBufferRef.current) {
      sourceBufferRef.current.destroy();
      sourceBufferRef.current = null;
    }
    if (mediaSourceRef.current && mediaSourceRef.current.readyState === "open") {
      try { mediaSourceRef.current.endOfStream(); } catch (_) {}
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
    }
    mediaSourceRef.current = null;
    currentTrackRef.current = null;
    pendingChunksRef.current = [];
    setBufferedChunks(0);
    setTotalChunks(0);
    setState("idle");
    setError(null);
  }, []);

  // Initialise le MediaSource et attache l'élément audio
  const initMediaSource = useCallback((mimeType: string, totalCk: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log(`[MSE Player] initMediaSource for mimeType: ${mimeType}, totalChunks: ${totalCk}`);
      if (!MediaSource.isTypeSupported(mimeType)) {
        console.error(`[MSE Player] Format not supported: ${mimeType}`);
        reject(new Error(`Format "${mimeType}" non supporté par ce navigateur/Electron.`));
        return;
      }

      const ms = new MediaSource();
      mediaSourceRef.current = ms;

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.volume = volume;
        console.log(`[MSE Player] Created new HTMLAudioElement`);
      }

      audioRef.current.src = URL.createObjectURL(ms);

      ms.addEventListener("sourceopen", () => {
        console.log(`[MSE Player] MediaSource 'sourceopen' event fired`);
        try {
          const sb = ms.addSourceBuffer(mimeType);
          console.log(`[MSE Player] SourceBuffer added for ${mimeType}`);
          sourceBufferRef.current = new SourceBufferWithQueue(sb, totalCk, {
            onFirstChunkReady: () => {
              console.log(`[MSE Player] First chunk ready! Attempting autoplay...`);
              setState("playing");
              const attemptPlay = () => {
                audioRef.current?.play().then(() => {
                  console.log(`[MSE Player] Autoplay succeeded!`);
                  setState("playing");
                }).catch((err) => {
                  console.warn(`[MSE Player] Autoplay blocked:`, err.name, err.message);
                  if (err.name === 'NotAllowedError') {
                    setState("paused");
                    const resumeOnInteraction = () => {
                      console.log(`[MSE Player] User interaction detected, resuming...`);
                      audioRef.current?.play().then(() => {
                        console.log(`[MSE Player] Resumed successfully!`);
                        setState("playing");
                      }).catch((e) => console.error(`[MSE Player] Failed to resume:`, e));
                      document.removeEventListener('click', resumeOnInteraction);
                      document.removeEventListener('touchstart', resumeOnInteraction);
                      document.removeEventListener('keydown', resumeOnInteraction);
                    };
                    document.addEventListener('click', resumeOnInteraction);
                    document.addEventListener('touchstart', resumeOnInteraction);
                    document.addEventListener('keydown', resumeOnInteraction);
                  } else {
                    setState("paused");
                  }
                });
              };
              attemptPlay();
            },
            onError: (err) => {
              console.error(`[MSE Player] SourceBuffer error:`, err);
              setError(err.message);
              setState("error");
            },
            onChunkAppended: (n) => {
              console.log(`[MSE Player] Appended chunk ${n}/${totalCk}`);
              setBufferedChunks(n);
            },
            onComplete: () => {
              console.log(`[MSE Player] All chunks appended. EndOfStream.`);
              try { ms.endOfStream(); } catch (_) {}
            },
          });
          
          if (pendingChunksRef.current.length > 0) {
            console.log(`[MSE Player] Flushing ${pendingChunksRef.current.length} early chunks...`);
            pendingChunksRef.current.forEach(msg => {
              sourceBufferRef.current!.enqueue(msg.chunkIndex, msg.data);
            });
            pendingChunksRef.current = [];
          }
          resolve();
        } catch (e) {
          console.error(`[MSE Player] Error adding SourceBuffer:`, e);
          reject(e);
        }
      }, { once: true });

      ms.addEventListener("error", (e) => {
        console.error(`[MSE Player] MediaSource error event:`, e);
        reject(new Error("MediaSource error"));
      }, { once: true });
    });
  }, [volume]);

  // ── Handlers PeerJS ─────────────────────────────────────────────────────────

  const onAudioReady = useCallback(async (msg: AudioReadyMessage) => {
    console.log(`[MSE Player] onAudioReady received for track: ${msg.trackId}`);
    if (currentTrackRef.current !== msg.trackId) {
      teardown();
      currentTrackRef.current = msg.trackId;
      setTotalChunks(msg.totalChunks);
      setState("buffering");

      try {
        await initMediaSource(msg.mimeType, msg.totalChunks);
        console.log(`[MSE Player] initMediaSource complete`);
      } catch (e) {
        console.error(`[MSE Player] initMediaSource failed:`, e);
        setError((e as Error).message);
        setState("error");
      }
    } else {
      console.log(`[MSE Player] onAudioReady ignored (track already current)`);
    }
  }, [teardown, initMediaSource]);

  const onAudioChunk = useCallback((msg: AudioChunkMessage) => {
    if (msg.trackId !== currentTrackRef.current) {
      console.warn(`[MSE Player] Ignored chunk for wrong track (${msg.trackId} != ${currentTrackRef.current})`);
      return;
    }
    if (!sourceBufferRef.current) {
      console.warn(`[MSE Player] Ignored chunk because sourceBufferRef is null`);
      return;
    }

    console.log(`[MSE Player] Received chunk ${msg.chunkIndex} (${msg.data.byteLength} bytes)`);
    sourceBufferRef.current.enqueue(msg.chunkIndex, msg.data);
  }, []);

  // ── Contrôles utilisateur ───────────────────────────────────────────────────

  const play = useCallback(() => {
    if (audioRef.current && state === "paused") {
      audioRef.current.play().then(() => setState("playing")).catch(() => {});
    }
  }, [state]);

  const pause = useCallback(() => {
    if (audioRef.current && state === "playing") {
      audioRef.current.pause();
      setState("paused");
    }
  }, [state]);

  const stop = useCallback(() => {
    teardown();
  }, [teardown]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => { teardown(); };
  }, [teardown]);

  return {
    state,
    bufferedChunks,
    totalChunks,
    error,
    volume,
    audioRef,
    setVolume,
    play,
    pause,
    stop,
    onAudioReady,
    onAudioChunk,
  };
}

// ─── SourceBufferWithQueue ────────────────────────────────────────────────────
// MSE interdit d'appeler appendBuffer() pendant qu'une opération est en cours.
// Cette classe gère une file d'attente et réordonne les chunks si nécessaire.

interface QueueCallbacks {
  onFirstChunkReady: () => void;
  onChunkAppended: (total: number) => void;
  onComplete: () => void;
  onError: (e: Error) => void;
}

class SourceBufferWithQueue {
  private sb: SourceBuffer;
  private queue: Map<number, ArrayBuffer> = new Map(); // chunkIndex -> data
  private nextExpected = 0;
  private appendedCount = 0;
  private totalChunks: number;
  private cbs: QueueCallbacks;
  private firstChunkReady = false;
  private destroyed = false;

  constructor(sb: SourceBuffer, totalChunks: number, cbs: QueueCallbacks) {
    this.sb = sb;
    this.totalChunks = totalChunks;
    this.cbs = cbs;

    sb.addEventListener("updateend", () => {
      this.appendedCount++;
      this.cbs.onChunkAppended(this.appendedCount);
      
      if (!this.firstChunkReady) {
        this.firstChunkReady = true;
        this.cbs.onFirstChunkReady();
      }
      
      if (this.appendedCount === this.totalChunks) {
        this.cbs.onComplete();
      }
      
      this.flush();
    });
    sb.addEventListener("error", (e) => cbs.onError(new Error("SourceBuffer error")));
  }

  enqueue(index: number, data: ArrayBuffer) {
    if (this.destroyed) return;
    this.queue.set(index, data);
    this.flush();
  }

  private flush() {
    if (this.destroyed) return;
    if (this.sb.updating) return;
    if (!this.queue.has(this.nextExpected)) return;

    const data = this.queue.get(this.nextExpected)!;
    this.queue.delete(this.nextExpected);

    try {
      this.sb.appendBuffer(data);
      this.nextExpected++;
    } catch (e) {
      this.cbs.onError(e as Error);
    }
  }

  destroy() {
    this.destroyed = true;
    this.queue.clear();
    try {
      this.sb.removeEventListener("updateend", this.flush);
    } catch (_) {}
  }
}
