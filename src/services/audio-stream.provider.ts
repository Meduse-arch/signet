/**
 * audio-stream.provider.ts
 * Côté MJ : indexation des frames MP3/OGG/WAV et envoi progressif via PeerJS.
 * Zéro conversion, zéro FFmpeg.
 */

import type { DataConnection } from "peerjs";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupportedFormat = "mp3" | "wav";

export interface StreamPlan {
  trackId: string;
  format: SupportedFormat;
  totalBytes: number;
  chunks: ChunkDescriptor[];
  mimeType: string;
}

interface ChunkDescriptor {
  index: number;
  byteStart: number;
  byteEnd: number; // exclusive
  durationSeconds: number;
}

export interface AudioChunkMessage {
  type: "AUDIO_CHUNK";
  trackId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
  mimeType: string;
}

export interface AudioReadyMessage {
  type: "AUDIO_READY";
  trackId: string;
  totalChunks: number;
  mimeType: string;
  durationSeconds: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CHUNK_TARGET_SECONDS = 30;
const SUPPORTED_MIME: Record<SupportedFormat, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

// Formats refusés explicitement (MSE ne peut pas les streamer sans fragmentation)
const REJECTED_EXTENSIONS = ["m4a", "aac", "flac", "wma", "mp4", "ogg"];

// ─── Validation du format ─────────────────────────────────────────────────────

export function validateAudioFormat(file: File): {
  valid: boolean;
  format?: SupportedFormat;
  error?: string;
} {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (REJECTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Format "${ext.toUpperCase()}" non supporté pour le streaming. Convertis le fichier en MP3 avant de l'importer.`,
    };
  }

  if (ext === "mp3" || file.type === "audio/mpeg" || file.type === "audio/mp3") {
    return { valid: true, format: "mp3" };
  }
  if (ext === "wav" || file.type === "audio/wav") {
    return { valid: true, format: "wav" };
  }

  return {
    valid: false,
    error: `Format non reconnu. Utilise du MP3 ou WAV.`,
  };
}

// ─── Indexation MP3 ───────────────────────────────────────────────────────────
// Lit les frame headers MP3 (sync word 0xFFE0) sans librairie externe.
// Chaque frame MP3 contient exactement 1152 samples @ 44100Hz = ~26ms.

function parseMp3Frames(buffer: ArrayBuffer): number[] {
  const view = new Uint8Array(buffer);
  const offsets: number[] = [];
  let i = 0;

  // Skip l'éventuel tag ID3v2 en début de fichier
  if (view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33) {
    const id3Size =
      ((view[6] & 0x7f) << 21) |
      ((view[7] & 0x7f) << 14) |
      ((view[8] & 0x7f) << 7) |
      (view[9] & 0x7f);
    i = 10 + id3Size;
  }

  while (i < view.length - 4) {
    // Sync word : 11 bits à 1 (0xFF 0xE0 minimum)
    if (view[i] === 0xff && (view[i + 1] & 0xe0) === 0xe0) {
      const header = (view[i] << 24) | (view[i + 1] << 16) | (view[i + 2] << 8) | view[i + 3];

      const versionBits = (header >> 19) & 0x3;
      const layerBits = (header >> 17) & 0x3;
      const bitrateBits = (header >> 12) & 0xf;
      const sampleRateBits = (header >> 10) & 0x3;
      const padding = (header >> 9) & 0x1;

      // On ne supporte que MPEG1 Layer3 (le MP3 standard)
      if (versionBits !== 3 || layerBits !== 1 || bitrateBits === 0 || bitrateBits === 0xf) {
        i++;
        continue;
      }

      const BITRATES_MPEG1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
      const SAMPLE_RATES = [44100, 48000, 32000, 0];

      const bitrate = BITRATES_MPEG1_L3[bitrateBits] * 1000;
      const sampleRate = SAMPLE_RATES[sampleRateBits];

      if (bitrate === 0 || sampleRate === 0) {
        i++;
        continue;
      }

      const frameSize = Math.floor((144 * bitrate) / sampleRate) + padding;

      if (frameSize > 4 && i + frameSize <= view.length) {
        offsets.push(i);
        i += frameSize;
        continue;
      }
    }
    i++;
  }

  return offsets;
}

// ─── Plan de découpe WAV / OGG ────────────────────────────────────────────────
// WAV : PCM brut, on peut couper n'importe où sur un multiple de (channels * bitsPerSample / 8)
// OGG : pages Ogg ont un sync marker "OggS" — on découpe sur ces boundaries

