import en, { type TranslationKeys } from './en';

export type Locale = 'en' | 'fr' | 'de' | 'bg' | 'el';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  bg: 'Български',
  el: 'Ελληνικά',
};

const cache: Partial<Record<Locale, TranslationKeys>> = { en };

const loaders: Record<Locale, () => Promise<TranslationKeys>> = {
  en: async () => en,
  fr: () => import('./fr').then(m => m.default),
  de: () => import('./de').then(m => m.default),
  bg: () => import('./bg').then(m => m.default),
  el: () => import('./el').then(m => m.default),
};

export async function loadTranslations(locale: Locale): Promise<TranslationKeys> {
  if (cache[locale]) return cache[locale]!;
  const t = await loaders[locale]();
  cache[locale] = t;
  return t;
}

export function getTranslations(locale: Locale): TranslationKeys {
  return cache[locale] || en;
}

export type { TranslationKeys };
