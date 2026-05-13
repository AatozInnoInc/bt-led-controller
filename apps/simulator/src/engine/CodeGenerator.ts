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

  fade: () =>
    [
      `// fade() in the firmware reduces to a white fill — kept for parity.`,
      `fill_solid_buf(255, 255, 255);`,
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
};

// Patterns that live only in the simulator until a firmware port lands.
// Keeping them as comments so the generated snippet is still a valid C++ body.
const SIM_ONLY: Partial<Record<PatternId, string>> = {
  fire: 'fire is simulator-only — port the heat array (Uint8Array of LED_COUNT) first.',
  meteor: 'meteor is simulator-only — needs a fadeToBlackBy + head-position helper.',
  colorwipe: 'colorwipe is simulator-only — derive `step` from millis() and currentSettings.speed.',
  plasma: 'plasma is simulator-only — needs the two-sine palette helper.',
};

export function generateArduinoCode(preset: LedPreset): string {
  const { config, name } = preset;
  const builder = BODY[config.pattern];
  const inner = builder
    ? builder(preset)
    : `// ${SIM_ONLY[config.pattern] ?? 'pattern not yet templated'}\nclearBuf();`;

  const header = [
    `// Generated by LED Simulator`,
    `// Preset: ${name}`,
    `// Pattern: ${config.pattern} · color rgb(${config.color.r}, ${config.color.g}, ${config.color.b})`,
    `// Speed: ${config.speed} · Brightness: ${config.brightness}`,
  ].join('\n');

  return `${header}\nvoid customPattern() {\n${indent(inner)}\n  ledBufferChanged = true;\n  showLeds();\n}\n`;
}
