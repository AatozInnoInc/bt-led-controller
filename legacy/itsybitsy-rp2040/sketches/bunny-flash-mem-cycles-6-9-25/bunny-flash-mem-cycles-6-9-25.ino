#include <FastLED.h>
#include "hardware/flash.h"
#include "hardware/sync.h"
#include "pico/stdlib.h"

// Pin & strip config
#define DATA_PIN            14   // APA102 data pin (GP14)
#define CLOCK_PIN           18   // APA102 clock pin (GP18)
#define NUM_LEDS            13   // Number of LEDs in strip
#define MAX_POWER_MILLIAMPS 500  // Max current draw
#define BRIGHTNESS_FACTOR   0.75f
#define FULL_BRIGHTNESS     uint8_t(255 * BRIGHTNESS_FACTOR)
#define HALF_BRIGHTNESS     (FULL_BRIGHTNESS * 0.75f)
#define PULSE               6
#define TOTAL_EFFECTS       8

// Reserve the final 4 KB flash sector for our byte:
constexpr uint32_t FLASH_TARGET_OFFSET = PICO_FLASH_SIZE_BYTES - FLASH_SECTOR_SIZE;

CRGB leds[NUM_LEDS];
uint8_t currentEffect;

// === Effect 1: Red–White–Blue Blend Cycle ===
CRGB cycleColors[3] = { CRGB::Red, CRGB::White, CRGB::Blue };
uint8_t effect1_colorIndex = 0;
int effect1_lerpVal = 0;
void effect1_loop() {
  CRGB startColor = cycleColors[effect1_colorIndex];
  CRGB endColor = cycleColors[(effect1_colorIndex + 1) % 3];
  uint8_t blendAmt = map(effect1_lerpVal, 0, NUM_LEDS - 1, 0, 255);
  leds[effect1_lerpVal] = blend(startColor, endColor, blendAmt);
  FastLED.show();
  effect1_lerpVal = (effect1_lerpVal + 1) % NUM_LEDS;
  if (effect1_lerpVal == 0)
    effect1_colorIndex = (effect1_colorIndex + 1) % 3;
  delay(100);
}

// === Effect 2: Smooth Gamma-Faded Sine Wave ===
const uint8_t PROGMEM gamma8[] = {
  /* 256-entry gamma table here */
};
void effect2_smoothfade() {
  uint32_t now = millis();
  for (int i = 0; i < NUM_LEDS; ++i) {
    uint8_t phase = (i * 255) / NUM_LEDS;
    uint8_t sineVal = sin8((now >> 3) + phase);
    uint8_t g = pgm_read_byte(&gamma8[sineVal]);
    leds[i] = CHSV(phase, 255, g);
  }
  FastLED.show();
}

// === Effect 3: Red/White/Blue Chasers ===
void effect3_chasers() {
  // ————— Temporarily lift power & brightness limits —————
  uint8_t prevBr = FastLED.getBrightness();
  FastLED.setBrightness(255);           // go to full 100%

  // ————— Compute positions & fade less —————
  uint8_t pos1 = map(beat8(PULSE,   0),   0, 255, 0, NUM_LEDS-1);
  uint8_t pos2 = map(beat8(PULSE,  85),   0, 255, 0, NUM_LEDS-1);
  uint8_t pos3 = map(beat8(PULSE, 170),   0, 255, 0, NUM_LEDS-1);
  fadeToBlackBy(leds, NUM_LEDS, 10);    // gentler fade (≈4% instead of 8%)

  // ————— Draw the three chasers at full intensity —————
  leds[pos1] = CRGB::Red;
  leds[pos2] = CRGB::White;
  leds[pos3] = CRGB::Blue;
  FastLED.show();
  delay(50);

  // ————— Restore your normal limits —————
  FastLED.setBrightness(prevBr);
}


// === Effect 4: Solid Red ===
void effect4_solidRed() {
  fill_solid(leds, NUM_LEDS, CRGB::Red);
  FastLED.show();
  delay(100);
}

// === Effect 5: Solid White (50% brightness) ===
void effect5_solidWhiteHalf() {
  uint8_t prevBr = FastLED.getBrightness();
  FastLED.setBrightness(HALF_BRIGHTNESS);
  fill_solid(leds, NUM_LEDS, CRGB::White);
  FastLED.show();
  delay(100);
  FastLED.setBrightness(prevBr);
}

// === Effect 6: Solid Yellow ===
void effect6_solidYellow() {
  fill_solid(leds, NUM_LEDS, CRGB::Yellow);
  FastLED.show();
  delay(100);
}

// === Effect 7: Solid Purple ===
void effect7_solidPurple() {
  fill_solid(leds, NUM_LEDS, CRGB::Purple);
  FastLED.show();
  delay(100);
}

// === Effect 8: Solid Green ===
void effect8_solidGreen() {
  fill_solid(leds, NUM_LEDS, CRGB::Green);
  FastLED.show();
  delay(100);
}

void setup() {
  Serial.begin(57600);
  // while (!Serial) {
  //   delay(10);
  // }
  delay(100);
  Serial.println("✅ Serial initialized");

  // Logging: about to read from flash
  Serial.println("🔍 Reading last effect from flash...");
  const uint8_t* flash_ptr = (const uint8_t*)(XIP_BASE + FLASH_TARGET_OFFSET);
  uint8_t last = *flash_ptr;
  Serial.print("🔍 Last effect read: ");
  Serial.println(last);

  // Determine next effect (wraps 0→1→...→7→0…)
  if (last < TOTAL_EFFECTS)
    currentEffect = (last + 1) % TOTAL_EFFECTS;
  else
    currentEffect = 0;
  Serial.print("⚙️ Determined currentEffect: ");
  Serial.println(currentEffect);

  // Logging: about to write to flash
  Serial.print("💾 Writing currentEffect to flash: ");
  Serial.println(currentEffect);
  uint32_t ints = save_and_disable_interrupts();
  flash_range_erase(FLASH_TARGET_OFFSET, FLASH_SECTOR_SIZE);
  flash_range_program(FLASH_TARGET_OFFSET, &currentEffect, sizeof(currentEffect));
  restore_interrupts(ints);
  Serial.println("💾 Flash write complete.");

  // Initialize LEDs with default brightness
  FastLED.addLeds<APA102, DATA_PIN, CLOCK_PIN, BGR>(leds, NUM_LEDS);
  FastLED.setBrightness(FULL_BRIGHTNESS);
  FastLED.setMaxPowerInMilliWatts(MAX_POWER_MILLIAMPS * 5);
  FastLED.setDither(0);
  FastLED.clear();
  FastLED.show();
}

void loop() {
  Serial.print("🔄 Looping effect #: ");
  Serial.println(currentEffect);

  switch (currentEffect) {
    case 0: effect1_loop(); break;
    case 1: effect2_smoothfade(); break;
    case 2: effect3_chasers(); break;
    case 3: effect4_solidRed(); break;
    case 4: effect5_solidWhiteHalf(); break;
    case 5: effect6_solidYellow(); break;
    case 6: effect7_solidPurple(); break;
    case 7: effect8_solidGreen(); break;
    default: effect1_loop(); break;
  }
}
