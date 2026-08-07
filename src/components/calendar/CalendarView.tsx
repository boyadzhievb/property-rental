import { useState } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendar } from '../../hooks/useCalendar';
import PageHeader from '../layout/PageHeader';
import CalendarRow from './CalendarRow';

export default function CalendarView() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const { data, loading } = useCalendar(weekStart);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  if (loading || !data) {
    return (
      <div className="pb-24">
        <PageHeader title="Calendar" />
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Calendar"
        right={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekStart(subDays(weekStart, 7))}
              className="p-2 bg-ios-gray-light rounded-full text-ios-text-secondary active:opacity-70 transition-opacity"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-semibold text-ios-text min-w-[120px] text-center">
              {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {addDays(weekStart, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-2 bg-ios-gray-light rounded-full text-ios-text-secondary active:opacity-70 transition-opacity"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        }
      />

      <div className="px-5">
        <div className="bg-ios-card rounded-3xl shadow-sm border border-black/[0.04] overflow-hidden">
          <div className="flex border-b border-ios-border/40">
            <div className="w-20 flex-shrink-0 border-r border-ios-border/40 p-3 bg-ios-bg/30"></div>
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} className="flex-1 p-3 text-center border-r last:border-r-0 border-ios-border/40">
                  <div className="text-xs font-medium text-ios-text-secondary mb-1">{format(day, 'EEE')}</div>
                  <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-ios-blue text-white' : 'text-ios-text'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="divide-y divide-ios-border/40">
            {data.rooms.map(room => (
              <CalendarRow
                key={room.id}
                room={room}
                reservations={data.reservations}
                guests={data.guests}
                weekStart={weekStart}
                days={days}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
