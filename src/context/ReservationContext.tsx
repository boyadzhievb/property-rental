import { type Reservation } from '../domain/Reservation';
import { reservationService } from '../services/ReservationService';
import { createEntityContext } from './createEntityContext';

const { Provider, useEntityContext } = createEntityContext<Reservation>(
  'Reservation',
  () => reservationService.getAllReservations(),
);

export const ReservationProvider = Provider;

export function useReservationContext() {
  const { data: reservations, ...rest } = useEntityContext();
  return { reservations, ...rest };
}
