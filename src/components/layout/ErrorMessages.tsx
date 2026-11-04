import { usePropertyContext } from '../../context/PropertyContext';
import { useRoomContext } from '../../context/RoomContext';
import { useGuestContext } from '../../context/GuestContext';
import { useReservationContext } from '../../context/ReservationContext';
import { usePaymentContext } from '../../context/PaymentContext';
import { useTaskContext } from '../../context/TaskContext';
import ErrorBanner from '../ui/ErrorBanner';

/** Banners for errors held by the entity contexts (e.g. a failed load), each dismissible. */
export default function ErrorMessages() {
  const { error: propertyError, clearError: clearPropertyError } = usePropertyContext();
  const { error: roomError, clearError: clearRoomError } = useRoomContext();
  const { error: guestError, clearError: clearGuestError } = useGuestContext();
  const { error: reservationError, clearError: clearReservationError } = useReservationContext();
  const { error: paymentError, clearError: clearPaymentError } = usePaymentContext();
  const { error: taskError, clearError: clearTaskError } = useTaskContext();

  const errors = [
    { message: propertyError, clear: clearPropertyError },
    { message: roomError, clear: clearRoomError },
    { message: guestError, clear: clearGuestError },
    { message: reservationError, clear: clearReservationError },
    { message: paymentError, clear: clearPaymentError },
    { message: taskError, clear: clearTaskError },
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
