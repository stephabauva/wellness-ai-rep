import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useLanguageSync = (savedLanguage?: string) => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage).then(() => {
        setCurrentLang(savedLanguage);
        localStorage.setItem('i18nextLng', savedLanguage);
      });
    }
  }, [savedLanguage, i18n]);

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    setCurrentLang(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return { currentLang, changeLanguage };
};