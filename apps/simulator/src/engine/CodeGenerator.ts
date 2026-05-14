import type { LedPreset, PatternId } from '@bt-led/led-types';

// Generates a self-contained C++ function body that drops into bt-led-controller.ino
// alongside the existing pattern functions. Uses ONLY helpers already present in
// the firmware: sin8_approx, beat8_like, fill_solid_buf, fadeToBlackBy_buf,
// clearBuf, ledBuf, currentSettings, LED_COUNT, gamma8, hsv2rgb, blend_rgb,
// random(), map(), millis().

const indent = (s: string, n = 2): string =>
  s
    .split('\n')
    .map((l) => (l.length ? ' '.repeat(n) + l : l))
    .join('\n');

interface BodyBuilder {
  (preset: LedPreset): string;
}

const BODY: Partial<Record<PatternId, BodyBuilder>> = {
  off: () => 'clearBuf();',

  solid: ({ config }) =>
    [
      `// Solid colour from preset (overrides currentSettings.color)`,
      `fill_solid_buf(${config.color.r}, ${config.color.g}, ${config.color.b});`,
    ].join('\n'),

  rainbow: () =>
    [
      `// Red → white → blue cycle (1:1 with rainbow() in the .ino).`,
      `const RGB cycleColors[3] = { {255,0,0}, {255,255,255}, {0,0,255} };`,
      `for (int i = 0; i < LED_COUNT; i++) {`,
      `  float position = (float)i / (float)LED_COUNT;`,
      `  int colorIndex = (int)(position * 3) % 3;`,
      `  float blendFactor = (position * 3) - (int)(position * 3);`,
      `  ledBuf[i] = blend_rgb(cycleColors[colorIndex], cycleColors[(colorIndex + 1) % 3], (uint8_t)(blendFactor * 255));`,
      `}`,
    ].join('\n'),

  pulse: ({ config }) =>
    [
      `// Pulse with sine-wave brightness — speed maps to pulse period.`,
      `uint8_t r = ${config.color.r};`,
      `uint8_t g = ${config.color.g};`,
      `uint8_t b = ${config.color.b};`,
      ``,
      `uint32_t now = millis();`,
      `uint16_t pulsePeriod = map(${config.speed}, 0, 100, 4000, 500);`,
      `uint8_t pulsePhase = (uint8_t)((now % pulsePeriod) * 255 / pulsePeriod);`,
      `uint8_t pulseBrightness = sin8_approx(pulsePhase);`,
      ``,
      `for (int i = 0; i < LED_COUNT; i++) {`,
      `  ledBuf[i].r = (uint8_t)((uint16_t)r * pulseBrightness / 255);`,
      `  ledBuf[i].g = (uint8_t)((uint16_t)g * pulseBrightness / 255);`,
      `  ledBuf[i].b = (uint8_t)((uint16_t)b * pulseBrightness / 255);`,
      `}`,
    ].join('\n'),

  fade: ({ config }) =>
    [
      `// Colour Fade: entire strip cycles through the HSV colour wheel.`,
      `uint32_t period = (uint32_t)map(${config.speed}, 0, 100, 12000, 1000);`,
      `if (period == 0) period = 1;`,
      `uint8_t hue = (uint8_t)(((uint32_t)(millis() % period) * 256) / period);`,
      `RGB c = hsv2rgb(hue, 255, 255);`,
      `fill_solid_buf(c.r, c.g, c.b);`,
    ].join('\n'),

  chase: () =>
    [
      `// Three offset markers with a fading trail. CHASER_PULSE = 12 bpm.`,
      `uint8_t pos1 = map(beat8_like(12,   0), 0, 255, 0, LED_COUNT - 1);`,
      `uint8_t pos2 = map(beat8_like(12,  85), 0, 255, 0, LED_COUNT - 1);`,
      `uint8_t pos3 = map(beat8_like(12, 170), 0, 255, 0, LED_COUNT - 1);`,
      `fadeToBlackBy_buf(20);`,
      `ledBuf[pos1] = {255,   0,   0};`,
      `ledBuf[pos2] = {255, 255, 255};`,
      `ledBuf[pos3] = {  0,   0, 255};`,
    ].join('\n'),

  twinkle: () =>
    [
      `// 30% chance per LED to be lit white.`,
      `for (int i = 0; i < LED_COUNT; i++) {`,
      `  if (random(10) < 3) ledBuf[i] = {255, 255, 255};`,
      `  else                ledBuf[i] = {  0,   0,   0};`,
      `}`,
    ].join('\n'),

  wave: ({ config }) =>
    [
      `// Travelling HSV wave — speed controls the time-shift.`,
      `uint32_t now = millis();`,
      `uint8_t speedShift = map(${config.speed}, 0, 100, 4, 1);`,
      `uint8_t timePhase = (uint8_t)(now >> speedShift);`,
      `for (int i = 0; i < LED_COUNT; i++) {`,
      `  uint8_t positionPhase = (uint8_t)((i * 255) / LED_COUNT);`,
      `  uint8_t wavePhase = timePhase + positionPhase;`,
      `  uint8_t sineVal = sin8_approx(wavePhase);`,
      `  uint8_t v = gamma8[sineVal];`,
      `  ledBuf[i] = hsv2rgb(wavePhase, 255, v);`,
      `}`,
    ].join('\n'),

  breath: () =>
    [
      `// Grayscale breath — single shared brightness from a /8 ms sine.`,
      `uint8_t b = (uint8_t)((sin8_approx((uint8_t)(millis() >> 3)) + 1) >> 1);`,
      `fill_solid_buf(b, b, b);`,
    ].join('\n'),

  strobe: ({ config }) =>
    [
      `// Strobe — speed maps to flash period; baked color from preset.`,
      `uint32_t now = millis();`,
      `uint16_t strobePeriod = map(${config.speed}, 0, 100, 1000, 50);`,
      `bool strobeState = ((now / strobePeriod) % 2) == 0;`,
      ``,
      `if (strobeState) {`,
      `  fill_solid_buf(${config.color.r}, ${config.color.g}, ${config.color.b});`,
      `} else {`,
      `  clearBuf();`,
      `}`,
    ].join('\n'),

  meteor: ({ config }) =>
    [
      `// Meteor: 2-LED head sweeps the strip with a fading trail.`,
      `uint16_t period = map(${config.speed}, 0, 100, 5000, 600);`,
      `uint32_t now = millis();`,
      `int head = (int)(((now % period) * (uint32_t)(LED_COUNT + 2)) / period);`,
      `fadeToBlackBy_buf(64);`,
      `RGB c = { ${config.color.r}, ${config.color.g}, ${config.color.b} };`,
      `for (int i = 0; i < 2; i++) {`,
      `  int idx = head - i;`,
      `  if (idx >= 0 && idx < LED_COUNT) ledBuf[idx] = c;`,
      `}`,
    ].join('\n'),

  colorwipe: ({ config }) =>
    [
      `// Color wipe: fill pixel-by-pixel, then erase, then repeat.`,
      `uint32_t stepMs = map(${config.speed}, 0, 100, 200, 20);`,
      `if (stepMs < 1) stepMs = 1;`,
      `uint32_t cycle = stepMs * (uint32_t)LED_COUNT * 2;`,
      `uint32_t step = (millis() % cycle) / stepMs;`,
      `bool filling = step < (uint32_t)LED_COUNT;`,
      `int cursor = filling ? (int)step : (int)(step - LED_COUNT);`,
      `RGB on = { ${config.color.r}, ${config.color.g}, ${config.color.b} };`,
      `for (int i = 0; i < LED_COUNT; i++) {`,
      `  bool lit = filling ? (i <= cursor) : (i > cursor);`,
      `  ledBuf[i] = lit ? on : (RGB){0, 0, 0};`,
      `}`,
    ].join('\n'),

  plasma: ({ config }) =>
    [
      `// Plasma: two phase-shifted sines drive HSV hue + value. Palette-driven.`,
      `uint8_t speedShift = map(${config.speed}, 0, 100, 5, 1);`,
      `uint8_t t = (uint8_t)(millis() >> speedShift);`,
      `for (int i = 0; i < LED_COUNT; i++) {`,
      `  uint8_t pos = (uint8_t)((i * 255) / LED_COUNT);`,
      `  uint8_t wave1 = sin8_approx((uint8_t)(pos + t));`,
      `  uint8_t wave2 = sin8_approx((uint8_t)(pos * 2 + (uint8_t)(255 - t)));`,
      `  uint8_t hue = (uint8_t)(((uint16_t)wave1 + (uint16_t)wave2) >> 1);`,
      `  uint8_t v = gamma8[(uint8_t)((sin8_approx((uint8_t)(pos + (t << 1))) >> 1) + 96)];`,
      `  ledBuf[i] = hsv2rgb(hue, 255, v);`,
      `}`,
    ].join('\n'),

  fire: ({ config }) =>
    [
      `// NightDriverStrip heat-map fire. heat[] and lastFireUpdate are static`,
      `// locals — they persist across calls on real hardware.`,
      `static uint8_t heat[LED_COUNT] = {};`,
      `static uint32_t lastFireUpdate = 0;`,
      `float spd      = ${(config.speed / 100).toFixed(2)}f;`,
      `float cooling  = 2.0f + (1.0f - spd) * 22.0f;`,
      `float ignProb  = 0.35f + spd * 0.55f;`,
      `float ignPower = 80.0f + spd * 130.0f;`,
      `uint32_t frameMs = (uint32_t)(80.0f - spd * 55.0f);`,
      `uint32_t nowMs = millis();`,
      `if (nowMs - lastFireUpdate < frameMs && lastFireUpdate != 0) {`,
      `  for (int i = 0; i < LED_COUNT; i++) {`,
      `    uint8_t t192 = (uint8_t)((uint16_t)heat[i] * 191 / 255);`,
      `    uint8_t ramp = (uint8_t)((t192 & 0x3f) << 2);`,
      `    if (t192 > 0x80)      ledBuf[i] = {255, 255, ramp};`,
      `    else if (t192 > 0x40) ledBuf[i] = {255, ramp, 0};`,
      `    else                  ledBuf[i] = {ramp, 0, 0};`,
      `  }`,
      `  return;`,
      `}`,
      `lastFireUpdate = nowMs;`,
      `for (int i = 0; i < LED_COUNT; i++) {`,
      `  uint8_t cool = (uint8_t)(random((int)cooling + 1));`,
      `  heat[i] = heat[i] > cool ? heat[i] - cool : 0;`,
      `}`,
      `for (int i = LED_COUNT - 1; i >= 2; i--)`,
      `  heat[i] = (uint8_t)(((uint16_t)heat[i-1] + heat[i-2] + heat[i-2]) / 3);`,
      `if ((float)random(1000) / 1000.0f < ignProb) {`,
      `  uint8_t idx   = (uint8_t)random(min(7, LED_COUNT));`,
      `  uint8_t boost = (uint8_t)(160 + random((int)ignPower + 1));`,
      `  heat[idx] = (uint8_t)min(255, (int)heat[idx] + boost);`,
      `}`,
      `for (int i = 0; i < LED_COUNT; i++) {`,
      `  uint8_t t192 = (uint8_t)((uint16_t)heat[i] * 191 / 255);`,
      `  uint8_t ramp = (uint8_t)((t192 & 0x3f) << 2);`,
      `  if (t192 > 0x80)      ledBuf[i] = {255, 255, ramp};`,
      `  else if (t192 > 0x40) ledBuf[i] = {255, ramp, 0};`,
      `  else                  ledBuf[i] = {ramp, 0, 0};`,
      `}`,
    ].join('\n'),
};

// Patterns not yet ported to firmware. Generated body still compiles (clearBuf stub).
const SIM_ONLY: Partial<Record<PatternId, string>> = {
  larson: 'larson is simulator-only — port fadeToBlackBy_buf + triangle-wave position helper.',
  confetti: 'confetti is simulator-only — port random HSV sparkle logic; needs random(256) for hue.',
};

export function generateArduinoCode(preset: LedPreset): string {
  const { config, name } = preset;
  const builder = BODY[config.pattern];
  const inner = builder
    ? builder(preset)
    : `// ${SIM_ONLY[config.pattern] ?? 'pattern not yet templated'}\nclearBuf();`;

  const sec = config.secondaryColor;
  const header = [
    `// Generated by LED Simulator`,
    `// Preset: ${name}`,
    `// Pattern: ${config.pattern} · color rgb(${config.color.r}, ${config.color.g}, ${config.color.b})${sec ? ` → rgb(${sec.r}, ${sec.g}, ${sec.b})` : ''}`,
    `// Speed: ${config.speed} · Brightness: ${config.brightness}`,
  ].join('\n');

  return `${header}\nvoid customPattern() {\n${indent(inner)}\n  ledBufferChanged = true;\n  showLeds();\n}\n`;
}
