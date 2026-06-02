import { Howl, Howler } from 'howler';

interface AudioTrack {
  hash: string;
  howl: Howl;
  blobUrl: string;
  soundId?: number;
}

class AudioService {
  private ambianceTrack: AudioTrack | null = null;
  private sfxTracks: Map<string, AudioTrack> = new Map();
  private _masterVolume: number = 0.5;

  constructor() {
    Howler.volume(this._masterVolume);
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

    const newHowl = new Howl({
      src: [blobUrl],
      format: [mime.split('/')[1] || 'mp3'],
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
   */
  public playSFX(hash: string, audioData: ArrayBuffer, mime: string = 'audio/mp3') {
    const blob = new Blob([audioData], { type: mime });
    const blobUrl = URL.createObjectURL(blob);

    const sfxHowl = new Howl({
      src: [blobUrl],
      format: [mime.split('/')[1] || 'mp3'],
      html5: false, // Web Audio API (meilleur pour SFX courts)
      loop: false,
      volume: 1,
      onend: () => {
        sfxHowl.unload();
        URL.revokeObjectURL(blobUrl);
        this.sfxTracks.delete(hash);
      }
    });

    this.sfxTracks.set(hash, { hash, howl: sfxHowl, blobUrl });
    sfxHowl.play();
  }
}

export const audioService = new AudioService();
