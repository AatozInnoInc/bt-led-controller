// Mirror of device_config.h binary protocol values.
// Do not change a value without updating the firmware in the same PR.

export const CMD_STATUS = 0x00;
export const CMD_CONFIG_UPDATE = 0x02;
export const CMD_ENTER_CONFIG = 0x10;
export const CMD_COMMIT_CONFIG = 0x11;
export const CMD_EXIT_CONFIG = 0x12;
export const CMD_CLAIM_DEVICE = 0x13;
export const CMD_VERIFY_OWNERSHIP = 0x14;
export const CMD_UNCLAIM_DEVICE = 0x15;
export const CMD_REQUEST_ANALYTICS = 0x20;
export const CMD_CONFIRM_ANALYTICS = 0x21;

export const RESPONSE_ACK_CONFIG_MODE = 0x90;
export const RESPONSE_ACK_COMMIT = 0x91;
export const RESPONSE_ACK_SUCCESS = 0x92;
export const RESPONSE_ANALYTICS_BATCH = 0xa0;

export const ERROR_NONE = 0x00;
export const ERROR_INVALID_COMMAND = 0x01;
export const ERROR_INVALID_PARAMETER = 0x02;
export const ERROR_OUT_OF_RANGE = 0x03;
export const ERROR_NOT_IN_CONFIG_MODE = 0x04;
export const ERROR_ALREADY_IN_CONFIG_MODE = 0x05;
export const ERROR_FLASH_WRITE_FAILED = 0x06;
export const ERROR_VALIDATION_FAILED = 0x07;
export const ERROR_NOT_OWNER = 0x08;
export const ERROR_ALREADY_CLAIMED = 0x09;

export const PARAM_BRIGHTNESS = 0x00;
export const PARAM_PATTERN = 0x01;
export const PARAM_COLOR_RGB = 0x02;
export const PARAM_POWER_MODE = 0x03;
export const PARAM_SPEED = 0x04;
/** Secondary gradient colour for palette-driven effects (simulator-side; firmware support deferred). */
export const PARAM_COLOR2_RGB = 0x05;

export const MAX_USER_ID_LENGTH = 64;
export const DEFAULT_BRIGHTNESS = 128;
export const MAX_EFFECTS = 14;
