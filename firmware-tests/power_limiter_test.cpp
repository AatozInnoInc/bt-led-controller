// Host-side tests for bt-led-controller/power_limiter.h.
//
// Build and run (CI does the same, see .github/workflows/test.yml):
//   g++ -std=c++11 -O2 -Wall -Wextra -Werror -I bt-led-controller
//       firmware-tests/power_limiter_test.cpp -o power_limiter_test
//   ./power_limiter_test
//
// The property sweeps check, for every case, that the brightness the
// limiter returns keeps the frame at or under MAX_FRAME_CURRENT_MA under
// three current models (linear, APA102 5-bit field, per-channel scaling),
// never raises brightness, leaves safe frames untouched, and dims no more
// than needed. All comparisons are exact integer arithmetic.

#include <stdint.h>
#include <stdio.h>

#include "power_limiter.h"

static unsigned long g_checks = 0;
static unsigned long g_failures = 0;

static void check(bool condition, const char* what, long a, long b, long c, long d) {
  g_checks++;
  if (condition) {
    return;
  }
  g_failures++;
  if (g_failures <= 20) {
    printf("FAIL: %s (a=%ld b=%ld c=%ld d=%ld)\n", what, a, b, c, d);
  }
}

// Arduino map(b, 0, 255, 0, 31) as used by sendLED() in the .ino.
static uint32_t apa102FiveBit(uint8_t brightness) {
  return ((uint32_t)brightness * 31u) / 255u;
}

struct Pixel {
  uint8_t r, g, b;
};

// Checks every property for one frame. Returns the limited brightness.
static uint8_t checkFrame(const Pixel* pixels, int ledCount, uint8_t requested, uint32_t limitMa) {
  const uint64_t ma = MA_PER_CHANNEL_AT_FULL;
  uint32_t channelSum = 0;
  for (int i = 0; i < ledCount; i++) {
    channelSum += (uint32_t)pixels[i].r + pixels[i].g + pixels[i].b;
  }

  uint8_t limited = powerLimitFrameBrightness(channelSum, requested, limitMa, MA_PER_CHANNEL_AT_FULL);

  // Never brighter than requested.
  check(limited <= requested, "limited <= requested", channelSum, requested, limited, ledCount);

  // Linear model: sum * ma * b / 65025 <= limit.
  uint64_t linearLhs = (uint64_t)channelSum * ma * limited;
  uint64_t linearRhs = (uint64_t)limitMa * POWER_LIMITER_FULL_SCALE;
  check(linearLhs <= linearRhs, "linear model current <= limit", channelSum, requested, limited, ledCount);

  // APA102 5-bit global field: sum * ma * fiveBit / (255 * 31) <= limit.
  uint64_t fiveBitLhs = (uint64_t)channelSum * ma * apa102FiveBit(limited);
  uint64_t fiveBitRhs = (uint64_t)limitMa * 255u * 31u;
  check(fiveBitLhs <= fiveBitRhs, "5-bit field current <= limit", channelSum, requested, limited, ledCount);

  // Per-channel scaling with the global field at 31/31: sum(floor(ch * b / 255)) * ma / 255 <= limit.
  uint64_t scaledSum = 0;
  for (int i = 0; i < ledCount; i++) {
    scaledSum += ((uint32_t)pixels[i].r * limited) / 255u;
    scaledSum += ((uint32_t)pixels[i].g * limited) / 255u;
    scaledSum += ((uint32_t)pixels[i].b * limited) / 255u;
  }
  check(scaledSum * ma <= (uint64_t)limitMa * 255u, "channel-scaled current <= limit", channelSum, requested, limited, ledCount);

  // Safe frames are untouched.
  uint64_t requestedLhs = (uint64_t)channelSum * ma * requested;
  bool requestedIsSafe = requestedLhs <= linearRhs;
  if (requestedIsSafe) {
    check(limited == requested, "safe frame unchanged", channelSum, requested, limited, ledCount);
  } else {
    // Tight: one step brighter would exceed the limit.
    uint64_t nextLhs = (uint64_t)channelSum * ma * ((uint64_t)limited + 1);
    check(nextLhs > linearRhs, "limiter dims no more than needed", channelSum, requested, limited, ledCount);
  }

  // Rounded-up reporter agrees with the exact check.
  check(powerFrameCurrentMa(channelSum, limited, MA_PER_CHANNEL_AT_FULL) <= limitMa,
        "reported current <= limit", channelSum, requested, limited, ledCount);
  return limited;
}

