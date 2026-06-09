import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icons } from './Icons';

// ============================================================
// COMPOSANT MODAL — SIGNET Design System
// Conteneur de modale standardisé avec habillage grimoire :
// texture cuir, coins dorés rétro-futuristes, backdrop flouté.
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
 // Surface sombre
 'bg-[#0B0B0E]/95 backdrop-blur-xl',
 'border-2 border-silver-DEFAULT/30 rounded-sm',
 // Ombre profonde
 'shadow-[0_0_60px_rgba(0,0,0,0.8)]',
 className,
 ].join(' ')}
 onClick={(e) => e.stopPropagation()}
 >
 {/* Coins technologiques décoratifs (Optionnel mais cool) */}
 <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-silver-DEFAULT pointer-events-none" />
 <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-silver-DEFAULT pointer-events-none" />
 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-silver-DEFAULT/50 pointer-events-none" />
 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-silver-DEFAULT/50 pointer-events-none" />

 {/* En-tête */}
 {title !== undefined && (
 <header className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
 <h2 className="text-sm sm:text-base font-quantico font-bold text-glacier-bright tracking-[0.2em] uppercase ">
 {title}
 </h2>
 <button
 onClick={onClose}
 className="p-1.5 rounded-sm text-silver-DEFAULT hover:text-glacier-bright hover:bg-glacier-DEFAULT/10 transition-all duration-200 flex items-center justify-center"
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
 <footer className="relative z-10 flex gap-3 px-6 py-5 shrink-0 border-t border-silver-DEFAULT/10 bg-black/40">
 {footer}
 </footer>
 )}
 </div>
 </div>,
 document.body
 );
}
