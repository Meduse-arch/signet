import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icons } from './Icons';

// ============================================================
//  COMPOSANT MODAL — SIGNET Design System
//  Conteneur de modale standardisé avec habillage grimoire :
//  texture cuir, coins dorés rétro-futuristes, backdrop flouté.
// ============================================================

export interface ModalProps {
  /** Contrôle l'affichage de la modale */
  isOpen: boolean;
  /** Callback déclenché à la fermeture (clic backdrop ou bouton ×) */
  onClose: () => void;
  /** Titre affiché dans l'en-tête (texte pré-traduit via t()) */
  title?: React.ReactNode;
  /** Contenu principal de la modale */
  children: React.ReactNode;
  /** Actions de pied de page (boutons Annuler / Valider) */
  footer?: React.ReactNode;
  /** Largeur maximale du panneau (défaut : max-w-sm) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Désactive la fermeture en cliquant sur le backdrop */
  disableBackdropClose?: boolean;
  /** Classe supplémentaire pour le panneau intérieur */
  className?: string;
}

const maxWidthClass: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'sm',
  disableBackdropClose = false,
  className = '',
}: ModalProps) {
  const { t } = useTranslation();

  // Bloquer le scroll de la page quand la modale est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fermeture sur Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 pointer-events-auto"
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={disableBackdropClose ? undefined : onClose}
      />

      {/* Panneau principal */}
      <div
        className={[
          // Taille & layout
          'relative w-full flex flex-col pointer-events-auto',
          'max-h-[95vh] sm:max-h-[90vh]',
          maxWidthClass[maxWidth],
          // Surface sombre avec texture
          'bg-[#111115]',
          'border border-gold-DEFAULT/40 rounded-[1.5rem] sm:rounded-[2rem]',
          // Ombre profonde
          'shadow-[0_0_60px_rgba(0,0,0,0.8)]',
          className,
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Texture grimoire */}
        <div className="absolute inset-0 bg-grimoire-texture opacity-[0.05] pointer-events-none rounded-[inherit]" />

        {/* Coins dorés décoratifs */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-gold-DEFAULT/40 rounded-tl-[1.5rem] sm:rounded-tl-[2rem] pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-gold-DEFAULT/40 rounded-tr-[1.5rem] sm:rounded-tr-[2rem] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-gold-DEFAULT/20 rounded-bl-[1.5rem] sm:rounded-bl-[2rem] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-gold-DEFAULT/20 rounded-br-[1.5rem] sm:rounded-br-[2rem] pointer-events-none" />

        {/* En-tête */}
        {title !== undefined && (
          <header className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
            <h2 className="text-sm sm:text-base font-cinzel font-black text-gold-bright tracking-[0.2em] uppercase text-glow-gold">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gold-DEFAULT hover:text-gold-bright hover:bg-gold-DEFAULT/10 transition-all duration-200 flex items-center justify-center"
              aria-label={t('common.close', 'Fermer')}
            >
              <Icons.X className="w-4 h-4" />
            </button>
          </header>
        )}

        {/* Corps scrollable */}
        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar px-6 pb-4">
          {children}
        </div>

        {/* Pied de page (boutons d'action) */}
        {footer && (
          <footer className="relative z-10 flex gap-3 px-6 py-5 shrink-0 border-t border-gold-DEFAULT/10">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
