import { describe, expect, it } from 'vitest';
import { hexToRgb, hsvToRgb, pointToHueSat, rgbToHex, rgbToHsv } from './colorMath';

describe('colorMath', () => {
  it('rgbToHex pads channels and uppercases', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#FFFFFF');
    expect(rgbToHex({ r: 1, g: 16, b: 200 })).toBe('#0110C8');
  });

  it('hexToRgb round-trips with rgbToHex', () => {
    const colors = [
      { r: 0, g: 0, b: 0 },
      { r: 12, g: 200, b: 240 },
      { r: 255, g: 128, b: 64 },
    ];
    for (const c of colors)
      expect(hexToRgb(rgbToHex(c))).toEqual(c);
  });

  it('hexToRgb rejects invalid input', () => {
    expect(hexToRgb('zzz')).toBeNull();
    expect(hexToRgb('#12345')).toBeNull();
    expect(hexToRgb('')).toBeNull();
  });

  it('hsvToRgb matches the canonical RGB anchors', () => {
    expect(hsvToRgb(0, 1, 1)).toEqual({ r: 255, g: 0, b: 0 });
    expect(hsvToRgb(120, 1, 1)).toEqual({ r: 0, g: 255, b: 0 });
    expect(hsvToRgb(240, 1, 1)).toEqual({ r: 0, g: 0, b: 255 });
    expect(hsvToRgb(0, 0, 1)).toEqual({ r: 255, g: 255, b: 255 });
    expect(hsvToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('rgbToHsv recovers hue/sat anchors', () => {
    expect(rgbToHsv(255, 0, 0).h).toBeCloseTo(0, 1);
    expect(rgbToHsv(0, 255, 0).h).toBeCloseTo(120, 1);
    expect(rgbToHsv(0, 0, 255).h).toBeCloseTo(240, 1);
    expect(rgbToHsv(128, 128, 128).s).toBe(0);
  });

  it('pointToHueSat clamps saturation at the wheel rim', () => {
    const radius = 32;
    expect(pointToHueSat(0, 0, radius).s).toBe(0);
    const edge = pointToHueSat(radius, 0, radius);
    expect(edge.h).toBeCloseTo(0, 5);
    expect(edge.s).toBeCloseTo(1, 5);
    // outside the wheel still clamps to s=1
    expect(pointToHueSat(radius * 3, 0, radius).s).toBe(1);
  });
});
