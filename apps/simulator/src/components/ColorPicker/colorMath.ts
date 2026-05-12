import type { RGB } from '@bt-led/led-types';

// Float-precision HSV→RGB used only by the canvas picker; the engine has its
// own 0..255 integer port that mirrors the firmware.
export function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0,
    gp = 0,
    bp = 0;
  if (h < 60) { rp = c; gp = x; }
  else if (h < 120) { rp = x; gp = c; }
  else if (h < 180) { gp = c; bp = x; }
  else if (h < 240) { gp = x; bp = c; }
  else if (h < 300) { rp = x; bp = c; }
  else { rp = c; bp = x; }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rp = r / 255;
  const gp = g / 255;
  const bp = b / 255;
  const max = Math.max(rp, gp, bp);
  const min = Math.min(rp, gp, bp);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rp) h = 60 * (((gp - bp) / d) % 6);
    else if (max === gp) h = 60 * ((bp - rp) / d + 2);
    else h = 60 * ((rp - gp) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

// Polar coords → (hue°, saturation 0..1). Canvas centre is the origin.
export function pointToHueSat(x: number, y: number, radius: number): { h: number; s: number } {
  const dx = x;
  const dy = y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const s = Math.min(1, dist / radius);
  let h = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { h, s };
}
