import express from 'express';
import cors from 'cors';
import { roomsRepo, guestsRepo, reservationsRepo } from './repositories.js';

const app = express();
app.use(cors());
app.use(express.json());

// --- Rooms ---

app.get('/api/rooms', (_req, res) => {
  res.json(roomsRepo.getAll());
});

app.get('/api/rooms/:id', (req, res) => {
  const room = roomsRepo.getById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

app.post('/api/rooms', (req, res) => {
  const room = roomsRepo.create(req.body);
  res.status(201).json(room);
});

app.patch('/api/rooms/:id', (req, res) => {
  const room = roomsRepo.update(req.params.id, req.body);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

app.delete('/api/rooms/:id', (req, res) => {
  const deleted = roomsRepo.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Room not found' });
  res.status(204).end();
});

// --- Guests ---

app.get('/api/guests', (_req, res) => {
  res.json(guestsRepo.getAll());
});

app.get('/api/guests/:id', (req, res) => {
  const guest = guestsRepo.getById(req.params.id);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });
  res.json(guest);
});

app.post('/api/guests', (req, res) => {
  const guest = guestsRepo.create(req.body);
  res.status(201).json(guest);
});

app.patch('/api/guests/:id', (req, res) => {
  const guest = guestsRepo.update(req.params.id, req.body);
  if (!guest) return res.status(404).json({ error: 'Guest not found' });
  res.json(guest);
});

app.delete('/api/guests/:id', (req, res) => {
  const deleted = guestsRepo.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Guest not found' });
  res.status(204).end();
});

// --- Reservations ---

app.get('/api/reservations', (req, res) => {
  const { from, to } = req.query;
  if (typeof from === 'string' && typeof to === 'string') {
    return res.json(reservationsRepo.getByMonth(from, to));
  }
  res.json(reservationsRepo.getAll());
});

app.get('/api/reservations/:id', (req, res) => {
  const reservation = reservationsRepo.getById(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  res.json(reservation);
});

app.post('/api/reservations', (req, res) => {
  const reservation = reservationsRepo.create(req.body);
  res.status(201).json(reservation);
});

app.patch('/api/reservations/:id', (req, res) => {
  const reservation = reservationsRepo.update(req.params.id, req.body);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  res.json(reservation);
});

app.delete('/api/reservations/:id', (req, res) => {
  const deleted = reservationsRepo.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Reservation not found' });
  res.status(204).end();
});

const PORT = parseInt(process.env.API_PORT || '3001');
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
