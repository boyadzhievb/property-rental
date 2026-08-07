import { useState } from 'react';
import { Calendar, Home, Users, Settings as SettingsIcon, LayoutGrid, Plus } from 'lucide-react';
import { RoomProvider } from './context/RoomContext';
import { GuestProvider } from './context/GuestContext';
import { ReservationProvider } from './context/ReservationContext';
import { PropertyProvider, usePropertyContext } from './context/PropertyContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import TodayView from './components/today/TodayView';
import CalendarView from './components/calendar/CalendarView';
import RoomsView from './components/rooms/RoomsView';
import GuestsView from './components/guests/GuestsView';
import SettingsView from './components/settings/SettingsView';
import SetupView from './components/SetupView';
import NewReservationModal from './components/reservations/NewReservationModal';
import TabBar from './components/layout/TabBar';

type Tab = 'today' | 'calendar' | 'rooms' | 'guests' | 'settings';

const NAV_ITEMS = [
  { id: 'today', label: 'Today', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'rooms', label: 'Rooms', icon: Home },
  { id: 'guests', label: 'Guests', icon: Users },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

function AppContent() {
  const { isConfigured, loading, configureApp, seedData, importData } = usePropertyContext();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-ios-bg flex items-center justify-center">
        <div className="text-ios-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-ios-bg flex justify-center w-full">
        <div className="w-full max-w-screen-xl sm:border-x sm:border-ios-border/20 shadow-sm bg-ios-bg">
          <SetupView onConfigure={configureApp} onSeedData={seedData} onImport={importData} />
        </div>
      </div>
    );
  }

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

  return (
    <RoomProvider>
    <GuestProvider>
    <ReservationProvider>
    <div className="min-h-screen bg-ios-bg flex justify-center w-full">
      <div className="w-full h-full min-h-screen max-w-screen-xl relative flex flex-col sm:border-x sm:border-ios-border/20 shadow-sm bg-ios-bg">
        <main className="flex-1 overflow-y-auto no-scrollbar relative w-full">
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </main>

        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute bottom-24 right-5 sm:right-8 lg:right-12 w-14 h-14 bg-ios-blue text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all z-20"
        >
          <Plus size={28} />
        </button>

        <TabBar items={NAV_ITEMS} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as Tab)} />

        {isModalOpen && <NewReservationModal onClose={() => setIsModalOpen(false)} />}
      </div>
    </div>
    </ReservationProvider>
    </GuestProvider>
    </RoomProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <PropertyProvider>
        <AppContent />
      </PropertyProvider>
    </ThemeProvider>
  );
}
