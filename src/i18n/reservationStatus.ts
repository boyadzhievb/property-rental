import type { ReservationStatus } from '../domain/Reservation';
import type { TranslationKeys } from './en';

/** Translated label for a reservation status. */
export function reservationStatusLabel(status: ReservationStatus, t: TranslationKeys): string {
  switch (status) {
    case 'Confirmed':
      return t.confirmed;
    case 'Checked In':
      return t.checkedIn;
    case 'Checked Out':
      return t.checkedOut;
    case 'Cancelled':
      return t.cancelled;
  }
}
