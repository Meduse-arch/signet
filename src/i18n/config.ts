import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import pl from './locales/pl.json';
import sv from './locales/sv.json';

const savedLanguage = localStorage.getItem('signet_language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
      de: { translation: de },
      pt: { translation: pt },
      it: { translation: it },
      ja: { translation: ja },
      pl: { translation: pl },
      sv: { translation: sv },
    },
    lng: savedLanguage, // Langue chargée depuis le stockage local ou par défaut
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React gère déjà l'échappement XSS
    },
  });

// Sauvegarder la langue lorsqu'elle change
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('signet_language', lng);
});

export default i18n;
