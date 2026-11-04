import { usePropertyContext } from '../../context/PropertyContext';
import { useRoomContext } from '../../context/RoomContext';
import { useGuestContext } from '../../context/GuestContext';
import { useReservationContext } from '../../context/ReservationContext';
import { usePaymentContext } from '../../context/PaymentContext';
import { useTaskContext } from '../../context/TaskContext';
import ErrorBanner from '../ui/ErrorBanner';
import { useLocale } from '../../context/LocaleContext';

/** Banners for errors held by the entity contexts (e.g. a failed load), each dismissible. */
export default function ErrorMessages() {
  const { error: propertyError, clearError: clearPropertyError } = usePropertyContext();
  const { error: roomError, clearError: clearRoomError } = useRoomContext();
  const { error: guestError, clearError: clearGuestError } = useGuestContext();
  const { error: reservationError, clearError: clearReservationError } = useReservationContext();
  const { error: paymentError, clearError: clearPaymentError } = usePaymentContext();
  const { error: taskError, clearError: clearTaskError } = useTaskContext();

  const { t } = useLocale();

  // The property context stores already-translated messages. Entity contexts hold raw load
  // errors (logged where they occur), which mean nothing to users, so show a translated summary.
  const loadError = (raw: string | null) => (raw ? t.loadFailed : null);
  const errors = [
    { message: propertyError, clear: clearPropertyError },
    { message: loadError(roomError), clear: clearRoomError },
    { message: loadError(guestError), clear: clearGuestError },
    { message: loadError(reservationError), clear: clearReservationError },
    { message: loadError(paymentError), clear: clearPaymentError },
    { message: loadError(taskError), clear: clearTaskError },
  ].filter(e => e.message);

  if (errors.length === 0) return null;

  return (
    <div className="pt-2">
      {errors.map((e, i) => (
        <ErrorBanner key={i} message={e.message!} onDismiss={e.clear} />
      ))}
    </div>
  );
}
