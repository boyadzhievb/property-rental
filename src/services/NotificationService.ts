import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { format } from 'date-fns';

const STORAGE_KEY = 'notifications-enabled';
const SCHEDULED_KEY_PREFIX = 'notifications-scheduled-';
/** Each day gets its own block of notification IDs, derived from the date. */
const IDS_PER_DAY = 100;

interface ReminderSlot {
  hour: number;
  minute: number;
  title: string;
  body: string;
}

/** Reminder key → notification ID, for the reminders scheduled today. */
type ScheduledReminders = Record<string, number>;

function reminderKey(reminder: ReminderSlot): string {
  return `${reminder.title}\n${reminder.body}`;
}

function parseScheduledReminders(raw: string | null): ScheduledReminders {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
    );
  } catch {
    return {};
  }
}

/** Today at the reminder's slot, or one minute from now when the slot has already passed. */
function reminderTime(reminder: ReminderSlot, now: Date): Date {
  const slot = new Date(now);
  slot.setHours(reminder.hour, reminder.minute, 0, 0);
  return slot > now ? slot : new Date(now.getTime() + 60_000);
}

export class NotificationService {
  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  async isEnabled(): Promise<boolean> {
    if (!this.isNativePlatform()) return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  async setEnabled(enabled: boolean): Promise<boolean> {
    if (!this.isNativePlatform()) return false;

    if (enabled) {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return false;
    }

    localStorage.setItem(STORAGE_KEY, String(enabled));

    if (!enabled) {
      await LocalNotifications.removeAllDeliveredNotifications();
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      const today = format(new Date(), 'yyyy-MM-dd');
      localStorage.removeItem(`${SCHEDULED_KEY_PREFIX}${today}`);
    }

    return enabled;
  }

  async scheduleDailyNotifications(params: {
    arrivals: { guestName: string; roomName: string }[];
    departures: { guestName: string; roomName: string }[];
    cleaningRooms: { roomName: string }[];
    pendingPayments: { guestName: string }[];
    translations: {
      notificationArrivalTitle: string;
      notificationArrivalBody: string;
      notificationDepartureTitle: string;
      notificationDepartureBody: string;
      notificationCleaningTitle: string;
      notificationCleaningBody: string;
      notificationPaymentTitle: string;
      notificationPaymentBody: string;
    };
  }): Promise<void> {
    const enabled = await this.isEnabled();
    if (!enabled) return;

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const scheduledKey = `${SCHEDULED_KEY_PREFIX}${today}`;
    this.removeOldScheduleRecords(scheduledKey);

    const { translations } = params;
    const wanted: ReminderSlot[] = [
      ...params.arrivals.map(arrival => ({
        hour: 8, minute: 0,
        title: translations.notificationArrivalTitle,
        body: translations.notificationArrivalBody.replace('{guest}', arrival.guestName).replace('{room}', arrival.roomName),
      })),
      ...params.departures.map(departure => ({
        hour: 9, minute: 0,
        title: translations.notificationDepartureTitle,
        body: translations.notificationDepartureBody.replace('{guest}', departure.guestName).replace('{room}', departure.roomName),
      })),
      ...params.cleaningRooms.map(room => ({
        hour: 8, minute: 30,
        title: translations.notificationCleaningTitle,
        body: translations.notificationCleaningBody.replace('{room}', room.roomName),
      })),
      ...params.pendingPayments.map(payment => ({
        hour: 10, minute: 0,
        title: translations.notificationPaymentTitle,
        body: translations.notificationPaymentBody.replace('{guest}', payment.guestName),
      })),
    ];
    const wantedKeys = new Set(wanted.map(reminderKey));

    const baseId = this.deterministicBaseId(today);
    const rawRecord = localStorage.getItem(scheduledKey);
    if (rawRecord === 'true') {
      // Written by an older app version that scheduled everything once for the day. Adopt the
      // current reminders as already scheduled rather than sending duplicates.
      const adopted: ScheduledReminders = {};
      [...wantedKeys].forEach((key, index) => { adopted[key] = baseId + index; });
      localStorage.setItem(scheduledKey, JSON.stringify(adopted));
      return;
    }
    const scheduled = parseScheduledReminders(rawRecord);

    // Reminders whose source data went away today (cancelled booking, cleaned room, paid balance).
    const droppedIds = Object.entries(scheduled)
      .filter(([key]) => !wantedKeys.has(key))
      .map(([, id]) => id);
    // Each distinct reminder is scheduled once per day; ones already scheduled are left alone.
    const added = wanted.filter((reminder, index) => {
      const key = reminderKey(reminder);
      return !(key in scheduled) && wanted.findIndex(other => reminderKey(other) === key) === index;
    });

    if (rawRecord !== null && droppedIds.length === 0 && added.length === 0) return;

    if (droppedIds.length > 0) {
      await LocalNotifications.cancel({ notifications: droppedIds.map(id => ({ id })) });
    }

    const remaining: ScheduledReminders = Object.fromEntries(
      Object.entries(scheduled).filter(([key]) => wantedKeys.has(key)),
    );
    let nextId = Math.max(baseId - 1, ...Object.values(scheduled)) + 1;
    const notifications: LocalNotificationSchema[] = [];
    for (const reminder of added) {
      if (nextId >= baseId + IDS_PER_DAY) break; // ID block for the day is used up.
      const id = nextId++;
      notifications.push({
        id,
        title: reminder.title,
        body: reminder.body,
        schedule: { at: reminderTime(reminder, now) },
      });
      remaining[reminderKey(reminder)] = id;
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }

    localStorage.setItem(scheduledKey, JSON.stringify(remaining));
  }

  /** Drop scheduling records of earlier days so they don't accumulate in localStorage. */
  private removeOldScheduleRecords(currentKey: string): void {
    const staleKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(SCHEDULED_KEY_PREFIX) && key !== currentKey) staleKeys.push(key);
    }
    for (const key of staleKeys) localStorage.removeItem(key);
  }

  private deterministicBaseId(dateString: string): number {
    let hash = 0;
    for (let index = 0; index < dateString.length; index++) {
      hash = (hash * 31 + dateString.charCodeAt(index)) & 0x7fffffff;
    }
    return (hash % 100000) * IDS_PER_DAY;
  }
}

export const notificationService = new NotificationService();
