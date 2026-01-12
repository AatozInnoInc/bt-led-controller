/**
 * Parameter Validation Utilities
 * Validates parameter values before sending to device
 */

import { ParameterId } from '../types/commands';
import { RGBColor } from '../utils/bleConstants';

/**
 * Minimal config interface for power validation
 */
interface PowerValidationConfig {
  brightness: number;
  color: RGBColor;
  powerState: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  correctedValue?: number;
}

// Power consumption constants
const MAX_LED_COUNT = 14; // Worst case: 14 LEDs
const MAX_CURRENT_PER_LED_WHITE = 60; // mA per LED at full white, full brightness
const BATTERY_MAX_CURRENT = 500; // mA - 500mAh battery
const SAFE_CURRENT_LIMIT = 400; // mA - 80% of max for safety margin

/**
 * Validate a parameter value before sending
 */
export function validateParameter(parameterId: ParameterId, value: number): ValidationResult {
  switch (parameterId) {
    case ParameterId.BRIGHTNESS:
      if (value < 0 || value > 100) {
        return {
          isValid: false,
          error: `Brightness must be between 0 and 100. Got: ${value}`,
          correctedValue: Math.max(0, Math.min(100, value)),
        };
      }
      break;
    
    case ParameterId.SPEED:
      if (value < 0 || value > 100) {
        return {
          isValid: false,
          error: `Speed must be between 0 and 100. Got: ${value}`,
          correctedValue: Math.max(0, Math.min(100, value)),
        };
      }
      break;
    
    case ParameterId.COLOR_HUE:
    case ParameterId.COLOR_SATURATION:
    case ParameterId.COLOR_VALUE:
      if (value < 0 || value > 255) {
        return {
          isValid: false,
          error: `Color component must be between 0 and 255. Got: ${value}`,
          correctedValue: Math.max(0, Math.min(255, value)),
        };
      }
      break;
    
    case ParameterId.EFFECT_TYPE:
      if (value < 0 || value > 5) {
        return {
          isValid: false,
          error: `Effect type must be between 0 and 5. Got: ${value}`,
          correctedValue: Math.max(0, Math.min(5, value)),
        };
      }
      break;
    
    case ParameterId.POWER_STATE:
      // Power state is boolean, but sent as 0 or 1
      if (value !== 0 && value !== 1) {
        return {
          isValid: false,
          error: `Power state must be 0 or 1. Got: ${value}`,
          correctedValue: value > 0 ? 1 : 0,
        };
      }
      break;
  }
  
  return { isValid: true };
}

/**
 * Calculate current draw for a single LED based on color and brightness
 * @param color RGB color [R, G, B] (0-255 for each component)
 * @param brightness Brightness level (0-100)
 * @returns Current draw in mA
 */
export function calculateLEDCurrent(color: RGBColor, brightness: number): number {
  const [r, g, b] = color;
  
  // Calculate current based on RGB values
  // White (255, 255, 255) at 100% brightness = 60mA
  // Other colors are proportional to (R + G + B) / (255 * 3)
  const rgbSum = r + g + b;
  const maxRgbSum = 255 * 3; // Maximum possible (white)

  // Current is proportional to RGB sum and brightness
  const colorFactor = rgbSum / maxRgbSum;
  const brightnessFactor = brightness / 100;

  return colorFactor * brightnessFactor * MAX_CURRENT_PER_LED_WHITE;
}

/**
 * Calculate total current draw for all LEDs
 * @param color RGB color [R, G, B]
 * @param brightness Brightness level (0-100)
 * @param ledCount Number of LEDs (defaults to MAX_LED_COUNT for worst case)
 * @returns Total current draw in mA
 */
export function calculateTotalCurrent(
  color: RGBColor,
  brightness: number,
  ledCount: number = MAX_LED_COUNT
): number {
  const currentPerLED = calculateLEDCurrent(color, brightness);
  return currentPerLED * ledCount;
}

/**
 * Validate power consumption for a configuration
 * @param config LED configuration
 * @param ledCount Number of LEDs (defaults to MAX_LED_COUNT for worst case)
 * @returns Validation result
 */
export function validatePowerConsumption(
  config: PowerValidationConfig,
  ledCount: number = MAX_LED_COUNT
): ValidationResult {
  // Only validate if power is on
  if (!config.powerState) {
    return { isValid: true };
  }
  
  const totalCurrent = calculateTotalCurrent(config.color, config.brightness, ledCount);
  
  if (totalCurrent > SAFE_CURRENT_LIMIT) {
    const maxSafeBrightness = Math.floor(
      (SAFE_CURRENT_LIMIT / (ledCount * calculateLEDCurrent(config.color, 100))) * 100
    );
    
    return {
      isValid: false,
      error: `Power consumption too high: ${totalCurrent.toFixed(0)}mA (limit: ${SAFE_CURRENT_LIMIT}mA). ` +
             `Reduce brightness to ${maxSafeBrightness}% or change color to reduce current draw.`,
    };
  }
  
  // Warn if approaching limit (above 80% of safe limit = 320mA)
  if (totalCurrent > SAFE_CURRENT_LIMIT * 0.8) {
    return {
      isValid: true, // Still valid, but warn
      error: `High power consumption: ${totalCurrent.toFixed(0)}mA. Consider reducing brightness or changing color.`,
    };
  }
  
  return { isValid: true };
}

/**
 * Validate RGB color
 */
export function validateColor(color: RGBColor): ValidationResult {
  const [r, g, b] = color;

  if (!Array.isArray(color) || color.length !== 3) {
    return {
      isValid: false,
      error: 'Color must be an array of 3 values [R, G, B]',
    };
  }
  
  const rValidation = validateParameter(ParameterId.COLOR_HUE, r); // Reusing parameter IDs for RGB
  if (!rValidation.isValid) {
    return { ...rValidation, error: `Red component ${rValidation.error}` };
  }

  const gValidation = validateParameter(ParameterId.COLOR_SATURATION, g);
  if (!gValidation.isValid) {
    return { ...gValidation, error: `Green component ${gValidation.error}` };
  }

  const bValidation = validateParameter(ParameterId.COLOR_VALUE, b);
  if (!bValidation.isValid) {
    return { ...bValidation, error: `Blue component ${bValidation.error}` };
  }

  return { isValid: true };
}

/**
 * Validate color and power consumption together
 * @param color RGB color [R, G, B]
 * @param brightness Brightness level (0-100)
 * @param powerState Whether power is on
 * @param ledCount Number of LEDs (defaults to MAX_LED_COUNT)
 * @returns Validation result
 */
export function validateColorAndPower(
  color: RGBColor,
  brightness: number,
  powerState: boolean,
  ledCount: number = MAX_LED_COUNT
): ValidationResult {
  // First validate color components
  const colorValidation = validateColor(color);
  if (!colorValidation.isValid) {
    return colorValidation;
  }
  
  // Then validate power consumption if power is on
  if (powerState) {
    const mockConfig: PowerValidationConfig = {
      brightness,
      color,
      powerState: true,
    };
    return validatePowerConsumption(mockConfig, ledCount);
  }
  
  return { isValid: true };
}

