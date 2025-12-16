import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flowbin.app',
  appName: 'FlowBin',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
