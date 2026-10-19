import { type Guest } from '../domain/Guest';
import { guestService } from '../services/GuestService';
import { createEntityContext } from './createEntityContext';

const { Provider, useEntityContext } = createEntityContext<Guest>(
  'Guest',
  () => guestService.getGuests(),
);

export const GuestProvider = Provider;

export function useGuestContext() {
  const { data: guests, ...rest } = useEntityContext();
  return { guests, ...rest };
}
