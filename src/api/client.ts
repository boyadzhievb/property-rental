const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  rooms: {
    getAll: () => request<Room[]>('/api/rooms'),
    getById: (id: string) => request<Room>(`/api/rooms/${id}`),
    create: (room: Room) => request<Room>('/api/rooms', { method: 'POST', body: JSON.stringify(room) }),
    update: (id: string, data: Partial<Room>) => request<Room>(`/api/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/rooms/${id}`, { method: 'DELETE' }),
  },
  guests: {
    getAll: () => request<Guest[]>('/api/guests'),
    getById: (id: string) => request<Guest>(`/api/guests/${id}`),
    create: (guest: Guest) => request<Guest>('/api/guests', { method: 'POST', body: JSON.stringify(guest) }),
    update: (id: string, data: Partial<Guest>) => request<Guest>(`/api/guests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/guests/${id}`, { method: 'DELETE' }),
  },
  reservations: {
    getAll: (params?: { from?: string; to?: string }) => {
      const query = params?.from && params?.to ? `?from=${params.from}&to=${params.to}` : '';
      return request<Reservation[]>(`/api/reservations${query}`);
    },
    getById: (id: string) => request<Reservation>(`/api/reservations/${id}`),
    create: (reservation: Reservation) => request<Reservation>('/api/reservations', { method: 'POST', body: JSON.stringify(reservation) }),
    update: (id: string, data: Partial<Reservation>) => request<Reservation>(`/api/reservations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/reservations/${id}`, { method: 'DELETE' }),
  },
};

export interface Room {
  id: string;
  name: string;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Not available';
  pricePerNight: number;
  image: string;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  previousStays: number;
  notes: string;
}

export interface Reservation {
  id: string;
  roomId: string;
  guestId: string;
  arrivalDate: string;
  departureDate: string;
  guestsCount: number;
  status: 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled';
  price: number;
  notes?: string;
}
