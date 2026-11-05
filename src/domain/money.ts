/**
 * Money is stored and computed as integer cents (hundredths of the currency unit; every
 * supported currency has two decimals), so sums and balances are exact. Decimal amounts only
 * exist at the edges: what the owner types, what is shown, and data from before version 6.
 */

/**
 * Convert a decimal amount (e.g. typed `19.99`) to whole cents, rounding half away from zero.
 * Rounding `amount * 100` directly is wrong for values like 19.995, whose float product is
 * 1999.4999999999998; trimming the product to 6 decimals first removes that noise.
 */
export function toCents(amount: number): number {
  const cents = Math.round(Math.abs(Number((amount * 100).toFixed(6))));
  return amount < 0 ? -cents : cents;
}

/** Decimal amount for an input field or `Intl.NumberFormat`, e.g. 1999 → 19.99. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Cents from a form field; null when the text is not a finite number. */
export function parseMoneyInput(text: string): number | null {
  const amount = Number.parseFloat(text);
  return Number.isFinite(amount) ? toCents(amount) : null;
}

/** Money fields that were decimal amounts before version 6 of the database (backup format 1). */
export const LEGACY_MONEY_FIELDS = {
  rooms: ['pricePerNight', 'pricePerNightCents'],
  reservations: ['price', 'priceCents'],
  payments: ['amount', 'amountCents'],
} as const;

/**
 * A record from before cents with its decimal money field replaced by the cents field, e.g.
 * `{ amount: 33.333 }` → `{ amountCents: 3333 }`. Anything that is not such a record is returned
 * unchanged, so validation can report it as usual.
 */
export function legacyRecordToCents(record: unknown, legacyField: string, centsField: string): unknown {
  if (typeof record !== 'object' || record === null || !(legacyField in record)) return record;
  const { [legacyField]: amount, ...rest } = record as Record<string, unknown>;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return record;
  return { ...rest, [centsField]: toCents(amount) };
}
