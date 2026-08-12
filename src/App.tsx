import { useState } from 'react';
import { Calendar, Home, Users, Settings as SettingsIcon, LayoutGrid, Plus } from 'lucide-react';
import { RoomProvider, useRoomContext } from './context/RoomContext';
import { GuestProvider, useGuestContext } from './context/GuestContext';
import { ReservationProvider, useReservationContext } from './context/ReservationContext';
import { PaymentProvider } from './context/PaymentContext';
import { PropertyProvider, usePropertyContext } from './context/PropertyContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider, useLocale } from './context/LocaleContext';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorBanner from './components/ui/ErrorBanner';
import TodayView from './components/today/TodayView';
import CalendarView from './components/calendar/CalendarView';
import RoomsView from './components/rooms/RoomsView';
import GuestsView from './components/guests/GuestsView';
import SettingsView from './components/settings/SettingsView';
import SetupView from './components/SetupView';
import NewReservationModal from './components/reservations/NewReservationModal';
import TabBar from './components/layout/TabBar';

type Tab = 'today' | 'calendar' | 'rooms' | 'guests' | 'settings';

function ErrorMessages() {
  const { error: propertyError, clearError: clearPropertyError } = usePropertyContext();
  const { error: roomError, clearError: clearRoomError } = useRoomContext();
  const { error: guestError, clearError: clearGuestError } = useGuestContext();
  const { error: resError, clearError: clearResError } = useReservationContext();

  const errors = [
    { message: propertyError, clear: clearPropertyError },
    { message: roomError, clear: clearRoomError },
    { message: guestError, clear: clearGuestError },
    { message: resError, clear: clearResError },
  ].filter(e => e.message);

  if (errors.length === 0) return null;

  return (
    <div className="pt-2">
      {errors.map((e, i) => (
        <ErrorBanner key={i} message={e.message!} onDismiss={e.clear} />
      ))}
    </div>
  );
}

function AppContent() {
  const { isConfigured, loading, configureApp, seedData, importData } = usePropertyContext();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const NAV_ITEMS = [
    { id: 'today', label: t.today, icon: LayoutGrid },
    { id: 'calendar', label: t.calendar, icon: Calendar },
    { id: 'rooms', label: t.rooms, icon: Home },
    { id: 'guests', label: t.guests, icon: Users },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

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
    <PaymentProvider>
    <div className="min-h-screen bg-ios-bg flex justify-center w-full">
      <div className="w-full h-full min-h-screen max-w-screen-xl relative flex flex-col sm:border-x sm:border-ios-border/20 shadow-sm bg-ios-bg">
        <main className="flex-1 overflow-y-auto no-scrollbar relative w-full">
          <ErrorBoundary>
            <ErrorMessages />
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
    </PaymentProvider>
    </ReservationProvider>
    </GuestProvider>
    </RoomProvider>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <PropertyProvider>
          <AppContent />
        </PropertyProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
