// 1:1 port of bt-led-controller.ino's math helpers.
// Behavioral parity with the firmware is the correctness requirement —
// do not "improve" these functions. If the numbers match here they match on hardware.

import type { RGB } from '@bt-led/led-types';

const u8 = (n: number): number => {
  const v = n | 0;
  return v < 0 ? 0 : v > 255 ? 255 : v;
};

// Mirrors Arduino's saturating add.
export function qadd8(a: number, b: number): number {
  const s = (a & 0xff) + (b & 0xff);
  return s > 255 ? 255 : s;
}

// Mirrors Arduino's saturating subtract.
export function qsub8(a: number, b: number): number {
  return a > b ? (a - b) & 0xff : 0;
}

// sin8_approx in the .ino:
//   rad = (x/255) * 2π;  v = (sin(rad)+1) * 127.5  → clamp 0..255
// This means sin8(0) ≈ 127, sin8(64) ≈ 255, sin8(128) ≈ 127, sin8(192) ≈ 0.
export function sin8(x: number): number {
  const rad = ((x & 0xff) / 255) * 2 * Math.PI;
  const s = Math.sin(rad);
  const v = Math.trunc((s + 1) * 127.5);
  return u8(v);
}

// beat8_like(bpm, phase) from the .ino — `now` replaces millis() for testability.
export function beat8(bpm: number, phase: number, now: number): number {
  const pos = Math.floor((now * bpm * 256) / 60000);
  return (pos + phase) & 0xff;
}

// Integer HSV → RGB (0..255 ranges), matching the .ino's hsv2rgb byte-for-byte.
export function hsv2rgb(h: number, s: number, v: number): RGB {
  if (s === 0) return { r: v, g: v, b: v };

  const region = Math.floor(h / 43);
  const remainder = (h - region * 43) * 6;

  const p = Math.floor((v * (255 - s)) / 255);
  const q = Math.floor((v * (255 - (s * remainder) / 255)) / 255);
  const t = Math.floor((v * (255 - (s * (255 - remainder)) / 255)) / 255);

  switch (region) {
    case 0:
      return { r: v, g: t, b: p };
    case 1:
      return { r: q, g: v, b: p };
    case 2:
      return { r: p, g: v, b: t };
    case 3:
      return { r: p, g: q, b: v };
    case 4:
      return { r: t, g: p, b: v };
    default:
      return { r: v, g: p, b: q };
  }
}

// RGB → HSV (0..255 ranges), matching rgb2hsv in the .ino.
export function rgb2hsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const maxVal = Math.max(r, g, b);
  const minVal = Math.min(r, g, b);
  const v = maxVal;
  if (maxVal === 0) return { h: 0, s: 0, v: 0 };

  const delta = maxVal - minVal;
  const s = Math.floor((delta * 255) / maxVal);
  if (delta === 0) return { h: 0, s, v };

  let h: number;
  if (maxVal === r) {
    h = Math.floor((43 * (((g - b) * 255) / delta)) / 255);
    if (h > 42) h = 0;
  } else if (maxVal === g) {
    h = 85 + Math.floor((43 * (((b - r) * 255) / delta)) / 255);
  } else {
    h = 170 + Math.floor((43 * (((r - g) * 255) / delta)) / 255);
  }
  return { h: h & 0xff, s, v };
}

// blend_rgb in the .ino: linear blend with t in 0..255.
export function blendRgb(a: RGB, b: RGB, t: number): RGB {
  const it = 255 - t;
  return {
    r: Math.floor((a.r * it + b.r * t) / 255),
    g: Math.floor((a.g * it + b.g * t) / 255),
    b: Math.floor((a.b * it + b.b * t) / 255),
  };
}

// Arduino map() — handoff uses it inside ported patterns.
export function mapRange(x: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return Math.floor(((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
}

// fadeToBlackBy_buf in the .ino: scale each channel by (255 - amount) / 255.
export function fadeToBlackBy(pixels: RGB[], amount: number): void {
  const scale = 255 - amount;
  for (const p of pixels) {
    p.r = Math.floor((p.r * scale) / 255);
    p.g = Math.floor((p.g * scale) / 255);
    p.b = Math.floor((p.b * scale) / 255);
  }
}

// prettier-ignore
// gamma8 table, copied verbatim from bt-led-controller.ino (16 rows × 16 cols = 256).
export const GAMMA8: readonly number[] = [
    0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
    0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,
    1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,
    2,  3,  3,  3,  3,  3,  3,  3,  4,  4,  4,  4,  4,  5,  5,  5,
    5,  6,  6,  6,  6,  7,  7,  7,  7,  8,  8,  8,  9,  9,  9, 10,
   10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16,
   17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 24, 24, 25,
   25, 26, 27, 27, 28, 29, 29, 30, 31, 32, 32, 33, 34, 35, 35, 36,
   37, 38, 39, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 50,
   51, 52, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 66, 67, 68,
   69, 70, 72, 73, 74, 75, 77, 78, 79, 81, 82, 83, 85, 86, 87, 89,
   90, 92, 93, 95, 96, 98, 99,101,102,104,105,107,109,110,112,114,
  115,117,119,120,122,124,126,127,129,131,133,135,137,138,140,142,
  144,146,148,150,152,154,156,158,160,162,164,167,169,171,173,175,
  177,180,182,184,186,189,191,193,196,198,200,203,205,208,210,213,
  215,218,220,223,225,228,231,233,236,239,241,244,247,249,252,255,
];

export function gamma8(x: number): number {
  return GAMMA8[x & 0xff];
}

export function clamp8(x: number): number {
  return u8(x);
}
