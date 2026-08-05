import { Plus } from 'lucide-react';
import { useRooms } from '../hooks/useRooms';

export default function RoomsView() {
  const { rooms, loading } = useRooms();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-ios-green/15 text-ios-green';
      case 'Occupied': return 'bg-ios-blue/15 text-ios-blue';
      case 'Cleaning': return 'bg-ios-orange/15 text-ios-orange';
      default: return 'bg-ios-gray-light text-ios-text-secondary';
    }
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
        <button className="text-ios-blue font-semibold flex items-center gap-1 active:opacity-70 transition-opacity">
          <Plus size={20} />
          <span>Add</span>
        </button>
      </header>

      <div className="px-5 space-y-5 sm:space-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        {rooms.map(room => (
          <div key={room.id} className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
            <div className="h-48 relative">
              <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4">
                <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${getStatusColor(room.status).replace('/15', '/90')} text-white shadow-sm`}>
                  {room.status}
                </div>
              </div>
              <div className="absolute bottom-4 right-4">
                <div className="px-3 py-1 bg-black/50 backdrop-blur-md text-white rounded-full text-sm font-semibold">
                  ${room.pricePerNight} / night
                </div>
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-xl font-bold text-ios-text mb-1">{room.name}</h3>
              <div className="text-sm text-ios-text-secondary mt-1">
                {room.isAvailable() ? 'Ready for next guest' : room.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
