import { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, SprayCan, CreditCard, CheckCircle2, Plus, X, Phone, MessageSquare, Sparkles, Home } from 'lucide-react';
import { useToday } from '../../hooks/useToday';
import { usePropertyContext } from '../../context/PropertyContext';
import { useReservationContext } from '../../context/ReservationContext';
import { useRoomContext } from '../../context/RoomContext';
import { usePaymentContext } from '../../context/PaymentContext';
import { useTaskContext } from '../../context/TaskContext';
import { useLocale } from '../../context/LocaleContext';
import { reservationService } from '../../services/ReservationService';
import { roomService } from '../../services/RoomService';
import { taskService } from '../../services/TaskService';
import { RoomStatus } from '../../domain/Room';
import { type Task, type TaskCategory } from '../../domain/Task';
import PageHeader from '../layout/PageHeader';
import StatCard from '../ui/StatCard';

export default function TodayView() {
  const { data, loading } = useToday();
  const { propertyName } = usePropertyContext();
  const { refresh: refreshReservations } = useReservationContext();
  const { refresh: refreshRooms } = useRoomContext();
  const { payments } = usePaymentContext();
  const { tasks, refresh: refreshTasks } = useTaskContext();
  const { t } = useLocale();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('custom');
  const today = new Date();
  const localDate = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const generateAutoTasks = useCallback(async () => {
    if (!data) return;

    const cleaningRoomIds = data.rooms
      .filter(r => r.status === RoomStatus.CLEANING)
      .map(r => ({ id: r.id, name: r.name }));

    const preparationRoomIds = data.arrivals.map(res => {
      const room = data.rooms.find(r => r.id === res.roomId);
      const guest = data.guests.find(g => g.id === res.guestId);
      return { id: res.roomId, name: room?.name ?? '', guestName: guest?.name ?? '' };
    });

    const pendingPayments: { reservationId: string; guestName: string }[] = [];
    const todayReservations = [...data.arrivals, ...data.departures];
    const seen = new Set<string>();
    for (const res of todayReservations) {
      if (seen.has(res.id)) continue;
      seen.add(res.id);
      const totalPaid = payments
        .filter(p => p.reservationId === res.id)
        .reduce((sum, p) => sum + p.amount, 0);
      if (res.price - totalPaid > 0) {
        const guest = data.guests.find(g => g.id === res.guestId);
        pendingPayments.push({ reservationId: res.id, guestName: guest?.name ?? '' });
      }
    }

    await taskService.ensureAutoTasks({ cleaningRoomIds, preparationRoomIds, pendingPayments });
    await refreshTasks();
  }, [data, payments, refreshTasks]);

  useEffect(() => {
    if (data) generateAutoTasks();
  }, [data, generateAutoTasks]);

  const handleToggleTask = async (task: Task) => {
    setLoadingId(task.id);
    try {
      await taskService.toggleTask(task.id);

      if (!task.completed && task.category === 'cleaning' && task.linkedRoomId) {
        await roomService.updateRoomStatus(task.linkedRoomId, 'clean');
        await refreshRooms();
      }

      await refreshTasks();
    } finally {
      setLoadingId(null);
    }
  };

  const handleCheckIn = async (reservationId: string) => {
    setLoadingId(reservationId);
    try {
      await reservationService.checkIn(reservationId);
      await Promise.all([refreshReservations(), refreshRooms()]);
    } finally {
      setLoadingId(null);
    }
  };

  const handleCheckOut = async (reservationId: string) => {
    setLoadingId(reservationId);
    try {
      await reservationService.checkOut(reservationId);
      await Promise.all([refreshReservations(), refreshRooms(), refreshTasks()]);
    } finally {
      setLoadingId(null);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const todayStr = today.toISOString().split('T')[0];
    await taskService.createTask({
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      completed: false,
      date: todayStr,
      auto: false,
    });
    await refreshTasks();
    setNewTaskTitle('');
    setNewTaskCategory('custom');
    setShowAddTask(false);
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
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const categoryIcon = (cat: TaskCategory) => {
    switch (cat) {
      case 'cleaning': return <SprayCan size={16} className="text-ios-green" />;
      case 'preparation': return <Sparkles size={16} className="text-ios-blue" />;
      case 'payment': return <CreditCard size={16} className="text-ios-red" />;
      case 'communication': return <Phone size={16} className="text-ios-purple" />;
      case 'custom': return <MessageSquare size={16} className="text-ios-text-secondary" />;
    }
  };

  return (
    <div className="pb-24">
      <PageHeader title={propertyName} subtitle={localDate} />

      <div className="px-5 space-y-6">
        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-5">
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
            icon={<Home size={24} className="text-ios-red" />}
            value={occupiedRooms.length}
            label={t.occupied}
          />
          <StatCard
            icon={<SprayCan size={24} className="text-ios-green" />}
            value={cleaningRooms.length}
            label={t.cleaning}
          />
          <StatCard
            icon={<CheckCircle2 size={24} className="text-ios-blue" />}
            value={pendingTasks.length}
            label="Tasks"
          />
        </div>

        {/* Quick actions: check-ins & check-outs */}
        {(data.arrivals.length > 0 || data.departures.length > 0) && (
          <div>
            <h3 className="text-xl font-bold mb-4">Arrivals & Departures</h3>
            <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
              <div className="divide-y divide-ios-border/40">
                {data.arrivals.map(res => {
                  const guest = data.guests.find(g => g.id === res.guestId);
                  const room = data.rooms.find(r => r.id === res.roomId);
                  return (
                    <div key={`arr-${res.id}`} className="flex items-center p-4 gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-ios-blue/10 flex items-center justify-center">
                        <LogIn size={18} className="text-ios-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ios-text text-sm truncate">{guest?.name}</div>
                        <div className="text-xs text-ios-text-secondary">{room?.name} — 14:00</div>
                      </div>
                      {res.status === 'Confirmed' && (
                        <button
                          onClick={() => handleCheckIn(res.id)}
                          disabled={loadingId === res.id}
                          className="flex-shrink-0 px-3 py-1.5 bg-ios-blue text-white text-xs font-semibold rounded-full active:scale-95 transition-all disabled:opacity-50"
                        >
                          {t.checkIn}
                        </button>
                      )}
                      {res.status === 'Checked In' && (
                        <span className="text-xs font-semibold text-ios-green">Done</span>
                      )}
                    </div>
                  );
                })}
                {data.departures.map(res => {
                  const guest = data.guests.find(g => g.id === res.guestId);
                  const room = data.rooms.find(r => r.id === res.roomId);
                  return (
                    <div key={`dep-${res.id}`} className="flex items-center p-4 gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-ios-orange/10 flex items-center justify-center">
                        <LogOut size={18} className="text-ios-orange" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ios-text text-sm truncate">{guest?.name}</div>
                        <div className="text-xs text-ios-text-secondary">{room?.name} — 11:00</div>
                      </div>
                      {res.status === 'Checked In' && (
                        <button
                          onClick={() => handleCheckOut(res.id)}
                          disabled={loadingId === res.id}
                          className="flex-shrink-0 px-3 py-1.5 bg-ios-orange text-white text-xs font-semibold rounded-full active:scale-95 transition-all disabled:opacity-50"
                        >
                          {t.checkOut}
                        </button>
                      )}
                      {res.status === 'Checked Out' && (
                        <span className="text-xs font-semibold text-ios-green">Done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Today's Tasks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Today's Tasks</h3>
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-ios-blue text-white text-xs font-semibold rounded-full active:scale-95 transition-all"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {pendingTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="bg-ios-card rounded-3xl p-8 shadow-sm border border-black/[0.04] text-center">
              <CheckCircle2 size={40} className="text-ios-green mx-auto mb-3" />
              <div className="font-semibold text-ios-text text-lg">All clear!</div>
              <div className="text-ios-text-secondary text-sm mt-1">No tasks for today.</div>
            </div>
          ) : (
            <div className="bg-ios-card rounded-3xl overflow-hidden shadow-sm border border-black/[0.04]">
              <div className="divide-y divide-ios-border/40">
                {pendingTasks.map(task => (
                  <div key={task.id} className="flex items-center p-4 gap-3">
                    <button
                      onClick={() => handleToggleTask(task)}
                      disabled={loadingId === task.id}
                      className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-ios-border flex items-center justify-center transition-colors hover:border-ios-blue disabled:opacity-50"
                    >
                    </button>
                    <div className="flex-shrink-0">
                      {categoryIcon(task.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ios-text text-sm truncate">{task.title}</div>
                    </div>
                  </div>
                ))}

                {completedTasks.length > 0 && pendingTasks.length > 0 && (
                  <div className="px-4 py-2 bg-ios-bg/50">
                    <span className="text-xs font-semibold text-ios-text-secondary uppercase">Completed</span>
                  </div>
                )}

                {completedTasks.map(task => (
                  <div key={task.id} className="flex items-center p-4 gap-3 opacity-60">
                    <button
                      onClick={() => handleToggleTask(task)}
                      disabled={loadingId === task.id}
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-ios-green border-2 border-ios-green flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} className="text-white" />
                    </button>
                    <div className="flex-shrink-0">
                      {categoryIcon(task.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ios-text text-sm truncate line-through">{task.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddTask(false)} />
          <div className="relative bg-ios-card rounded-3xl shadow-xl w-full max-w-sm overflow-hidden border border-black/[0.04]">
            <div className="flex items-center justify-between p-5 border-b border-ios-border/40">
              <h3 className="text-lg font-bold text-ios-text">New Task</h3>
              <button
                onClick={() => setShowAddTask(false)}
                className="p-1 text-ios-text-secondary hover:text-ios-text transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ios-text mb-1">What needs doing?</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                  className="w-full px-4 py-2.5 bg-ios-bg border border-ios-border/40 rounded-xl text-ios-text focus:outline-none focus:ring-2 focus:ring-ios-blue"
                  placeholder="e.g. Call Maria about arrival time"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ios-text mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'cleaning', label: 'Cleaning', icon: <SprayCan size={14} /> },
                    { key: 'preparation', label: 'Preparation', icon: <Sparkles size={14} /> },
                    { key: 'payment', label: 'Payment', icon: <CreditCard size={14} /> },
                    { key: 'communication', label: 'Communication', icon: <Phone size={14} /> },
                    { key: 'custom', label: 'Other', icon: <MessageSquare size={14} /> },
                  ] as { key: TaskCategory; label: string; icon: React.ReactNode }[]).map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setNewTaskCategory(cat.key)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                        newTaskCategory === cat.key
                          ? 'bg-ios-blue text-white'
                          : 'bg-ios-bg text-ios-text-secondary border border-ios-border/40'
                      }`}
                    >
                      {cat.icon}
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="w-full py-3 bg-ios-blue text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
