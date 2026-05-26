import { useState, useEffect } from 'react';
import { assetSyncService } from '../services/asset-sync.service';

/**
 * Hook qui transforme une URL asset:// en URL blob: utilisable par Pixi ou HTML.
 * Gère automatiquement le téléchargement P2P si nécessaire avec un système de retry.
 */
export function useAssetUrl(url: string | undefined) {
  const [assetUrl, setAssetUrl] = useState<string | undefined>(url);

  useEffect(() => {
    if (!url) {
      setAssetUrl(undefined);
      return;
    }

    if (url.startsWith('asset://')) {
      let cancelled = false;
      let retryCount = 0;
      const MAX_RETRIES = 3;

      const resolve = async () => {
        try {
          const resolved = await assetSyncService.getAssetUrl(url);
          if (!cancelled) setAssetUrl(resolved);
        } catch (err) {
          if (!cancelled && retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`[useAssetUrl] Retry ${retryCount}/${MAX_RETRIES} for ${url}`);
            setTimeout(resolve, 2000); // Réessayer après 2s
          }
        }
      };

      resolve();
      return () => { cancelled = true; };
    } else {
      setAssetUrl(url);
    }
  }, [url]);

  return assetUrl;
}
