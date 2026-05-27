import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arunmarella.workoutlogger',
  appName: 'Rep Journal',
  webDir: 'out',
  server: {
    iosScheme: 'capacitor'
  },
  loggingBehavior: 'none'
};

export default config;