// Property: uniform colour x every brightness x every LED count 0..MAX_LED_COUNT.
static void sweepUniformFrames() {
  static const uint8_t levels[] = {0, 1, 2, 3, 7, 15, 31, 63, 64, 100, 127, 128, 191, 200, 254, 255};
  const int levelCount = (int)(sizeof(levels) / sizeof(levels[0]));
  Pixel frame[MAX_LED_COUNT];

  for (int ri = 0; ri < levelCount; ri++) {
    for (int gi = 0; gi < levelCount; gi++) {
      for (int bi = 0; bi < levelCount; bi++) {
        Pixel colour = {levels[ri], levels[gi], levels[bi]};
        for (int i = 0; i < MAX_LED_COUNT; i++) {
          frame[i] = colour;
        }
        for (int ledCount = 0; ledCount <= MAX_LED_COUNT; ledCount++) {
          for (int brightness = 0; brightness <= 255; brightness++) {
            checkFrame(frame, ledCount, (uint8_t)brightness, MAX_FRAME_CURRENT_MA);
          }
        }
      }
    }
  }
}

// Property: every possible per-LED channel sum 0..765, exhaustively. The
// linear model depends on colour only through this sum.
static void sweepEveryChannelSum() {
  Pixel frame[MAX_LED_COUNT];
  for (int sum = 0; sum <= 765; sum++) {
    int remaining = sum;
    Pixel colour = {0, 0, 0};
    colour.r = (uint8_t)(remaining > 255 ? 255 : remaining);
    remaining -= colour.r;
    colour.g = (uint8_t)(remaining > 255 ? 255 : remaining);
    remaining -= colour.g;
    colour.b = (uint8_t)remaining;
    for (int i = 0; i < MAX_LED_COUNT; i++) {
      frame[i] = colour;
    }
    for (int ledCount = 0; ledCount <= MAX_LED_COUNT; ledCount++) {
      for (int brightness = 0; brightness <= 255; brightness++) {
        checkFrame(frame, ledCount, (uint8_t)brightness, MAX_FRAME_CURRENT_MA);
      }
    }
  }
}

// Property: mixed-colour frames from a fixed-seed generator (patterns such as
// rainbow and fire never show one uniform colour), also at other limits.
static void sweepMixedFrames() {
  uint32_t state = 0x12345678u;
  Pixel frame[MAX_LED_COUNT];
  static const uint32_t limits[] = {MAX_FRAME_CURRENT_MA, 0, 1, 100, 250, 1800, 5000};
  const int limitCount = (int)(sizeof(limits) / sizeof(limits[0]));

  for (int iteration = 0; iteration < 200000; iteration++) {
    int ledCount = 0;
    for (int i = 0; i < MAX_LED_COUNT; i++) {
      state = state * 1664525u + 1013904223u;
      frame[i].r = (uint8_t)(state >> 24);
      frame[i].g = (uint8_t)(state >> 16);
      frame[i].b = (uint8_t)(state >> 8);
    }
    state = state * 1664525u + 1013904223u;
    ledCount = (int)((state >> 16) % (MAX_LED_COUNT + 1));
    uint8_t brightness = (uint8_t)(state >> 8);
    checkFrame(frame, ledCount, brightness, limits[iteration % limitCount]);
  }
}

