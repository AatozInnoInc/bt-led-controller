import { ErrorCode, BLEError } from '../../types/errors';

/**
 * Error Envelope Pattern
 * Structured error handling with code and message matching microcontroller error codes
 */
export interface ErrorEnvelope {
  code: number;
  message: string;
  timestamp?: number;
  data?: Uint8Array;
}

// Re-export ErrorCode for convenience
export { ErrorCode };

/**
 * Parse error envelope from binary response
 * Format: [0x90, errorCode, ...messageBytes]
 */
export function parseErrorEnvelope(data: Uint8Array | number[]): ErrorEnvelope | null {
  if (!data || data.length < 2) {
    return null;
  }

  // Check for error envelope marker (0x90)
  if (data[0] !== 0x90) {
    return null;
  }

  const errorCode = data[1];
  const messageBytes = data.slice(2);
  
  // Convert message bytes to string
  const message = messageBytes.length > 0
    ? String.fromCharCode(...messageBytes.filter(b => b !== 0))
    : getDefaultErrorMessage(errorCode);

  return {
    code: errorCode,
    message: message.trim() || getDefaultErrorMessage(errorCode),
    timestamp: Date.now(),
  };
}

/**
 * Parse error envelope from string response
 * Format: "ERROR:code:message"
 */
export function parseErrorEnvelopeFromString(response: string): ErrorEnvelope | null {
  if (!response.startsWith('ERROR:')) {
    return null;
  }

  const parts = response.substring(6).split(':');
  
  // Guard against empty or invalid parts
  if (!parts || parts.length === 0 || !parts[0]) {
    return null;
  }
  
  // Guard parseInt - it can throw for very large numbers, but more commonly returns NaN
  let code: number;
  try {
    code = parseInt(parts[0], 10);
  } catch (error) {
    console.error('Failed to parse error code:', error);
    return null;
  }
  
  if (isNaN(code) || !isFinite(code)) {
    return null;
  }

  return {
    code,
    message: parts.slice(1).join(':') || getDefaultErrorMessage(code),
    timestamp: Date.now(),
  };
}

/**
 * Get user-friendly error message for error code
 */
export function getErrorMessage(errorCode: number): string {
  return getDefaultErrorMessage(errorCode);
}

/**
 * Get default error message for error code
 */
function getDefaultErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case ErrorCode.NONE:
      return 'No error';
    case ErrorCode.INVALID_COMMAND:
      return 'Invalid command sent to device';
    case ErrorCode.INVALID_PARAMETER:
      return 'Invalid parameter value';
    case ErrorCode.OUT_OF_RANGE:
      return 'Parameter value out of range';
    case ErrorCode.NOT_IN_CONFIG_MODE:
      return 'Device not in configuration mode';
    case ErrorCode.ALREADY_IN_CONFIG_MODE:
      return 'Device already in configuration mode';
    case ErrorCode.FLASH_WRITE_FAILED:
      return 'Failed to save settings to flash memory';
    case ErrorCode.SETTINGS_CORRUPT:
      return 'Device settings are corrupted';
    case ErrorCode.FLASH_FAILURE:
      return 'Failed to save settings to flash memory';
    case ErrorCode.LED_FAILURE:
      return 'LED hardware failure detected';
    case ErrorCode.MEMORY_LOW:
      return 'Device memory is low';
    case ErrorCode.POWER_LOW:
      return 'Device power is low';
    case ErrorCode.VALIDATION_FAILED:
      return 'Configuration validation failed';
    case ErrorCode.NOT_OWNER:
      return 'You are not the owner of this device';
    case ErrorCode.ALREADY_CLAIMED:
      return 'Device is already claimed by another user';
    case ErrorCode.UNKNOWN_ERROR:
      return 'Unknown error occurred';
    default:
      return `Unknown error (code: ${errorCode})`;
  }
}

/**
 * Create error envelope from error code
 */
export function createErrorEnvelope(code: number, message?: string): ErrorEnvelope {
  return {
    code,
    message: message || getDefaultErrorMessage(code),
    timestamp: Date.now(),
  };
}

/**
 * Check if response is an error envelope
 */
export function isErrorEnvelope(data: Uint8Array | number[] | string): boolean {
  if (typeof data === 'string') {
    return data.startsWith('ERROR:');
  }
  
  if (Array.isArray(data) || data instanceof Uint8Array) {
    return data.length >= 2 && data[0] === 0x90;
  }
  
  return false;
}

/**
 * Helper to normalize data for error envelope parsing
 * Converts string or array data to Uint8Array for consistent processing
 */
export function normalizeDataForErrorEnvelope(data: Uint8Array | number[] | string): Uint8Array | null {
  if (typeof data === 'string') {
    return new Uint8Array(data.split('').map(c => c.charCodeAt(0)));
  }
  
  if (Array.isArray(data)) {
    return new Uint8Array(data);
  }
  
  if (data instanceof Uint8Array) {
    return data;
  }

  return null;
}

/**
 * Helper to check and parse error envelope from any data type
 * Returns the error envelope if found, null otherwise
 */
export function checkAndParseErrorEnvelope(data: Uint8Array | number[] | string): ErrorEnvelope | null {
  // Check string format first
  if (typeof data === 'string' && data.startsWith('ERROR:')) {
    return parseErrorEnvelopeFromString(data);
  }

  // Normalize and check binary format
  const normalized = normalizeDataForErrorEnvelope(data);
  if (normalized && isErrorEnvelope(normalized)) {
    return parseErrorEnvelope(normalized);
  }

  return null;
}

/**
 * Convert error envelope to user-friendly string
 */
export function formatErrorForUser(envelope: ErrorEnvelope): string {
  return envelope.message;
}

/**
   TODO FOR AGENT: THIS PROBABLY BELONGS IN ANOTOER FILE
 * Error Handler Class
 * Processes and handles error envelopes from microcontroller
 */
export class ErrorHandler {
  /**
   * Process an error envelope and return user-friendly message
   */
  static processError(envelope: ErrorEnvelope): string {
    return envelope.message;
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(envelope: ErrorEnvelope): boolean {
    switch (envelope.code) {
      case ErrorCode.FLASH_FAILURE:
      case ErrorCode.FLASH_WRITE_FAILED:
      case ErrorCode.VALIDATION_FAILED:
        return false;
      case ErrorCode.NOT_IN_CONFIG_MODE:
      case ErrorCode.ALREADY_IN_CONFIG_MODE:
        return true;
      default:
        return true;
    }
  }

  /**
   * Get error severity level
   */
  static getSeverity(envelope: ErrorEnvelope): 'error' | 'warning' | 'info' {
    switch (envelope.code) {
      case ErrorCode.FLASH_FAILURE:
      case ErrorCode.FLASH_WRITE_FAILED:
      case ErrorCode.VALIDATION_FAILED:
        return 'error';
      case ErrorCode.OUT_OF_RANGE:
      case ErrorCode.INVALID_PARAMETER:
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Create error envelope from BLEError
   */
  static fromError(error: BLEError): ErrorEnvelope {
    return {
      code: error.envelope.code,
      message: error.envelope.message,
      timestamp: Date.now(),
      data: error.envelope.data,
    };
  }
}

