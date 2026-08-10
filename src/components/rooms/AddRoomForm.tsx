import { useState } from 'react';
import { RoomStatus } from '../../domain/Room';
import { roomService } from '../../services/RoomService';

interface AddRoomFormProps {
  onAdded: () => Promise<void>;
  onCancel: () => void;
}

export default function AddRoomForm({ onAdded, onCancel }: AddRoomFormProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('100');
  const [maxGuests, setMaxGuests] = useState('2');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await roomService.createRoom({
      id: `room-${Date.now()}`,
      name: name.trim(),
      status: RoomStatus.AVAILABLE,
      pricePerNight: parseFloat(price) || 100,
      maxGuests: parseInt(maxGuests) || 2,
    });
    await onAdded();
    onCancel();
  };

  return (
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
            onClick={onCancel}
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
  );
}
