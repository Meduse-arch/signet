import { useEffect, RefObject } from 'react';

/**
 * Hook personnalisé : détecte les clics à l'extérieur d'un élément référencé.
 * Remplace les useEffect ad-hoc répétés dans chaque composant avec un dropdown.
 *
 * @param ref - La référence React vers l'élément à surveiller
 * @param handler - La fonction à appeler lors d'un clic extérieur
 * @param enabled - Activer/désactiver la détection (utile quand le dropdown est fermé)
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: () => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
}
