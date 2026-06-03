import React, { useId } from 'react';

// ============================================================
//  COMPOSANT INPUT — SIGNET Design System
//  Standardise tous les champs de saisie de l'application.
//  Charte : fond sombre, bordures dorées réactives, placeholder lisible.
// ============================================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Libellé affiché au-dessus du champ */
  label?: string;
  /** Message d'erreur affiché sous le champ avec style rouge */
  error?: string;
  /** Icône affichée à gauche, à l'intérieur du champ (depuis Icons.tsx) */
  leftIcon?: React.ReactNode;
  /** Icône ou bouton affiché à droite (depuis Icons.tsx) */
  rightElement?: React.ReactNode;
  /** Affiche un fond plus clair et opaque pour les zones à fort contraste */
  elevated?: boolean;
  /** Activer la police mono (pour clés de connexion, codes…) */
  mono?: boolean;
  /** Classes supplémentaires appliquées au wrapper externe */
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightElement,
      elevated = false,
      mono = false,
      wrapperClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    const bgClass = elevated
      ? 'bg-surface-card border border-gold-DEFAULT/30'
      : 'bg-[#0D0D0F]/80 border border-gold-DEFAULT/30';

    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        {/* Libellé */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-[10px] font-cinzel font-black text-gold-muted tracking-widest uppercase ml-1"
          >
            {label}
          </label>
        )}

        {/* Wrapper du champ + icônes */}
        <div className="relative group">
          {/* Icône gauche */}
          {leftIcon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-muted group-focus-within:text-gold-bright transition-colors duration-200 pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              // Base
              'w-full rounded-xl py-3 text-sm transition-all duration-200 outline-none',
              // Fond & bordure
              bgClass,
              // Focus : bordure plus lumineuse + légère lueur
              'focus:border-gold-DEFAULT/60 focus:ring-1 focus:ring-gold-DEFAULT/20',
              // Placeholder plus lisible (ni trop fort, ni invisible)
              'placeholder:text-gold-muted/50 placeholder:font-serif placeholder:italic',
              // Texte principal
              'text-gold-bright',
              // Disabled
              'disabled:opacity-50 disabled:cursor-not-allowed',
              // Padding conditionnel selon les icônes
              leftIcon ? 'pl-12' : 'pl-4',
              rightElement ? 'pr-12' : 'pr-4',
              // Police mono optionnelle
              mono ? 'font-mono tracking-[0.2em] uppercase text-center' : 'font-serif italic',
              // Erreur : bordure rouge
              error ? 'border-red-500/50 focus:border-red-500/80 focus:ring-red-500/20' : '',
              className,
            ].join(' ')}
            {...props}
          />

          {/* Élément de droite (icône ou bouton) */}
          {rightElement && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {rightElement}
            </span>
          )}
        </div>

        {/* Message d'erreur */}
        {error && (
          <p className="text-red-400 text-[10px] font-cinzel tracking-wide ml-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
