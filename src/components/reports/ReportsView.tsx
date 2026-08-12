import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, AlertCircle, Banknote, BedDouble } from 'lucide-react';
import { useReservationContext } from '../../context/ReservationContext';
import { usePaymentContext } from '../../context/PaymentContext';
import { useRoomContext } from '../../context/RoomContext';
import { useGuestContext } from '../../context/GuestContext';
import { useLocale } from '../../context/LocaleContext';
import { RoomStatus } from '../../domain/Room';
import PageHeader from '../layout/PageHeader';

type Period = 'week' | 'month';

export default function ReportsView() {
  const { reservations } = useReservationContext();
  const { payments } = usePaymentContext();
  const { rooms } = useRoomContext();
  const { guests } = useGuestContext();
  const { t } = useLocale();
  const [period, setPeriod] = useState<Period>('month');
  const [monthOffset, setMonthOffset] = useState(0);

  const currentDate = useMemo(() => {
    const now = new Date();
    return monthOffset === 0 ? now : subMonths(now, -monthOffset);
  }, [monthOffset]);

  const dateRange = useMemo(() => {
    if (period === 'month') {
      return { start: format(startOfMonth(currentDate), 'yyyy-MM-dd'), end: format(endOfMonth(currentDate), 'yyyy-MM-dd') };
    }
    return { start: format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'), end: format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
  }, [currentDate, period]);

  const periodLabel = useMemo(() => {
    if (period === 'month') return format(currentDate, 'MMMM yyyy');
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
  }, [currentDate, period]);

  const periodPayments = useMemo(() =>
    payments.filter(p => p.date >= dateRange.start && p.date <= dateRange.end),
    [payments, dateRange]
  );

  const totalCollected = useMemo(() =>
    periodPayments.reduce((sum, p) => sum + p.amount, 0),
    [periodPayments]
  );

  const paymentsByMethod = useMemo(() => {
    const groups: Record<string, number> = { cash: 0, card: 0, transfer: 0 };
    for (const p of periodPayments) {
      groups[p.method] = (groups[p.method] || 0) + p.amount;
    }
    return groups;
  }, [periodPayments]);

  const periodReservations = useMemo(() =>
    reservations.filter(r =>
      r.arrivalDate <= dateRange.end && r.departureDate >= dateRange.start && r.status !== 'Cancelled'
    ),
    [reservations, dateRange]
  );

  const totalRevenue = useMemo(() =>
    periodReservations.reduce((sum, r) => sum + r.price, 0),
    [periodReservations]
  );

  const occupancyRate = useMemo(() => {
    if (rooms.length === 0) return 0;
    const occupied = rooms.filter(r => r.status === RoomStatus.OCCUPIED).length;
    return Math.round((occupied / rooms.length) * 100);
  }, [rooms]);

  const outstandingBalances = useMemo(() => {
    const active = reservations.filter(r => r.status !== 'Cancelled');
    const results: { reservationId: string; guestName: string; roomName: string; total: number; paid: number; balance: number; arrivalDate: string }[] = [];
    for (const res of active) {
      const paid = payments.filter(p => p.reservationId === res.id).reduce((s, p) => s + p.amount, 0);
      const balance = res.price - paid;
      if (balance > 0) {
        const guest = guests.find(g => g.id === res.guestId);
        const room = rooms.find(r => r.id === res.roomId);
        results.push({
          reservationId: res.id,
          guestName: guest?.name ?? 'Unknown',
          roomName: room?.name ?? 'Unknown',
          total: res.price,
          paid,
          balance,
          arrivalDate: res.arrivalDate,
        });
      }
    }
    results.sort((a, b) => b.balance - a.balance);
    return results;
  }, [reservations, payments, guests, rooms]);

  const totalOutstanding = useMemo(() =>
    outstandingBalances.reduce((sum, b) => sum + b.balance, 0),
    [outstandingBalances]
  );

  const recentPayments = useMemo(() =>
    [...payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [payments]
  );

  return (
    <div className="pb-24">
      <PageHeader title={t.reports} />

      <div className="px-5 space-y-6">
        {/* Period selector */}
        <div className="flex items-center justify-between">
          <div className="flex bg-ios-gray-light rounded-xl p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                period === 'week' ? 'bg-ios-card text-ios-text shadow-sm' : 'text-ios-text-secondary'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                period === 'month' ? 'bg-ios-card text-ios-text shadow-sm' : 'text-ios-text-secondary'
              }`}
            >
              Month
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthOffset(o => o - 1)}
              className="p-1.5 bg-ios-gray-light rounded-full text-ios-text-secondary active:opacity-70"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-ios-text min-w-[140px] text-center">{periodLabel}</span>
            <button
              onClick={() => setMonthOffset(o => o + 1)}
              className="p-1.5 bg-ios-gray-light rounded-full text-ios-text-secondary active:opacity-70"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
            <div className="mb-2"><TrendingUp size={24} className="text-ios-green" /></div>
            <div className="text-2xl font-bold text-ios-text">${totalCollected}</div>
            <div className="text-ios-text-secondary text-sm font-medium">Collected</div>
          </div>
          <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
            <div className="mb-2"><Banknote size={24} className="text-ios-blue" /></div>
            <div className="text-2xl font-bold text-ios-text">${totalRevenue}</div>
            <div className="text-ios-text-secondary text-sm font-medium">Booked revenue</div>
          </div>
          <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
            <div className="mb-2"><AlertCircle size={24} className="text-ios-red" /></div>
            <div className="text-2xl font-bold text-ios-text">${totalOutstanding}</div>
            <div className="text-ios-text-secondary text-sm font-medium">Outstanding</div>
          </div>
          <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
            <div className="mb-2"><BedDouble size={24} className="text-ios-orange" /></div>
            <div className="text-2xl font-bold text-ios-text">{occupancyRate}%</div>
            <div className="text-ios-text-secondary text-sm font-medium">Occupancy</div>
          </div>
        </div>

        {/* Payment by method */}
        {totalCollected > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3">By method</h3>
            <div className="bg-ios-card rounded-3xl p-5 shadow-sm border border-black/[0.04]">
              <div className="space-y-3">
                {Object.entries(paymentsByMethod).filter(([, v]) => v > 0).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        method === 'cash' ? 'bg-ios-green' : method === 'card' ? 'bg-ios-blue' : 'bg-ios-orange'
                      }`} />
                      <span className="text-sm font-medium text-ios-text capitalize">{method}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-ios-gray-light rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            method === 'cash' ? 'bg-ios-green' : method === 'card' ? 'bg-ios-blue' : 'bg-ios-orange'
                          }`}
                          style={{ width: `${(amount / totalCollected) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-ios-text w-16 text-right">${amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Outstanding balances */}
        {outstandingBalances.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3">Outstanding balances</h3>
            <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
              <div className="divide-y divide-ios-border/40">
                {outstandingBalances.map(item => (
                  <div key={item.reservationId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-ios-text text-sm">{item.guestName}</div>
                        <div className="text-xs text-ios-text-secondary">{item.roomName} — {item.arrivalDate}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-ios-red text-sm">${item.balance}</div>
                        <div className="text-xs text-ios-text-secondary">${item.paid} / ${item.total}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent payments */}
        <div>
          <h3 className="text-lg font-bold mb-3">Recent payments</h3>
          {recentPayments.length === 0 ? (
            <div className="bg-ios-card rounded-3xl p-8 shadow-sm border border-black/[0.04] text-center">
              <div className="text-ios-text-secondary text-sm">No payments recorded yet.</div>
            </div>
          ) : (
            <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
              <div className="divide-y divide-ios-border/40">
                {recentPayments.map(p => {
                  const res = reservations.find(r => r.id === p.reservationId);
                  const guest = res ? guests.find(g => g.id === res.guestId) : null;
                  return (
                    <div key={p.id} className="flex items-center p-4 gap-3">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                        p.method === 'cash' ? 'bg-ios-green/10' : p.method === 'card' ? 'bg-ios-blue/10' : 'bg-ios-orange/10'
                      }`}>
                        <Banknote size={16} className={
                          p.method === 'cash' ? 'text-ios-green' : p.method === 'card' ? 'text-ios-blue' : 'text-ios-orange'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ios-text text-sm truncate">{guest?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-ios-text-secondary">
                          {p.date} · <span className="capitalize">{p.method}</span>
                          {p.note && ` · ${p.note}`}
                        </div>
                      </div>
                      <div className="font-bold text-ios-text text-sm">${p.amount}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
