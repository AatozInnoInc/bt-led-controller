/**
 * Parameter Validation Tests
 * Tests LED parameter validation and power consumption calculations.
 *
 * Revived in H2 against the current API. The old file called
 * calculateCurrentDraw(config) (removed) and used {h, s, v} colours and a
 * 0-255 brightness. The current API is calculateLEDCurrent /
 * calculateTotalCurrent / validateColorAndPower with [r, g, b] tuples and a
 * 0-100 brightness. Every original invariant is kept, translated to that
 * API; the property sweeps at the bottom are new.
 */

import {
  validateColorAndPower,
  validatePowerConsumption,
  calculateLEDCurrent,
  calculateTotalCurrent,
  calculateMaxSafeBrightness,
} from '../utils/parameterValidation';
import { RGBColor } from '../utils/bleConstants';
import { logger } from '../utils/logger';
import {
  MAX_LED_COUNT,
  MA_PER_CHANNEL_AT_FULL,
  MAX_FRAME_CURRENT_MA,
} from '../../packages/ble-protocol/src/powerSafety';

// Plain no-op functions (not jest.fn) so the multi-million-call sweeps below
// do not record every call. Tests that check logging use jest.spyOn.
jest.mock('../utils/logger', () => ({
  logger: {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  },
}));

// RGB equivalents of the old HSV fixtures (MOCK_COLORS in testFixtures.ts).
const RGB = {
  red: [255, 0, 0] as RGBColor,
  green: [0, 255, 0] as RGBColor,
  blue: [0, 0, 255] as RGBColor,
  white: [255, 255, 255] as RGBColor,
  black: [0, 0, 0] as RGBColor,
};

// Brightness is 0-100 in the current API. The old fixtures used 0-255.
const SAFE_POWER = { color: RGB.blue, brightness: 50 }; // 300 mA at 30 LEDs: safe, below the 320 mA warning band
const HIGH_POWER = { color: RGB.white, brightness: 100 }; // 1800 mA at 30 LEDs
const WARNING_THRESHOLD_MA = MAX_FRAME_CURRENT_MA * 0.8;

