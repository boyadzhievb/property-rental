import { addDays, subDays, format } from 'date-fns';
import { roomsRepo, guestsRepo, reservationsRepo } from './repositories.js';
import db from './db.js';

const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

db.exec('DELETE FROM reservations; DELETE FROM guests; DELETE FROM rooms;');

roomsRepo.create({ id: '101', name: 'Suite 1', status: 'Occupied', pricePerNight: 250, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop&auto=format' });
roomsRepo.create({ id: '102', name: 'Ocean View', status: 'Available', pricePerNight: 200, image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&h=400&fit=crop&auto=format' });
roomsRepo.create({ id: '103', name: 'Standard Room', status: 'Cleaning', pricePerNight: 150, image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&h=400&fit=crop&auto=format' });
roomsRepo.create({ id: '104', name: 'Garden Villa', status: 'Occupied', pricePerNight: 300, image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop&auto=format' });

guestsRepo.create({ id: 'g1', name: 'John Smith', phone: '+1 555-0100', email: 'john@example.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&auto=format', previousStays: 2, notes: 'Prefers extra pillows.' });
guestsRepo.create({ id: 'g2', name: 'Mary Brown', phone: '+1 555-0101', email: 'mary@example.com', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&auto=format', previousStays: 0, notes: 'Allergic to feathers.' });
guestsRepo.create({ id: 'g3', name: 'Peter Jones', phone: '+1 555-0102', email: 'peter@example.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&auto=format', previousStays: 5, notes: 'VIP Guest.' });

reservationsRepo.create({ id: 'r1', roomId: '101', guestId: 'g1', arrivalDate: fmt(subDays(today, 1)), departureDate: fmt(addDays(today, 2)), guestsCount: 2, status: 'Checked In', price: 750 });
reservationsRepo.create({ id: 'r2', roomId: '104', guestId: 'g2', arrivalDate: fmt(today), departureDate: fmt(addDays(today, 4)), guestsCount: 1, status: 'Confirmed', price: 1200 });
reservationsRepo.create({ id: 'r3', roomId: '103', guestId: 'g3', arrivalDate: fmt(subDays(today, 3)), departureDate: fmt(today), guestsCount: 2, status: 'Checked Out', price: 450 });

console.log('Database seeded successfully.');
