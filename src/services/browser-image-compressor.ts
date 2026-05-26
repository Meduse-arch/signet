import { ImageCompressor } from './p2p-sync.types';

export class BrowserImageCompressor implements ImageCompressor {
  async compress(file: File | Blob | ArrayBuffer): Promise<ArrayBuffer> {
    let blob: Blob;
    if (file instanceof ArrayBuffer) {
      blob = new Blob([file]);
    } else {
      blob = file;
    }

    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Failed to get 2d context for compression");
    
    ctx.drawImage(bitmap, 0, 0);
    const compressedBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
    return await compressedBlob.arrayBuffer();
  }
}
