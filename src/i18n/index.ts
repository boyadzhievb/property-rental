import en, { type TranslationKeys } from './en';
import fr from './fr';
import de from './de';
import bg from './bg';
import el from './el';

export type Locale = 'en' | 'fr' | 'de' | 'bg' | 'el';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  bg: 'Български',
  el: 'Ελληνικά',
};

const translations: Record<Locale, TranslationKeys> = { en, fr, de, bg, el };

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale];
}

export type { TranslationKeys };
