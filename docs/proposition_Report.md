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

## 3. Comportement de la Map sur l'Écran Externe (Question Ouverte)
*Contexte : Comment l'écran externe doit-il réagir quand le Maître du Jeu change de carte sur son écran principal ?*

Voici **deux approches possibles** pour lesquelles j'ai besoin de ton avis :

> [!TIP]
> **Option A : Synchronisation Automatique ("Auto-Sync")**
> Dès que le MJ clique sur une carte dans sa liste, l'écran de projection externe change instantanément de carte pour suivre le MJ.
> **Avantage** : Rapide, fluide, aucune action supplémentaire.
> **Inconvénient** : Si le MJ veut juste "regarder" ou préparer une carte en secret avant de l'envoyer aux joueurs, il ne peut pas le faire (car ça s'affichera direct sur l'écran des joueurs).

> [!TIP]
> **Option B : Synchronisation Manuelle ("Push to Screen")**
> L'écran externe reste sur la scène actuelle. Le MJ peut naviguer sur différentes cartes de son côté. Pour envoyer une carte spécifique à l'écran externe, le MJ doit appuyer sur un bouton "Projeter cette carte".
> **Avantage** : Contrôle absolu du MJ. Possibilité de préparer des tokens/brouillard en secret.
> **Inconvénient** : Nécessite un clic supplémentaire de la part du MJ pour changer l'affichage public.

**Quelle option préfères-tu pour le changement de carte (A ou B) ?** Dès que j'ai ta réponse, je lance le code pour la barre de chargement, l'UI du bouton, et la logique d'écran externe !
