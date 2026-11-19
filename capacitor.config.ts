const config = {
  appId: 'com.bossaluminium.app',
  appName: 'BOSS Aluminium',
  webDir: 'dist',
  server: {
    url: 'https://boss-master-clint-web-app.vercel.app/',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0C0F14',
      showSpinner: false,
    },
  },
};

export default config;
