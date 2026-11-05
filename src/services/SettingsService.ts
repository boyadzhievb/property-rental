import { settingsRepository } from '../repositories/SettingsRepository';
import { detectCurrency, isSupportedCurrency, type CurrencyCode } from '../domain/currency';
import { DomainError } from '../domain/errors';
import { RoomStatus } from '../domain/Room';
import { RoomSchema, type RoomData } from '../schemas/RoomSchema';

/** Name used when the owner leaves the property name empty, and after a reset. */
export const DEFAULT_PROPERTY_NAME = 'My Property';
const DEFAULT_ROOM_PRICE = 100;
const DEFAULT_ROOM_CAPACITY = 2;

export interface PropertySettingsView {
  name: string;
  isConfigured: boolean;
  currency: CurrencyCode;
}

function deviceLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

export class SettingsService {
  /** Best guess for the owner's currency, from the device's languages and region. */
  detectCurrency(): CurrencyCode {
    return detectCurrency(deviceLanguages());
  }

  /**
   * Load property settings. A configured property without a (valid) currency, i.e. data from
   * before currencies existed, gets one inferred from the device and saved, so it stays fixed
   * even if the device language changes later. Before setup nothing is saved: setup asks.
   */
  async getPropertySettings(): Promise<PropertySettingsView> {
    const stored = await settingsRepository.getProperty();
    let currency: CurrencyCode;
    if (isSupportedCurrency(stored.currency)) {
      currency = stored.currency;
    } else {
      currency = this.detectCurrency();
      if (stored.isConfigured) await settingsRepository.saveProperty({ currency });
    }
    return { name: stored.name, isConfigured: stored.isConfigured, currency };
  }

  async saveName(name: string): Promise<void> {
    await settingsRepository.saveProperty({ name });
  }

  /** Change the display currency. Existing amounts are not converted. */
  async saveCurrency(currency: string): Promise<void> {
    if (!isSupportedCurrency(currency)) throw new DomainError('unsupportedCurrency', { currency });
    await settingsRepository.saveProperty({ currency });
  }

  /**
   * First-run setup: create `roomCount` rooms with default price and capacity, and save the name
   * and currency. Returns the name actually saved (a default when left empty).
   */
  async configureProperty(name: string, roomCount: number, currency: string): Promise<string> {
    if (!isSupportedCurrency(currency)) throw new DomainError('unsupportedCurrency', { currency });
    if (!Number.isInteger(roomCount) || roomCount < 1) throw new RangeError(`Invalid room count: ${roomCount}`);
    const propertyName = name.trim() || DEFAULT_PROPERTY_NAME;
    const rooms: RoomData[] = Array.from({ length: roomCount }, (_, index) => RoomSchema.parse({
      id: `room-${index + 1}`,
      name: `Room ${index + 1}`,
      status: RoomStatus.AVAILABLE,
      pricePerNight: DEFAULT_ROOM_PRICE,
      maxGuests: DEFAULT_ROOM_CAPACITY,
    }));
    await settingsRepository.configure(propertyName, rooms, currency);
    return propertyName;
  }

  /** Replace everything with the demo property (rooms, guests, reservations, payments). */
  async seedDemoData(): Promise<void> {
    await settingsRepository.seedDemoData();
  }

  /** Delete all data and return to first-run setup. Callers should export a backup first. */
  async resetAllData(): Promise<void> {
    await settingsRepository.resetAll();
  }
}

export const settingsService = new SettingsService();
