import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export const LanguageTest: React.FC = () => {
  const { t } = useTranslation();
  
  const handleLanguageChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    // Force re-render by updating the page
    window.location.reload();
  };

  return (
    <div className="p-4 border rounded">
      <h3>Language Test</h3>
      <p>Current language: {i18n.language}</p>
      <p>Test translation: {t('navigation.chat')}</p>
      <div className="flex gap-2 mt-2">
        <button 
          onClick={() => handleLanguageChange('en')}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          English
        </button>
        <button 
          onClick={() => handleLanguageChange('fr')}
          className="px-3 py-1 bg-green-500 text-white rounded"
        >
          Français
        </button>
      </div>
    </div>
  );
};