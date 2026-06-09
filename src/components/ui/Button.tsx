import React from 'react';
import { Icons } from './Icons';

// ============================================================
// COMPOSANT BUTTON — SIGNET Design System
// Règle de lisibilité : fond clair (or/argent) + texte sombre.
// Le bouton "Lancer la Session" est le standard de référence.
// ============================================================

export type ButtonVariant =
 | 'primary' // Or lumineux, texte noir → contraste maximal (standard de référence)
 | 'secondary' // Contour doré fin, texte doré, fond très légèrement opaque
 | 'tertiary' // Contour blanc/argent, texte blanc
 | 'silver' // Argent lumineux, texte noir
 | 'danger' // Rouge-orangé lumineux, texte noir
 | 'ghost'; // Aucun fond, texte doré discret

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: ButtonVariant;
 size?: ButtonSize;
 /** Affiche Icons.Loader2 animé et bloque le bouton */
 isLoading?: boolean;
 /** Icône à gauche du texte (depuis Icons.tsx uniquement) */
 leftIcon?: React.ReactNode;
 /** Icône à droite du texte (depuis Icons.tsx uniquement) */
 rightIcon?: React.ReactNode;
 /** Active le reflet lumineux animé traversant le bouton */
 hasSheen?: boolean;
 /** Bouton pleine largeur */
 fullWidth?: boolean;
}

// --- Styles par variante ---
const variantStyles: Record<ButtonVariant, string> = {
 primary: [
 'bg-glacier-DEFAULT text-black',
 'hover:bg-glacier-bright',
 'disabled:bg-[#18181F] disabled:text-white/30 disabled:border disabled:border-white/10 disabled:cursor-not-allowed disabled:pointer-events-auto',
 'shadow-[0_4px_20px_rgba(79,164,184,0.2)] hover:shadow-[0_4px_30px_rgba(79,164,184,0.45)]',
 ].join(' '),

 secondary: [
 'bg-glacier-DEFAULT/5 text-glacier-bright border border-glacier-DEFAULT/30',
 'hover:bg-glacier-DEFAULT/15 hover:border-glacier-DEFAULT/60',
 'disabled:bg-transparent disabled:text-white/25 disabled:border-white/10 disabled:cursor-not-allowed',
 ].join(' '),

 tertiary: [
 'bg-transparent text-white/70 border border-white/15',
 'hover:bg-white/5 hover:text-white hover:border-white/30',
 'disabled:text-white/20 disabled:border-white/5 disabled:cursor-not-allowed',
 ].join(' '),

 silver: [
 'bg-silver-DEFAULT text-black',
 'hover:bg-silver-bright',
 'disabled:bg-[#18181F] disabled:text-white/30 disabled:border disabled:border-white/10 disabled:cursor-not-allowed',
 'shadow-[0_4px_20px_rgba(157,168,184,0.2)] hover:shadow-[0_4px_30px_rgba(157,168,184,0.4)]',
 ].join(' '),

 danger: [
 'bg-red-500 text-white',
 'hover:bg-red-400',
 'disabled:bg-[#18181F] disabled:text-white/30 disabled:border disabled:border-white/10 disabled:cursor-not-allowed',
 'shadow-[0_4px_20px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_30px_rgba(239,68,68,0.4)]',
 ].join(' '),

 ghost: [
 'bg-transparent text-glacier-DEFAULT/80',
 'hover:text-glacier-bright hover:bg-glacier-DEFAULT/5',
 'disabled:text-white/20 disabled:cursor-not-allowed',
 ].join(' '),
};

// --- Tailles ---
const sizeStyles: Record<ButtonSize, string> = {
 sm: 'px-4 py-2 text-[10px] gap-1.5 rounded-xl',
 md: 'px-6 py-3 text-xs gap-2 rounded-xl',
 lg: 'px-8 py-5 text-sm gap-3 rounded-2xl',
};

// --- Poids de police selon la variante ---
const fontStyles: Record<ButtonVariant, string> = {
 primary: 'font-quantico font-bold tracking-widest uppercase',
 secondary: 'font-quantico font-bold tracking-widest uppercase',
 tertiary: 'font-quantico font-bold tracking-widest uppercase',
 silver: 'font-quantico font-bold tracking-widest uppercase',
 danger: 'font-quantico font-bold tracking-widest uppercase',
 ghost: 'font-quantico font-bold tracking-[0.15em] uppercase',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 (
 {
 variant = 'primary',
 size = 'md',
 isLoading = false,
 leftIcon,
 rightIcon,
 hasSheen = false,
 fullWidth = false,
 children,
 className = '',
 disabled,
 ...props
 },
 ref
 ) => {
 const isDisabled = disabled || isLoading;

 return (
 <button
 ref={ref}
 disabled={isDisabled}
 className={[
 // Base commune
 'relative overflow-hidden inline-flex items-center justify-center',
 'transition-all duration-200 ease-out',
 'active:scale-95',
 // Taille & typographie
 sizeStyles[size],
 fontStyles[variant],
 // Variante
 variantStyles[variant],
 // Pleine largeur
 fullWidth ? 'w-full' : '',
 // Classes personnalisées
 className,
 ].join(' ')}
 {...props}
 >
 {/* Effet reflet lumineux (Sheen Effect) */}
 {hasSheen && !isDisabled && (
 <span
 aria-hidden="true"
 className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 pointer-events-none"
 />
 )}

 {/* Contenu du bouton */}
 <span className="relative z-10 inline-flex items-center justify-center gap-[inherit]">
 {isLoading ? (
 <Icons.Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 leftIcon
 )}
 {children}
 {!isLoading && rightIcon}
 </span>
 </button>
 );
 }
);

Button.displayName = 'Button';
