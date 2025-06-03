import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';

// Get the saved language or default to 'en'
const savedLanguage = localStorage.getItem('i18nextLng') || 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: savedLanguage, // Set initial language explicitly
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false,
    },
    
    resources: {
      en: {
        translation: en
      },
      fr: {
        translation: fr
      }
    },
    
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    }
  });

export default i18n;