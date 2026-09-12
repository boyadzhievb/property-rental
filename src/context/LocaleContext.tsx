import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { type Locale, type TranslationKeys, getTranslations, loadTranslations } from '../i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
}

const STORAGE_KEY = 'app-locale';

function getInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ['en', 'fr', 'de', 'bg', 'el'].includes(stored)) {
    return stored as Locale;
  }
  return 'en';
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const [t, setT] = useState<TranslationKeys>(() => getTranslations(getInitialLocale()));

  useEffect(() => {
    if (locale !== 'en') {
      loadTranslations(locale).then(setT);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    loadTranslations(newLocale).then((translations) => {
      setLocaleState(newLocale);
      setT(translations);
      localStorage.setItem(STORAGE_KEY, newLocale);
    });
  }, []);

  return (
    <LocaleContext.Provider value={useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context;
}
