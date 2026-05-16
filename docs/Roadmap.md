# Roadmap

## v1 — Core simulator

Goal: a working, hosted browser tool that lets a developer design LED effects and export them to the firmware.

### Features

- LED strip canvas (SVG circles, glow effect, 16–144 LEDs, horizontal layout)
- All 10 patterns from `bt-led-controller.ino` ported to TypeScript
- Fire effect ported from NightDriverStrip (first bonus effect)
- Full mock BLE transport (CMD_VERIFY_OWNERSHIP, CMD_ENTER_CONFIG, CMD_CONFIG_UPDATE, CMD_COMMIT_CONFIG, CMD_EXIT_CONFIG)
- Color picker (HSV wheel + RGB sliders + hex input)
- Pattern panel (grid of effect cards, speed slider, brightness slider)
- Preset save/load via `localStorage`
- Preset export as `.json` file in companion RN app import format
- Arduino C++ code generator (solid, pulse, and fire to start; expand per pattern)
- URL hash share link (encodes `LedConfig` as base64)
- Deployed to Vercel

### Out of scope for v1

- Shared public gallery
- Multi-strip layouts
- Audio-reactive effects
- Native BLE connection to real hardware

---

## v1.5 — Polish and sharing

Goal: make the tool useful for clients and collaborators who are not developers.

### Features

- Supabase shared preset gallery (public read, authenticated write)
- "Share preset" one-click copy of URL hash link
- Meteor, colorwipe, and plasma effects (NightDriverStrip)
- LED count selector in UI (16 / 30 / 60 / 144 presets)
- Pattern preview thumbnails (static snapshots for the pattern grid)
- Improved code generator coverage (all 10 base patterns + fire)
- PWA manifest and install prompt (mobile use on the go)
- Basic analytics (Vercel analytics, no PII)

---

## v1.5 additions (in progress)

- Larson Scanner effect (KITT/Cylon bouncing dot with fading trail)
- Confetti effect (random coloured sparkles, FastLED DemoReel100 style)
- Color Fade effect (uniform hue-wheel rotation, replaces static white fill)
- Secondary-colour gradient picker (Color A / Color B for rainbow, chase, wave, plasma)
- Brightness scaling fixed in simulator output layer
- Work WITH THE USER to find good LED patterns on the internet. Start with a web search for popular, good LED patterns, then ask the user for approval on a set of patterns, with the goal of implementing 5 patterns E2E

---

## v2 — Advanced effects studio

Goal: support complex multi-parameter effects and become the primary design tool before any firmware work begins.

### Features

- **TODO: Pattern Maker** — an interactive canvas where a user can compose a new LED effect from scratch. Concept: define keyframes on a timeline (color, brightness, position) and the tool generates the interpolated animation + exports firmware C++ code. Should support both single-zone and per-LED keyframing. Prior art: WLED's segment timelines, Jinx! sequencer, xLights. Target: v2 milestone or a standalone v2.5.
- Effect parameter editor (expose per-effect knobs beyond speed/color, e.g. fire cooling rate, chase dot count)
- Effect sequencer (define a timed sequence of presets — play on loop or on trigger)
- Custom palette editor (define a named color palette, use it across effects)
- Larson Scanner, Confetti firmware ports (larson=14, confetti=15 currently sim-only)
- Starfield, spectrum, and twinkle-with-color effects (NightDriverStrip)
- Side-by-side A/B comparison view (two configs rendered simultaneously)
- Keyboard shortcuts for rapid iteration

---

## Future / under consideration

- **Native BLE connection** — connect the simulator directly to real hardware (Web Bluetooth API, Chromium only). This would make the mock transport optional and let the same UI control a physical device.
- **Guitar fretboard layout** — a second strip orientation that matches a guitar neck silhouette, useful for spatial effect design.
- **Effect marketplace** — community-contributed effects with one-click import into the companion RN app.
- **Waveform editor** — define custom animation curves (not just sine) for any parameter.
- **Multi-zone support** — model a device with multiple independent LED strips.
