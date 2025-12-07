/**
 * Error Envelope Handler
 * Processes and handles error envelopes from microcontroller
 */

import { ErrorEnvelope, ErrorCode, BLEError } from '../types/errors';

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
      case ErrorCode.NOT_IN_CONFIG_MODE:
      case ErrorCode.ALREADY_IN_CONFIG_MODE:
        return true;
      case ErrorCode.FLASH_WRITE_FAILED:
      case ErrorCode.VALIDATION_FAILED:
        return false;
      default:
        return true;
    }
  }

  /**
   * Get error severity level
   */
  static getSeverity(envelope: ErrorEnvelope): 'error' | 'warning' | 'info' {
    switch (envelope.code) {
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
    return error.envelope;
  }
}

