import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRooms } from '../../hooks/useRooms';
import { useLocale } from '../../context/LocaleContext';
import PageHeader from '../layout/PageHeader';
import RoomCard from './RoomCard';
import AddRoomForm from './AddRoomForm';

export default function RoomsView() {
  const { rooms, loading, refresh } = useRooms();
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);

  if (loading) {
    return (
      <div className="pb-24">
        <PageHeader title={t.rooms} />
        <div className="px-5 text-center text-ios-text-secondary py-12">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title={t.rooms}
        right={
          <button
            onClick={() => setShowForm(true)}
            className="text-ios-blue font-semibold flex items-center gap-1 active:opacity-70 transition-opacity"
          >
            <Plus size={20} />
            <span>{t.add}</span>
          </button>
        }
      />

      {showForm && <AddRoomForm onAdded={refresh} onCancel={() => setShowForm(false)} />}

      <div className="px-5 space-y-5 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        {rooms.map(room => (
          <RoomCard key={room.id} room={room} onUpdated={refresh} />
        ))}
      </div>
    </div>
  );
}
