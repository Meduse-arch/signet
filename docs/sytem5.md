# Implémentation du Système 5e (SRD)

Maintenant que l'architecture modulaire est en place, ajouter le Système 5e consiste simplement à créer un nouveau "plugin" système et à l'ajouter au registre. Le `CoreEngine` s'occupera d'afficher le reste de l'interface (carte, annales, inventaire, etc.).

## ⚠️ User Review Required
Avant de coder l'interface de la fiche de perso 5e, j'ai besoin de savoir jusqu'où tu veux pousser la spécialisation de la fiche.

## ❓ Open Questions
1. **Les Compétences 5e (Athlétisme, Discrétion...)** : 
   - *Option A* : On garde la même interface épurée que Seal, et les joueurs ajoutent leurs compétences dans l'onglet "Codex/Skills". (Le plus simple).
   - *Option B* : On intègre la liste officielle des 18 compétences 5e directement sur la page "Profil" de la fiche de perso, avec des cases à cocher pour la Maîtrise. (Plus proche d'une vraie fiche D&D).
2. **Magie / Emplacements de sorts** :
   - Pour l'instant, on peut utiliser le système de "Ressources" (Barres) pour ajouter des barres "Slots Niv 1", "Slots Niv 2", etc. Est-ce que ça te va, ou veux-tu un onglet dédié à la magie ?

## Proposed Changes

### 1. Constantes 5e
#### [NEW] `src/systems/srd5/constants.ts`
- `DEFAULT_5E_STATS` : Force, Dextérité, Constitution, Intelligence, Sagesse, Charisme (valeur par défaut : 10).
- `DEFAULT_5E_BARS` : HP (Points de vie), AC (Classe d'Armure), Speed (Vitesse), Temp HP.
- `DEFAULT_5E_SETTINGS` : Paramètres de base pour une nouvelle session 5e.

### 2. Interface des paramètres
#### [NEW] `src/systems/srd5/components/Srd5SettingsModal.tsx`
- Une version adaptée de la modale de création de session, qui charge les stats et barres 5e par défaut.

### 3. Fiche de Personnage 5e
#### [NEW] `src/systems/srd5/components/Srd5CharacterSheet.tsx`
- Fiche de perso spécifique à la 5e.
- **Logique de Jet de Dés modifiée** : 
  Au lieu de lancer `1d(Valeur de stat)`, la fonction de jet calculera le modificateur : `Mod = Math.floor((Valeur - 10) / 2)`.
  Le jet envoyé au chat sera donc un classique `1d20 + Mod` !

### 4. Enregistrement du Système
#### [NEW] `src/systems/srd5/index.ts`
- Exporte l'objet `Srd5System` contenant le nom, les composants et les paramètres par défaut.
#### [MODIFY] `src/components/CreateSessionModal/index.tsx`
- Import de `Srd5System` et ajout dans `SYSTEM_REGISTRY`.
- Le système "Système 5e" apparaîtra dans le menu déroulant lors de la création d'une nouvelle session !

## Verification Plan
1. Lancer l'application et créer une session en choisissant "Système 5e".
2. Ouvrir la fiche d'un personnage (Hud ou fenêtre complète).
3. Vérifier que les stats sont bien celles de D&D.
4. Mettre la Force à 16.
5. Cliquer sur Force : vérifier que le chat affiche un jet de `1d20+3` et non pas `1d16`.
