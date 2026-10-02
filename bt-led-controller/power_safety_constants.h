#ifndef POWER_SAFETY_CONSTANTS_H
#define POWER_SAFETY_CONSTANTS_H

// ========================================
// POWER SAFETY CONSTANTS (shared with the app)
// ========================================
// Mirror of packages/ble-protocol/src/powerSafety.ts, which is the single
// source of truth. scripts/check-power-safety-constants.mjs runs in CI and
// fails when a value here drifts from the TypeScript file. Change both in
// the same PR.

// Largest LED count the hardware build supports.
#define MAX_LED_COUNT 30

// mA drawn by one colour channel of one LED at full value and full brightness.
#define MA_PER_CHANNEL_AT_FULL 20

// Upper bound on the current all LEDs may draw in one frame, in mA.
// TODO(battery decision): 400 mA is a placeholder until Cow picks the
// battery. Set the real number here and in powerSafety.ts.
// A build may override it (for example -DMAX_FRAME_CURRENT_MA=350), which
// is why this one is guarded. The CI drift check compares the default.
#ifndef MAX_FRAME_CURRENT_MA
#define MAX_FRAME_CURRENT_MA 400
#endif

#endif // POWER_SAFETY_CONSTANTS_H
