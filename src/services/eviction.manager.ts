import { dbStorage } from './db.storage';
import { MapRecord } from './p2p-sync.types';

const QUOTA_THRESHOLD = 0.80; // 80% usage triggers eviction
const ESTIMATION_MARGIN = 1.10; // 10% safety margin for unreliable APIs (Firefox/Safari)

export class EvictionManager {
  private isEvicting = false;

  public async checkAndEvict(): Promise<void> {
    if (this.isEvicting) return;
    this.isEvicting = true;

    try {
      if (!navigator.storage || !navigator.storage.estimate) {
        console.warn('[EvictionManager] Storage estimation not supported.');
        this.isEvicting = false;
        return;
      }

      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      let usage = estimate.usage || 0;

      // Apply margin for Safari/Firefox
      usage = usage * ESTIMATION_MARGIN;

      if (quota > 0 && (usage / quota) > QUOTA_THRESHOLD) {
        console.warn(`[EvictionManager] Quota exceeded 80% (${(usage/1024/1024).toFixed(2)}MB / ${(quota/1024/1024).toFixed(2)}MB). Starting LRU eviction.`);
        await this.evictLRU(quota);
      }
    } catch (e) {
      console.error('[EvictionManager] Failed to check quota:', e);
    } finally {
      this.isEvicting = false;
    }
  }

  private async evictLRU(quota: number): Promise<void> {
    // Note: To do this perfectly, dbStorage needs a getAllMaps() method.
    // Assuming we add it to dbStorage...
    const maps = await dbStorage.getAllMaps();
    if (maps.length === 0) return;

    // Sort by oldest first (Least Recently Used)
    maps.sort((a, b) => a.last_accessed - b.last_accessed);

    for (const map of maps) {
      console.log(`[EvictionManager] Evicting map ${map.map_id} (Last accessed: ${new Date(map.last_accessed).toLocaleString()})`);
      await dbStorage.deleteMapData(map.map_id, map.global_hash);

      const newEstimate = await navigator.storage.estimate();
      const newUsage = (newEstimate.usage || 0) * ESTIMATION_MARGIN;
      
      if ((newUsage / quota) < QUOTA_THRESHOLD) {
        console.log('[EvictionManager] Quota safely below threshold. Stopping eviction.');
        break;
      }
    }
  }
}

export const evictionManager = new EvictionManager();
