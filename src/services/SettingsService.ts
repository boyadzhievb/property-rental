import { settingsRepository } from '../repositories/SettingsRepository';
import { detectCurrency, isSupportedCurrency, type CurrencyCode } from '../domain/currency';

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
    if (!isSupportedCurrency(currency)) throw new Error(`Unsupported currency: ${currency}`);
    await settingsRepository.saveProperty({ currency });
  }
}

export const settingsService = new SettingsService();
