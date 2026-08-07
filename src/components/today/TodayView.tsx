import { LogIn, LogOut, Home, SprayCan } from 'lucide-react';
import { useToday } from '../../hooks/useToday';
import { usePropertyContext } from '../../context/PropertyContext';
import PageHeader from '../layout/PageHeader';
import StatCard from '../ui/StatCard';
import Timeline from './Timeline';

export default function TodayView() {
  const { data, loading } = useToday();
  const { propertyName } = usePropertyContext();
  const today = new Date();
  const localDate = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading || !data) {
    return (
      <div className="pb-24">
        <PageHeader title={propertyName} subtitle={localDate} />
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader title={propertyName} subtitle={localDate} />

      <div className="px-5 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <StatCard icon={<LogIn size={24} className="text-ios-blue" />} value={data.arrivals.length} label="Arrivals" />
          <StatCard icon={<LogOut size={24} className="text-ios-orange" />} value={data.departures.length} label="Departures" />
          <StatCard icon={<Home size={24} className="text-ios-red" />} value={data.occupiedCount} label="Occupied" />
          <StatCard icon={<SprayCan size={24} className="text-ios-green" />} value={data.cleaningCount} label="Cleaning" />
        </div>

        <Timeline events={data.timeline} rooms={data.rooms} guests={data.guests} />
      </div>
    </div>
  );
}
