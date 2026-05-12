import { useEffect, useState } from 'react';
import type { VirtualDevice } from '@bt-led/led-engine';
import type { RGB } from '@bt-led/led-types';

// 33ms ≈ 30fps; matches LED_UPDATE_INTERVAL_MS in bt-led-controller.ino.
const FRAME_INTERVAL_MS = 33;

export function usePatternLoop(device: VirtualDevice): { pixels: ReadonlyArray<RGB> } {
  const [pixels, setPixels] = useState<ReadonlyArray<RGB>>(() => device.tick(0));

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= FRAME_INTERVAL_MS) {
        setPixels(device.tick(now));
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [device]);

  return { pixels };
}
