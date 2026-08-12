import { useState } from 'react';
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, LogIn, LogOut, X, XCircle, Banknote, Plus } from 'lucide-react';
import { useCalendar } from '../../hooks/useCalendar';
import { useReservationContext } from '../../context/ReservationContext';
import { useRoomContext } from '../../context/RoomContext';
import { usePaymentContext } from '../../context/PaymentContext';
import { useLocale } from '../../context/LocaleContext';
import { reservationService } from '../../services/ReservationService';
import { paymentService } from '../../services/PaymentService';
import { type Reservation } from '../../domain/Reservation';
import { type Room } from '../../domain/Room';
import { type Guest } from '../../domain/Guest';
import PageHeader from '../layout/PageHeader';
import CalendarRow from './CalendarRow';

export default function CalendarView() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const { data, loading, refresh: refreshCalendar } = useCalendar(weekStart);
  const { refresh: refreshReservations } = useReservationContext();
  const { refresh: refreshRooms } = useRoomContext();
  const { payments, refresh: refreshPayments } = usePaymentContext();
  const { t } = useLocale();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const refreshAll = () => Promise.all([refreshCalendar(), refreshReservations(), refreshRooms(), refreshPayments()]);

  const handleCheckIn = async () => {
    if (!selectedReservation) return;
    setActionLoading(true);
    try {
      await reservationService.checkIn(selectedReservation.id);
      await refreshAll();
      setSelectedReservation(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedReservation) return;
    setActionLoading(true);
    try {
      await reservationService.checkOut(selectedReservation.id);
      await refreshAll();
      setSelectedReservation(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedReservation) return;
    setActionLoading(true);
    try {
      await reservationService.cancel(selectedReservation.id);
      await refreshAll();
      setSelectedReservation(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedReservation || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    setActionLoading(true);
    try {
      await paymentService.createPayment({
        id: `pay-${Date.now()}`,
        reservationId: selectedReservation.id,
        amount,
        date: new Date().toISOString().split('T')[0],
        method: paymentMethod,
        note: paymentNote,
      });
      await refreshPayments();
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentNote('');
    } finally {
      setActionLoading(false);
    }
  };

  const getReservationPaid = (resId: string) =>
    payments.filter(p => p.reservationId === resId).reduce((sum, p) => sum + p.amount, 0);

  const getReservationPayments = (resId: string) =>
    payments.filter(p => p.reservationId === resId);

  if (loading || !data) {
    return (
      <div className="pb-24">
        <PageHeader title={t.calendar} />
        <div className="px-5 text-center text-ios-text-secondary py-12">{t.loading}</div>
      </div>
    );
  }

  const selectedGuest = selectedReservation
    ? data.guests.find((g: Guest) => g.id === selectedReservation.guestId)
    : null;
  const selectedRoom = selectedReservation
    ? data.rooms.find((r: Room) => r.id === selectedReservation.roomId)
    : null;

  return (
    <div className="pb-24">
      <PageHeader
        title={t.calendar}
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
                onReservationClick={setSelectedReservation}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedReservation(null); setShowPaymentForm(false); }} />
          <div className="relative bg-ios-card rounded-3xl shadow-xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden border border-black/[0.04]">
            <div className="flex items-center justify-between p-5 border-b border-ios-border/40">
              <h3 className="text-lg font-bold text-ios-text">{t.reservation}</h3>
              <button
                onClick={() => { setSelectedReservation(null); setShowPaymentForm(false); }}
                className="p-1 text-ios-text-secondary hover:text-ios-text transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-3">
                <div>
                  <div className="text-sm text-ios-text-secondary">{t.guest}</div>
                  <div className="font-semibold text-ios-text">{selectedGuest?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-ios-text-secondary">{t.room}</div>
                  <div className="font-semibold text-ios-text">{selectedRoom?.name}</div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-sm text-ios-text-secondary">{t.arrival}</div>
                    <div className="font-semibold text-ios-text">{selectedReservation.arrivalDate}</div>
                  </div>
                  <div>
                    <div className="text-sm text-ios-text-secondary">{t.departure}</div>
                    <div className="font-semibold text-ios-text">{selectedReservation.departureDate}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-ios-text-secondary">{t.status}</div>
                  <div className={`font-semibold ${
                    selectedReservation.status === 'Confirmed' ? 'text-ios-blue' :
                    selectedReservation.status === 'Checked In' ? 'text-ios-green' :
                    selectedReservation.status === 'Checked Out' ? 'text-ios-orange' :
                    'text-ios-red'
                  }`}>
                    {selectedReservation.status === 'Confirmed' ? t.confirmed :
                     selectedReservation.status === 'Checked In' ? t.checkedIn :
                     selectedReservation.status === 'Checked Out' ? t.checkedOut :
                     t.cancelled}
                  </div>
                </div>

                {/* Payment summary */}
                <div className="border-t border-ios-border/40 pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-ios-text-secondary uppercase">Payment</div>
                    {selectedReservation.status !== 'Cancelled' && selectedReservation.price - getReservationPaid(selectedReservation.id) > 0 && (
                      <button
                        onClick={() => setShowPaymentForm(!showPaymentForm)}
                        className="flex items-center gap-1 text-xs font-semibold text-ios-blue"
                      >
                        <Plus size={12} />
                        Add
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ios-text-secondary">Total</span>
                    <span className="font-semibold text-ios-text">${selectedReservation.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ios-text-secondary">Paid</span>
                    <span className="font-semibold text-ios-green">${getReservationPaid(selectedReservation.id)}</span>
                  </div>
                  {selectedReservation.price - getReservationPaid(selectedReservation.id) > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-ios-text-secondary">Balance</span>
                      <span className="font-semibold text-ios-red">${selectedReservation.price - getReservationPaid(selectedReservation.id)}</span>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-ios-green mt-1">Fully paid</div>
                  )}

                  {getReservationPayments(selectedReservation.id).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {getReservationPayments(selectedReservation.id).map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-center gap-1.5 text-ios-text-secondary">
                            <Banknote size={11} />
                            <span>{p.date}</span>
                            <span className="capitalize bg-ios-gray-light px-1.5 py-0.5 rounded">{p.method}</span>
                            {p.note && <span className="truncate max-w-[80px]">— {p.note}</span>}
                          </div>
                          <span className="font-semibold text-ios-text">${p.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {showPaymentForm && (
                    <div className="mt-3 p-3 bg-ios-bg rounded-2xl border border-ios-border/40 space-y-3">
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          className="w-full px-3 py-2 bg-ios-card border border-ios-border/40 rounded-xl text-sm text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue"
                          placeholder="Amount"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-1.5">
                        {(['cash', 'card', 'transfer'] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => setPaymentMethod(m)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                              paymentMethod === m
                                ? 'bg-ios-blue text-white'
                                : 'bg-ios-card text-ios-text-secondary border border-ios-border/40'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={e => setPaymentNote(e.target.value)}
                        className="w-full px-3 py-2 bg-ios-card border border-ios-border/40 rounded-xl text-sm text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue"
                        placeholder="Note (optional)"
                      />
                      <button
                        onClick={handleAddPayment}
                        disabled={actionLoading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                        className="w-full py-2 bg-ios-blue text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {actionLoading ? 'Saving...' : 'Record Payment'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 border-t border-ios-border/40 space-y-3">
                {selectedReservation.status === 'Confirmed' && (
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-ios-blue text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <LogIn size={18} />
                    {t.checkIn}
                  </button>
                )}

                {selectedReservation.status === 'Checked In' && (
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-ios-orange text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <LogOut size={18} />
                    {t.checkOut}
                  </button>
                )}

                {(selectedReservation.status === 'Confirmed' || selectedReservation.status === 'Checked In') && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-ios-red/10 text-ios-red font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    {t.cancelReservation}
                  </button>
                )}

                {(selectedReservation.status === 'Checked Out' || selectedReservation.status === 'Cancelled') && (
                  <div className="text-center text-ios-text-secondary text-sm py-2">
                    {t.noActionsAvailable} {selectedReservation.status === 'Checked Out' ? t.checkedOut.toLowerCase() : t.cancelled.toLowerCase()}.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
