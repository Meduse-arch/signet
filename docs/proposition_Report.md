# Rapport de Proposition : Écran de Projection Externe

Ce rapport fait suite à ta demande concernant la réorganisation de la projection de carte (écran externe/joueurs) et l'affichage de la barre de chargement.

## 1. La Barre de Chargement (Cache)
*Contexte : Le pourcentage sautait de 0 à 100% d'un coup lors de l'utilisation du cache.*
**Proposition retenue :** Je vais rétablir l'affichage du texte de chargement pour le cache. Au lieu de valider 100% instantanément, nous incrémenterons le pourcentage visuellement à chaque itération (à chaque chunk peint ou vérifié). Même si le cache est très rapide, l'utilisateur verra le chiffre grimper rapidement et fluidement, ce qui rassure l'œil. 

## 2. L'Interface du Mode Projection
*Contexte : Le bouton de projection (l'écran) est actuellement dupliqué sur chaque carte de lieu dans la galerie.*
**Ce qui va être fait :**
- Suppression totale du bouton "Projection" (`MonitorPlay`) des cartes individuelles de la galerie.
- Ajout d'un bouton unique de projection dans l'en-tête de la fenêtre (à côté de celui qui permet de pop-out/détacher la fenêtre des scènes). 

## 3. Comportement de la Map sur l'Écran Externe (Solution retenue)
*Contexte : Comment l'écran externe doit-il réagir quand le Maître du Jeu change de carte sur son écran principal ?*

Au lieu de choisir entre un mode purement automatique ou manuel, nous allons implémenter un interrupteur (**Toggle**) directement dans l'en-tête de la fenêtre :

- **Bouton Vert (Auto-Sync ON)** : L'écran de projection externe change instantanément de carte dès que le MJ sélectionne une nouvelle scène. C'est l'approche fluide et rapide.
- **Bouton Rouge (Auto-Sync OFF)** : Le MJ peut naviguer librement entre les scènes pour préparer sa session en secret. L'écran de projection externe reste figé sur la scène actuelle jusqu'à ce que l'Auto-Sync soit réactivé.

Cette solution offre la flexibilité totale au MJ directement depuis l'interface principale.

**Je lance dès maintenant le code pour la barre de chargement, l'UI des boutons (projection et toggle auto-sync), ainsi que la logique de synchronisation !**

