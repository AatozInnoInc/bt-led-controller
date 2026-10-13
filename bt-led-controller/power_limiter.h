#ifndef POWER_LIMITER_H
#define POWER_LIMITER_H

// ========================================
// FRAME CURRENT LIMITER (pure logic, host-testable)
// ========================================
// No Arduino APIs here on purpose: firmware-tests/power_limiter_test.cpp
// compiles this header with g++ on the host and proves the limit holds.
//
// Current model (same one the app uses in src/utils/parameterValidation.ts):
//   frame current (mA) = channelSum * MA_PER_CHANNEL_AT_FULL * brightness / (255 * 255)
// where channelSum is the sum of every R, G and B byte in the frame and
// brightness is the 0-255 global brightness.
//
// This linear model is an upper bound for both ways the firmware can put
// brightness on the wire:
//   - 5-bit APA102 global field: floor(brightness * 31 / 255) / 31 <= brightness / 255
//   - per-channel scaling with the 5-bit field at 31: floor(ch * brightness / 255) <= ch * brightness / 255
// so a brightness that keeps the linear model under the limit keeps the
// real frame under the limit in either mode. The tests check all three.
//
// Not modelled: the LED's own idle current (about 1 mA per APA102 even when
// dark) and the controller's draw. Both are outside the colour budget.

#include <stdint.h>

#include "power_safety_constants.h"

// Full-scale product used by the model: 255 (channel) * 255 (brightness).
#define POWER_LIMITER_FULL_SCALE 65025UL

// True when a raw brightness value (for example a byte read from BLE as an
// int, where -1 means "no data") is inside 0..maxBrightness.
static inline bool powerIsBrightnessInRange(int brightness, int maxBrightness) {
  bool isAtLeastZero = brightness >= 0;
  bool isAtMostMax = brightness <= maxBrightness;
  return isAtLeastZero && isAtMostMax;
}

// Frame current in mA under the linear model, rounded up so it never
// under-reports. For logging and tests.
static inline uint32_t powerFrameCurrentMa(uint32_t frameChannelSum,
                                           uint8_t brightness,
                                           uint32_t maPerChannelAtFull) {
  uint64_t scaled = (uint64_t)frameChannelSum * maPerChannelAtFull * brightness;
  uint64_t roundedUp = (scaled + POWER_LIMITER_FULL_SCALE - 1) / POWER_LIMITER_FULL_SCALE;
  return (uint32_t)roundedUp;
}

// Largest brightness <= requestedBrightness whose frame current stays at or
// under limitMa. Returns requestedBrightness unchanged when it is already safe.
//
// Proof sketch: the result b satisfies b <= floor(limitMa * 65025 / (sum * ma)),
// so sum * ma * b <= limitMa * 65025, which is "current <= limit" in exact
// integer arithmetic with no rounding error.
static inline uint8_t powerLimitFrameBrightness(uint32_t frameChannelSum,
                                                uint8_t requestedBrightness,
                                                uint32_t limitMa,
                                                uint32_t maPerChannelAtFull) {
  uint64_t perBrightnessStep = (uint64_t)frameChannelSum * maPerChannelAtFull;
  if (perBrightnessStep == 0) {
    // Dark frame (or zero-current model): any brightness draws nothing.
    return requestedBrightness;
  }

  uint64_t budget = (uint64_t)limitMa * POWER_LIMITER_FULL_SCALE;
  uint64_t maxSafeBrightness = budget / perBrightnessStep;
  if (maxSafeBrightness >= requestedBrightness) {
    return requestedBrightness;
  }

  // maxSafeBrightness < requestedBrightness <= 255, so the cast is lossless.
  return (uint8_t)maxSafeBrightness;
}

// Convenience wrapper bound to the shared constants. This is what the
// firmware calls once per frame.
static inline uint8_t powerLimitFrameBrightnessDefault(uint32_t frameChannelSum,
                                                       uint8_t requestedBrightness) {
  return powerLimitFrameBrightness(frameChannelSum,
                                   requestedBrightness,
                                   (uint32_t)MAX_FRAME_CURRENT_MA,
                                   (uint32_t)MA_PER_CHANNEL_AT_FULL);
}

#endif // POWER_LIMITER_H
