import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Replace this temporary ID only after the final product name and domains are approved.
  appId: 'com.fairshare.app',
  appName: 'Fairshare',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
