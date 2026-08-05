import { useState } from 'react';
import { Calendar, Home, Users, Settings as SettingsIcon, LayoutGrid, Plus } from 'lucide-react';
import { RoomProvider } from './context/RoomContext';
import { GuestProvider } from './context/GuestContext';
import { ReservationProvider } from './context/ReservationContext';
import TodayView from './components/TodayView';
import CalendarView from './components/CalendarView';
import RoomsView from './components/RoomsView';
import GuestsView from './components/GuestsView';
import SettingsView from './components/SettingsView';
import NewReservationModal from './components/NewReservationModal';

type Tab = 'today' | 'calendar' | 'rooms' | 'guests' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'today': return <TodayView />;
      case 'calendar': return <CalendarView />;
      case 'rooms': return <RoomsView />;
      case 'guests': return <GuestsView />;
      case 'settings': return <SettingsView />;
      default: return <TodayView />;
    }
  };

  const navItems = [
    { id: 'today', label: 'Today', icon: LayoutGrid },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'rooms', label: 'Rooms', icon: Home },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <RoomProvider>
    <GuestProvider>
    <ReservationProvider>
    <div className="min-h-screen bg-ios-bg flex justify-center w-full">
      {/* Responsive centered container */}
      <div className="w-full h-full min-h-screen max-w-screen-xl relative flex flex-col sm:border-x sm:border-ios-border/20 shadow-sm bg-ios-bg">
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar relative w-full">
          {renderContent()}
        </main>

        {/* Floating Action Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="absolute bottom-24 right-5 sm:right-8 lg:right-12 w-14 h-14 bg-ios-blue text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all z-20"
        >
          <Plus size={28} />
        </button>

        {/* Bottom Tab Navigation */}
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <nav className="h-20 bg-ios-bg/80 backdrop-blur-xl border-t border-ios-border/30 px-2 pb-6 pt-2 flex justify-around sm:justify-center sm:gap-16 items-center w-full max-w-screen-xl mx-auto">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors ${
                    isActive ? 'text-ios-blue' : 'text-ios-gray hover:text-ios-text-secondary'
                  }`}
                >
                  <Icon size={24} />
                  <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Modals */}
        {isModalOpen && <NewReservationModal onClose={() => setIsModalOpen(false)} />}
      </div>
    </div>
    </ReservationProvider>
    </GuestProvider>
    </RoomProvider>
  );
}
