# Rapport de Mise à Jour (Initiative)

- **Corrections des bugs de sauvegarde** : La fonction `saveCombatState` est maintenant correctement reconnue dans l'API Electron (`preload.ts`), supprimant l'erreur critique qui survenait lors des actions d'initiative.
- **Ajout rapide de participants** : La saisie manuelle de monstres a été supprimée. Vous avez maintenant un sélecteur intelligent lié au serveur et un bouton **"Tout ajouter"** qui insère d'un coup tous les personnages/monstres existants dans la timeline.
- **Rolls automatiques pour le MJ** : Lorsque vous cliquez sur "Lancer", l'application détecte automatiquement les PNJs et Monstres, lance **1d20** pour eux, et trie immédiatement l'ordre d'initiative de manière décroissante.
- **Notification visuelle "À VOS DÉS"** : Dès le lancement du combat, un gigantesque texte animé "À VOS DÉS !" doré et lumineux apparaît en plein milieu de l'écran des joueurs pendant 5 secondes pour les appeler à l'action.