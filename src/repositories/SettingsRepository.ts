import { api, type PropertySettings } from '../api/client';

export class SettingsRepository {
  async getProperty(): Promise<PropertySettings> {
    return api.settings.getProperty();
  }

  async saveProperty(changes: Partial<PropertySettings>): Promise<PropertySettings> {
    return api.settings.saveProperty(changes);
  }
}

export const settingsRepository = new SettingsRepository();
