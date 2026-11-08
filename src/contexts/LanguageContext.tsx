import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'tr' | 'en' | 'ru' | 'de';

interface Translations {
  [key: string]: string | Translations;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('tr');
  const [translations, setTranslations] = useState<Translations>({});

  const loadTranslations = async (lang: Language) => {
    try {
      // Import the translation file directly
      let translations;
      if (lang === 'tr') {
        translations = await import('../language/tr/lang.json');
      } else if (lang === 'en') {
        translations = await import('../language/en/lang.json');
      } else if (lang === 'ru') {
        translations = await import('../language/ru/lang.json');
      } else if (lang === 'de') {
        translations = await import('../language/de/lang.json');
      } else {
        throw new Error(`Unsupported language: ${lang}`);
      }
      setTranslations(translations.default || translations);
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to Turkish if loading fails
      if (lang !== 'tr') {
        loadTranslations('tr');
      }
    }
  };

  useEffect(() => {
    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['tr', 'en', 'ru', 'de'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    loadTranslations(language);
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: string | Translations = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key; // Return the key itself if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: handleSetLanguage,
      t,
      translations
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;