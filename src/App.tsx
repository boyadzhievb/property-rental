import { useState, useMemo, lazy, Suspense } from 'react';
import { Calendar, Home, Users, Settings as SettingsIcon, LayoutGrid, Plus, BarChart3 } from 'lucide-react';
import { RoomProvider, useRoomContext } from './context/RoomContext';
import { GuestProvider, useGuestContext } from './context/GuestContext';
import { ReservationProvider, useReservationContext } from './context/ReservationContext';
import { PaymentProvider } from './context/PaymentContext';
import { TaskProvider } from './context/TaskContext';
import { PropertyProvider, usePropertyContext } from './context/PropertyContext';
import { ThemeProvider } from './context/ThemeContext';
import { LocaleProvider, useLocale } from './context/LocaleContext';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorBanner from './components/ui/ErrorBanner';
import TodayView from './components/today/TodayView';
import SetupView from './components/SetupView';
import TabBar from './components/layout/TabBar';
import InstallBanner from './components/ui/InstallBanner';
import OfflineBanner from './components/ui/OfflineBanner';
import UpdateBanner from './components/ui/UpdateBanner';

const CalendarView = lazy(() => import('./components/calendar/CalendarView'));
const RoomsView = lazy(() => import('./components/rooms/RoomsView'));
const GuestsView = lazy(() => import('./components/guests/GuestsView'));
const ReportsView = lazy(() => import('./components/reports/ReportsView'));
const SettingsView = lazy(() => import('./components/settings/SettingsView'));
const NewReservationModal = lazy(() => import('./components/reservations/NewReservationModal'));

type Tab = 'today' | 'calendar' | 'rooms' | 'guests' | 'reports' | 'settings';

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

function Loading({ t }: { t: { loading: string } }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-ios-text-secondary text-sm">{t.loading}</div>
    </div>
  );
}

function AppContent() {
  const { isConfigured, loading, configureApp, seedData, importData } = usePropertyContext();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const NAV_ITEMS = useMemo(() => [
    { id: 'today', label: t.today, icon: LayoutGrid },
    { id: 'calendar', label: t.calendar, icon: Calendar },
    { id: 'rooms', label: t.rooms, icon: Home },
    { id: 'guests', label: t.guests, icon: Users },
    { id: 'reports', label: t.reports, icon: BarChart3 },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ], [t]);

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
      case 'calendar': return <Suspense fallback={<Loading t={t} />}><CalendarView /></Suspense>;
      case 'rooms': return <Suspense fallback={<Loading t={t} />}><RoomsView /></Suspense>;
      case 'guests': return <Suspense fallback={<Loading t={t} />}><GuestsView /></Suspense>;
      case 'reports': return <Suspense fallback={<Loading t={t} />}><ReportsView /></Suspense>;
      case 'settings': return <Suspense fallback={<Loading t={t} />}><SettingsView /></Suspense>;
      default: return <TodayView />;
    }
  };

  return (
    <RoomProvider>
    <GuestProvider>
    <ReservationProvider>
    <PaymentProvider>
    <TaskProvider>
    <div className="min-h-screen bg-ios-bg flex justify-center w-full">
      <div className="w-full h-full min-h-screen max-w-screen-xl relative flex flex-col sm:border-x sm:border-ios-border/20 shadow-sm bg-ios-bg">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-ios-blue focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:text-sm focus:font-semibold">
          Skip to content
        </a>
        <main id="main-content" className="flex-1 overflow-y-auto no-scrollbar relative w-full">
          <InstallBanner />
          <OfflineBanner />
          <UpdateBanner />
          <ErrorBoundary>
            <ErrorMessages />
            {renderContent()}
          </ErrorBoundary>
        </main>

        <button
          onClick={() => setIsModalOpen(true)}
          aria-label={t.newReservation}
          className="absolute bottom-24 right-5 sm:right-8 lg:right-12 w-14 h-14 bg-ios-blue text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all z-20"
        >
          <Plus size={28} />
        </button>

        <TabBar items={NAV_ITEMS} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as Tab)} />

        {isModalOpen && <Suspense fallback={null}><NewReservationModal onClose={() => setIsModalOpen(false)} /></Suspense>}
      </div>
    </div>
    </TaskProvider>
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
