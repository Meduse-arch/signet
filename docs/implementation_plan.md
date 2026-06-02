# Implémentation du Système Audio (Jukebox & Soundboard)

Ce plan vise à implémenter la **Proposition n°7** (Jukebox & Soundboards Avancés) en intégrant les directives techniques et les bonnes pratiques définies dans le rapport `reflexion_Audio.md`.

L'objectif est d'avoir une ambiance sonore synchronisée en multijoueur, avec un rendu haut de gamme (Crossfades), tout en protégeant la connexion P2P de la saturation grâce à un système de *Pacing* (Régulation) et de cache (IndexedDB).

## Feedback Intégré
- L'interface principale du Jukebox sera sous forme d'un **lecteur audio flottant en bas au centre** de l'écran.
- Structure du lecteur :
  - **Centre** : Temps écoulé / durée de la musique avec un bouton Play/Pause au-dessus.
  - **Droite** : Bouton de gestion du volume (Slider de volume global).
  - **Gauche (MJ uniquement)** : Bouton pour ouvrir le gestionnaire de musique (liste des pistes, ajout, soundboard).

## Proposed Changes

---

### 1. Dépendances
- **Action** : `npm install howler` et `npm install -D @types/howler`
- **Justification** : `Howler.js` simplifie grandement la gestion des Blobs audio, du buffering et des transitions fluides (fade in/out).

---

### 2. Réseau & Pacing (Couche de Transfert)

#### `src/services/peer.service.ts`
- **Action** : Exposer le `dataChannel.bufferedAmount` des connexions WebRTC actives.

#### `src/services/transfer.service.ts`
- **Action** : Créer `sendAudioChunks(fileId, data, targetPeerId)`.
- **Détails** : Boucle asynchrone qui vérifie le `bufferedAmount`. S'il dépasse 64Ko, la boucle attend un évènement `bufferedamountlow` (ou fait des micro-pauses) avant d'envoyer la suite. Cela garantit que les actions urgentes (déplacement de jetons) ne sont pas bloquées.

---

### 3. Moteur Audio & Cache

#### `src/services/audio.service.ts`
- **Action** : Créer le singleton de gestion audio.
- **Fonctionnalités** :
  - *Ambiance* : Jouer une musique (Blob URL) en boucle, avec Crossfade (2s) lors du passage à une nouvelle piste.
  - *SFX* : Jouer instantanément des sons en surcouche.
  - *Synchro* : Utiliser `sound.seek(latence)` pour caler les joueurs sur le temps exact du MJ.

#### `src/hooks/useAudioSync.ts` (ou via `usePeer`)
- **Messages** :
  - `AUDIO_PLAY { hash, startTime }`
  - `AUDIO_PAUSE { hash, pauseTime }`
  - `AUDIO_REQUEST { hash }`
- **Comportement Joueur** : À réception de `PLAY`, on cherche dans `dbStorage` (IndexedDB). Si présent (Cache Hit) -> on joue direct. Si absent (Cache Miss) -> on demande au MJ (`REQUEST`).
- **Comportement MJ** : À réception de `REQUEST`, utilise `sendAudioChunks` pour envoyer le fichier en douceur.

---

### 4. Interface Utilisateur (HUD)

#### `src/components/AudioHUD/index.tsx`
- **Emplacement** : En bas au centre (`fixed bottom-6 left-1/2 -translate-x-1/2`).
- **Composants** :
  - Un mini-player de style "verre trempé" (glassmorphism).
  - **Bouton Gauche (MJ)** : Icône Liste/Musique ouvrant un panneau latéral ou modale pour gérer la playlist et uploader des fichiers.
  - **Centre** : Titre de la piste, Bouton Play/Pause, Barre de progression (temps / durée).
  - **Bouton Droite** : Bouton de contrôle du volume (mute/unmute, slider vertical au survol).

#### `src/components/AudioHUD/JukeboxManager.tsx`
- Panneau réservé au MJ (ouvrable depuis le bouton gauche).
- Permet d'importer (`<input type="file" accept="audio/*">`) des MP3/OGG, de les lister (stockés en base de données ou IndexedDB), et de déclencher leur lecture.

## Verification Plan

### Tests Automatisés
- `npx tsc --noEmit` pour s'assurer du bon typage des events Howler et PeerJS.

### Tests Manuels (MJ + 1 Joueur)
1. **Upload** : Le MJ ouvre le gestionnaire, ajoute un fichier MP3 lourd (ex: 10 Mo).
2. **Lecture (Cache Miss)** : Le MJ lance la musique. Le joueur reçoit progressivement le fichier sans lag sur la carte (vérifier en déplaçant un jeton en même temps). La musique se lance à la fin du téléchargement, synchronisée au temps du MJ.
3. **Play/Pause** : Le MJ fait pause. Le lecteur du joueur se met en pause au bon endroit.
4. **Relance (Cache Hit)** : On recharge le navigateur du joueur. Le MJ fait Play. Le joueur joue instantanément la musique depuis IndexedDB sans retélécharger.
5. **Crossfade** : Lancer une autre musique et écouter la transition en fondu.
