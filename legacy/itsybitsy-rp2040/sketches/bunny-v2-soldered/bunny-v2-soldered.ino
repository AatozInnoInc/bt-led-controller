#include <FastLED.h>

#define DATA_PIN 14              // GP14 / D5 — Data pin for external LEDs
#define CLOCK_PIN 18             // GP18 / SCK — Clock pin for external LEDs
#define NEOPIXEL_POWER_PIN 16    // Power control pin for built-in NeoPixel
#define NEOPIXEL_LED_PIN 17      // Built-in NeoPixel data pin (assumed WS2812)
#define NUM_EXTERNAL_LEDS 13
#define NUM_BUILTIN_LEDS 1
#define MAX_POWER_MILLIAMPS 500
#define TOTAL_LEDS (NUM_EXTERNAL_LEDS + NUM_BUILTIN_LEDS)

CRGB leds[NUM_EXTERNAL_LEDS];

const float BRIGHTNESS_FACTOR = 0.50f;
const uint8_t BRIGHTNESS = 255 * BRIGHTNESS_FACTOR;

// const uint8_t activeExternalIndices[] = {5, 10, 16, 22, 33, 45, 46, 55, 56, 66, 67, 76, 77};

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Starting FastLED test");

  // Power on the built-in NeoPixel
  pinMode(NEOPIXEL_POWER_PIN, OUTPUT);
  digitalWrite(NEOPIXEL_POWER_PIN, HIGH);

  // Setup APA102/SK9822 external LED strip with data + clock
  FastLED.addLeds<APA102, DATA_PIN, CLOCK_PIN, BGR>(leds, NUM_EXTERNAL_LEDS);
  
  // Setup built-in WS2812 (NeoPixel-style)
  // FastLED.addLeds<WS2812B, NEOPIXEL_LED_PIN, GRB>(leds + NUM_EXTERNAL_LEDS, NUM_BUILTIN_LEDS);

  FastLED.setBrightness(BRIGHTNESS);
  FastLED.setMaxPowerInMilliWatts(MAX_POWER_MILLIAMPS * 5); // 5V × 500mA = 2500 mW

  // Clear all LEDs first
  fill_solid(leds, NUM_EXTERNAL_LEDS, CRGB::Black);

  FastLED.show();

  Serial.println("Setup complete. LEDs updated.");
}

void loop() {
  Serial.println("Looping...");
  
  static uint8_t globalHue = 0; // Cycles through 0–255 (full hue spectrum)

  // Turn off all LEDs first
  fill_solid(leds, NUM_EXTERNAL_LEDS, CRGB::Black);

  // Set each active LED to a hue offset based on position
  for (uint8_t i = 0; i < NUM_EXTERNAL_LEDS; i++) {
    uint8_t index = i;
    // uint8_t hue = globalHue + i * 12;  // Offset each LED by 12 hue steps for variety
    // leds[index] = CHSV(hue, 255, BRIGHTNESS);
    leds[index] = CRGB::Orange;
  }

  FastLED.show();
  globalHue++;       // Increment global hue to animate the color wheel
  delay(330); // Adjust speed here
}

