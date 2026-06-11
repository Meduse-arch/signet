import { Howl, Howler } from 'howler';
import { useToolsStore } from '../store/tools';

interface AudioTrack {
  hash: string;
  howl: Howl;
  blobUrl: string;
  soundId?: number;
  spatial?: { x: number, y: number };
}

class AudioService {
  private ambianceTrack: AudioTrack | null = null;
  private sfxTracks: Map<string, AudioTrack> = new Map();
  private _masterVolume: number = 0.5;

  // Stockage en RAM des très gros fichiers (évite IndexedDB et FileReader massifs)
  public memoryAudioFiles: Map<string, File> = new Map();

  private lastListenerPos = { x: 0, y: 0, z: 0 };

  constructor() {
    Howler.volume(this._masterVolume);
    // Position par défaut du listener (au centre de l'écran ou à 0,0)
    Howler.pos(0, 0, 0);
  }

  public updateListenerPosition(x: number, y: number) {
    if (this.lastListenerPos.x !== x || this.lastListenerPos.y !== y) {
      this.lastListenerPos = { x, y, z: 0 };
      Howler.pos(x, y, 0);
      
      // Mettre à jour dynamiquement le son de tous les SFX spatiaux en cours de lecture
      this.sfxTracks.forEach(track => {
        if (track.spatial) {
          this.applySpatialToHowl(track.howl, track.spatial);
        }
      });
    }
  }

  private applySpatialToHowl(howl: Howl, spatial: { x: number, y: number }) {
    const dx = spatial.x - this.lastListenerPos.x;
    const dy = spatial.y - this.lastListenerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    let targetVolume = 1;
    const refDist = 300;
    const maxDist = 3000;
    
    if (distance >= maxDist) {
      targetVolume = 0.01; // Évite 0 absolu
    } else if (distance > refDist) {
      targetVolume = 1 - ((distance - refDist) / (maxDist - refDist));
    }

    // Le volume final prend en compte le volume maître
    howl.volume(targetVolume * this._masterVolume);

    let pan = dx / 1000; // 1000 pixels = son totalement d'un côté
    if (pan > 1) pan = 1;
    if (pan < -1) pan = -1;
    howl.stereo(pan);
  }

  public setMasterVolume(vol: number) {
    this._masterVolume = Math.max(0, Math.min(1, vol));
    Howler.volume(this._masterVolume);
  }

  public getMasterVolume() {
    return this._masterVolume;
  }

  /**
   * Joue une musique d'ambiance en boucle. Fait un crossfade si une musique est déjà en cours.
   */
  public playAmbiance(hash: string, audioData: ArrayBuffer, mime: string = 'audio/mp3', startTime: number = 0) {
    if (this.ambianceTrack && this.ambianceTrack.hash === hash) {
      if (!this.ambianceTrack.howl.playing()) {
        const id = this.ambianceTrack.howl.play();
        this.ambianceTrack.soundId = id;
        this.ambianceTrack.howl.seek(startTime, id);
      } else {
        this.ambianceTrack.howl.seek(startTime, this.ambianceTrack.soundId);
      }
      return;
    }

    const blob = new Blob([audioData], { type: mime });
    const blobUrl = URL.createObjectURL(blob);

    const LONG_TRACK_THRESHOLD_BYTES = 5 * 60 * (128_000 / 8); // ~4.8 Mo
    const isLong = audioData.byteLength >= LONG_TRACK_THRESHOLD_BYTES;

    const newHowl = new Howl({
      src: [blobUrl],
      format: [mime.split('/')[1] || 'mp3'],
      html5: isLong, // Protection RAM : HTML5 Audio pour les gros fichiers, Web Audio pour les boucles courtes
      loop: true,
      volume: 0, // Commence à 0 pour le fade in
    });

    const newTrack: AudioTrack = { hash, howl: newHowl, blobUrl };

    if (this.ambianceTrack) {
      const oldTrack = this.ambianceTrack;
      // Crossfade: baisse de l'ancien, montée du nouveau sur 2 secondes
      oldTrack.howl.fade(oldTrack.howl.volume(), 0, 2000);
      oldTrack.howl.once('fade', () => {
        oldTrack.howl.stop();
        oldTrack.howl.unload();
        URL.revokeObjectURL(oldTrack.blobUrl);
      });
    }

    this.ambianceTrack = newTrack;
    const id = newHowl.play();
    newTrack.soundId = id;
    newHowl.seek(startTime, id);
    newHowl.fade(0, 1, 2000, id);
  }

  public pauseAmbiance() {
    if (this.ambianceTrack) {
      this.ambianceTrack.howl.pause();
    }
  }

  public resumeAmbiance() {
    if (this.ambianceTrack && !this.ambianceTrack.howl.playing()) {
      this.ambianceTrack.howl.play(this.ambianceTrack.soundId);
    }
  }

  public getAmbiancePosition(): number {
    if (this.ambianceTrack && this.ambianceTrack.howl.playing()) {
       return this.ambianceTrack.howl.seek(this.ambianceTrack.soundId) as number;
    }
    return 0;
  }
  
  public getAmbianceDuration(): number {
    if (this.ambianceTrack) {
       return this.ambianceTrack.howl.duration();
    }
    return 0;
  }

  public seekAmbiance(position: number) {
    if (this.ambianceTrack) {
      console.log(`[AudioService] Seeking ambiance to ${position}s with id ${this.ambianceTrack.soundId}`);
      this.ambianceTrack.howl.seek(position, this.ambianceTrack.soundId);
    } else {
      console.warn(`[AudioService] Ignored seek to ${position}s because ambianceTrack is null`);
    }
  }

  public setLoopAmbiance(loop: boolean) {
    if (this.ambianceTrack) {
      this.ambianceTrack.howl.loop(loop);
    }
  }

  public getAmbianceLoop(): boolean {
    if (this.ambianceTrack) {
      return this.ambianceTrack.howl.loop();
    }
    return false;
  }

  public getAmbianceHash(): string | null {
    return this.ambianceTrack ? this.ambianceTrack.hash : null;
  }

  /**
   * Joue un effet sonore (SFX) one-shot.
   * Peut être spatialisé si des coordonnées sont fournies.
   */
  public playSFX(hash: string, audioData: ArrayBuffer, mime: string = 'audio/mp3', spatial?: { x: number, y: number }) {
    const blob = new Blob([audioData], { type: mime });
    const blobUrl = URL.createObjectURL(blob);

    const sfxHowl = new Howl({
      src: [blobUrl],
      format: [mime.split('/')[1] || 'mp3'],
      html5: false, // Web Audio API (meilleur pour SFX courts et REQUIS pour la 3D)
      loop: false,
      volume: 1,
      onend: () => {
        sfxHowl.unload();
        URL.revokeObjectURL(blobUrl);
        this.sfxTracks.delete(hash);
        
        if (spatial) {
          useToolsStore.getState().setSpatialTarget(null);
        }
      },
      onstop: () => {
        sfxHowl.unload();
        URL.revokeObjectURL(blobUrl);
        this.sfxTracks.delete(hash);
        
        if (spatial) {
          useToolsStore.getState().setSpatialTarget(null);
        }
      }
    });

    try {
      if (spatial) {
        this.applySpatialToHowl(sfxHowl, spatial);
      }

      const soundId = sfxHowl.play();
      this.sfxTracks.set(hash, { hash, howl: sfxHowl, blobUrl, soundId, spatial });
    } catch (e: any) {
      alert("Erreur Howler: " + e.message);
    }
  }
}

export const audioService = new AudioService();
