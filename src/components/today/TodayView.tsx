import { useState, useMemo } from 'react';
import { LogIn, LogOut, SprayCan, CreditCard, CheckCircle2 } from 'lucide-react';
import { useToday } from '../../hooks/useToday';
import { usePropertyContext } from '../../context/PropertyContext';
import { useReservationContext } from '../../context/ReservationContext';
import { useRoomContext } from '../../context/RoomContext';
import { usePaymentContext } from '../../context/PaymentContext';
import { useLocale } from '../../context/LocaleContext';
import { reservationService } from '../../services/ReservationService';
import { roomService } from '../../services/RoomService';
import { RoomStatus } from '../../domain/Room';
import PageHeader from '../layout/PageHeader';
import StatCard from '../ui/StatCard';

interface ActionItem {
  id: string;
  roomName: string;
  roomId: string;
  icon: 'arrival' | 'departure' | 'cleaning' | 'payment';
  label: string;
  sublabel?: string;
  actionLabel?: string;
  actionType?: 'checkIn' | 'checkOut' | 'markClean';
  reservationId?: string;
}

export default function TodayView() {
  const { data, loading } = useToday();
  const { propertyName } = usePropertyContext();
  const { refresh: refreshReservations } = useReservationContext();
  const { refresh: refreshRooms } = useRoomContext();
  const { payments } = usePaymentContext();
  const { t } = useLocale();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const today = new Date();
  const localDate = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const actions = useMemo<ActionItem[]>(() => {
    if (!data) return [];

    const items: ActionItem[] = [];

    for (const res of data.arrivals) {
      const room = data.rooms.find(r => r.id === res.roomId);
      const guest = data.guests.find(g => g.id === res.guestId);
      if (!room || !guest) continue;
      items.push({
        id: `arrival-${res.id}`,
        roomName: room.name,
        roomId: room.id,
        icon: 'arrival',
        label: `${guest.name} arrives`,
        sublabel: '14:00',
        actionLabel: t.checkIn,
        actionType: 'checkIn',
        reservationId: res.id,
      });
    }

    for (const res of data.departures) {
      const room = data.rooms.find(r => r.id === res.roomId);
      const guest = data.guests.find(g => g.id === res.guestId);
      if (!room || !guest) continue;
      items.push({
        id: `departure-${res.id}`,
        roomName: room.name,
        roomId: room.id,
        icon: 'departure',
        label: `${guest.name} departs`,
        sublabel: '11:00',
        actionLabel: t.checkOut,
        actionType: 'checkOut',
        reservationId: res.id,
      });
    }

    const cleaningRooms = data.rooms.filter(r => r.status === RoomStatus.CLEANING);
    for (const room of cleaningRooms) {
      items.push({
        id: `cleaning-${room.id}`,
        roomName: room.name,
        roomId: room.id,
        icon: 'cleaning',
        label: 'Cleaning required',
        actionLabel: 'Mark clean',
        actionType: 'markClean',
      });
    }

    const activeReservations = data.arrivals.concat(data.departures);
    const allActive = [...new Map(activeReservations.map(r => [r.id, r])).values()];
    for (const res of allActive) {
      const totalPaid = payments
        .filter(p => p.reservationId === res.id)
        .reduce((sum, p) => sum + p.amount, 0);
      const balance = res.price - totalPaid;
      if (balance > 0) {
        const room = data.rooms.find(r => r.id === res.roomId);
        const guest = data.guests.find(g => g.id === res.guestId);
        if (!room || !guest) continue;
        items.push({
          id: `payment-${res.id}`,
          roomName: room.name,
          roomId: room.id,
          icon: 'payment',
          label: `Payment pending — ${guest.name}`,
          sublabel: `$${balance} remaining`,
        });
      }
    }

    items.sort((a, b) => a.roomName.localeCompare(b.roomName, undefined, { numeric: true }));
    return items;
  }, [data, payments, t]);

  const handleAction = async (action: ActionItem) => {
    if (!action.actionType) return;
    const id = action.reservationId || action.roomId;
    setLoadingId(action.id);
    try {
      if (action.actionType === 'checkIn' && action.reservationId) {
        await reservationService.checkIn(action.reservationId);
      } else if (action.actionType === 'checkOut' && action.reservationId) {
        await reservationService.checkOut(action.reservationId);
      } else if (action.actionType === 'markClean') {
        await roomService.updateRoomStatus(action.roomId, 'clean');
      }
      await Promise.all([refreshReservations(), refreshRooms()]);
    } finally {
      setLoadingId(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="pb-24">
        <PageHeader title={propertyName} subtitle={localDate} />
        <div className="px-5 text-center text-ios-text-secondary py-12">{t.loading}</div>
      </div>
    );
  }

  const occupiedRooms = data.rooms.filter(r => r.status === RoomStatus.OCCUPIED);
  const cleaningRooms = data.rooms.filter(r => r.status === RoomStatus.CLEANING);

  const iconElement = (type: ActionItem['icon']) => {
    switch (type) {
      case 'arrival': return <LogIn size={18} className="text-ios-blue" />;
      case 'departure': return <LogOut size={18} className="text-ios-orange" />;
      case 'cleaning': return <SprayCan size={18} className="text-ios-green" />;
      case 'payment': return <CreditCard size={18} className="text-ios-red" />;
    }
  };

  const actionButtonStyle = (type: ActionItem['actionType']) => {
    switch (type) {
      case 'checkIn': return 'bg-ios-blue';
      case 'checkOut': return 'bg-ios-orange';
      case 'markClean': return 'bg-ios-green';
      default: return 'bg-ios-blue';
    }
  };

  return (
    <div className="pb-24">
      <PageHeader title={propertyName} subtitle={localDate} />

      <div className="px-5 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            icon={<LogIn size={24} className="text-ios-blue" />}
            value={data.arrivals.length}
            label={t.arrivals}
          />
          <StatCard
            icon={<LogOut size={24} className="text-ios-orange" />}
            value={data.departures.length}
            label={t.departures}
          />
          <StatCard
            icon={<SprayCan size={24} className="text-ios-green" />}
            value={cleaningRooms.length}
            label={t.cleaning}
          />
          <StatCard
            icon={<CreditCard size={24} className="text-ios-red" />}
            value={actions.filter(a => a.icon === 'payment').length}
            label="Pending"
          />
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4">What needs doing</h3>

          {actions.length === 0 ? (
            <div className="bg-ios-card rounded-3xl p-8 shadow-sm border border-black/[0.04] text-center">
              <CheckCircle2 size={40} className="text-ios-green mx-auto mb-3" />
              <div className="font-semibold text-ios-text text-lg">All clear!</div>
              <div className="text-ios-text-secondary text-sm mt-1">Nothing needs your attention today.</div>
            </div>
          ) : (
            <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
              <div className="divide-y divide-ios-border/40">
                {actions.map(action => (
                  <div key={action.id} className="flex items-center p-4 gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-ios-bg flex items-center justify-center">
                      {iconElement(action.icon)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ios-text text-sm">{action.roomName}</div>
                      <div className="text-sm text-ios-text-secondary truncate">{action.label}</div>
                      {action.sublabel && (
                        <div className="text-xs text-ios-text-secondary/70">{action.sublabel}</div>
                      )}
                    </div>

                    {action.actionLabel && (
                      <button
                        onClick={() => handleAction(action)}
                        disabled={loadingId === action.id}
                        className={`flex-shrink-0 px-3 py-1.5 text-white text-xs font-semibold rounded-full active:scale-95 transition-all disabled:opacity-50 ${actionButtonStyle(action.actionType)}`}
                      >
                        {loadingId === action.id ? '...' : action.actionLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
