#include <FastLED.h>
#include <Adafruit_NeoPixel.h>

#define EXTERNAL_LED_PIN 14    // On RP 2040 AKA D5 or GP14
#define NEOPIXEL_POWER_PIN 16  // GPIO16 for RP 2040 https://learn.adafruit.com/adafruit-itsybitsy-rp2040/pinouts
#define NEOPIXEL_LED_PIN 17    // The built-in NeoPixel is on pin 8 for Feather, and GPIO17 for RP 2040 https://learn.adafruit.com/adafruit-itsybitsy-rp2040/pinouts
#define NUM_EXTERNAL_LEDS 12   // Eleven external LEDs
#define NUM_BUILTIN_LEDS 1     // One built-in LED
#define TOTAL_LEDS (NUM_EXTERNAL_LEDS + NUM_BUILTIN_LEDS)
#define MAX_POWER_MILLIAMPS 500  // Maximum power consumption in milliamps
#include <FastLED.h>
#include <Adafruit_NeoPixel.h>


CRGB externalLeds[NUM_EXTERNAL_LEDS];
Adafruit_NeoPixel builtInStrip = Adafruit_NeoPixel(NUM_BUILTIN_LEDS, NEOPIXEL_LED_PIN, NEO_GRB + NEO_KHZ800);

uint8_t hue = 0;
uint8_t brightness = 125; // Adjust the brightness value (0 to 255)

void setup() {
    Serial.println("Setup");

    // Initialize the external NeoPixel
    FastLED.addLeds<NEOPIXEL, EXTERNAL_LED_PIN>(externalLeds, NUM_EXTERNAL_LEDS);
    FastLED.setBrightness(brightness); // Set brightness for external LEDs
    //externalLeds[0] = CRGB::Blue; // Set the external NeoPixel to green
    //externalLeds[1] = CRGB::Blue; // Set the external NeoPixel to green
    //externalLeds[2] = CRGB::Blue; // Set the external NeoPixel to green
    //FastLED.show();

    // Initialize the built-in NeoPixel
    pinMode(NEOPIXEL_POWER_PIN, OUTPUT);
    // Enable power to the NeoPixel
    digitalWrite(NEOPIXEL_POWER_PIN, HIGH);
    builtInStrip.begin();
    builtInStrip.setBrightness(brightness); // Set brightness for the built-in LED
    builtInStrip.setPixelColor(0, builtInStrip.Color(0, 10, 25)); // Set the built-in NeoPixel to blue
    builtInStrip.show();


  for (int i = 0; i < NUM_EXTERNAL_LEDS; i++) {
    // externalLeds[i] = CHSV(hue + (i * 85), 255, brightness); // Use HSV to create a smooth transition with offset
    externalLeds[i] = CHSV(85, 255, 128); // Minty Green
    // externalLeds[i] = CHSV(0, 0, 100); // Use HSV to create a smooth transition with offset
  }
  FastLED.show();
}

void loop() {
  // hue++; // Increment the hue value to create a cycling effect

  // // Update the external NeoPixels with the new color
  // for (int i = 0; i < NUM_EXTERNAL_LEDS; i++) {
  //   // externalLeds[i] = CHSV(hue + (i * 85), 255, brightness); // Use HSV to create a smooth transition with offset
  //   externalLeds[i] = CHSV(85, 255, 128); // Minty Green
  //   // externalLeds[i] = CHSV(0, 0, 100); // Use HSV to create a smooth transition with offset
  // }
  // FastLED.show();
  // Serial.println("SLeeping to test this");

  // // Update the built-in NeoPixel with the new color
  // // uint32_t color = builtInStrip.Color(
  // //   (uint8_t)(sin(hue * 0.1) * 127 + 128), // Red
  // //   (uint8_t)(sin(hue * 0.1 + 2) * 127 + 128), // Green
  // //   (uint8_t)(sin(hue * 0.1 + 4) * 127 + 128)  // Blue
  // // );
  // // builtInStrip.setPixelColor(0, color);
  // // builtInStrip.show();

  // delay(75); // Small delay to slow down the cycling effect
  // Serial.print("End of loop. Hue: ");
  // Serial.println(hue);
}
