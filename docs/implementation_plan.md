# Implémentation : Tracker d'Initiative & Combats (Top-Center)

Mise en place d'un système de gestion de combat purement visuel, non-bloquant et synchronisé en P2P.

## User Review Required

> [!IMPORTANT]
> - La nouvelle disposition "Haut Centre" avec les 3 jetons et le bouton `⚔️ Fight` te convient-elle ?
> - Le bouton `Fight` servira à ouvrir la pop-up de gestion complète (Ordre, PV, Ajout/Suppression) pour le MJ, libérant ainsi l'écran de jeu.

## Proposed Changes

### 1. Base de Données (SQLite)
#### [MODIFY] [electron/ipc-handlers.ts](file:///c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/electron/ipc-handlers.ts)
- Ajout des tables `combat_sessions` et `combat_actors`.
- Ajout des requêtes IPC pour sauvegarder et charger l'état du combat (CRUD acteurs & avancement du tour).

### 2. State Management & P2P
#### [NEW] [src/store/combat.ts](file:///c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/src/store/combat.ts)
- Création du store Zustand `useCombatStore`.
- Implémentation des fonctions : `startCombat()`, `nextTurn()`, `updateActors()`, `toggleInitiativeWindow()`.
- Synchronisation inter-fenêtres locales avec `setupStoreSync`.
- Diffusion P2P de `COMBAT_STATE_UPDATE` via `peerService.broadcast`.

### 3. Moteur Graphique (PixiJS 8)
#### [MODIFY] [src/pixi/TokenSprite.ts](file:///c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/src/pixi/TokenSprite.ts)
- Création de `setActiveTurnEffect(isActive: boolean)` pour générer et animer l'aura dorée sous le jeton du personnage actif.
#### [MODIFY] [src/pixi/BoardScene.ts](file:///c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/src/pixi/BoardScene.ts)
- Abonnement au `useCombatStore` pour appliquer la surbrillance au jeton actif.
- Implémentation d'une fonction de pan/zoom fluide (déclenchée lorsqu'on clique sur un avatar du carrousel de combat).

### 4. Interface Utilisateur (React)
#### [NEW] [src/components/CombatHUD/index.tsx](file:///c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/src/components/CombatHUD/index.tsx)
- Nouveau composant indépendant placé en **haut au centre** de l'écran (`fixed top-6 left-1/2 -translate-x-1/2`).
- Contient le Mini-Carrousel de combat affichant 3 jetons maximum : [Précédent] [Actuel + Nom] [Suivant].
- Intègre le bouton "Suivant" (`>`) et le bouton d'administration "Fight" (`⚔️`).
- Intégré directement dans la racine (ex: `src/App.tsx` ou `src/components/SignetInterface/index.ts`).
#### [NEW] [src/components/SignetInterface/InitiativeWindowContent.tsx](file:///c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/src/components/SignetInterface/InitiativeWindowContent.tsx)
- Fenêtre pop-up `DraggableWindow` (ouverte via le bouton `Fight` par le MJ).
- Permet de gérer la liste intégrale, de changer l'ordre d'initiative manuellement, et d'ajouter/supprimer des monstres depuis le bestiaire.
#### [MODIFY] [src/store/signet.ts](file:///c:/Users/Etudiant/Desktop/projet/sigil-app/sigil-vtt/src/store/signet.ts)
- Ajout du type de fenêtre `'combat'` pour enregistrer les positions de cette pop-up.

## Verification Plan

### Manual Verification
- Démarrer une session avec 2 clients (MJ + Joueur).
- MJ : Cliquer sur `Fight` (en haut au centre) -> vérifier que la pop-up s'ouvre et scanne les jetons de la carte.
- Les HUDs en haut au centre doivent afficher les 3 premiers personnages.
- Clic sur "Suivant" (`>`) : vérifier le glissement des avatars dans le HUD et le déplacement du halo sur le canvas PixiJS.
- Clic sur un avatar du HUD : vérifier que la caméra centre ce jeton.
- Hors de leur tour, les joueurs peuvent interagir librement avec leurs fiches et inventaires.
