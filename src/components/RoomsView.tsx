import { useState } from 'react';
import { Plus, Users, Pencil, Check, X } from 'lucide-react';
import { useRooms } from '../hooks/useRooms';
import { roomService } from '../services/RoomService';
import { type Room } from '../domain/Room';

export default function RoomsView() {
  const { rooms, loading, refresh } = useRooms();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('100');
  const [maxGuests, setMaxGuests] = useState('2');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editMaxGuests, setEditMaxGuests] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-ios-green/15 text-ios-green';
      case 'Occupied': return 'bg-ios-blue/15 text-ios-blue';
      case 'Cleaning': return 'bg-ios-orange/15 text-ios-orange';
      default: return 'bg-ios-gray-light text-ios-text-secondary';
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    await roomService.createRoom({
      id: `room-${Date.now()}`,
      name: name.trim(),
      status: 'Available',
      pricePerNight: parseFloat(price) || 100,
      maxGuests: parseInt(maxGuests) || 2,
    });
    setName('');
    setPrice('100');
    setMaxGuests('2');
    setShowForm(false);
    await refresh();
  };

  const startEdit = (room: Room) => {
    setEditingId(room.id);
    setEditName(room.name);
    setEditPrice(String(room.pricePerNight));
    setEditMaxGuests(String(room.maxGuests));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (room: Room) => {
    await roomService.createRoom({
      ...room.toData(),
      name: editName.trim() || room.name,
      pricePerNight: parseFloat(editPrice) || room.pricePerNight,
      maxGuests: parseInt(editMaxGuests) || room.maxGuests,
    });
    setEditingId(null);
    await refresh();
  };

  if (loading) {
    return (
      <div className="pb-24">
        <header className="px-5 pt-12 pb-4 bg-ios-bg sticky top-0 z-10">
          <h1 className="text-3xl font-bold text-ios-text">Rooms</h1>
        </header>
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <header className="px-5 pt-12 pb-4 bg-ios-bg sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ios-text">Rooms</h1>
        <button
          onClick={() => setShowForm(true)}
          className="text-ios-blue font-semibold flex items-center gap-1 active:opacity-70 transition-opacity"
        >
          <Plus size={20} />
          <span>Add</span>
        </button>
      </header>

      {showForm && (
        <div className="px-5 mb-5">
          <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04] space-y-3">
            <input
              type="text"
              placeholder="Room name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full p-3 border border-ios-border/40 rounded-xl focus:outline-none focus:border-ios-blue bg-ios-bg/30 text-ios-text"
            />
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Price / night"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="flex-1 p-3 border border-ios-border/40 rounded-xl focus:outline-none focus:border-ios-blue bg-ios-bg/30 text-ios-text"
              />
              <input
                type="number"
                placeholder="Max guests"
                min="1"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
                className="flex-1 p-3 border border-ios-border/40 rounded-xl focus:outline-none focus:border-ios-blue bg-ios-bg/30 text-ios-text"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl bg-ios-gray-light text-ios-text font-semibold active:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-3 rounded-xl bg-ios-blue text-white font-semibold active:opacity-70"
              >
                Add Room
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 space-y-5 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        {rooms.map(room => (
          <div key={room.id} className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
            {editingId === room.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="w-full p-3 border border-ios-border/40 rounded-xl focus:outline-none focus:border-ios-blue bg-ios-bg/30 text-ios-text font-bold text-lg"
                />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-ios-text-secondary ml-1 mb-1 block">Price / night</label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full p-3 border border-ios-border/40 rounded-xl focus:outline-none focus:border-ios-blue bg-ios-bg/30 text-ios-text"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-ios-text-secondary ml-1 mb-1 block">Max guests</label>
                    <input
                      type="number"
                      min="1"
                      value={editMaxGuests}
                      onChange={(e) => setEditMaxGuests(e.target.value)}
                      className="w-full p-3 border border-ios-border/40 rounded-xl focus:outline-none focus:border-ios-blue bg-ios-bg/30 text-ios-text"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={cancelEdit}
                    className="flex-1 py-2.5 rounded-xl bg-ios-gray-light text-ios-text font-semibold active:opacity-70 flex items-center justify-center gap-1"
                  >
                    <X size={16} /> Cancel
                  </button>
                  <button
                    onClick={() => saveEdit(room)}
                    className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white font-semibold active:opacity-70 flex items-center justify-center gap-1"
                  >
                    <Check size={16} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-ios-text mb-2">{room.name}</h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(room.status)}`}>
                      {room.status}
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(room)}
                    className="p-2 text-ios-text-secondary active:opacity-70 transition-opacity"
                  >
                    <Pencil size={18} />
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-ios-border/30 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-sm text-ios-text-secondary">
                    <Users size={16} />
                    <span>{room.maxGuests} guests max</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-ios-text">${room.pricePerNight}</span>
                    <span className="text-xs text-ios-text-secondary"> / night</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
