import { useState } from 'react';
import { Users, Pencil, Check, X } from 'lucide-react';
import { type Room } from '../../domain/Room';
import { roomService } from '../../services/RoomService';

interface RoomCardProps {
  room: Room;
  onUpdated: () => Promise<void>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Available': return 'bg-ios-green/15 text-ios-green';
    case 'Occupied': return 'bg-ios-blue/15 text-ios-blue';
    case 'Cleaning': return 'bg-ios-orange/15 text-ios-orange';
    default: return 'bg-ios-gray-light text-ios-text-secondary';
  }
};

export default function RoomCard({ room, onUpdated }: RoomCardProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editMaxGuests, setEditMaxGuests] = useState('');

  const startEdit = () => {
    setEditing(true);
    setEditName(room.name);
    setEditPrice(String(room.pricePerNight));
    setEditMaxGuests(String(room.maxGuests));
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    await roomService.updateRoom(room.id, {
      name: editName.trim() || room.name,
      pricePerNight: parseFloat(editPrice) || room.pricePerNight,
      maxGuests: parseInt(editMaxGuests) || room.maxGuests,
    });
    setEditing(false);
    await onUpdated();
  };

  return (
    <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
      {editing ? (
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
              onClick={saveEdit}
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
              onClick={startEdit}
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
  );
}
