/**
 * Normalizes various binary payload types into a raw ArrayBuffer.
 * Handles ArrayBuffer, Uint8Array (including slices/offsets), and Blobs.
 */
export async function toArrayBuffer(payload: unknown): Promise<ArrayBuffer> {
  if (payload instanceof ArrayBuffer) {
    return payload;
  }
  
  if (payload instanceof Uint8Array) {
    // Crucial: use slice to get only the relevant portion of the underlying buffer
    return (payload.buffer as ArrayBuffer).slice(
      payload.byteOffset,
      payload.byteOffset + payload.byteLength
    );
  }
  
  if (payload instanceof Blob) {
    return await payload.arrayBuffer();
  }
  
  throw new Error(`Payload type non supporté: ${Object.prototype.toString.call(payload)}`);
}
