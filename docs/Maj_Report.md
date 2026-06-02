# Rapport de Mise à Jour : Refonte du Système de Tokens

Ce document détaille les spécifications et le fonctionnement de la nouvelle mise à jour majeure concernant la manipulation et l'affichage des jetons (tokens) sur la grille de jeu.

## 1. Mise en Évidence Visuelle (Z-Index et Lueur)
Afin d'éviter la confusion lors des affrontements groupés (mêlée), chaque joueur distingue désormais instantanément son propre personnage :
- **Superposition (Z-Index)** : Le jeton contrôlé par l'utilisateur est forcé au premier plan, s'affichant toujours par-dessus les autres jetons s'ils se chevauchent sur la même case.
- **Rendu Visuel Accentué** : Le token lié à l'utilisateur est entouré d'une lueur (glow) spécifique ou bénéficie d'une légère sursaturation pour attirer l'œil dans la vision locale du joueur (les autres joueurs ne voient pas cette surbrillance, chacun voyant la sienne).

## 2. Déplacement Intelligent : Snap vs Libre
Le déplacement des tokens a été optimisé pour répondre aux besoins tactiques tout en gardant une flexibilité narrative :
- **Snap to Grid (Par défaut)** : Lors d'un glisser-déposer standard, le jeton est magnétiquement attiré par le centre des cases de la grille. Cela garantit une lisibilité tactique parfaite (portée, zones d'effet, déplacements calculés).
- **Déplacement Libre (Touche `Maj`)** : Si le joueur ou le MJ maintient la touche `Shift / Maj` enfoncée pendant qu'il déplace le token, le magnétisme est désactivé. Le jeton peut alors être posé n'importe où, avec une précision au pixel, idéal pour des scènes narratives ou des tokens de grande taille.

## 3. Contrôle au Clavier (ZQSD)
Pour offrir une expérience plus "jeu vidéo" et plus réactive :
- Un joueur peut **cliquer sur son token** pour le sélectionner (focus).
- Une fois sélectionné, il peut utiliser les touches **ZQSD** (ou les flèches directionnelles) pour déplacer le jeton de case en case instantanément, sans avoir à utiliser la souris.
- Ce déplacement respecte l'option de "Snap to Grid" et envoie les coordonnées via le système P2P (PeerJS) pour fluidifier les déplacements rapides.

## 4. Sécurité et Gestion des Permissions
Le moteur physique et réseau intègre désormais une vérification stricte :
- **Joueurs** : Un joueur ne peut interagir, glisser-déposer ou utiliser les contrôles claviers **que** sur les tokens qui lui appartiennent (ceux liés à son ID de session ou attribués par le MJ).
- **Maître de Jeu (MJ)** : Le MJ conserve les droits absolus (God Mode). Il peut sélectionner, déplacer et éditer n'importe quel token présent sur la carte.

## 5. Menu Contextuel (HUD) du Maître de Jeu
Le MJ dispose d'une interface rapide pour gérer les entités à la volée. En cliquant sur n'importe quel token, un petit menu flottant (HUD) apparaît au-dessus du jeton avec trois actions instantanées :
- 👁️ **Caché / Révélé** : Rend le jeton invisible aux yeux des joueurs. Sur l'écran du MJ, le jeton reste visible mais devient semi-transparent (pour indiquer son état caché). Parfait pour les embuscades ou les PNJ furtifs.
- 🔗 **Posséder** : Permet au MJ de se "lier" au jeton. Toutes les actions suivantes (lancers de dés, prises de parole dans le chat, mouvements) sont considérées comme venant de ce PNJ ou monstre.
- 🗑️ **Supprimer** : Retire instantanément le token de la carte de tous les joueurs et libère la mémoire.