function createWavChunks(buffer: ArrayBuffer, targetBytes: number): ChunkDescriptor[] {
  // Lit le header WAV pour connaître le block align
  const view = new DataView(buffer);
  const blockAlign = view.getUint16(32, true); // bytes per sample frame
  const dataOffset = 44; // standard WAV header
  const totalData = buffer.byteLength - dataOffset;

  const chunks: ChunkDescriptor[] = [];
  let offset = dataOffset;
  let index = 0;

  while (offset < buffer.byteLength) {
    // Aligne targetBytes sur un multiple de blockAlign
    const alignedSize = Math.floor(targetBytes / blockAlign) * blockAlign;
    const end = Math.min(offset + alignedSize, buffer.byteLength);
    chunks.push({ index, byteStart: offset, byteEnd: end, durationSeconds: CHUNK_TARGET_SECONDS });
    offset = end;
    index++;
  }

  return chunks;
}

// ─── API Principale ───────────────────────────────────────────────────────────

export async function buildStreamPlan(file: File, trackId: string): Promise<StreamPlan> {
  const validation = validateAudioFormat(file);
  if (!validation.valid || !validation.format) {
    throw new Error(validation.error);
  }

  const format = validation.format;
  const buffer = await file.arrayBuffer();

  // Taille cible d'un chunk : ~30s. On estime à partir du débit moyen.
  // Pour MP3 128kbps => ~480Ko/30s. Pour WAV 44100Hz stéréo => ~5Mo/30s.
  const targetBytes = format === "wav" ? 5 * 1024 * 1024 : 480 * 1024;

  let chunks: ChunkDescriptor[];

  if (format === "mp3") {
    const frameOffsets = parseMp3Frames(buffer);
    if (frameOffsets.length === 0) throw new Error("Impossible de lire les trames MP3.");

    // Regroupe les frames en chunks de ~targetBytes
    chunks = [];
    let chunkStart = 0;
    let index = 0;

    for (let f = 1; f < frameOffsets.length; f++) {
      const size = frameOffsets[f] - frameOffsets[chunkStart];
      if (size >= targetBytes || f === frameOffsets.length - 1) {
        chunks.push({
          index,
          byteStart: frameOffsets[chunkStart],
          byteEnd: f === frameOffsets.length - 1 ? buffer.byteLength : frameOffsets[f],
          durationSeconds: CHUNK_TARGET_SECONDS,
        });
        chunkStart = f;
        index++;
      }
    }
  } else if (format === "wav") {
    chunks = createWavChunks(buffer, targetBytes);
  } else {
    throw new Error("Format de fichier inattendu après validation");
  }

  return {
    trackId,
    format,
    totalBytes: buffer.byteLength,
    chunks,
    mimeType: SUPPORTED_MIME[format],
  };
}

// ─── Streaming vers les joueurs ───────────────────────────────────────────────

export class AudioStreamProvider {
  private file: File;
  private plan: StreamPlan;
  private connections: DataConnection[];
  private aborted = false;
  private buffer: ArrayBuffer | null = null;

  constructor(file: File, plan: StreamPlan, connections: DataConnection[]) {
    this.file = file;
    this.plan = plan;
    this.connections = connections;
  }

  /** Annule le streaming en cours (ex: le MJ change de piste) */
  abort() {
    this.aborted = true;
  }

  /** Envoie l'annonce de la piste, puis stream les chunks progressivement */
  async stream(onProgress?: (sent: number, total: number) => void) {
    if (!this.buffer) {
      this.buffer = await this.file.arrayBuffer();
    }

    const readyMsg: AudioReadyMessage = {
      type: "AUDIO_READY",
      trackId: this.plan.trackId,
      totalChunks: this.plan.chunks.length,
      mimeType: this.plan.mimeType,
      durationSeconds: this.plan.chunks.length * CHUNK_TARGET_SECONDS,
    };
    this.broadcast(readyMsg);

    // Envoie le chunk 0 immédiatement pour démarrage instantané
    await this.sendChunk(0);
    onProgress?.(1, this.plan.chunks.length);

    // Envoie le reste avec un léger délai entre chaque pour ne pas saturer PeerJS
    for (let i = 1; i < this.plan.chunks.length; i++) {
      if (this.aborted) break;
      await this.sendChunk(i);
      onProgress?.(i + 1, this.plan.chunks.length);
      // Pause de 200ms entre les chunks pour laisser respirer la connexion
      await sleep(200);
    }
  }

  private async sendChunk(index: number) {
    const chunk = this.plan.chunks[index];
    const data = this.buffer!.slice(chunk.byteStart, chunk.byteEnd);

    const msg: AudioChunkMessage = {
      type: "AUDIO_CHUNK",
      trackId: this.plan.trackId,
      chunkIndex: index,
      totalChunks: this.plan.chunks.length,
      data,
      mimeType: this.plan.mimeType,
    };

    this.broadcast(msg);
  }

  private broadcast(msg: AudioReadyMessage | AudioChunkMessage) {
    for (const conn of this.connections) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
