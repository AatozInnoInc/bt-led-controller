import type { PatternFn, RGB } from '@bt-led/led-types';
import { qsub8 } from '../math';

// NightDriverStrip-style heat decay. Speed (0..100, normalised to 0..1) tunes
// cooling, ignition probability, ignition power, and the per-frame throttle —
// see Handoff.md "Fire effect — speed behaviour" for the exact formulas.
//
// Heat → RGB uses the classic "fire palette": warm rise from black → red → yellow → white.
function heatColor(heat: number): RGB {
  const t192 = Math.floor((heat * 191) / 255);
  const heatramp = (t192 & 0x3f) << 2;
  if (t192 > 0x80) return { r: 255, g: 255, b: heatramp };
  if (t192 > 0x40) return { r: 255, g: heatramp, b: 0 };
  return { r: heatramp, g: 0, b: 0 };
}

export function createFire(ledCount: number): PatternFn {
  const heat = new Uint8Array(ledCount);
  let lastUpdate = 0;

  return (pixels, cfg, now) => {
    const speed = Math.max(0, Math.min(100, cfg.speed)) / 100;
    const cooling = 2 + (1 - speed) * 22;
    const igniteProb = 0.35 + speed * 0.55;
    const ignitePower = 80 + speed * 130;
    const frameMs = Math.round(80 - speed * 55);

    if (now - lastUpdate < frameMs && lastUpdate !== 0) {
      for (let i = 0; i < ledCount; i++) {
        const c = heatColor(heat[i]);
        pixels[i].r = c.r;
        pixels[i].g = c.g;
        pixels[i].b = c.b;
      }
      return;
    }
    lastUpdate = now;

    for (let i = 0; i < ledCount; i++) {
      heat[i] = qsub8(heat[i], Math.floor(Math.random() * cooling));
    }
    for (let i = ledCount - 1; i >= 2; i--) {
      heat[i] = Math.floor((heat[i - 1] + heat[i - 2] + heat[i - 2]) / 3);
    }
    if (Math.random() < igniteProb) {
      const idx = Math.floor(Math.random() * Math.min(7, ledCount));
      const boost = Math.floor(160 + Math.random() * ignitePower);
      heat[idx] = Math.min(255, heat[idx] + boost);
    }
    for (let i = 0; i < ledCount; i++) {
      const c = heatColor(heat[i]);
      pixels[i].r = c.r;
      pixels[i].g = c.g;
      pixels[i].b = c.b;
    }
  };
}
