import { useState, useRef } from 'react';
import { assetSyncService } from '../services/asset-sync.service';
import { useAssetUrl } from './useAssetUrl';

export function useAssetUpload(initialUrl: string = '', onUploadSuccess?: (url: string) => void) {
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useAssetUrl(imageUrl);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const assetUrl = await assetSyncService.uploadLocalAsset(file);
        setImageUrl(assetUrl);
        if (onUploadSuccess) onUploadSuccess(assetUrl);
      } catch (err) {
        console.error('Upload failed', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return {
    imageUrl,
    setImageUrl,
    isUploading,
    fileInputRef,
    previewUrl,
    handleFileUpload
  };
}
