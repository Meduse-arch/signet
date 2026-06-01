# Walkthrough : Refactoring et Dédoublonnement

Ce document résume le travail accompli pour optimiser, centraliser et nettoyer le code de l'application.

## Modifications apportées

### 1. Hook d'Upload (`useAssetUpload.ts`)
Nous avons créé le hook personnalisé `useAssetUpload` pour encapsuler toute la logique d'upload d'images locales, ainsi que la gestion de l'état de chargement (`isUploading`).
- Ce hook a été intégré avec succès dans toutes les modales de création/édition :
  - `ItemCreationModal.tsx`
  - `SkillCreationModal.tsx`
  - `QuestCreationModal.tsx`
  - `ManageCharacterModal.tsx`
- **Impact** : Réduction majeure de la duplication de code et normalisation du comportement d'upload d'assets.

### 2. Centralisation de la Synchronisation Zustand (`storeSync.ts`)
Un helper `setupStoreSync` et `emitStoreSync` a été créé pour gérer dynamiquement la création, l'écoute et la fermeture des canaux `BroadcastChannel` basés sur le `sessionId`.
- Appliqué avec succès sur les stores Zustand suivants :
  - `items.ts`
  - `skills.ts`
  - `map.ts`
  - `dice.ts`
- **Impact** : Plus besoin de redéclarer l'instanciation de `BroadcastChannel` ou les listeners d'évènements complexes. Le code est drastiquement allégé et le comportement d'émission/écoute standardisé.

### 3. Nettoyage (Hygiène du code)
Les dossiers morts qui polluaient l'arborescence (notamment les résidus de l'ancienne version Pixi et d'anciens hooks) ont été supprimés :
- `src/hooks/usePeer/`
- `src/hooks/useRune/`
- `src/pixi/BoardScene/`
- `src/pixi/FogOfWar/`
- `src/pixi/MapLayer/`
- `src/pixi/TokenSprite/`

## Vérifications
- Une vérification formelle des types via `npx tsc --noEmit` a été effectuée et **a réussi avec succès**. Aucune erreur TypeScript n'a été introduite.
- Le refactoring a été testé et compilé. La session est prête.

> [!TIP]
> **Prochaine étape** : Vous pouvez naviguer sur l'application (`npm run electron:dev` fonctionne toujours en arrière-plan) et vérifier que l'upload d'assets dans les modales, ainsi que la synchronisation des données Zustand (dés, items, map, skills) entre fenêtres fonctionne de manière fluide et instantanée.

## Nouveautés : UI/UX & Mode Écran Externe (Projection)

### 1. Mode Écran Externe (Projection Map)
- Ajout d'un bouton "Projection" (`MonitorPlay`) sur chaque carte de scène pour le MJ.
- Création d'une vue `/external/map/:sessionId` dépourvue d'interface utilisateur, affichant uniquement le canvas en plein écran (`BoardCanvas`).
- **Synchronisation locale** : Implémentation du canal `board_position_sync_${sessionId}` permettant de relayer en temps réel les ajouts, suppressions, et déplacements de tokens de la fenêtre principale vers la fenêtre de projection.

### 2. Indicateur de Chargement de Map Progressif
- Suivi du téléchargement des chunks de la map via des états locaux dans `useBoard.ts`.
- Ajout d'un *overlay* "premium" (glassmorphism avec animations) dans `BoardCanvas` qui s'affiche automatiquement pendant le transfert de la carte, affichant le pourcentage d'avancement pour les joueurs.

### 3. Optimisation PixiJS (Throttling Réseau)
- Création d'un utilitaire générique `throttle` (`src/utils/throttle.ts`).
- Appliqué au mouvement des tokens (`BoardScene.ts`) pour brider les envois réseau lors du glisser-déposer à environ 30 FPS (~33ms), réduisant considérablement la charge réseau.

### 4. Standardisation des Modales
- Refonte des modales `TagManagementModal`, `GiveItemModal`, et `SelectCharacterModal` pour utiliser un style d'overlay "glassmorphic" unifié, garantissant une cohérence visuelle haut de gamme sur toute l'interface.

## Nouveautés : Transition de Carte "Brume Magique" & Robustesse P2P

