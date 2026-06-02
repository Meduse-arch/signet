# Rapport de Réflexion : Tracker d'Initiative & Gestion Visuelle des Combats (Option 1)

Ce document présente l'étude de conception pour le **Tracker d'Initiative** de **Signet VTT**, révisée pour se concentrer sur une **approche purement visuelle et non-bloquante** guidée par le MJ et intégrée de façon ergonomique dans l'interface de jeu.

---

## 1. Philosophie du Système : Visuel et Non-Bloquant

Pour conserver la flexibilité du jeu de rôle sur table physique, le tracker d'initiative est conçu pour être un **assistant visuel et narratif**, et non un verrou de jeu.

*   **Pas de blocage d'action** : Le système ne verrouille jamais les contrôles des joueurs. Même si ce n'est pas le tour de son personnage, un joueur peut toujours :
    *   Déplacer son jeton (Token) librement sur la carte.
    *   Ouvrir sa fiche de personnage et utiliser ses compétences.
    *   Lancer des dés ou interagir avec son inventaire (ce qui est crucial pour appliquer des dégâts reçus ou préparer une réaction).
*   **Rôle indicatif** : Le passage d'un tour à un autre sert uniquement à :
    *   Mettre à jour la file d'attente visuelle pour indiquer qui doit agir.
    *   Activer l'effet lumineux sous le jeton concerné sur la carte PixiJS pour que tout le monde le repère instantanément.

---

## 2. Emplacement dans l'Interface : Le Combat HUD (Haut Centre)

Suite à une réflexion sur l'ergonomie, nous avons écarté la zone en bas à gauche (déjà occupée par l'avatar du joueur et ses menus) pour éviter la surcharge visuelle.

La timeline de combat sera placée **en haut, au centre de l'écran** (`top-center`), inspirée des jeux de rôle tactiques modernes (ex: Baldur's Gate 3).

### A. Le Mini-Carrousel de Combat (Haut Centre)
Dès qu'un combat commence, un HUD central minimaliste apparaît :
*   **Affichage Limité (3 Acteurs max)** : 
    1.  **Précédent** : Avatar uniquement (estompé).
    2.  **Actuel (Tour en cours)** : **Avatar + Nom du personnage**, mis en évidence avec un halo doré.
    3.  **Suivant** : Avatar uniquement.
*   **Interactivité de Caméra (Zoom)** : Cliquer sur l'un de ces avatars déclenche un pan/zoom de la caméra sur la carte vers ce jeton.

### B. Les Boutons "Next" et "Fight"
À droite de ce mini-carrousel, se trouvent les commandes de gestion de combat :
*   **Bouton "Suivant" (`>`)** : Permet de terminer le tour en cours et de passer au suivant de manière très rapide.
*   **Bouton "Fight" (`⚔️`)** : Situé juste en dessous du bouton "Suivant" (ou à côté).
    *   **Pour le MJ** : C'est le bouton principal. Hors combat, il permet de "Créer un combat". Pendant le combat, cliquer sur "Fight" ouvre la **fenêtre d'administration complète** (la pop-up `InitiativeWindowContent` permettant de changer l'ordre d'initiative, ajouter des monstres, modifier les PV).
    *   **Pour les Joueurs** : Ce bouton (optionnel) pourrait simplement leur ouvrir la liste complète en lecture seule s'ils veulent voir l'ordre au-delà des 3 prochains tours.

---

## 3. Gestion des Participants (Qui participe au combat ?)

Pour savoir qui doit participer, le MJ dispose de trois méthodes combinées :

1. **Auto-Détection (Tokens de la scène active)** :
   *   Dès que le MJ clique sur "Fight" pour démarrer, le système scanne automatiquement tous les jetons présents sur la scène active.
2. **Sélection Contextuelle sur la Carte** :
   *   Le MJ peut faire un clic droit sur un jeton spécifique pour **"Ajouter à l'initiative"**.
3. **Ajout/Suppression à la volée dans le Tracker (Bouton Fight)** :
   *   Depuis la pop-up du bouton "Fight", le MJ peut ajouter/retirer des acteurs du bestiaire à tout moment, ou masquer certains monstres pour garder l'effet de surprise.

---

## 4. Architecture de Synchronisation P2P (SQLite & Zustand)

### A. Structure de la Base de Données (Hôte/MJ)
Le MJ stocke la structure de base du combat en local dans son fichier SQLite :

```sql
CREATE TABLE IF NOT EXISTS combat_sessions (
  session_id TEXT PRIMARY KEY,
  is_active INTEGER DEFAULT 0,
  current_round INTEGER DEFAULT 1,
  active_actor_id TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS combat_actors (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  name TEXT NOT NULL,
  initiative INTEGER DEFAULT 0,
  turn_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 0,
  conditions TEXT DEFAULT '[]',
  FOREIGN KEY(session_id) REFERENCES combat_sessions(session_id) ON DELETE CASCADE
);
```

### B. Zustand Store Répliqué (`src/store/combat.ts`)
Le passage de tour est purement déclaratif et visuel. Le MJ diffuse `COMBAT_STATE_UPDATE` via PeerJS aux joueurs pour que leurs HUDs (mini-carrousel et surbrillances PixiJS) se mettent à jour.

---

## 5. Intégration Graphique dans PixiJS 8 (Feedback de Tour Actif)

Quand un personnage a le tour actif, un halo lumineux apparaît sous son jeton via la classe `TokenSprite`.

### Code de l'effet dans `TokenSprite.ts`
```typescript
private activeRing: Container | null = null;

public setActiveTurnEffect(isActive: boolean) {
  if (isActive) {
    if (this.activeRing) return;
    this.activeRing = new Container();
    
    // Dessin du disque d'aura dorée
    const ring = new Graphics();
    ring.circle(0, 0, 24).stroke({ color: 0xF0C040, width: 2.5, alpha: 0.75 });
      
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      ring.circle(Math.cos(angle) * 24, Math.sin(angle) * 24, 2.5).fill({ color: 0xF0C040, alpha: 0.9 });
    }

    this.activeRing.addChild(ring);
    this.addChildAt(this.activeRing, 0); // Sous le sprite du perso
    this.app.ticker.add(this.animateActiveRing, this);
  } else {
    if (!this.activeRing) return;
    this.app.ticker.remove(this.animateActiveRing, this);
    this.removeChild(this.activeRing);
    this.activeRing.destroy({ children: true });
    this.activeRing = null;
  }
}

private animateActiveRing() {
  if (!this.activeRing) return;
  this.activeRing.rotation += 0.01;
  this.activeRing.scale.set(1.0 + Math.sin(this.app.ticker.lastTime * 0.005) * 0.05);
}
```
