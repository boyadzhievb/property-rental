import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // iOS bundle ID. Android's differs (com.boyadboz.propertyrental, set in android/app/build.gradle);
  // both apps are published, so neither may change. See README → Mobile.
  appId: 'com.boyadboz.property-rental',
  appName: 'Property Rental',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#3B82F6',
    }
  }
};

export default config;