static void fillFrame(Pixel* frame, int ledCount, uint8_t r, uint8_t g, uint8_t b) {
  for (int i = 0; i < ledCount; i++) {
    frame[i].r = r;
    frame[i].g = g;
    frame[i].b = b;
  }
}

// Known values, so a reader can sanity-check the model by hand.
static void checkKnownValues() {
  Pixel frame[MAX_LED_COUNT];

  // Full white, 30 LEDs, unlimited: 30 * 765 * 20 * 255 / 65025 = 1800 mA.
  check(powerFrameCurrentMa(30u * 765u, 255, MA_PER_CHANNEL_AT_FULL) == 1800, "full white 30 LEDs is 1800 mA", 0, 0, 0, 0);

  // Limited to 400 mA: floor(400 * 65025 / 459000) = 56.
  fillFrame(frame, 30, 255, 255, 255);
  uint8_t limited = checkFrame(frame, 30, 255, 400);
  check(limited == 56, "full white 30 LEDs limits to 56", limited, 0, 0, 0);

  // The firmware's current LED_COUNT (10): full white limits to exactly 400 mA at 170.
  fillFrame(frame, 10, 255, 255, 255);
  limited = checkFrame(frame, 10, 255, 400);
  check(limited == 170, "full white 10 LEDs limits to 170", limited, 0, 0, 0);
  check(powerFrameCurrentMa(10u * 765u, limited, MA_PER_CHANNEL_AT_FULL) == 400, "10 LEDs at 170 is 400 mA", 0, 0, 0, 0);

  // Pure red, 30 LEDs: 600 mA at full, so it is limited too.
  fillFrame(frame, 30, 255, 0, 0);
  limited = checkFrame(frame, 30, 255, 400);
  check(limited == 170, "full red 30 LEDs limits to 170", limited, 0, 0, 0);

  // Dark frame passes through unchanged.
  check(powerLimitFrameBrightness(0, 255, 400, MA_PER_CHANNEL_AT_FULL) == 255, "dark frame unchanged", 0, 0, 0, 0);

  // The default wrapper uses the shared constants.
  check(powerLimitFrameBrightnessDefault(30u * 765u, 255) ==
            powerLimitFrameBrightness(30u * 765u, 255, MAX_FRAME_CURRENT_MA, MA_PER_CHANNEL_AT_FULL),
        "default wrapper uses shared constants", 0, 0, 0, 0);
}

// validateBrightness() in the .ino delegates to this.
static void checkBrightnessRange() {
  check(!powerIsBrightnessInRange(-1, 255), "-1 (no data) rejected", 0, 0, 0, 0);
  check(powerIsBrightnessInRange(0, 255), "0 accepted", 0, 0, 0, 0);
  check(powerIsBrightnessInRange(128, 255), "128 accepted", 0, 0, 0, 0);
  check(powerIsBrightnessInRange(255, 255), "255 accepted", 0, 0, 0, 0);
  check(!powerIsBrightnessInRange(256, 255), "256 rejected", 0, 0, 0, 0);
  check(!powerIsBrightnessInRange(101, 100), "101 rejected when max is 100", 0, 0, 0, 0);
  for (int value = -300; value <= 600; value++) {
    bool expected = value >= 0 && value <= 255;
    check(powerIsBrightnessInRange(value, 255) == expected, "range sweep", value, 0, 0, 0);
  }
}

int main() {
  printf("power_limiter_test: MAX_LED_COUNT=%d MA_PER_CHANNEL_AT_FULL=%d MAX_FRAME_CURRENT_MA=%d\n",
         MAX_LED_COUNT, MA_PER_CHANNEL_AT_FULL, MAX_FRAME_CURRENT_MA);

  checkKnownValues();
  checkBrightnessRange();
  sweepUniformFrames();
  sweepEveryChannelSum();
  sweepMixedFrames();

  printf("power_limiter_test: %lu checks, %lu failures\n", g_checks, g_failures);
  if (g_failures == 0) {
    printf("PASS\n");
    return 0;
  }
  printf("FAILED\n");
  return 1;
}
