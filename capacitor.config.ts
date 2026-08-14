import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boyadboz.propertyrental',
  appName: 'Property Rental',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
