# 💡 Boîte à Idées & Propositions pour Signet VTT

Ce document rassemble les propositions de fonctionnalités futures pour enrichir l'expérience de jeu et renforcer l'aspect "Premium" de Signet VTT.

---

## 1. 🌦️ Système de Météo Dynamique & Particules (PixiJS)
Ajouter des effets visuels en superposition sur la carte géographique pour renforcer l'immersion :
- **Générateur de Particules** : Pluie, neige, cendres volcaniques, tempête de sable, ou lucioles magiques.
- **Synchronisation P2P** : Le MJ change la météo et l'effet se déclenche instantanément sur les écrans des joueurs et sur l'écran de projection externe.
- **Impact Mécanique** (Optionnel) : L'UI pourrait adapter sa teinte selon la météo (plus froide/bleutée sous la neige, etc.).

## 2. 📜 Handouts & Indices Interactifs ("Push to Players")
Permettre au MJ de partager des documents visuels avec les joueurs sous forme de fenêtres flottantes immersives :
- **Parchemins, Lettres, et Cartes au Trésor** : Avec des polices manuscrites et des textures de papier.
- **Mécanique de "Push"** : Un bouton "Envoyer à tous" qui fait apparaître le document en plein centre de l'écran des joueurs avec une animation et un effet sonore ("bruit de papier déplié").
- **Éléments Cachés** : Une loupe magique (effet de filtre CSS/SVG) que les joueurs peuvent glisser sur le document pour révéler de l'encre invisible.

## 3. 🎲 Lancer de Dés 3D Physiques (Dice Roller)
Remplacer ou compléter le lancer de dés textuel par une expérience visuelle forte :
- **Moteur Physique** : Utilisation d'une surcouche (ex: `@react-three/fiber` + physique) pour lancer de vrais dés 3D qui rebondissent sur l'écran.
- **Dés Personnalisés** : Chaque joueur peut avoir sa propre texture de dés (dés de feu, dés en os, dés néon).
- **Lancer Collectif** : Lorsqu'un joueur lance les dés, tout le monde voit les dés rouler sur son écran grâce à la synchro WebRTC (PeerJS).

## 4. 🔦 Éclairage Dynamique & Lignes de Vue (Dynamic Lighting)
Une évolution majeure pour la gestion de la carte (BoardScene) :
- **Murs et Obstacles** : Le MJ peut tracer des lignes bloquant la lumière et le mouvement.
- **Lumière attachée aux Tokens** : Les joueurs tiennent des torches (ex: rayon de 6 cases) éclairant dynamiquement la carte.
- **Vision Personnalisée** : Un joueur elfe (vision nocturne) ne verrait pas la carte de la même façon qu'un joueur humain. 

## 5. 🃏 Decks de Cartes Intégrés (Tirage et Destin)
Pour les systèmes de jeu utilisant des cartes (ex: critiques, tarot, deck des illusions) :
- **Création de Decks personnalisés** : Upload d'images via l'outil existant (`useAssetUpload`).
- **Tirage et Animations** : Animation 3D de la carte (Framer Motion) lorsqu'elle est tirée de la pioche, avec un effet "Holographique" ou brillance (Gloss effect) au survol de la souris.

## 6. 📚 Compendium / Grimoire Rapide (Raccourci Command-K)
Intégrer une base de données de "Lore" ultra-rapide accessible sans casser le flow du jeu :
- **Spotlight Search** : Appuyer sur `Ctrl+K` (ou `Cmd+K`) pour ouvrir une barre de recherche en plein écran (style MacOS Spotlight).
- **Drag & Drop** : Rechercher "Gobelin" et glisser son portrait directement depuis la recherche sur la carte de combat.
- **Réticulation des Liens** : Dans la description d'un lieu, les noms des PNJs sont des liens cliquables ouvrant instantanément leur fiche dans une nouvelle fenêtre flottante Signet.

## 7. 🎭 Jukebox & Soundboards Avancés (Howler.js)
Étendre la réflexion audio existante :
- **Fading Automatique** : Transition douce (Crossfade) entre la musique "Exploration" et la musique "Combat" déclenchée par le MJ.
- **Ambiance Multi-couches** : Jouer un fond sonore "Forêt" (oiseaux, vent) + une piste musicale par-dessus, gérables par des sliders séparés.
- **Soundboard One-Shot** : Un panneau de boutons pour le MJ permettant de déclencher des bruitages instantanés ("Cri de loup", "Explosion", "Porte qui grince") envoyés en P2P sans délai.

## 8. 🛠️ La "Boîte à Outils" Rapide (Toolbar)
Une barre verticale très élégante contenant les outils d'interaction rapide sur la carte pour remplacer la liste des joueurs :
- **Règle** : Pour mesurer facilement les distances en cases.
- **Outil Ping** : Faire clignoter un endroit précis sur la carte pour attirer l'attention de tous les joueurs.


---
*N'hésitez pas à cocher ou annoter les idées que vous souhaitez prioriser pour l'implémentation !*