import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import type { ZodSchema } from 'zod';
import { roomsRepo, guestsRepo, reservationsRepo } from './repositories.js';
import {
  createRoomSchema, updateRoomSchema,
  createGuestSchema, updateGuestSchema,
  createReservationSchema, updateReservationSchema,
} from './schemas.js';
import { asyncHandler, errorHandler, notFound } from './errors.js';
import { logger } from './logger.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

function parse<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

// --- Rooms ---

app.get('/api/rooms', asyncHandler(async (_req, res) => {
  res.json(roomsRepo.getAll());
}));

app.get('/api/rooms/:id', asyncHandler(async (req, res) => {
  const room = roomsRepo.getById(param(req.params.id)) ?? notFound('Room');
  res.json(room);
}));

app.post('/api/rooms', asyncHandler(async (req, res) => {
  const data = parse(createRoomSchema, req.body);
  res.status(201).json(roomsRepo.create(data));
}));

app.patch('/api/rooms/:id', asyncHandler(async (req, res) => {
  const data = parse(updateRoomSchema, req.body);
  const room = roomsRepo.update(param(req.params.id), data) ?? notFound('Room');
  res.json(room);
}));

app.delete('/api/rooms/:id', asyncHandler(async (req, res) => {
  if (!roomsRepo.delete(param(req.params.id))) notFound('Room');
  res.status(204).end();
}));

// --- Guests ---

app.get('/api/guests', asyncHandler(async (_req, res) => {
  res.json(guestsRepo.getAll());
}));

app.get('/api/guests/:id', asyncHandler(async (req, res) => {
  const guest = guestsRepo.getById(param(req.params.id)) ?? notFound('Guest');
  res.json(guest);
}));

app.post('/api/guests', asyncHandler(async (req, res) => {
  const data = parse(createGuestSchema, req.body);
  res.status(201).json(guestsRepo.create(data));
}));

app.patch('/api/guests/:id', asyncHandler(async (req, res) => {
  const data = parse(updateGuestSchema, req.body);
  const guest = guestsRepo.update(param(req.params.id), data) ?? notFound('Guest');
  res.json(guest);
}));

app.delete('/api/guests/:id', asyncHandler(async (req, res) => {
  if (!guestsRepo.delete(param(req.params.id))) notFound('Guest');
  res.status(204).end();
}));

// --- Reservations ---

app.get('/api/reservations', asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (typeof from === 'string' && typeof to === 'string') {
    res.json(reservationsRepo.getByMonth(from, to));
    return;
  }
  res.json(reservationsRepo.getAll());
}));

app.get('/api/reservations/:id', asyncHandler(async (req, res) => {
  const reservation = reservationsRepo.getById(param(req.params.id)) ?? notFound('Reservation');
  res.json(reservation);
}));

app.post('/api/reservations', asyncHandler(async (req, res) => {
  const data = parse(createReservationSchema, req.body);
  res.status(201).json(reservationsRepo.create(data));
}));

app.patch('/api/reservations/:id', asyncHandler(async (req, res) => {
  const data = parse(updateReservationSchema, req.body);
  const reservation = reservationsRepo.update(param(req.params.id), data) ?? notFound('Reservation');
  res.json(reservation);
}));

app.delete('/api/reservations/:id', asyncHandler(async (req, res) => {
  if (!reservationsRepo.delete(param(req.params.id))) notFound('Reservation');
  res.status(204).end();
}));

app.use(errorHandler);

const PORT = parseInt(process.env.API_PORT || '3001');
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'API server running');
});
