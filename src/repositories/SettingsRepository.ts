import { api, configureProperty, seedDemoData, resetData, type PropertySettings} from '../api/client';
import type { RoomData } from '../domain/Room';

export class SettingsRepository {
  async getProperty(): Promise<PropertySettings> {
    return api.settings.getProperty();
  }

  async saveProperty(changes: Partial<PropertySettings>): Promise<PropertySettings> {
    return api.settings.saveProperty(changes);
  }

  /** Save validated rooms and the configured settings atomically. */
  async configure(name: string, rooms: RoomData[], currency: string): Promise<void> {
    return configureProperty(name, rooms, currency);
  }

  async seedDemoData(): Promise<void> {
    return seedDemoData();
  }

  /** Delete all data and return the settings to the unconfigured state. */
  async resetAll(): Promise<void> {
    return resetData();
  }
}

export const settingsRepository = new SettingsRepository();
