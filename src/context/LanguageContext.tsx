import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  isRTL: false,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to 'fr' (standard telecom language in Algeria) or stored preference
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('djezzy_portal_lang');
    if (saved === 'fr' || saved === 'ar' || saved === 'en') {
      return saved;
    }
    return 'fr';
  });

  const isRTL = language === 'ar';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('djezzy_portal_lang', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    if (isRTL) {
      document.body.classList.add('font-cairo');
    } else {
      document.body.classList.remove('font-cairo');
    }
  }, [language, isRTL]);

  const t = (key: string, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key] !== undefined) {
      return langDict[key];
    }
    // Fallback to English, then French, then fallback string
    return (
      TRANSLATIONS.en[key] ||
      TRANSLATIONS.fr[key] ||
      fallback ||
      key
    );
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'font-arabic' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
