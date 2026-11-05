import { fromCents } from './money';

/** Currencies the owner can pick. One currency per property; amounts are stored as integer cents. */
export const SUPPORTED_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** Used when the region is unknown; matches the `$` the app showed before currencies existed. */
export const FALLBACK_CURRENCY: CurrencyCode = 'USD';

// Euro area as of 2026 (Bulgaria adopted the euro on 1 January 2026).
const EURO_REGIONS = [
  'AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
];

const REGION_CURRENCIES: Record<string, CurrencyCode> = {
  ...Object.fromEntries(EURO_REGIONS.map(region => [region, 'EUR' as const])),
  US: 'USD', GB: 'GBP', CH: 'CHF', LI: 'CHF', CA: 'CAD', AU: 'AUD', SE: 'SEK', NO: 'NOK',
  DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', TR: 'TRY',
};

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function currencyForRegion(region: string | undefined): CurrencyCode {
  return (region && REGION_CURRENCIES[region.toUpperCase()]) || FALLBACK_CURRENCY;
}

/**
 * Guess the owner's currency from the device's preferred languages (e.g. `navigator.languages`).
 * A tag without a region (`bg`) is expanded to its likely region (`bg-Cyrl-BG`).
 */
export function detectCurrency(languageTags: readonly string[]): CurrencyCode {
  for (const tag of languageTags) {
    try {
      const region = new Intl.Locale(tag).maximize().region;
      if (region) return currencyForRegion(region);
    } catch {
      // Malformed tag: try the next one.
    }
  }
  return FALLBACK_CURRENCY;
}

/** Format integer cents for display, e.g. `$500`, `$33.30`, `1.234,50 €`. Whole amounts omit decimals. */
export function formatMoney(cents: number, currency: CurrencyCode, locale: string): string {
  const fractionDigits = cents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(fromCents(cents));
}

/** "EUR · Euro" in the given language; falls back to the bare code. */
export function currencyLabel(currency: CurrencyCode, locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'currency' }).of(currency);
    return name && name !== currency ? `${currency} · ${name}` : currency;
  } catch {
    return currency;
  }
}
