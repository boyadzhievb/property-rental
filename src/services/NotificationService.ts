import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { format } from 'date-fns';

const STORAGE_KEY = 'notifications-enabled';

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

    const today = format(new Date(), 'yyyy-MM-dd');
    const scheduledKey = `notifications-scheduled-${today}`;
    if (localStorage.getItem(scheduledKey)) return;

    const notifications: LocalNotificationSchema[] = [];
    let notificationId = this.deterministicBaseId(today);

    const now = new Date();

    for (const arrival of params.arrivals) {
      const arrivalTime = new Date(now);
      arrivalTime.setHours(8, 0, 0, 0);
      if (arrivalTime <= now) arrivalTime.setMinutes(now.getMinutes() + 1);

      notifications.push({
        id: notificationId++,
        title: params.translations.notificationArrivalTitle,
        body: params.translations.notificationArrivalBody
          .replace('{guest}', arrival.guestName)
          .replace('{room}', arrival.roomName),
        schedule: { at: arrivalTime },
      });
    }

    for (const departure of params.departures) {
      const departureTime = new Date(now);
      departureTime.setHours(9, 0, 0, 0);
      if (departureTime <= now) departureTime.setMinutes(now.getMinutes() + 1);

      notifications.push({
        id: notificationId++,
        title: params.translations.notificationDepartureTitle,
        body: params.translations.notificationDepartureBody
          .replace('{guest}', departure.guestName)
          .replace('{room}', departure.roomName),
        schedule: { at: departureTime },
      });
    }

    for (const room of params.cleaningRooms) {
      const cleaningTime = new Date(now);
      cleaningTime.setHours(8, 30, 0, 0);
      if (cleaningTime <= now) cleaningTime.setMinutes(now.getMinutes() + 1);

      notifications.push({
        id: notificationId++,
        title: params.translations.notificationCleaningTitle,
        body: params.translations.notificationCleaningBody
          .replace('{room}', room.roomName),
        schedule: { at: cleaningTime },
      });
    }

    for (const payment of params.pendingPayments) {
      const paymentTime = new Date(now);
      paymentTime.setHours(10, 0, 0, 0);
      if (paymentTime <= now) paymentTime.setMinutes(now.getMinutes() + 1);

      notifications.push({
        id: notificationId++,
        title: params.translations.notificationPaymentTitle,
        body: params.translations.notificationPaymentBody
          .replace('{guest}', payment.guestName),
        schedule: { at: paymentTime },
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }

    localStorage.setItem(scheduledKey, 'true');
  }

  private deterministicBaseId(dateString: string): number {
    let hash = 0;
    for (let index = 0; index < dateString.length; index++) {
      hash = (hash * 31 + dateString.charCodeAt(index)) & 0x7fffffff;
    }
    return (hash % 100000) * 100;
  }
}

export const notificationService = new NotificationService();
