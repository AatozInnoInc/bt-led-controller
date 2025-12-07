/**
 * BLE Command Protocol Types
 * Based on the design: config-design.mmd and tx-config.mmd
 */

export enum CommandType {
  ENTER_CONFIG = 0x10,
  EXIT_CONFIG = 0x11,
  COMMIT_CONFIG = 0x12,
  UPDATE_PARAM = 0x02,
  UPDATE_COLOR = 0x03, // Update HSV color as single command (payload: [H, S, V])
}

export enum ResponseType {
  ACK_SUCCESS = 0x90,
  ACK_ERROR = 0x91,
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

