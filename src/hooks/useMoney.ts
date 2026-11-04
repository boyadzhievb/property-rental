import { useCallback } from 'react';
import { usePropertyContext } from '../context/PropertyContext';
import { useLocale } from '../context/LocaleContext';
import { formatMoney } from '../domain/currency';

/** Returns a formatter for amounts in the property's currency and the current language. */
export function useMoney(): (amount: number) => string {
  const { currency } = usePropertyContext();
  const { locale } = useLocale();
  return useCallback((amount: number) => formatMoney(amount, currency, locale), [currency, locale]);
}