### 1. Overlay de Transition "Brume Magique"
- **Visuel 100% Procédural** : Création du composant `MapTransitionOverlay` utilisant exclusivement CSS (`radial-gradient`) et SVG (`feTurbulence`) pour générer une brume réaliste animée (dérive et pulsation) sans aucune image externe (zéro overhead réseau).
- **Affichage Garanti** : Le brouillard dispose désormais d'un *temps d'affichage minimum forcé* (1,2 seconde), garantissant que l'animation d'opacité se déploie toujours visiblement, même si le fond charge quasi-instantanément depuis le cache local.
- **Occultation Totale** : Ajout d'un fond d'obscurcissement quasi-opaque (`bg-[#050508]/95`) permettant de masquer totalement la carte précédente ainsi que la texture globale du jeu. Le filtre de brume s'imprime dessus pour une immersion parfaite.
- **Non Bloquant** : Le loader s'affiche avec un `z-index` de 10. Les fenêtres de l'interface (fiches de personnages, jets de dés, etc.) ayant un `z-index` de 200+, elles restent parfaitement interactives et visibles au-dessus de la brume pendant le chargement.
- **États détaillés** : L'interface affiche le statut en temps réel (Demande au MJ, Invocation en cours..., La brume se dissipe...).

### 2. Robustesse du Chargement P2P
- **Hydratation Sécurisée** : Modification de la logique de chargement dans `useBoard.ts` (`paintMapFromCache`) pour repeindre la carte progressivement depuis la base de données locale si elle est déjà possédée.
- **Gestion des Timeouts** : Ajout d'un timer de 8 secondes lors de la requête de carte au Maître du Jeu. Si le réseau échoue ou que l'hôte ne répond pas, la brume affiche un message d'erreur clair avec un bouton "Forcer la synchronisation".
- **Fluidité de Transition** : Les queues de chargement (manifestes et chunks en attente) sont réinitialisées et drainées correctement lors des changements rapides de scènes.

## Nouveautés : Synchronisation de Carte (Auto-Sync)

### 1. Toggle Auto-Sync
- Remplacement du choix de projection par un interrupteur (**Toggle**) directement dans l'en-tête de la fenêtre "Scènes".
- **Bouton Vert (ON)** : Le simple clic sur une scène par le MJ synchronise instantanément la carte sur la fenêtre de projection externe. Le double-clic synchronise pour tout le monde (joueurs et projection).
- **Bouton Rouge (OFF)** : Le simple clic permet au MJ de naviguer de manière privée. Pour envoyer la carte aux joueurs et à la fenêtre de projection, le MJ doit effectuer un **double-clic** sur la scène souhaitée.
- Ce système garantit que la fenêtre de projection locale et le broadcast P2P vers les joueurs sont parfaitement découplés et sécurisés.

## Nouveautés : Synchronisation & Upload des Images de Jetons (Tokens)

### 1. Upload d'Images en P2P
- **Problème résolu** : Auparavant, si le MJ configurait un portrait avec un chemin absolu de son disque local, les joueurs ne voyaient rien.
- **Sélecteur de Fichier dans la Fiche** : Ajout du bouton d'upload et du hook `useAssetUpload` dans [CharacterSheetContent.tsx](file:///c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/src/components/SignetInterface/CharacterSheetContent.tsx) (boîte d'édition rapide d'avatar).
- **Sélecteur de Fichier dans la Création d'Entités** : Intégration du sélecteur de fichier dans [CreateCharacterModal.tsx](file:///c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/src/components/CreateCharacterModal/index.tsx) (utilisé dans le Bestiaire pour les monstres/PNJ et lors de la création d'un joueur).
- **Hachage & P2P automatique** : Les fichiers locaux sélectionnés sont compressés, renommés en `asset://<sha256>`, et stockés dans l'Asset Store IndexedDB. Les clients des joueurs les téléchargent à la volée via PeerJS au moment du placement du jeton sur la carte.

## Vérifications
- Une vérification formelle des types via `npx tsc --noEmit` a été effectuée et **a réussi avec succès**.

> [!TIP]
> **Validation Requise** : Vous pouvez tester l'upload d'un portrait local depuis la fiche d'un personnage ou la création d'un monstre dans le Bestiaire, vérifier qu'il est synchronisé en P2P, et s'affiche correctement sous forme de jeton (token) sur la carte du joueur.

