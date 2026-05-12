import { useEffect, useMemo, useState } from 'react';
import { VirtualDevice } from '@bt-led/led-engine';
import type { RGB } from '@bt-led/led-types';
import { BleCommandService } from './engine/BleCommandService';

// Placeholder shell. Phase 2 will replace this with the full UI from
// Handoff.md "UI design specification".
export function App() {
  const device = useMemo(() => new VirtualDevice({ ledCount: 16 }), []);
  const ble = useMemo(() => new BleCommandService(device), [device]);
  const [pixels, setPixels] = useState<ReadonlyArray<RGB>>(() => device.tick(0));

  useEffect(() => {
    let raf = 0;
    let last = 0;
    void (async () => {
      await ble.verifyOwnership('simulator-user');
      const state = await ble.enterConfigMode();
      await ble.updatePattern('rainbow');
      void state;
    })();
    const loop = (now: number) => {
      if (now - last >= 33) {
        setPixels(device.tick(now));
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [device, ble]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-sm tracking-widest uppercase text-white/30">LED Simulator</h1>
      <p className="text-xs text-white/40">Phase 1 engine wired up — full UI ships in Phase 2.</p>
      <div className="flex gap-[5px] p-6 rounded-xl" style={{ background: '#060608' }}>
        {pixels.map((p, i) => (
          <span
            key={i}
            className="block w-[14px] h-[14px] rounded-full"
            style={{ background: `rgb(${p.r}, ${p.g}, ${p.b})` }}
          />
        ))}
      </div>
    </main>
  );
}
