import { useCallback, useEffect, useState } from 'react';
import { promptPwaInstall, pwaInstallOfferActive, subscribePwaInstall } from '../pwaInstall';

export function usePwaInstall() {
  const [offered, setOffered] = useState(() => pwaInstallOfferActive());

  useEffect(() => {
    return subscribePwaInstall(() => {
      setOffered(pwaInstallOfferActive());
    });
  }, []);

  const install = useCallback(async () => {
    try {
      await promptPwaInstall();
    }
    catch (err) {
      console.warn('pwa install prompt failed', err);
    }
  }, []);

  return { offered, install };
}
