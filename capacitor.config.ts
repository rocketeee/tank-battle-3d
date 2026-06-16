import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rocketeee.tankbattle3d',
  appName: '萌坦大战',
  webDir: 'dist',
  android: {
    // game is fully offline / bundled — no cleartext network needed
    allowMixedContent: false,
  },
};

export default config;