describe('Parameter Validation', () => {
  describe('shared power safety constants', () => {
    it('uses the shared constants: 30 LEDs, 20 mA per channel, 400 mA limit', () => {
      expect(MAX_LED_COUNT).toBe(30);
      expect(MA_PER_CHANNEL_AT_FULL).toBe(20);
      expect(MAX_FRAME_CURRENT_MA).toBe(400);
    });

    it('defaults every calculation to the worst case of MAX_LED_COUNT LEDs', () => {
      expect(calculateTotalCurrent(RGB.white, 100)).toBeCloseTo(calculateTotalCurrent(RGB.white, 100, MAX_LED_COUNT), 9);
      expect(calculateTotalCurrent(RGB.white, 100)).toBeCloseTo(1800, 9);
    });
  });

  describe('calculateLEDCurrent / calculateTotalCurrent', () => {
    it('should not draw or block when powered off', () => {
      const result = validateColorAndPower(HIGH_POWER.color, HIGH_POWER.brightness, false);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should calculate current for white at full brightness', () => {
      // White at full brightness = 60 mA per LED.
      expect(calculateLEDCurrent(RGB.white, 100)).toBeCloseTo(3 * MA_PER_CHANNEL_AT_FULL, 9);
      // The original expectation: 60 mA * 14 LEDs = 840 mA.
      const current14 = calculateTotalCurrent(RGB.white, 100, 14);
      expect(current14).toBeGreaterThan(800);
      expect(current14).toBeLessThanOrEqual(840);
    });

    it('should calculate current for half brightness', () => {
      // Half brightness should be roughly half the current (840 / 2 = 420 at 14 LEDs).
      const current = calculateTotalCurrent(RGB.white, 50, 14);
      expect(current).toBeGreaterThan(400);
      expect(current).toBeLessThan(450);
    });

    it('should calculate less current for colored LEDs than white', () => {
      const whiteCurrent = calculateTotalCurrent(RGB.white, 100);
      const redCurrent = calculateTotalCurrent(RGB.red, 100);
      // Red should use less current than white (only red channel active)
      expect(redCurrent).toBeLessThan(whiteCurrent);
    });

    it('should scale with brightness linearly', () => {
      const brightness40 = calculateTotalCurrent(RGB.white, 40);
      const brightness80 = calculateTotalCurrent(RGB.white, 80);
      // Double brightness should roughly double current
      expect(brightness80).toBeGreaterThan(brightness40 * 1.8);
      expect(brightness80).toBeLessThan(brightness40 * 2.2);
    });

    it('should return 0 for black color (all off)', () => {
      expect(calculateTotalCurrent(RGB.black, 100)).toBe(0);
    });
  });

  describe('validateColorAndPower', () => {
    it('should validate safe power configuration', () => {
      const result = validateColorAndPower(SAFE_POWER.color, SAFE_POWER.brightness, true);
      const current = calculateTotalCurrent(SAFE_POWER.color, SAFE_POWER.brightness);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(current).toBeLessThan(MAX_FRAME_CURRENT_MA);
    });

    it('should warn at the 320mA threshold', () => {
      // White at 30 LEDs is 18 mA per brightness step: 18 * 18 = 324 mA.
      const brightness = 18;
      const current = calculateTotalCurrent(RGB.white, brightness);
      expect(current).toBeGreaterThan(WARNING_THRESHOLD_MA);
      expect(current).toBeLessThanOrEqual(MAX_FRAME_CURRENT_MA);

      const result = validateColorAndPower(RGB.white, brightness, true);
      // Warning severity: still valid, but an error message is set.
      expect(result.isValid).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/High power consumption/);
    });

    it('should block unsafe power configuration (> 400mA)', () => {
      const result = validateColorAndPower(HIGH_POWER.color, HIGH_POWER.brightness, true);

      // Error severity: invalid, so the app does not send it.
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(calculateTotalCurrent(HIGH_POWER.color, HIGH_POWER.brightness)).toBeGreaterThan(MAX_FRAME_CURRENT_MA);
    });

    it('should log a warning when it blocks a configuration', () => {
      const warnSpy = jest.spyOn(logger, 'warn');
      try {
        validateColorAndPower(HIGH_POWER.color, HIGH_POWER.brightness, true);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toBe('PowerValidation');
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('should allow powered-off config regardless of other settings', () => {
      const result = validateColorAndPower(HIGH_POWER.color, HIGH_POWER.brightness, false);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should include current draw in the result message', () => {
      // The result reports the computed draw and the limit in its message.
      const blocked = validateColorAndPower(HIGH_POWER.color, HIGH_POWER.brightness, true);
      expect(blocked.error).toContain('1800mA');
      expect(blocked.error).toContain(`limit: ${MAX_FRAME_CURRENT_MA}mA`);
      expect(calculateTotalCurrent(SAFE_POWER.color, SAFE_POWER.brightness)).toBeGreaterThan(0);
    });

    it('should handle edge case: exactly 400mA', () => {
      // Pure red is 20 mA per LED at full brightness: 20 LEDs = exactly 400 mA.
      const ledCount = 20;
      const atLimit = calculateTotalCurrent(RGB.red, 100, ledCount);
      expect(atLimit).toBeCloseTo(MAX_FRAME_CURRENT_MA, 9);
      expect(atLimit).toBeLessThanOrEqual(MAX_FRAME_CURRENT_MA);
      // At the limit is allowed (the limit is inclusive), with the high-power warning.
      const atLimitResult = validateColorAndPower(RGB.red, 100, true, ledCount);
      expect(atLimitResult.isValid).toBe(true);
      expect(atLimitResult.error).toMatch(/High power consumption/);

      // One more LED is over the limit and must be blocked.
      expect(validateColorAndPower(RGB.red, 100, true, ledCount + 1).isValid).toBe(false);
    });

    it('should handle different colors at same brightness', () => {
      const colors = [RGB.red, RGB.green, RGB.blue, RGB.white];
      const currents = colors.map(color => calculateTotalCurrent(color, 80));

      // White should draw the most current
      const whiteCurrent = currents[3];
      currents.slice(0, 3).forEach(current => {
        expect(current).toBeLessThan(whiteCurrent);
      });
    });

    it('should provide appropriate error messages', () => {
      const result = validateColorAndPower(HIGH_POWER.color, HIGH_POWER.brightness, true);

      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/power/i);
      expect((result.error || '').length).toBeGreaterThan(10);
    });

    it('should suggest a brightness that is actually safe', () => {
      const result = validateColorAndPower(HIGH_POWER.color, HIGH_POWER.brightness, true);
      const suggested = calculateMaxSafeBrightness(HIGH_POWER.color);

      expect(result.error).toContain(`Reduce brightness to ${suggested}%`);
      expect(calculateTotalCurrent(HIGH_POWER.color, suggested)).toBeLessThanOrEqual(MAX_FRAME_CURRENT_MA);
      expect(calculateTotalCurrent(HIGH_POWER.color, suggested + 1)).toBeGreaterThan(MAX_FRAME_CURRENT_MA);
    });

    it('should handle minimum brightness', () => {
      const brightness = 1;
      const result = validateColorAndPower(SAFE_POWER.color, brightness, true);
      const current = calculateTotalCurrent(SAFE_POWER.color, brightness);

      expect(result.isValid).toBe(true);
      expect(current).toBeGreaterThan(0);
      expect(current).toBeLessThan(50);
    });

    it('should handle maximum safe brightness for white', () => {
      // Find the maximum brightness for white that's still safe
      let safeBrightness = 0;

      for (let b = 1; b <= 100; b++) {
        const result = validateColorAndPower(RGB.white, b, true);
        if (result.isValid && !result.error) {
          safeBrightness = b;
        } else {
          break;
        }
      }

      expect(safeBrightness).toBeGreaterThan(0);
      expect(safeBrightness).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle out-of-range color values gracefully', () => {
      const outOfRange: RGBColor = [300, 300, 300];

      // Should not throw, should handle gracefully, and must not pass
      expect(() => {
        validateColorAndPower(outOfRange, 50, true);
      }).not.toThrow();
      expect(validateColorAndPower(outOfRange, 50, true).isValid).toBe(false);
    });

    it('should handle zero brightness', () => {
      const result = validateColorAndPower(RGB.white, 0, true);
      expect(calculateTotalCurrent(RGB.white, 0)).toBe(0);
      expect(result.isValid).toBe(true);
    });

    it('should handle effect type (should not affect power calc)', () => {
      // The power API takes only colour, brightness, power state and LED
      // count, so two configs that differ only in effect type (SOLID vs
      // RAINBOW in the old fixtures) must get identical results.
      const solid = { effectType: 0, color: SAFE_POWER.color, brightness: SAFE_POWER.brightness };
      const rainbow = { effectType: 2, color: SAFE_POWER.color, brightness: SAFE_POWER.brightness };

      expect(calculateTotalCurrent(solid.color, solid.brightness)).toBe(
        calculateTotalCurrent(rainbow.color, rainbow.brightness)
      );
      expect(validateColorAndPower(solid.color, solid.brightness, true)).toEqual(
        validateColorAndPower(rainbow.color, rainbow.brightness, true)
      );
    });
  });

  // Property-style tests: colour x brightness x LED count <= MAX_LED_COUNT.
  // The current model depends on colour only through r + g + b, so sweeping
  // every channel sum 0..765 is exhaustive over colour for that model.
  describe('Power safety properties', () => {
    // A colour whose channels add up to `sum`, filling red then green then blue.
    function colorWithChannelSum(sum: number): RGBColor {
      const r = Math.min(255, sum);
      const g = Math.min(255, sum - r);
      const b = sum - r - g;
      return [r, g, b];
    }

    it('never accepts a configuration over the limit (every channel sum x brightness 0-100 x 0-30 LEDs)', () => {
      const violations: string[] = [];
      let checked = 0;

      for (let sum = 0; sum <= 765; sum++) {
        const color = colorWithChannelSum(sum);
        for (let ledCount = 0; ledCount <= MAX_LED_COUNT; ledCount++) {
          for (let brightness = 0; brightness <= 100; brightness++) {
            const current = calculateTotalCurrent(color, brightness, ledCount);
            const result = validatePowerConsumption({ color, brightness, powerState: true }, ledCount);
            checked++;
            const acceptedOverLimit = result.isValid && current > MAX_FRAME_CURRENT_MA;
            const rejectedWithinLimit = !result.isValid && current <= MAX_FRAME_CURRENT_MA;
            if (acceptedOverLimit || rejectedWithinLimit) {
              violations.push(`sum=${sum} leds=${ledCount} brightness=${brightness} current=${current} valid=${result.isValid}`);
            }
          }
        }
      }

      expect(checked).toBe(766 * 31 * 101);
      expect(violations.slice(0, 10)).toEqual([]);
    });

    it('never accepts a configuration over the limit (colour grid x fractional brightness)', () => {
      const levels = [0, 1, 2, 7, 31, 63, 64, 127, 128, 191, 200, 254, 255];
      const brightnessLevels = [0, 0.5, 1, 9.99, 18, 22.2, 33.33, 50, 66.6, 99.9, 100];
      const violations: string[] = [];

      for (const r of levels) {
        for (const g of levels) {
          for (const b of levels) {
            const color: RGBColor = [r, g, b];
            for (let ledCount = 0; ledCount <= MAX_LED_COUNT; ledCount++) {
              for (const brightness of brightnessLevels) {
                const result = validateColorAndPower(color, brightness, true, ledCount);
                const current = calculateTotalCurrent(color, brightness, ledCount);
                if (result.isValid && current > MAX_FRAME_CURRENT_MA) {
                  violations.push(`color=${color} leds=${ledCount} brightness=${brightness} current=${current}`);
                }
              }
            }
          }
        }
      }

      expect(violations.slice(0, 10)).toEqual([]);
    });

    it('suggested max safe brightness is always safe and as high as possible', () => {
      const violations: string[] = [];

      for (let sum = 0; sum <= 765; sum++) {
        const color = colorWithChannelSum(sum);
        for (let ledCount = 0; ledCount <= MAX_LED_COUNT; ledCount++) {
          const maxSafe = calculateMaxSafeBrightness(color, ledCount);
          const currentAtMax = calculateTotalCurrent(color, maxSafe, ledCount);
          const isInRange = maxSafe >= 0 && maxSafe <= 100 && Number.isInteger(maxSafe);
          const isSafe = currentAtMax <= MAX_FRAME_CURRENT_MA;
          const isTight = maxSafe === 100 || calculateTotalCurrent(color, maxSafe + 1, ledCount) > MAX_FRAME_CURRENT_MA;
          if (!(isInRange && isSafe && isTight)) {
            violations.push(`sum=${sum} leds=${ledCount} maxSafe=${maxSafe} current=${currentAtMax}`);
          }
        }
      }

      expect(violations.slice(0, 10)).toEqual([]);
    });
  });
});
