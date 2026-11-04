import type { TranslationKeys } from './en';

/**
 * Zod schema messages (src/schemas) are English and also used in logs/tests, so they are
 * translated here at display time. Keep this in sync when adding a schema message; the test
 * in __tests__/validationMessage.test.ts fails for a booking-form message without a key.
 */
export const VALIDATION_MESSAGE_KEYS = {
  'Guest name is required': 'validationGuestNameRequired',
  'Phone number is required': 'validationPhoneRequired',
  'Invalid email': 'validationEmailInvalid',
  'Room is required': 'validationRoomRequired',
  'Guest is required': 'validationGuestRequired',
  'Check-in date is required': 'validationCheckInRequired',
  'Check-out date is required': 'validationCheckOutRequired',
  'At least 1 guest required': 'validationGuestsCountMin',
  'Price must be greater than 0': 'validationPriceRequired',
  'Check-out must be after check-in': 'validationCheckOutAfterCheckIn',
  'Date must use the yyyy-MM-dd format': 'validationDateFormat',
  'Date does not exist': 'validationDateNotExist',
  'End date is required': 'validationRecurrenceEndRequired',
  'End date is required for recurring reservations': 'validationRecurrenceEndRequired',
  'End date must be after the first check-out': 'validationRecurrenceEndAfterCheckOut',
} as const satisfies Record<string, keyof TranslationKeys>;

/** Translated text for a schema validation message; unknown messages get a generic hint. */
export function validationMessage(message: string, t: TranslationKeys): string {
  const key = (VALIDATION_MESSAGE_KEYS as Record<string, keyof TranslationKeys>)[message];
  const translated = key ? t[key] : undefined;
  return typeof translated === 'string' ? translated : t.validationInvalid;
}
