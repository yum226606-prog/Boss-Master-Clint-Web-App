import { useState, useEffect, useCallback } from 'react';

export type PWAInstallOutcome =
  | 'installed'
  | 'dismissed'
  | 'ios-share'
  | 'ios-manual'
  | 'manual';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (standalone) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    const beforeInstallHandler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const appInstalledHandler = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const install = useCallback(async (): Promise<PWAInstallOutcome> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (outcome === 'accepted') {
          setIsInstallable(false);
          setIsInstalled(true);
          return 'installed';
        }
        return 'dismissed';
      } catch {
        setDeferredPrompt(null);
      }
    }

    if (isIOS) {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: 'Boss Aluminium & Glass',
            text: 'Tap "Add to Home Screen" to install Boss Aluminium & Glass App',
            url: window.location.href,
          });
          return 'ios-share';
        } catch {
          return 'ios-manual';
        }
      }
      return 'ios-manual';
    }

    return 'manual';
  }, [deferredPrompt, isIOS]);

  return { isInstalled, isInstallable, isIOS, install };
}
