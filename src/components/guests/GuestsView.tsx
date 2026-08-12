import { useState, useMemo, useRef } from 'react';
import { Search, ChevronRight, Phone, X, Calendar, DoorOpen, Plus, Banknote } from 'lucide-react';
import { useGuests } from '../../hooks/useGuests';
import { useReservationContext } from '../../context/ReservationContext';
import { useRoomContext } from '../../context/RoomContext';
import { usePaymentContext } from '../../context/PaymentContext';
import { paymentService } from '../../services/PaymentService';
import { type Guest } from '../../domain/Guest';
import { type Reservation } from '../../domain/Reservation';
import PageHeader from '../layout/PageHeader';

export default function GuestsView() {
  const { guests, loading } = useGuests();
  const { reservations } = useReservationContext();
  const { rooms } = useRoomContext();
  const { payments, refresh: refreshPayments } = usePaymentContext();
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [payingReservation, setPayingReservation] = useState<Reservation | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [saving, setSaving] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredGuests = useMemo(() => {
    if (!search) return guests;
    const q = search.toLowerCase();
    return guests.filter(g =>
      g.name.toLowerCase().includes(q) || g.phone.includes(q)
    );
  }, [guests, search]);

  const groupedGuests = useMemo(() => {
    const sorted = [...filteredGuests].sort((a, b) => a.name.localeCompare(b.name));
    const groups: Record<string, typeof sorted> = {};
    for (const guest of sorted) {
      const letter = guest.name.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(guest);
    }
    return groups;
  }, [filteredGuests]);

  const letters = useMemo(() => Object.keys(groupedGuests).sort(), [groupedGuests]);

  const guestReservations = useMemo(() => {
    if (!selectedGuest) return [];
    return reservations
      .filter(r => r.guestId === selectedGuest.id)
      .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate));
  }, [selectedGuest, reservations]);

  const getPaymentsForReservation = (reservationId: string) =>
    payments.filter(p => p.reservationId === reservationId);

  const getTotalPaid = (reservationId: string) =>
    getPaymentsForReservation(reservationId).reduce((sum, p) => sum + p.amount, 0);

  const scrollToLetter = (letter: string) => {
    setActiveLetter(letter);
    sectionRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getRoomName = (roomId: string) => rooms.find(r => r.id === roomId)?.name ?? 'Unknown';

  const statusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'text-ios-blue bg-ios-blue/10';
      case 'Checked In': return 'text-ios-green bg-ios-green/10';
      case 'Checked Out': return 'text-ios-orange bg-ios-orange/10';
      case 'Cancelled': return 'text-ios-red bg-ios-red/10';
      default: return 'text-ios-text-secondary bg-ios-gray-light';
    }
  };

  const handleAddPayment = async () => {
    if (!payingReservation || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    setSaving(true);
    try {
      await paymentService.createPayment({
        id: `pay-${Date.now()}`,
        reservationId: payingReservation.id,
        amount,
        date: new Date().toISOString().split('T')[0],
        method: paymentMethod,
        note: paymentNote,
      });
      await refreshPayments();
      setPayingReservation(null);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentNote('');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-24">
        <PageHeader title="Guests" />
        <div className="px-5 text-center text-ios-text-secondary py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="pb-24 relative">
      <header className="px-5 pt-12 pb-4 bg-ios-bg sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-ios-text mb-4">Guests</h1>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-ios-text-secondary" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border-none rounded-xl leading-5 bg-ios-gray-light text-ios-text placeholder-ios-text-secondary focus:outline-none focus:ring-2 focus:ring-ios-blue focus:bg-ios-card transition-colors"
            placeholder="Search guests..."
          />
        </div>
      </header>

      <div className="flex">
        <div className="flex-1 px-5 mt-2 max-w-screen-md mx-auto">
          {letters.map(letter => (
            <div key={letter} ref={el => { sectionRefs.current[letter] = el; }}>
              <div className="text-sm font-semibold text-ios-text-secondary uppercase px-4 pt-4 pb-1">
                {letter}
              </div>
              <div className="bg-ios-card rounded-2xl overflow-hidden shadow-sm border border-black/[0.04] mb-3">
                <div className="divide-y divide-ios-border/40">
                  {groupedGuests[letter].map(guest => (
                    <div
                      key={guest.id}
                      onClick={() => setSelectedGuest(guest)}
                      className="flex items-center p-4 active:bg-ios-gray-light/30 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ios-text text-lg">{guest.name}</div>
                        <div className="flex items-center gap-1 text-sm text-ios-text-secondary">
                          <Phone size={12} />
                          <span>{guest.phone}</span>
                        </div>
                      </div>
                      <ChevronRight className="text-ios-border flex-shrink-0" size={20} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {letters.length === 0 && (
            <div className="text-center text-ios-text-secondary py-12">No guests found.</div>
          )}
        </div>

        {letters.length > 1 && (
          <div className="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center z-20 py-2">
            {letters.map(letter => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                  activeLetter === letter
                    ? 'bg-ios-blue text-white'
                    : 'text-ios-blue hover:bg-ios-blue/10'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedGuest && !payingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedGuest(null)} />
          <div className="relative bg-ios-card rounded-3xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden border border-black/[0.04]">
            <div className="flex items-center justify-between p-5 border-b border-ios-border/40">
              <div>
                <h3 className="text-lg font-bold text-ios-text">{selectedGuest.name}</h3>
                <div className="flex items-center gap-1 text-sm text-ios-text-secondary">
                  <Phone size={12} />
                  <span>{selectedGuest.phone}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedGuest(null)}
                className="p-1 text-ios-text-secondary hover:text-ios-text transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm font-semibold text-ios-text-secondary uppercase mb-3">
                Reservations ({guestReservations.length})
              </div>

              {guestReservations.length === 0 ? (
                <div className="text-center text-ios-text-secondary py-8">No reservations found.</div>
              ) : (
                <div className="space-y-3">
                  {guestReservations.map(res => {
                    const paid = getTotalPaid(res.id);
                    const balance = res.price - paid;
                    return (
                      <div key={res.id} className="bg-ios-bg rounded-2xl p-4 border border-ios-border/40">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DoorOpen size={14} className="text-ios-text-secondary" />
                            <span className="font-semibold text-ios-text">{getRoomName(res.roomId)}</span>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(res.status)}`}>
                            {res.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-ios-text-secondary mb-2">
                          <Calendar size={12} />
                          <span>{res.arrivalDate} → {res.departureDate}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm border-t border-ios-border/40 pt-2 mt-2">
                          <div className="space-y-0.5">
                            <div className="text-ios-text-secondary">
                              Total: <span className="font-semibold text-ios-text">${res.price}</span>
                            </div>
                            <div className="text-ios-text-secondary">
                              Paid: <span className="font-semibold text-ios-green">${paid}</span>
                            </div>
                            {balance > 0 && (
                              <div className="text-ios-text-secondary">
                                Balance: <span className="font-semibold text-ios-red">${balance}</span>
                              </div>
                            )}
                            {balance <= 0 && (
                              <div className="text-xs font-semibold text-ios-green">Fully paid</div>
                            )}
                          </div>
                          {balance > 0 && res.status !== 'Cancelled' && (
                            <button
                              onClick={() => setPayingReservation(res)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-ios-blue text-white text-xs font-semibold rounded-xl active:scale-95 transition-transform"
                            >
                              <Plus size={12} />
                              Payment
                            </button>
                          )}
                        </div>
                        {getPaymentsForReservation(res.id).length > 0 && (
                          <div className="mt-3 pt-2 border-t border-ios-border/40 space-y-1.5">
                            {getPaymentsForReservation(res.id).map(p => (
                              <div key={p.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-ios-text-secondary">
                                  <Banknote size={11} />
                                  <span>{p.date}</span>
                                  <span className="capitalize bg-ios-gray-light px-1.5 py-0.5 rounded">{p.method}</span>
                                </div>
                                <span className="font-semibold text-ios-text">${p.amount}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {payingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayingReservation(null)} />
          <div className="relative bg-ios-card rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-black/[0.04]">
            <div className="flex items-center justify-between p-5 border-b border-ios-border/40">
              <h3 className="text-lg font-bold text-ios-text">Add Payment</h3>
              <button
                onClick={() => setPayingReservation(null)}
                className="p-1 text-ios-text-secondary hover:text-ios-text transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-sm text-ios-text-secondary">
                {getRoomName(payingReservation.roomId)} — {payingReservation.arrivalDate} → {payingReservation.departureDate}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ios-text-secondary">Balance remaining</span>
                <span className="font-semibold text-ios-red">
                  ${payingReservation.price - getTotalPaid(payingReservation.id)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-ios-text mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-ios-bg border border-ios-border/40 rounded-xl text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ios-text mb-1">Method</label>
                <div className="flex gap-2">
                  {(['cash', 'card', 'transfer'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl capitalize transition-colors ${
                        paymentMethod === m
                          ? 'bg-ios-blue text-white'
                          : 'bg-ios-bg text-ios-text-secondary border border-ios-border/40'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ios-text mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full px-4 py-2.5 bg-ios-bg border border-ios-border/40 rounded-xl text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue"
                  placeholder="e.g. Advance deposit"
                />
              </div>

              <button
                onClick={handleAddPayment}
                disabled={saving || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="w-full py-3 bg-ios-blue text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
