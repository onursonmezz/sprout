import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { Language, translations, Translations } from '@/constants/translations';
import { loadJSON, saveJSON } from '@/utils/storage';

const STORAGE_KEY = 'sprout:language';

type LanguageContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  loaded: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJSON<Language>(STORAGE_KEY, 'en').then((saved) => {
      setLangState(saved);
      setLoaded(true);
    });
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    saveJSON(STORAGE_KEY, next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang], loaded }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
