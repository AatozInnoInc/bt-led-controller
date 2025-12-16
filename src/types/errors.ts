/**
 * Error Envelope Types
 * Structured error handling from microcontroller
 */

export enum ErrorCode {
  INVALID_COMMAND = 0x01,
  INVALID_PARAMETER = 0x02,
  OUT_OF_RANGE = 0x03,
  NOT_IN_CONFIG_MODE = 0x04,
  ALREADY_IN_CONFIG_MODE = 0x05,
  FLASH_WRITE_FAILED = 0x06,
  VALIDATION_FAILED = 0x07,
  NOT_OWNER = 0x08, // User is not the owner and not a developer/test user
  ALREADY_CLAIMED = 0x09, // Device already has an owner
  UNKNOWN_ERROR = 0xFF,
}

export interface ErrorEnvelope {
  code: ErrorCode;
  message: string;
  data?: Uint8Array;
}

export class BLEError extends Error {
  constructor(
    public readonly envelope: ErrorEnvelope,
    message?: string
  ) {
    super(message || envelope.message);
    this.name = 'BLEError';
  }
}

