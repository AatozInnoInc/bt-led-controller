/**
 * Parameter Validation Utilities
 * Validates parameter values before sending to device
 */

import { ParameterId } from '../types/commands';
import { HSVColor } from '../types/config';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  correctedValue?: number;
}

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

