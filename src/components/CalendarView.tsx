import { useState } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalendar } from '../hooks/useCalendar';

export default function CalendarView() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const { data, loading } = useCalendar(weekStart);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

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

  return (
    <div className="pb-24">
      <header className="px-5 pt-12 pb-4 bg-ios-bg sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ios-text">Calendar</h1>
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
      </header>

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
              <div key={room.id} className="flex min-h-[80px]">
                <div className="w-20 flex-shrink-0 border-r border-ios-border/40 p-3 flex flex-col justify-center bg-ios-bg/30">
                  <span className="text-sm font-semibold text-ios-text leading-tight">{room.name}</span>
                </div>
                <div className="flex-1 relative">
                  {data.reservations.filter(r => r.roomId === room.id).map(res => {
                    const guest = data.guests.find(g => g.id === res.guestId);

                    const startIdx = days.findIndex(d => format(d, 'yyyy-MM-dd') === res.arrivalDate);
                    const endIdx = days.findIndex(d => format(d, 'yyyy-MM-dd') === res.departureDate);

                    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
                    const weekEndStr = format(addDays(weekStart, 7), 'yyyy-MM-dd');
                    if (res.departureDate <= weekStartStr || res.arrivalDate >= weekEndStr) return null;

                    const actualStart = startIdx === -1 ? 0 : startIdx;
                    const actualEnd = endIdx === -1 ? 7 : endIdx;
                    const span = actualEnd - actualStart;
                    if (span <= 0) return null;

                    return (
                      <div
                        key={res.id}
                        className="absolute top-2 bottom-2 rounded-xl bg-ios-blue/15 border border-ios-blue/30 px-3 py-1 overflow-hidden flex items-center"
                        style={{
                          left: `${(actualStart / 7) * 100}%`,
                          width: `${(span / 7) * 100}%`,
                          marginLeft: '4px',
                          marginRight: '4px'
                        }}
                      >
                        <div className="text-xs font-semibold text-ios-blue truncate">{guest?.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
