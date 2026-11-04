/**
 * Business-rule errors carry a stable `code` plus parameters, so the UI can show a translated
 * message (see i18n/errorMessage). `message` stays English for logs and tests.
 */
const ENGLISH_MESSAGES = {
  roomNotAvailable: 'Room can only be occupied from Available status',
  roomNotInCleaning: 'Room can only be marked available from Cleaning status',
  roomNotOccupied: 'Room can only be marked for cleaning from Occupied status',
  roomOccupiedNoMaintenance: 'An occupied room cannot be marked for maintenance',
  roomNotInMaintenance: 'Only a maintenance room can be marked available this way',
  reservationNotCancellable: 'Cannot cancel a reservation that is {status}',
  reservationNotConfirmed: 'Can only check in a Confirmed reservation, current status is {status}',
  reservationNotCheckedIn: 'Can only check out a Checked In reservation, current status is {status}',
  seriesTooLong: 'A recurring series can last at most {years} years',
  seriesStayTooLong: 'The stay is longer than the repeat interval, so occurrences would overlap',
  seriesTooManyOccurrences: 'A recurring series can have at most {max} occurrences',
  seriesEmpty: 'No occurrences generated — check dates and recurrence pattern',
  bookingConflict: 'Room is already booked from {from} to {to}',
  seriesConflict: 'Recurring reservation conflicts with existing booking from {from} to {to}',
  capacityExceeded: 'Guest count ({guests}) exceeds room capacity ({max})',
  roomNotFound: 'Room not found',
  guestNotFound: 'Guest not found',
  reservationNotFound: 'Reservation not found',
  paymentOnCancelled: 'Cannot record payment for a cancelled reservation',
  paymentExceedsBalance: 'Payment exceeds remaining balance of {remaining}',
  unsupportedCurrency: 'Unsupported currency: {currency}',
} as const;

export type DomainErrorCode = keyof typeof ENGLISH_MESSAGES;
export type DomainErrorParams = Record<string, string | number>;

export const DOMAIN_ERROR_CODES = Object.keys(ENGLISH_MESSAGES) as DomainErrorCode[];

/** Replace `{name}` placeholders; function replacers keep `$` in values literal. */
export function fillPlaceholders(template: string, params: DomainErrorParams, render: (name: string, value: string | number) => string = (_, value) => String(value)): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => (name in params ? render(name, params[name]) : placeholder));
}

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly params: DomainErrorParams;

  constructor(code: DomainErrorCode, params: DomainErrorParams = {}) {
    super(fillPlaceholders(ENGLISH_MESSAGES[code], params));
    this.name = 'DomainError';
    this.code = code;
    this.params = params;
  }
}
