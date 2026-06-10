import { useState, useEffect } from 'react';
import { assetSyncService } from '../services/asset-sync.service';

/**
 * Hook qui transforme une URL asset:// en URL blob: utilisable par Pixi ou HTML.
 * Gère automatiquement le téléchargement P2P si nécessaire avec un système de retry.
 */
export function useAssetUrl(url: string | undefined) {
  // undefined = en chargement, null = erreur/introuvable, string = résolu
  const [assetUrl, setAssetUrl] = useState<string | undefined | null>(
    url?.startsWith('asset://') ? undefined : url
  );

  useEffect(() => {
    if (!url) {
      setAssetUrl(undefined);
      return;
    }

    if (url.startsWith('asset://')) {
      let cancelled = false;
      const hash = url.replace('asset://', '');

      // On s'abonne aux assets reçus dynamiquement (par PUSH ou PULL retardé)
      const unsubscribe = assetSyncService.onAssetReady(hash, (blobUrl) => {
        if (!cancelled) setAssetUrl(blobUrl);
      });

      let retryCount = 0;
      const MAX_RETRIES = 2; // Réduit à 2 car on a maintenant la maj dynamique

      const resolve = async () => {
        try {
          const resolved = await assetSyncService.getAssetUrl(url);
          if (!cancelled) setAssetUrl(resolved);
        } catch (err) {
          if (!cancelled) {
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              console.log(`[useAssetUrl] Retry ${retryCount}/${MAX_RETRIES} for ${url}`);
              setTimeout(resolve, 3000); // Réessayer après 3s
            } else {
              setAssetUrl(null); // Marquer comme échoué (affichera l'icône ImageOff)
            }
          }
        }
      };

      resolve();
      
      return () => { 
        cancelled = true; 
        unsubscribe();
      };
    } else {
      setAssetUrl(url);
    }
  }, [url]);

  return assetUrl;
}
