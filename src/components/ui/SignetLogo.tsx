import React from 'react';
import logo from '../../assets/logo.svg';

export interface SignetLogoProps {
 /** 
 * 'loop' = Un balayage métallique traverse le logo toutes les 5 secondes (pour les écrans de chargement)
 * 'hover' = Statique, le balayage ne s'active qu'une seule fois au survol (pour l'UI in-game)
 */
 mode: 'loop' | 'hover';
 className?: string;
 imgClassName?: string;
}

export function SignetLogo({ mode, className = '', imgClassName = '' }: SignetLogoProps) {
 return (
 <div className={`relative inline-flex items-center justify-center group ${className} ${mode === 'loop' ? 'sheen-loop' : 'sheen-hover'}`}>
 {/* L'image de base (non animée, nette) */}
 <img src={logo} alt="Signet Logo" className={`object-contain relative z-10 ${imgClassName}`} />
 
 {/* Le masque qui contient l'animation de balayage. Il a la forme exacte du logo. */}
 <div 
 className="absolute inset-0 pointer-events-none sheen-overlay z-20"
 style={{ 
 WebkitMaskImage: `url(${logo})`, 
 WebkitMaskSize: 'contain', 
 WebkitMaskRepeat: 'no-repeat', 
 WebkitMaskPosition: 'center',
 maskImage: `url(${logo})`,
 maskSize: 'contain',
 maskRepeat: 'no-repeat',
 maskPosition: 'center'
 }}
 />
 </div>
 );
}
