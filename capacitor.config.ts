import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rocketeee.tankbattle3d',
  appName: '萌坦大战',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
