import React, { useState, useRef, useCallback } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useTranslation } from 'react-i18next';
import { Icons } from './Icons';

// ============================================================
// COMPOSANT SELECT — SIGNET Design System
// Extraction de notre liste déroulante personnalisée réutilisable.
// Basé sur le dropdown de sélection de système dans CreateSessionModal
// et le filtre de recherche dans HubPage.
// ============================================================

export interface SelectOption {
 /** Valeur interne (clé) */
 value: string;
 /** Texte affiché */
 label: string;
 /** Icône optionnelle affichée à gauche de l'option */
 icon?: React.ReactNode;
}

export interface SelectProps {
 /** Libellé affiché au-dessus du champ */
 label?: string;
 /** Option actuellement sélectionnée */
 value: string;
 /** Callback déclenché à la sélection d'une option */
 onChange: (value: string) => void;
 /** Liste des options disponibles */
 options: SelectOption[];
 /** Texte affiché quand aucune valeur n'est sélectionnée */
 placeholder?: string;
 /** Message si la liste filtrée est vide */
 emptyMessage?: string;
 /** Activer la barre de recherche intégrée pour filtrer les options */
 searchable?: boolean;
 /** Désactiver le composant */
 disabled?: boolean;
 /** Classes supplémentaires pour le wrapper */
 className?: string;
}

export function Select({
 label,
 value,
 onChange,
 options,
 placeholder = 'Sélectionner…',
 emptyMessage = 'Aucun résultat…',
 searchable = false,
 disabled = false,
 className = '',
}: SelectProps) {
 const { t } = useTranslation();
 const actualPlaceholder = placeholder === 'Sélectionner…' ? t('common.select', 'Sélectionner…') : placeholder;
 const actualEmptyMessage = emptyMessage === 'Aucun résultat…' ? t('common.noResult', 'Aucun résultat…') : emptyMessage;
 
 const [isOpen, setIsOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const wrapperRef = useRef<HTMLDivElement>(null);

 // Fermeture automatique au clic hors du composant
 const handleClose = useCallback(() => {
 setIsOpen(false);
 setSearchQuery('');
 }, []);
 useClickOutside(wrapperRef, handleClose, isOpen);

 const selectedOption = options.find((o) => o.value === value);

 const filteredOptions = searchable
 ? options.filter((o) =>
 o.label.toLowerCase().includes(searchQuery.toLowerCase())
 )
 : options;

 const handleSelect = (optionValue: string) => {
 onChange(optionValue);
 handleClose();
 };

 const handleToggle = () => {
 if (!disabled) {
 setIsOpen((prev) => !prev);
 if (!isOpen) setSearchQuery('');
 }
 };

 return (
 <div
 ref={wrapperRef}
 className={`relative flex flex-col gap-1.5 ${className}`}
 >
 {/* Libellé */}
 {label && (
 <span className="text-[10px] font-quantico font-black text-gold-muted tracking-widest uppercase ml-1">
 {label}
 </span>
 )}

 {/* Bouton déclencheur */}
 <button
 type="button"
 onClick={handleToggle}
 disabled={disabled}
 className={[
 'w-full flex items-center justify-between gap-3 text-left',
 'bg-[#0D0D0F]/80 border rounded-xl py-3 px-4',
 'text-xs font-quantico transition-all duration-200',
 'disabled:opacity-50 disabled:cursor-not-allowed',
 isOpen
 ? 'border-silver-DEFAULT/60 ring-1 ring-gold-DEFAULT/20 text-glacier-bright'
 : 'border-silver-DEFAULT/30 text-glacier-bright hover:border-silver-DEFAULT/50',
 ].join(' ')}
 aria-expanded={isOpen}
 aria-haspopup="listbox"
 >
 <span className="flex items-center gap-2 tracking-widest uppercase truncate">
 {selectedOption?.icon}
 {selectedOption ? selectedOption.label : (
 <span className="text-gold-muted/60 font-inter italic normal-case tracking-normal">{actualPlaceholder}</span>
 )}
 </span>
 <Icons.ChevronDown
 className={`w-4 h-4 text-gold-muted shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-glacier-bright' : ''}`}
 />
 </button>

 {/* Panneau déroulant */}
 {isOpen && (
 <div
 role="listbox"
 className={[
 'absolute top-full left-0 w-full z-[60] mt-2',
 'bg-[#16161C] border border-silver-DEFAULT/40 rounded-xl',
 'shadow-2xl backdrop-blur-md',
 'animate-in fade-in slide-in-from-top-2 duration-200',
 'overflow-hidden',
 ].join(' ')}
 >
 {/* Recherche intégrée */}
 {searchable && (
 <div className="p-2 border-b border-silver-DEFAULT/10">
 <div className="relative">
 <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-muted/60 pointer-events-none" />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={t('common.searchPlaceholder', 'Rechercher…')}
 autoFocus
 className="w-full bg-transparent pl-8 pr-3 py-2 text-[11px] font-inter italic text-glacier-bright placeholder:text-gold-muted/40 outline-none"
 />
 </div>
 </div>
 )}

 {/* Liste des options */}
 <div className="max-h-52 overflow-y-auto custom-scrollbar">
 {filteredOptions.length === 0 ? (
 <div className="px-4 py-4 text-xs italic font-inter text-gold-muted/50 text-center">
 {actualEmptyMessage}
 </div>
 ) : (
 filteredOptions.map((option) => {
 const isSelected = option.value === value;
 return (
 <div
 key={option.value}
 role="option"
 aria-selected={isSelected}
 onClick={() => handleSelect(option.value)}
 className={[
 'flex items-center justify-between px-4 py-3 cursor-pointer',
 'text-[11px] font-quantico uppercase tracking-widest',
 'border-b border-white/5 last:border-0',
 'transition-all duration-150',
 isSelected
 ? 'text-glacier-bright bg-glacier-DEFAULT/10'
 : 'text-silver-bright hover:text-glacier-bright hover:bg-glacier-DEFAULT/5',
 ].join(' ')}
 >
 <span className="flex items-center gap-2 font-bold">
 {option.icon}
 {option.label}
 </span>
 {isSelected && (
 <Icons.Check className="w-3.5 h-3.5 text-glacier-bright shrink-0" />
 )}
 </div>
 );
 })
 )}
 </div>
 </div>
 )}
 </div>
 );
}
