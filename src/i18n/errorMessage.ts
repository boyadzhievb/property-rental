import { DomainError, fillPlaceholders, type DomainErrorCode } from '../domain/errors';
import type { ReservationStatus } from '../domain/Reservation';
import type { TranslationKeys } from './en';
import { reservationStatusLabel } from './reservationStatus';

const RESERVATION_STATUSES: readonly string[] = ['Confirmed', 'Checked In', 'Checked Out', 'Cancelled'];
/** Parameters that hold amounts of money and must be shown in the property currency. */
const MONEY_PARAMS = new Set(['remaining']);

function translationKey(code: DomainErrorCode): keyof TranslationKeys {
  return `error${code[0].toUpperCase()}${code.slice(1)}` as keyof TranslationKeys;
}

/**
 * User-facing text for an error: business-rule errors are translated with their parameters
 * filled in (statuses translated, money formatted); anything else gets the generic message.
 */
export function errorMessage(error: unknown, t: TranslationKeys, formatMoney: (amount: number) => string): string {
  if (!(error instanceof DomainError)) return t.actionFailed;
  const template = t[translationKey(error.code)];
  if (typeof template !== 'string') return t.actionFailed;
  return fillPlaceholders(template, error.params, (name, value) => {
    if (MONEY_PARAMS.has(name) && typeof value === 'number') return formatMoney(value);
    if (name === 'status' && RESERVATION_STATUSES.includes(String(value))) {
      return reservationStatusLabel(value as ReservationStatus, t);
    }
    return String(value);
  });
}
