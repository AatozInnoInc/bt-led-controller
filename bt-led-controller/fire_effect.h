#pragma once
// Mirrors packages/led-engine/src/patterns/fire.ts
// Adapted from NightDriverStrip heat-map fire effect.
// Included from bt-led-controller.ino after globals (ledBuf, currentSettings, LED_COUNT,
// millis(), random(), min()) — extracted so dispatch + BLE handling stay readable.

// Maps a heat value (0–255) to a fire-palette RGB colour:
//   black → red → yellow → white
static RGB fireHeatColor(uint8_t heat) {
  uint8_t t192 = (uint8_t)((uint16_t)heat * 191 / 255);
  uint8_t ramp  = (uint8_t)((t192 & 0x3f) << 2);
  if (t192 > 0x80) return {255, 255, ramp};
  if (t192 > 0x40) return {255, ramp,   0};
  return {ramp, 0, 0};
}

// Fire effect entry point. heat[] is a static local — it persists across calls
// exactly like the TypeScript closure in createFire(ledCount).
void fire() {
  static uint8_t   heat[LED_COUNT] = {};
  static uint32_t  lastFireUpdate  = 0;

  float    spd      = (float)currentSettings.speed / 100.0f;
  float    cooling  = 2.0f  + (1.0f - spd) * 22.0f;
  float    ignProb  = 0.35f + spd * 0.55f;
  float    ignPower = 80.0f + spd * 130.0f;
  uint32_t frameMs  = (uint32_t)(80.0f - spd * 55.0f);

  uint32_t now = millis();
  if (now - lastFireUpdate < frameMs && lastFireUpdate != 0) {
    for (int i = 0; i < LED_COUNT; i++) ledBuf[i] = fireHeatColor(heat[i]);
    return;
  }
  lastFireUpdate = now;

  // Cool every cell
  for (int i = 0; i < LED_COUNT; i++) {
    uint8_t cool = (uint8_t)random((int)cooling + 1);
    heat[i] = heat[i] > cool ? heat[i] - cool : 0;
  }
  // Diffuse heat upward
  for (int i = LED_COUNT - 1; i >= 2; i--)
    heat[i] = (uint8_t)(((uint16_t)heat[i-1] + heat[i-2] + heat[i-2]) / 3);

  // Randomly ignite at the base
  if ((float)random(1000) / 1000.0f < ignProb) {
    uint8_t idx   = (uint8_t)random(min(7, LED_COUNT));
    uint8_t boost = (uint8_t)(160 + random((int)ignPower + 1));
    heat[idx] = (uint8_t)min(255, (int)heat[idx] + boost);
  }

  for (int i = 0; i < LED_COUNT; i++) ledBuf[i] = fireHeatColor(heat[i]);
}
