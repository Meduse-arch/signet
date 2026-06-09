import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Icons } from '../ui/Icons';

export const languages = [
 { code: 'fr', label: 'Français' },
 { code: 'en', label: 'English' },
 { code: 'es', label: 'Español' },
 { code: 'de', label: 'Deutsch' },
 { code: 'pt', label: 'Português' },
 { code: 'it', label: 'Italiano' },
 { code: 'ja', label: '日本語' },
 { code: 'pl', label: 'Polski' },
 { code: 'sv', label: 'Svenska' }
];

interface LanguageModalProps {
 isOpen: boolean;
 onClose: () => void;
}

export function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
 const { t, i18n } = useTranslation();

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title="LANGUAGES"
 maxWidth="md"
 >
 <div className="grid grid-cols-2 gap-3 pt-2">
 {languages.map((lang) => {
 const isActive = i18n.language.startsWith(lang.code);
 return (
 <button
 key={lang.code}
 onClick={() => {
 i18n.changeLanguage(lang.code);
 onClose();
 }}
 className={`relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group ${
 isActive 
 ? 'bg-glacier-DEFAULT/10 border-silver-DEFAULT text-glacier-bright shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
 : 'bg-surface-sidebar border-silver-DEFAULT/20 text-silver-bright hover:border-silver-DEFAULT/50 hover:bg-glacier-DEFAULT/5'
 }`}
 >
 <span className="font-quantico font-bold tracking-wider text-sm">{lang.label}</span>
 {isActive && <Icons.Check className="w-5 h-5 text-glacier-bright" />}
 {!isActive && <div className="w-5 h-5 rounded-full border border-silver-DEFAULT/30 group-hover:border-silver-DEFAULT/60 transition-colors" />}
 </button>
 );
 })}
 </div>
 </Modal>
 );
}
