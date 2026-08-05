import { useState } from 'react';
import { format, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendar } from '../hooks/useCalendar';

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data, loading } = useCalendar(currentMonth);
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  if (loading || !data) {
    return (
      <div className="pb-24">
        <header className="px-5 pt-12 pb-4 bg-ios-bg sticky top-0 z-10">
          <h1 className="text-3xl font-bold text-ios-text">Calendar</h1>
        </header>
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
      </div>
    );
  }

  const getReservationsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return data.reservations.filter(r => r.arrivalDate <= dayStr && r.departureDate > dayStr);
  };

  return (
    <div className="pb-24">
      <header className="px-5 pt-12 pb-4 bg-ios-bg sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ios-text">Calendar</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 bg-ios-gray-light rounded-full text-ios-text-secondary active:opacity-70 transition-opacity"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-semibold text-ios-text min-w-[100px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 bg-ios-gray-light rounded-full text-ios-text-secondary active:opacity-70 transition-opacity"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div className="px-5">
        <div className="bg-ios-card rounded-3xl shadow-sm border border-black/[0.04] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-ios-border/40">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="p-2 text-center text-xs font-medium text-ios-text-secondary">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              const inMonth = isSameMonth(day, currentMonth);
              const dayReservations = getReservationsForDay(day);

              return (
                <div
                  key={i}
                  className={`min-h-[60px] p-1 border-b border-r border-ios-border/20 ${!inMonth ? 'opacity-30' : ''}`}
                >
                  <div className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${isToday ? 'bg-ios-blue text-white' : 'text-ios-text'}`}>
                    {format(day, 'd')}
                  </div>
                  {dayReservations.slice(0, 2).map(res => {
                    const guest = data.guests.find(g => g.id === res.guestId);
                    return (
                      <div
                        key={res.id}
                        className="text-[9px] leading-tight font-medium text-ios-blue bg-ios-blue/10 rounded px-1 py-0.5 truncate mb-0.5"
                      >
                        {guest?.name.split(' ')[0]}
                      </div>
                    );
                  })}
                  {dayReservations.length > 2 && (
                    <div className="text-[9px] text-ios-text-secondary text-center">
                      +{dayReservations.length - 2}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
