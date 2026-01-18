/**
 * Parameter Validation Tests
 * Tests LED parameter validation and power consumption calculations
 */

import { validateColorAndPower, calculateCurrentDraw } from '../utils/parameterValidation';
import { LEDConfig } from '../types/config';
import { MOCK_CONFIGS, MOCK_COLORS } from './utils/testFixtures';

describe('Parameter Validation', () => {
  describe('calculateCurrentDraw', () => {
    it('should return 0 for powered off config', () => {
      const config: LEDConfig = {
        ...MOCK_CONFIGS.default,
        powerState: false,
      };
      
      const current = calculateCurrentDraw(config);
      expect(current).toBe(0);
    });

    it('should calculate current for white at full brightness', () => {
      const config: LEDConfig = {
        ...MOCK_CONFIGS.default,
        color: MOCK_COLORS.white,
        brightness: 255,
        powerState: true,
      };
      
      const current = calculateCurrentDraw(config);
      // White at full brightness = 60mA * 14 LEDs = 840mA
      expect(current).toBeGreaterThan(800);
      expect(current).toBeLessThanOrEqual(840);
    });

    it('should calculate current for half brightness', () => {
      const config: LEDConfig = {
        ...MOCK_CONFIGS.default,
        color: MOCK_COLORS.white,
        brightness: 128,
        powerState: true,
      };
      
      const current = calculateCurrentDraw(config);
      // Half brightness should be roughly half the current
      expect(current).toBeGreaterThan(400);
      expect(current).toBeLessThan(450);
    });

    it('should calculate less current for colored LEDs than white', () => {
      const whiteConfig: LEDConfig = {
        ...MOCK_CONFIGS.default,
        color: MOCK_COLORS.white,
        brightness: 255,
        powerState: true,
      };
      
      const redConfig: LEDConfig = {
        ...MOCK_CONFIGS.default,
        color: MOCK_COLORS.red,
        brightness: 255,
        powerState: true,
      };
      
      const whiteCurrent = calculateCurrentDraw(whiteConfig);
      const redCurrent = calculateCurrentDraw(redConfig);
      
      // Red should use less current than white (only red channel active)
      expect(redCurrent).toBeLessThan(whiteCurrent);
    });

    it('should scale with brightness linearly', () => {
      const brightness100 = calculateCurrentDraw({
        ...MOCK_CONFIGS.default,
        color: MOCK_COLORS.white,
        brightness: 100,
        powerState: true,
      });
      
      const brightness200 = calculateCurrentDraw({
        ...MOCK_CONFIGS.default,
        color: MOCK_COLORS.white,
        brightness: 200,
        powerState: true,
      });
      
      // Double brightness should roughly double current
      expect(brightness200).toBeGreaterThan(brightness100 * 1.8);
      expect(brightness200).toBeLessThan(brightness100 * 2.2);
    });

    it('should return 0 for black color (all off)', () => {
      const config: LEDConfig = {
        ...MOCK_CONFIGS.default,
        color: MOCK_COLORS.black,
        brightness: 255,
        powerState: true,
      };
      
      const current = calculateCurrentDraw(config);
      expect(current).toBe(0);
    });
  });

  describe('validateColorAndPower', () => {
    it('should validate safe power configuration', () => {
      const config = MOCK_CONFIGS.safePower;
      const result = validateColorAndPower(config);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.currentDrawMa).toBeDefined();
      expect(result.currentDrawMa).toBeLessThan(400);
    });

    it('should warn at 320mA threshold', () => {
      // Create config that draws around 320mA
      const config: LEDConfig = {
        ...MOCK_CONFIGS.default,
        color: { h: 0, s: 0, v: 255 }, // White
        brightness: 154, // Should be around 320mA
        powerState: true,
      };
      
      const result = validateColorAndPower(config);
      const currentDraw = result.currentDrawMa || 0;
      
      if (currentDraw >= 320) {
        expect(result.error).toBeDefined();
        expect(result.error?.severity).toBe('warning');
      }
    });

    it('should block unsafe power configuration (> 400mA)', () => {
      const config = MOCK_CONFIGS.highPower;
      const result = validateColorAndPower(config);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.severity).toBe('error');
      expect(result.currentDrawMa).toBeGreaterThan(400);
    });

    it('should allow powered-off config regardless of other settings', () => {
      const config: LEDConfig = {
        ...MOCK_CONFIGS.highPower,
        powerState: false, // Override to powered off
      };
      
      const result = validateColorAndPower(config);
      
      expect(result.isValid).toBe(true);
      expect(result.currentDrawMa).toBe(0);
    });

    it('should include current draw in result', () => {
      const config = MOCK_CONFIGS.safePower;
      const result = validateColorAndPower(config);
      
      expect(result.currentDrawMa).toBeDefined();
      expect(result.currentDrawMa).toBeGreaterThan(0);
    });

    it('should handle edge case: exactly 400mA', () => {
      // Try to create a config that draws exactly 400mA
      const config: LEDConfig = {
        ...MOCK_CONFIGS.default,
        color: MOCK_COLORS.white,
        brightness: 191, // Calculated to be close to 400mA
        powerState: true,
      };
      
      const result = validateColorAndPower(config);
      const currentDraw = result.currentDrawMa || 0;
      
      if (currentDraw > 400) {
        expect(result.isValid).toBe(false);
      } else {
        expect(result.isValid).toBe(true);
      }
    });

    it('should handle different colors at same brightness', () => {
      const colors = [
        MOCK_COLORS.red,
        MOCK_COLORS.green,
        MOCK_COLORS.blue,
        MOCK_COLORS.white,
      ];
      
      const results = colors.map(color => {
        const config: LEDConfig = {
          ...MOCK_CONFIGS.default,
          color,
          brightness: 200,
          powerState: true,
        };
        return validateColorAndPower(config);
      });
      
      // White should draw the most current
      const whiteCurrent = results[3].currentDrawMa || 0;
      results.slice(0, 3).forEach(result => {
        expect(result.currentDrawMa).toBeLessThan(whiteCurrent);
      });
    });

    it('should provide appropriate error messages', () => {
      const unsafeConfig = MOCK_CONFIGS.highPower;
      const result = validateColorAndPower(unsafeConfig);
      
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('power');
      expect(result.error?.message.length).toBeGreaterThan(10);
    });

    it('should handle minimum brightness', () => {
      const config: LEDConfig = {
        ...MOCK_CONFIGS.default,
        brightness: 1,
        powerState: true,
      };
      
      const result = validateColorAndPower(config);
      
      expect(result.isValid).toBe(true);
      expect(result.currentDrawMa).toBeGreaterThan(0);
      expect(result.currentDrawMa).toBeLessThan(50);
    });

    it('should handle maximum safe brightness for white', () => {
      // Find the maximum brightness for white that's still safe
      let safeBrightness = 0;
      
      for (let b = 1; b <= 255; b++) {
        const config: LEDConfig = {
          ...MOCK_CONFIGS.default,
          color: MOCK_COLORS.white,
          brightness: b,
          powerState: true,
        };
        
        const result = validateColorAndPower(config);
        if (result.isValid && !result.error) {
          safeBrightness = b;
        } else {
          break;
        }
      }
      
      expect(safeBrightness).toBeGreaterThan(0);
      expect(safeBrightness).toBeLessThan(255);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid HSV values gracefully', () => {
      const config: LEDConfig = {
        ...MOCK_CONFIGS.default,
        color: { h: 300, s: 300, v: 300 }, // Out of range
        powerState: true,
      };
      
      // Should not throw, should handle gracefully
      expect(() => {
        validateColorAndPower(config);
      }).not.toThrow();
    });

    it('should handle zero brightness', () => {
      const config: LEDConfig = {
        ...MOCK_CONFIGS.default,
        brightness: 0,
        powerState: true,
      };
      
      const result = validateColorAndPower(config);
      expect(result.currentDrawMa).toBe(0);
    });

    it('should handle effect type (should not affect power calc)', () => {
      const config1: LEDConfig = {
        ...MOCK_CONFIGS.default,
        effectType: 0, // SOLID
        powerState: true,
      };
      
      const config2: LEDConfig = {
        ...MOCK_CONFIGS.default,
        effectType: 2, // RAINBOW
        powerState: true,
      };
      
      const result1 = validateColorAndPower(config1);
      const result2 = validateColorAndPower(config2);
      
      // Effect type should not change current draw for same color/brightness
      expect(result1.currentDrawMa).toBe(result2.currentDrawMa);
    });
  });
});



