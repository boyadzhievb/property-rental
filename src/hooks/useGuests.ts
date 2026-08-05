import { useGuestContext } from '../context/GuestContext';

export function useGuests() {
  return useGuestContext();
}
