/**
 * Exemple d'intégration — à adapter dans tes composants existants.
 * Montre comment câbler AudioStreamProvider (MJ) et useMseAudioPlayer (joueur).
 */

// ═══════════════════════════════════════════════════════════════════
// CÔTÉ MJ — dans ton composant AudioControls ou ton audio.service.ts
// ═══════════════════════════════════════════════════════════════════

import { buildStreamPlan, AudioStreamProvider, validateAudioFormat } from "../services/audio-stream.provider";

// Dans ton handler d'upload de piste longue (> 5 min) :
export async function handleLongTrackUpload(
  file: File,
  trackId: string,
  peerConnections: any[], // tes DataConnections PeerJS existantes
  onProgress: (sent: number, total: number) => void
) {
  // 1. Validation du format — erreur claire si M4A/AAC
  const validation = validateAudioFormat(file);
  if (!validation.valid) {
    // Affiche validation.error dans ton UI (toast, modal...)
    throw new Error(validation.error);
  }

  // 2. Indexation (~100ms, non-bloquant car await dans un handler async)
  const plan = await buildStreamPlan(file, trackId);
  console.log(`Plan créé : ${plan.chunks.length} chunks pour ${file.name}`);

  // 3. Streaming progressif
  const provider = new AudioStreamProvider(file, plan, peerConnections);
  await provider.stream(onProgress);

  // Pour annuler (ex: le MJ change de piste) :
  // provider.abort();
}

// ═══════════════════════════════════════════════════════════════════
// DÉCISION HYBRIDE : court vs long
// Dans ton audio.service.ts existant, avant d'envoyer une piste :
// ═══════════════════════════════════════════════════════════════════

const LONG_TRACK_THRESHOLD_SECONDS = 5 * 60; // 5 minutes

export async function sendTrack(file: File, trackId: string, connections: any[]) {
  // Durée estimée : taille en bytes / (128kbps / 8) = secondes à 128kbps
  const estimatedDuration = file.size / (128_000 / 8);

  if (estimatedDuration > LONG_TRACK_THRESHOLD_SECONDS) {
    // Piste longue → MSE buffer glissant
    await handleLongTrackUpload(file, trackId, connections, (sent, total) => {
      console.log(`Streaming : ${sent}/${total} chunks envoyés`);
    });
  } else {
    // Piste courte → pre-loading classique Howler + IndexedDB (logique existante)
    // sendFullFileViaPeerJS(file, trackId, connections);
  }
}
