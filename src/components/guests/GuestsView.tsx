import { Search, ChevronRight } from 'lucide-react';
import { useGuests } from '../../hooks/useGuests';
import PageHeader from '../layout/PageHeader';

export default function GuestsView() {
  const { guests, loading } = useGuests();

  if (loading) {
    return (
      <div className="pb-24">
        <PageHeader title="Guests" />
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <header className="px-5 pt-12 pb-4 bg-ios-bg sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-ios-text mb-4">Guests</h1>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-ios-text-secondary" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border-none rounded-xl leading-5 bg-ios-gray-light text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue focus:bg-white transition-colors"
            placeholder="Search guests..."
          />
        </div>
      </header>

      <div className="px-5 mt-2 max-w-screen-md mx-auto">
        <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
          <div className="divide-y divide-ios-border/40">
            {guests.map(guest => (
              <div key={guest.id} className="flex items-center p-4 active:bg-ios-gray-light/30 transition-colors cursor-pointer">
                <div className="flex-1">
                  <div className="font-semibold text-ios-text text-lg">{guest.name}</div>
                  <div className="text-sm text-ios-text-secondary">{guest.previousStays} previous stays</div>
                </div>
                <ChevronRight className="text-ios-border" size={20} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
