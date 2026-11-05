import { useCallback } from 'react';
import { usePropertyContext } from '../context/PropertyContext';
import { useLocale } from '../context/LocaleContext';
import { formatMoney } from '../domain/currency';

/** Returns a formatter for integer cents in the property's currency and the current language. */
export function useMoney(): (cents: number) => string {
  const { currency } = usePropertyContext();
  const { locale } = useLocale();
  return useCallback((cents: number) => formatMoney(cents, currency, locale), [currency, locale]);
}
