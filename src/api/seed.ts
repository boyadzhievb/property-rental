/**
 * Whole-property writes for the setup screen and Settings: demo data, first-run
 * configuration and reset. Each runs in one transaction.
 */
import { format, addDays, subDays } from 'date-fns';
import type { RoomData } from '../schemas/RoomSchema';
import type { GuestData } from '../schemas/GuestSchema';
import type { ReservationData } from '../schemas/ReservationSchema';
import type { PaymentData } from '../schemas/PaymentSchema';
import { getDB, waitForTransaction, unconfiguredSettings, ALL_STORES, ENTITY_STORES, SETTINGS_KEY } from './db';

const toLocalDate = (date: Date) => format(date, 'yyyy-MM-dd');

function getSeedData() {
  const today = new Date();

  const rooms: RoomData[] = [
    { id: '101', name: 'Suite 1', status: 'Occupied', pricePerNight: 250, maxGuests: 4 },
    { id: '102', name: 'Ocean View', status: 'Available', pricePerNight: 200, maxGuests: 2 },
    { id: '103', name: 'Standard Room', status: 'Cleaning', pricePerNight: 150, maxGuests: 2 },
    { id: '104', name: 'Garden Villa', status: 'Occupied', pricePerNight: 300, maxGuests: 6 },
    { id: '105', name: 'Penthouse', status: 'Available', pricePerNight: 400, maxGuests: 4 },
  ];

  const guests: GuestData[] = [
    { id: 'g1', name: 'John Smith', phone: '+1 555-0100', email: 'john@example.com', previousStays: 2, notes: 'Prefers extra pillows.' },
    { id: 'g2', name: 'Mary Brown', phone: '+1 555-0101', email: 'mary@example.com', previousStays: 0, notes: 'Allergic to feathers.' },
    { id: 'g3', name: 'Peter Jones', phone: '+1 555-0102', email: 'peter@example.com', previousStays: 5, notes: 'VIP Guest.' },
    { id: 'g4', name: 'Elena Kowalski', phone: '+48 600-123-456', email: 'elena@example.com', previousStays: 1, notes: 'Vegetarian breakfast.' },
    { id: 'g5', name: 'Carlos Rivera', phone: '+34 612-345-678', email: 'carlos@example.com', previousStays: 0, notes: 'Late check-in expected.' },
  ];

  const reservations: ReservationData[] = [
    { id: 'r1', roomId: '101', guestId: 'g1', arrivalDate: toLocalDate(subDays(today, 1)), departureDate: toLocalDate(addDays(today, 2)), guestsCount: 2, status: 'Checked In', price: 750 },
    { id: 'r2', roomId: '104', guestId: 'g2', arrivalDate: toLocalDate(today), departureDate: toLocalDate(addDays(today, 4)), guestsCount: 1, status: 'Checked In', price: 1200 },
    { id: 'r3', roomId: '103', guestId: 'g3', arrivalDate: toLocalDate(subDays(today, 3)), departureDate: toLocalDate(today), guestsCount: 2, status: 'Checked Out', price: 450 },
    { id: 'r4', roomId: '102', guestId: 'g4', arrivalDate: toLocalDate(addDays(today, 1)), departureDate: toLocalDate(addDays(today, 5)), guestsCount: 2, status: 'Confirmed', price: 800 },
    { id: 'r5', roomId: '105', guestId: 'g5', arrivalDate: toLocalDate(addDays(today, 3)), departureDate: toLocalDate(addDays(today, 7)), guestsCount: 3, status: 'Confirmed', price: 1600 },
  ];

  const payments: PaymentData[] = [
    { id: 'pay-1', reservationId: 'r1', amount: 500, date: toLocalDate(subDays(today, 1)), method: 'card', note: 'Advance payment' },
    { id: 'pay-2', reservationId: 'r3', amount: 450, date: toLocalDate(subDays(today, 1)), method: 'cash', note: '' },
    { id: 'pay-3', reservationId: 'r2', amount: 600, date: toLocalDate(today), method: 'transfer', note: 'First installment' },
  ];

  return { rooms, guests, reservations, payments };
}

export async function seedDemoData() {
  const { rooms, guests, reservations, payments } = getSeedData();
  const db = await getDB();
  const tx = db.transaction([...ALL_STORES], 'readwrite');
  const done = waitForTransaction(tx);
  for (const room of rooms) tx.objectStore('rooms').put(room);
  for (const guest of guests) tx.objectStore('guests').put(guest);
  for (const reservation of reservations) tx.objectStore('reservations').put(reservation);
  for (const payment of payments) tx.objectStore('payments').put(payment);
  tx.objectStore('settings').put({ id: SETTINGS_KEY, name: 'Villa Blanca', isConfigured: true });
  await done;
}

/** Delete every record and return the settings to the unconfigured state. */
export async function resetData() {
  const db = await getDB();
  const tx = db.transaction([...ALL_STORES], 'readwrite');
  const done = waitForTransaction(tx);
  for (const store of ENTITY_STORES) tx.objectStore(store).clear();
  tx.objectStore('settings').put(unconfiguredSettings());
  await done;
}

/** Write the initial rooms and mark the property configured, in one transaction. Rooms must be validated. */
export async function configureProperty(name: string, rooms: RoomData[], currency: string) {
  const db = await getDB();
  const tx = db.transaction(['rooms', 'settings'], 'readwrite');
  const done = waitForTransaction(tx);
  for (const room of rooms) tx.objectStore('rooms').put(room);
  tx.objectStore('settings').put({ id: SETTINGS_KEY, name, isConfigured: true, currency });
  await done;
}
