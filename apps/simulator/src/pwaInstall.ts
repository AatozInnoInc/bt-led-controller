/**
 * Captures Chromium's beforeinstallprompt deferred event for a custom install control.
 * Mirrors the flow described in Roadmap v1.5 (TopBar affordance, listeners at bootstrap).
 */

/**
 * Chromium install prompt (not wired in older TypeScript `lib.dom` builds).
 */
type BeforeInstallPromptEventLike = Event & {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEventLike | null = null;

const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const fn of listeners)
    fn();
}

export function subscribePwaInstall(listener: () => void): () => void {
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}

export function pwaInstallOfferActive(): boolean {
  return deferred !== null;
}

/**
 * Registers global listeners. Safe to call once at app bootstrap (`main.tsx`).
 */
export function initPwaInstallListeners(): void {
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEventLike;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    notifyListeners();
  });
}

/**
 * Shows the browser install sheet. Resolves when the prompt is consumed or is unavailable.
 */
export async function promptPwaInstall(): Promise<void> {
  if (!deferred)
    return;

  const evt = deferred;

  try {
    await evt.prompt();
    await evt.userChoice;
  }
  finally {
    deferred = null;
    notifyListeners();
  }
}
