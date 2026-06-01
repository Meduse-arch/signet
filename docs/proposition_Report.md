# Rapport de Proposition : Prochaines Évolutions de Sigil VTT

Suite à la finalisation du système de synchronisation des cartes (Auto-Sync) et à la refonte de l'interface et du réseau P2P, la base du VTT est désormais très solide. 

Voici plusieurs propositions d'évolutions majeures pour enrichir l'expérience de jeu. Quelle direction souhaites-tu prendre pour la suite ?

## Option 1 : Tracker d'Initiative et Gestion des Combats
*Une fonctionnalité indispensable pour tout VTT.*
- **Concept** : Un panneau ou une fenêtre flottante permettant au MJ d'ajouter des personnages (joueurs et monstres du bestiaire) à une liste d'initiative.
- **Fonctionnalités** :
  - Lancer d'initiative automatique ou manuel.
  - Suivi des tours (personnage actif mis en surbrillance).
  - Suivi rapide des points de vie (PV) directement depuis le tracker.
  - Synchronisation en temps réel avec tous les joueurs.

## Option 2 : Outils de Dessin et Pointeurs sur la Map
*Pour améliorer la communication visuelle pendant la partie.*
- **Concept** : Ajouter une barre d'outils sur le `BoardCanvas` permettant de dessiner ou d'indiquer des choses.
- **Fonctionnalités** :
  - **Pointeur Magique** : Un clic prolongé ou un outil spécifique crée un "ping" visuel synchronisé chez tout le monde pour attirer l'attention sur un point de la carte.
  - **Dessin basique** : Outil pinceau/ligne pour tracer des zones de sorts, des murs ou des chemins (avec choix de couleur).
  - **Outil de Mesure** : Une règle pour calculer les distances en cases/mètres sur la grille.

## Option 3 : Ambiance Sonore et Audio Sync
*Pour une immersion totale.*
- **Concept** : Permettre au MJ de diffuser de la musique ou des effets sonores à tous les joueurs connectados.
- **Fonctionnalités** :
  - Lecteur audio intégré pour le MJ (upload ou liens YouTube/fichiers locaux).
  - Synchronisation de la lecture, de la pause et du volume via le réseau P2P.
  - Boutons de "Soundboard" rapides pour des effets (bruit d'épée, explosion, etc.).

## Option 4 : Brouillard de Guerre Dynamique (Fog of War)
*L'évolution logique de la carte.*
- **Concept** : Cacher la carte aux joueurs et la révéler progressivement.
- **Fonctionnalités** :
  - Outil pinceau pour le MJ pour révéler ou masquer manuellement des zones de la carte.
  - (Optionnel) Vision liée aux tokens : la zone se découvre automatiquement autour des tokens des joueurs.

---

> [!TIP]
> **Que choisis-tu ?**
> Réponds-moi avec l'option qui te tente le plus (ou propose une autre idée !), et je préparerai le plan d'implémentation détaillé.