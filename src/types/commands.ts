/**
 * BLE Command Protocol Types
 * Based on the design: config-design.mmd and tx-config.mmd
 */

export enum CommandType {
  ENTER_CONFIG        = 0x10,
  EXIT_CONFIG         = 0x11,
  COMMIT_CONFIG       = 0x12,
  CLAIM_DEVICE        = 0x13, // Claim device ownership (one-time, sets owner)
  VERIFY_OWNERSHIP    = 0x14, // Verify user can access device (per-session)
  UNCLAIM_DEVICE      = 0x15, // Unclaim device ownership (removes owner)
  UPDATE_PARAM        = 0x02,
  UPDATE_COLOR        = 0x03, // Update HSV color as single command (payload: [H, S, V])
  REQUEST_ANALYTICS   = 0x20, // Request analytics batch from controller
  CONFIRM_ANALYTICS   = 0x21, // Confirm receipt of analytics batch
}

export enum ResponseType {
  ACK_SUCCESS = 0x90,
  ACK_ERROR = 0x91,
  ANALYTICS_BATCH = 0xA0, // Analytics batch response
}

export enum ParameterId {
  BRIGHTNESS = 0x01,
  SPEED = 0x02,
  COLOR_HUE = 0x03,
  COLOR_SATURATION = 0x04,
  COLOR_VALUE = 0x05,
  EFFECT_TYPE = 0x06,
  POWER_STATE = 0x07,
}

export interface BLECommand {
  type: CommandType;
  payload?: Uint8Array;
}

export interface CommandResponse {
  type: ResponseType;
  data?: Uint8Array;
  isSuccess: boolean;
}

export interface UpdateParameterCommand {
  parameterId: ParameterId;
  value: number;
}

/**
 * Analytics batch from microcontroller
 * Sent automatically on connection if there are completed sessions
 */
export interface AnalyticsBatch {
  batchId: number; // Unique ID for this batch
  sessionCount: number; // Number of completed sessions in this batch
  sessions: AnalyticsSessionData[];
  flashReads: number;
  flashWrites: number;
  errorCount: number;
  lastErrorCode?: number; // Most recent error code (0 = no error)
  lastErrorTimestamp?: number; // Unix timestamp (seconds) of last error
  averagePowerConsumption?: number; // mA, optional
  peakPowerConsumption?: number; // mA, optional
}

export interface AnalyticsSessionData {
  startTime: number; // Unix timestamp (seconds)
  endTime: number; // Unix timestamp (seconds)
  duration: number; // milliseconds
  turnedOn: boolean;
  turnedOff: boolean;
}

