// Power safety constants shared by the RN app and the firmware.
//
// This file is the single source of truth. The firmware mirror is
// bt-led-controller/power_safety_constants.h, and
// scripts/check-power-safety-constants.mjs fails CI when the two disagree.
// Change a value here and in the header in the same PR.

/** Largest LED count the hardware build supports. Every power check is sized for this worst case. */
export const MAX_LED_COUNT = 30;

/**
 * Current drawn by one colour channel (R, G or B) of one LED at full value
 * and full brightness, in mA. Full white on one LED is 3 x this value.
 */
export const MA_PER_CHANNEL_AT_FULL = 20;

/**
 * Upper bound on the current all LEDs may draw in one frame, in mA.
 *
 * TODO(battery decision): 400 mA is a placeholder until Cow picks the
 * battery. Once the battery and its safe continuous discharge are known,
 * set this to the real number here and in power_safety_constants.h.
 * The firmware header lets a build override it with -DMAX_FRAME_CURRENT_MA=...
 */
export const MAX_FRAME_CURRENT_MA = 400;
