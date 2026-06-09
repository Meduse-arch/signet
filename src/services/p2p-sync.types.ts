import { PaletteAnalysis } from '../pixi/qualityFilters';

export interface ImageCompressor {
  /**
   * Compresses an image file (e.g., PNG, JPEG) into an optimized ArrayBuffer (typically WebP).
   * @param file The file or blob to compress.
   * @returns A promise resolving to the compressed binary data.
   */
  compress(file: File | Blob | ArrayBuffer): Promise<ArrayBuffer>;
}

export interface FragmentHeader {
  chunk_id: string; // ID of the logical 512x512 chunk this fragment belongs to
  frag_index: number; // 0-based index of this fragment
  total_frags: number; // Total number of fragments for this chunk
  expected_hash: string; // SHA-256 hash expected upon reassembly
}

export interface ChunkManifestEntry {
  id: string; // Identifier for the chunk (e.g., "x_y" coordinates)
  hash: string; // SHA-256 hash of the chunk's binary data
  x: number;
  y: number;
}

export interface ChunkManifest {
  map_id: string;
  global_hash: string; // Merkle root hash of all chunk hashes
  grid_size?: number;
  width?: number;
  height?: number;
  palette?: PaletteAnalysis;
  chunks: ChunkManifestEntry[];
}

export type TransferPayload =
  | { map_id: string; session_transfer_id: string; manifest: ChunkManifest } // TRANSFER_START
  | { session_transfer_id: string }                                          // TRANSFER_INVALIDATED
  | { map_hash: string; chunk_id: string }                                   // CHUNK_COMPLETE
  | { map_id: string }                                                       // MAP_HIDDEN
  | { map_id: string; metadata: Record<string, unknown> }                    // UPDATE_METADATA
  | { map_id: string; chunk_ids: string[] };                                 // CHUNK_REQUEST

export interface TransferMessage {
  type: ControlChannelMessage;
  payload: TransferPayload;
  session_transfer_id?: string;
}

export interface ChunkRecord {
  chunk_id: string;
  map_hash: string;
  hash: string;
  status: 'downloading' | 'complete';
  data?: ArrayBuffer;
  last_accessed: number;
}

export interface MapRecord {
  map_id: string;
  global_hash: string;
  manifest: ChunkManifest;
  last_accessed: number;
  total_chunks: number;
  completed_chunks: number;
}

export enum ControlChannelMessage {
  TRANSFER_START = 'TRANSFER_START',
  TRANSFER_INVALIDATED = 'TRANSFER_INVALIDATED',
  CHUNK_COMPLETE = 'CHUNK_COMPLETE',
  MAP_HIDDEN = 'MAP_HIDDEN',
  UPDATE_METADATA = 'UPDATE_METADATA',
  CHUNK_REQUEST = 'CHUNK_REQUEST'
}
