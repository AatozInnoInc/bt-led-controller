/**
 * Parameter Validation Utilities
 * Validates parameter values before sending to device
 */

import { ParameterId } from '../types/commands';
import { HSVColor } from '../types/config';
import { hsvToRgb } from './colorUtils';

/**
 * Minimal config interface for power validation
 */
interface PowerValidationConfig {
  brightness: number;
  color: HSVColor;
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
 * @param color HSV color (0-255 for each component)
 * @param brightness Brightness level (0-100)
 * @returns Current draw in mA
 */
export function calculateLEDCurrent(color: HSVColor, brightness: number): number {
  // Convert HSV to RGB
  const rgb = hsvToRgb(color);
  
  // Calculate current based on RGB values
  // White (255, 255, 255) at 100% brightness = 60mA
  // Other colors are proportional to (R + G + B) / (255 * 3)
  const rgbSum = rgb.r + rgb.g + rgb.b;
  const maxRgbSum = 255 * 3; // Maximum possible (white)
  
  // Current is proportional to RGB sum and brightness
  const colorFactor = rgbSum / maxRgbSum;
  const brightnessFactor = brightness / 100;
  
  return colorFactor * brightnessFactor * MAX_CURRENT_PER_LED_WHITE;
}

/**
 * Calculate total current draw for all LEDs
 * @param color HSV color
 * @param brightness Brightness level (0-100)
 * @param ledCount Number of LEDs (defaults to MAX_LED_COUNT for worst case)
 * @returns Total current draw in mA
 */
export function calculateTotalCurrent(
  color: HSVColor,
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
 * Validate HSV color
 */
export function validateColor(color: HSVColor): ValidationResult {
  const hValidation = validateParameter(ParameterId.COLOR_HUE, color.h);
  if (!hValidation.isValid) {
    return hValidation;
  }
  
  const sValidation = validateParameter(ParameterId.COLOR_SATURATION, color.s);
  if (!sValidation.isValid) {
    return sValidation;
  }
  
  const vValidation = validateParameter(ParameterId.COLOR_VALUE, color.v);
  if (!vValidation.isValid) {
    return vValidation;
  }
  
  return { isValid: true };
}

/**
 * Validate color and power consumption together
 * @param color HSV color
 * @param brightness Brightness level (0-100)
 * @param powerState Whether power is on
 * @param ledCount Number of LEDs (defaults to MAX_LED_COUNT)
 * @returns Validation result
 */
export function validateColorAndPower(
  color: HSVColor,
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

