import { z } from 'zod';

const roomStatus = z.enum(['Available', 'Occupied', 'Cleaning', 'Not available']);
const reservationStatus = z.enum(['Confirmed', 'Checked In', 'Checked Out', 'Cancelled']);

export const createRoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: roomStatus,
  pricePerNight: z.number().positive(),
  image: z.string(),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1),
  status: roomStatus,
  pricePerNight: z.number().positive(),
  image: z.string(),
}).partial();

export const createGuestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string(),
  email: z.string().email(),
  avatar: z.string(),
  previousStays: z.number().int().min(0),
  notes: z.string(),
});

export const updateGuestSchema = z.object({
  name: z.string().min(1),
  phone: z.string(),
  email: z.string().email(),
  avatar: z.string(),
  previousStays: z.number().int().min(0),
  notes: z.string(),
}).partial();

export const createReservationSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  guestId: z.string().min(1),
  arrivalDate: z.string().date(),
  departureDate: z.string().date(),
  guestsCount: z.number().int().positive(),
  status: reservationStatus,
  price: z.number().min(0),
  notes: z.string().optional(),
}).refine(d => d.arrivalDate < d.departureDate, {
  message: 'arrivalDate must be before departureDate',
  path: ['departureDate'],
});

export const updateReservationSchema = z.object({
  roomId: z.string().min(1),
  guestId: z.string().min(1),
  arrivalDate: z.string().date(),
  departureDate: z.string().date(),
  guestsCount: z.number().int().positive(),
  status: reservationStatus,
  price: z.number().min(0),
  notes: z.string().optional(),
}).partial().refine(
  d => !(d.arrivalDate && d.departureDate) || d.arrivalDate < d.departureDate,
  { message: 'arrivalDate must be before departureDate', path: ['departureDate'] },
);
