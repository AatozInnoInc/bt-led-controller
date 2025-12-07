/**
 * Color Conversion Utilities
 * Convert between HSV (FastLED format) and RGB for UI display
 * FastLED uses HSV with 0-255 range for all components
 */

import { HSVColor } from '../types/config';

export interface RGBColor {
  readonly r: number; // 0-255
  readonly g: number; // 0-255
  readonly b: number; // 0-255
}

/**
 * Convert HSV (FastLED format, 0-255) to RGB (0-255)
 */
export function hsvToRgb(hsv: HSVColor): RGBColor {
  const h = (hsv.h / 255) * 360; // Convert to 0-360 degrees
  const s = hsv.s / 255; // Convert to 0-1
  const v = hsv.v / 255; // Convert to 0-1

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Convert RGB (0-255) to HSV (FastLED format, 0-255)
 */
export function rgbToHsv(rgb: RGBColor): HSVColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }
  h = Math.round((h * 60) / 360 * 255); // Convert to 0-255 range

  const s = max === 0 ? 0 : Math.round((delta / max) * 255);
  const v = Math.round(max * 255);

  return { h, s, v };
}

/**
 * Convert HSV to hex color string for UI display
 */
export function hsvToHex(hsv: HSVColor): string {
  const rgb = hsvToRgb(hsv);
  return `#${[rgb.r, rgb.g, rgb.b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

/**
 * Convert hex color string to HSV
 */
export function hexToHsv(hex: string): HSVColor {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return rgbToHsv({ r, g, b });
}

