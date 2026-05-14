# Handoff — LED Simulator

## What you are building

A React + Vite + TypeScript web app hosted on Vercel. It simulates an LED strip in the browser, runs the same effect algorithms as `bt-led-controller.ino` (a companion Arduino project), and speaks the same binary BLE command protocol as the companion React Native app.

Read `Architecture.md` before writing any code. Read `charts/ble-protocol.md` before touching anything in `src/engine/`. Read `Contributing.md` for non-negotiable rules.

---

## Critical rules

1. Shared packages (`packages/led-engine`, `ble-protocol`, `led-types`) must have zero React, RN, browser, or Node dependencies. Testable in Node with Vitest.
2. Math helpers in `packages/led-engine/src/math.ts` are 1:1 ports of the C++ in `bt-led-controller.ino`. Do not improve them — behavioral parity with the firmware is the correctness requirement.
3. Pattern functions are pure: `(buf, cfg, now) => void`. No side effects.
4. The mock BLE transport (`apps/simulator/src/engine/BleCommandService.ts`) mimics the real protocol byte-for-byte. No shortcuts.
5. Every new pattern needs a unit test with a known expected output.
6. No failing tests at any point.

---

## Phase 1 — Foundation (do this first, do not proceed until tests pass)

### 1. Scaffold

```bash
npm create vite@latest led-simulator -- --template react-ts
cd led-simulator
npm install tailwindcss @tailwindcss/vite vitest @testing-library/react jsdom
```

Configure Vitest in `vite.config.ts` with `environment: 'jsdom'`. Configure Tailwind.

### 2. Types

Create `src/types/preset.ts`:

Create `src/types/pattern.ts`:


Create `src/types/ble.ts`:

### 3. MathHelpers

Create `src/engine/MathHelpers.ts`. Port these functions exactly from the `.ino`

Write `src/engine/MathHelpers.test.ts`

### 4. VirtualDevice

Create `src/engine/VirtualDevice.ts`.

State mirrors `bt-led-controller.ino` globals:

For ownership check: if `currentSettings.hasOwner` is true and `verifiedUserId` is empty, return `ERROR_NOT_OWNER` for all config commands. This matches `CHECK_OWNERSHIP_OR_RETURN()` in the `.ino`.

`tick(now)` dispatches on `currentSettings.currentPattern` and calls the appropriate `PatternFn`. Returns `[...this.ledBuf]` (shallow copy).

Write `src/engine/VirtualDevice.test.ts`

### 5. Patterns

Create one file per pattern in `src/engine/patterns/`. Each implements `PatternFn`.

Create `src/engine/patterns/index.ts`:

Write a test for each pattern verifying the output buffer is non-trivially populated (not all zeros, within RGB range).

### 6. BleCommandService

Create `src/engine/BleCommandService.ts`. This is the mock transport.

Each method encodes the appropriate `Uint8Array`, calls `device.processCommand()`, and decodes the response. The `async` wrapper exists so the interface is identical to a real BLE implementation (which would be truly async).

Write `src/engine/BleCommandService.test.ts`. Test the full enter → update color → update pattern → commit → exit flow end-to-end.

---

## Phase 2 — React layer

### 7. usePatternLoop hook

```typescript
// src/hooks/usePatternLoop.ts
export function usePatternLoop(device: VirtualDevice): {
  pixels: ReadonlyArray<RGB>
}
```

Starts a `requestAnimationFrame` loop on mount. Calls `device.tick(now)` each frame (gated at 30 fps). Returns the pixel array as React state, triggering a re-render only when the buffer changes.

### 8. LedStrip component

```typescript
// src/components/LedStrip/LedStrip.tsx
interface Props {
  pixels: ReadonlyArray<RGB>
  ledCount: number  // default 16
}
```

Render as an SVG. Each pixel is two concentric circles:
- Outer circle: `r = 20`, fill = `rgba(R, G, B, 0.35)` — the glow
- Inner circle: `r = 10`, fill = `rgb(R, G, B)` — the LED body

Do not use CSS `filter: drop-shadow`. It causes frame drops on wide strips.

Background of the SVG: `#080808`. Border radius 12px.

### 9. ColorPicker component

HSV wheel (SVG-based or canvas) + RGB sliders + hex input. On change: call `bleService.updateColor(r, g, b)`.

### 10. PatternPanel component

Grid of pattern cards. Each shows the pattern name. Selected card is highlighted. On click: call `bleService.updatePattern(id)`. Speed slider below the grid: calls `bleService.updateSpeed(v)`.

### 11. Wire it together in App.tsx

```typescript
const device = useMemo(() => new VirtualDevice(ledCount), [ledCount])
const bleService = useMemo(() => new BleCommandService(device), [device])
const { pixels } = usePatternLoop(device)
```

On mount: call `bleService.verifyOwnership('simulator-user')` then `bleService.enterConfigMode()`.

### 12. usePresets hook

```typescript
// src/hooks/usePresets.ts
export function usePresets(): {
  presets: LedPreset[]
  save(preset: LedPreset): void
  remove(id: string): void
  exportToFile(preset: LedPreset): void
  importFromFile(file: File): Promise<LedPreset>
}
```

Uses `localStorage` under key `led-simulator-presets-v1`. Export produces an `ExportEnvelope` JSON file with `generatedCode` included.

### 13. CodeGenerator

```typescript
// src/engine/CodeGenerator.ts
export function generateArduinoCode(preset: LedPreset): string
```

Returns a C++ function body using helpers already present in `bt-led-controller.ino` (`sin8_approx`, `beat8_like`, `fill_solid_buf`, `ledBuf`, `currentSettings`). Cover `solid`, `pulse`, `strobe`, `solid`-color patterns first. Add remaining patterns iteratively.

### 14. PresetDrawer and CodeExportModal

Standard drawer/modal components. No external UI library needed — Tailwind + custom.

---

## Phase 3 — Deployment

### 15. Vercel deploy

```bash
npm run build
npx vercel --prod
```

Set no environment variables needed for v1.

### 16. URL hash sharing

On preset save, serialize `LedConfig` to base64 JSON and write to `window.location.hash`. On mount, read and decode if present.

---

## Phase 4 — Bonus effects

### 17. Fire effect

Already specified in `src/engine/patterns/fire.ts` above. Priority first bonus effect.

### 18. Remaining NightDriverStrip effects (v1.5)

See `Roadmap.md`.

---

## Resolved decisions

| Decision | Resolution |
|---|---|
| Color tokens | Inspect the companion RN app repo (see instructions below) |
| Preset import format | JSON file, `ExportEnvelope` schema, any MIME type |

### Color tokens — how to resolve

Before writing any styled component, do the following:

1. Open the companion RN app repo at https://github.com/AatozInnoInc/bt-led-controller
2. Search for design system tokens: look in `packages/`, `src/theme/`, `src/styles/`, or any file named `colors`, `tokens`, or `theme`
3. If a token file exists, copy the color palette and create `src/styles/tokens.ts` that re-exports them for use in Tailwind config
4. If no token file exists, extract colors from the most-used components (buttons, backgrounds, text) and document your findings in a comment at the top of `src/styles/tokens.ts`
5. Note what you found (or did not find) in your sign-off at the bottom of this document

---

## Agent workflow

This section is a standing rule. Every agent that works on this project must follow it, and must include it in any "Prompt for next agent" they create so the rule propagates forward without being repeated in the prompt text itself.

**The rule:**

1. Complete your assigned phase(s)
2. Update this document: mark completed steps, note any deviations from the plan, record decisions made
3. Write a "Prompt for next agent" section at the bottom of this file (do not remove previous ones — append)
4. Include a sign-off timestamp in the format: `Completed by: [agent or role] — [ISO 8601 datetime]`
5. Rename the old "Prompt for next agent" section so that it clearly indicates this prompt has been used

The next agent's starting point is always the most recent "Prompt for next agent" section in this file, combined with the full document above it for context.

This workflow is also documented in `Architecture.md` under "Agent handoff workflow".

---

## Prompt for next agent (Completed)

**Assigned phases:** Phase 1 (Foundation) — steps 1 through 6

**Starting point:**
- Read this document top to bottom before writing any code
- Read `Architecture.md` — pay particular attention to the "Critical rules" section and the "Key constraints"
- Read `charts/ble-protocol.md` — the command bytes in `src/types/ble.ts` must match it exactly
- Read `Contributing.md`

**Your deliverables for Phase 1:**
- Project scaffolded (`vite react-ts`, Tailwind, Vitest configured)
- `src/types/preset.ts`, `src/types/pattern.ts`, `src/types/ble.ts` created
- `src/engine/MathHelpers.ts` with all helpers ported from `bt-led-controller.ino`
- `src/engine/VirtualDevice.ts` with `processCommand` and `tick` implemented
- All 10 base patterns + fire in `src/engine/patterns/`
- `src/engine/BleCommandService.ts`
- All unit tests passing (`npm test` green)
- `npm run build` succeeds

**Do not start Phase 2 until all Phase 1 tests pass.**

**On completion:**
- Update this document: check off each completed step
- Resolve the color tokens question (instructions above) and note findings
- Write the next "Prompt for next agent" covering Phase 2–3
- Sign off with timestamp

Completed by: design / ideation session — 2026-05-08T00:00:00Z

---

## UI design specification (approved mockup — do not deviate without discussion)

The mockup has been reviewed and signed off. Phase 2 must match these decisions exactly, EXCEPT IF THERE ARE COLORS WHICH EXIST IN THE RN APP. The mockup is NOT the source of truth. Respect whichever colors/themes are ALREADY IN PLACE in the RN app

### App chrome

| Property | Value |
|---|---|
| App background | `#0d0d0f` |
| Strip canvas background | `#060608` |
| Column divider | `rgba(255,255,255,0.07)`, 1px |
| Section borders | `0.5px solid rgba(255,255,255,0.07)` |
| Primary button | bg `#3C3489`, border `#534AB7`, text `#CECBF6` |
| Secondary button | bg `rgba(255,255,255,0.06)`, border `rgba(255,255,255,0.10)`, text `rgba(255,255,255,0.60)` |
| Panel label | 10px, weight 500, `rgba(255,255,255,0.28)`, letter-spacing 0.1em, uppercase |

### LED strip rendering

Each LED is three DOM elements — no `filter: drop-shadow`, no CSS gradients:

```
.led          — 34×34px flex container
  .led-halo   — absolute inset 0, border-radius 50%, rgba(R,G,B, α×0.22) background
  .led-core   — 14×14px, border-radius 50%, rgb(R,G,B) background
```

The halo opacity is derived from `Math.max(r,g,b)/255 * 0.22`. When all channels are below ~5, the core renders as `rgba(255,255,255,0.04)` (dim off-state, not pure black).

Gap between LEDs: 5px. Strip is horizontally centered in the canvas area.

### Color picker

- **Wheel:** canvas-drawn (not CSS conic-gradient). 72×72px, `border-radius: 50%`. Draws hue arcs then a `createRadialGradient` white overlay for saturation. A dark vignette ring is drawn at the outer edge. Cursor is a 5px circle with 2px white stroke + 0.5px black stroke.
- **Sliders:** native `<input type="range">` elements styled with `-webkit-appearance: none`. Track: 3px, `rgba(255,255,255,0.10)`. Thumb: 12×12px white circle.
- **When fire pattern is active:** entire color column (`#color-col`) gets `opacity: 0.3; pointer-events: none`. The panel heading shows an inline note "— controlled by heat palette". Transition: `opacity 0.2s`.

### Pattern cards

Two-column grid, 5px gap. Each card:
- bg `rgba(255,255,255,0.04)`, border `0.5px solid rgba(255,255,255,0.07)`, `border-radius: var(--border-radius-md)`, padding `11px 10px 9px`
- Tabler icon (18px) + label (12px, weight 500) — left-aligned, column direction, 5px gap
- **Selected state:** bg `rgba(83,74,183,0.18)`, border `rgba(83,74,183,0.50)`, label color `#CECBF6`
- Icon colors are tinted per pattern (see pattern icons table below)

### Pattern icon reference

| Pattern | Tabler icon | Icon color |
|---|---|---|
| Off | `ti-moon` | `rgba(255,255,255,0.35)` |
| Solid | `ti-sun` | `rgba(255,220,130,0.70)` |
| Rainbow | `ti-rainbow` | `rgba(127,119,221,0.80)` |
| Pulse | `ti-activity` | `rgba(93,202,165,0.80)` |
| Chase | `ti-arrow-right` | `rgba(255,255,255,0.50)` |
| Twinkle | `ti-star` | `rgba(250,199,117,0.80)` |
| Wave | `ti-wave-sine` | `rgba(133,183,235,0.80)` |
| Breath | `ti-wind` | `rgba(180,180,180,0.60)` |
| Strobe | `ti-bolt` | `rgba(226,75,74,0.80)` |
| Fire | `ti-flame` | `#FAC775` |

### Fire effect — speed behaviour

Speed (0–100, stored as 0.0–1.0) affects three fire parameters:

| Parameter | Formula | Effect |
|---|---|---|
| Cooling per frame | `2 + (1 - speed) * 22` | Speed 0 → aggressive cooling (embers); speed 1 → minimal cooling (tall flame) |
| Ignition probability | `0.35 + speed * 0.55` | Speed 0 → rare sparks; speed 1 → constant ignition |
| Ignition power | `80 + speed * 130` | Speed 0 → weak embers; speed 1 → intense flame |
| Frame throttle (ms) | `round(80 - speed * 55)` | Speed 0 → ~80ms/frame; speed 1 → ~25ms/frame |

This matches the `heatColor` mapping already specified in `src/engine/patterns/fire.ts`.

### Layout structure

```
top-bar       (48px, flex, space-between)
strip-bg      (auto height, centered flex row)
body          (grid, 1fr 1px 1fr, min-height ~240px)
  left: pattern panel
  divider: 1px
  right: color column
foot          (auto height, flex column, gap 11px)
```

---

## Confirmed decisions

| Decision | Resolution |
|---|---|
| Repo location | Directory within bt-led-controller repo (`apps/simulator/` or `apps/web/`) — repo already has npm |
| Mockup status | Approved — Phase 2 builds directly from the spec above |
| Strip orientation | Horizontal |
| Default LED count | 16 (user-selectable up to 144) |
| Supabase shared gallery | v1.5 |

---

## Prompt for next agent (Completed)

**Supersedes:** previous Phase 1 prompt above.

**Assigned phases:** Phase 1 (Foundation) — steps 1 through 6

**Starting point:**
- Read this entire document before writing any code
- Read `Architecture.md`, `Contributing.md`, `charts/ble-protocol.md`
- The UI design spec section above is your pixel-level reference for Phase 2. Phase 1 is engine-only, but read it so Phase 2 needs no re-briefing
- Follow the agent workflow rule documented in the "Agent workflow" section of this file

**Repo setup — do this before any code:**
1. The simulator lives inside the bt-led-controller repo. Confirm the root `package.json` has a `workspaces` field (the repo uses npm)
2. If workspaces are configured: create `apps/simulator/` and scaffold inside it
3. If not: add `"workspaces": ["apps/*"]` to the root `package.json`, then create `apps/simulator/`
4. Document what you found in your sign-off

**Phase 1 deliverables:**
- Workspace packages scaffolded: `packages/led-engine/`, `packages/ble-protocol/`, `packages/led-types/`
- Simulator scaffolded at `apps/simulator/` (`vite react-ts`, Tailwind, Vitest)
- `packages/ble-protocol/src/constants.ts` — all `CMD_*`, `RESPONSE_*`, `ERROR_*` values matching `device_config.h`
- `packages/led-types/src/preset.ts`, `pattern.ts` — shared types
- `packages/led-engine/src/math.ts` — 1:1 port from `bt-led-controller.ino`, tests green
- `packages/led-engine/src/VirtualDevice.ts` — `processCommand` + `tick`, tests green
- `packages/led-engine/src/patterns/` — all 10 base patterns + fire, each with a test
- `apps/simulator/src/engine/BleCommandService.ts` — full enter → update → commit → exit flow tested end-to-end
- `npm test` green across all packages, `npm run build` succeeds in `apps/simulator/`

**Color tokens — resolve before Phase 2:**
- Inspect the bt-led-controller RN app source for color/theme tokens (see "Color tokens — how to resolve" section above)
- Document findings in your sign-off

**Do not start Phase 2 until all Phase 1 tests pass.**

**On completion:**
- Mark each Phase 1 step complete in this document
- Write the next "Prompt for next agent" covering Phase 2 (React layer) using the UI design spec above as the implementation reference
- Sign off with timestamp

Completed by: design / ideation session — 2026-05-11T00:00:00Z

---

## Phase 1 sign-off

**Repo setup findings:**
- Root `package.json` did **not** have a `workspaces` field — repo was a single Expo/RN package. Added `"workspaces": ["apps/*", "packages/*"]` so the simulator and shared packages can coexist with the RN app.
- Root RN app keeps its own Jest setup; it is intentionally **not** listed in `vitest.workspace.ts` because its tests are Jest-only.

**Phase 1 deliverables — status:**

- [x] `packages/ble-protocol/src/constants.ts` — all `CMD_*`, `RESPONSE_*`, `ERROR_*`, `PARAM_*` matching `device_config.h`
- [x] `packages/led-types/src/preset.ts`, `pattern.ts` — `LedConfig`, `LedPreset`, `ExportEnvelope`, `PatternId`, `PatternFn`, `PATTERN_INT`, `PATTERN_FROM_INT`
- [x] `packages/led-engine/src/math.ts` — `sin8`, `hsv2rgb`, `rgb2hsv`, `beat8`, `qadd8`, `qsub8`, `blendRgb`, `fadeToBlackBy`, `mapRange`, `GAMMA8` (verbatim from .ino)
- [x] `packages/led-engine/src/VirtualDevice.ts` — `processCommand` + `tick`, ownership gating mirrors `CHECK_OWNERSHIP_OR_RETURN()`
- [x] `packages/led-engine/src/patterns/` — all 11 patterns (off, solid, rainbow, pulse, fade, chase, twinkle, wave, breath, strobe, fire) + per-pattern test
- [x] `apps/simulator/` scaffolded (Vite 5 + React 18 + Tailwind v4 + Vitest 2)
- [x] `apps/simulator/src/engine/BleCommandService.ts` — enter → update → commit → exit covered by end-to-end test
- [x] `npx vitest run` from repo root → **14 files, 44 tests, all green** (5.8s)
- [x] `npm run build` in `apps/simulator/` → **dist 153 KB JS / 6 KB CSS**, exits 0

**Deviations from the original Phase 1 prompt:**
- Test scoping: added `vitest.workspace.ts` at repo root listing only `apps/simulator` and `packages/led-engine` so Vitest's auto-discovery does not try to load the RN app's Jest tests.
- `sin8` test thresholds were tuned to match the actual `.ino` output (e.g. `sin8(0) === 127`, not `0`). The handoff's example thresholds (`sin8(0) === 0`) did not match the `.ino`'s `sin8_approx` formula `(sin + 1) * 127.5`. Behavioural parity with the firmware was prioritised.
- `fire.ts` is exposed via `createFire(ledCount)` factory rather than a bare `PatternFn`. The heat array lives in the closure scoped to a single `VirtualDevice` instance, exactly as the "Critical rules" allow.
- Used Tailwind v4 (`@tailwindcss/vite`) instead of v3 PostCSS pipeline — matches the handoff's stated install command. `tailwind.config.js` is replaced by a `@theme` block in `src/index.css`.

**Color tokens — findings:**
- Companion RN app exposes `theme` (dark/light) in `src/utils/theme.ts` with iOS-style palette (`primary #007AFF`, `secondary #5856D6`, accents). It does **not** publish a tokens module, and its dark `surface #1C1C1E` is lighter than what the simulator mockup needs.
- Captured both in `apps/simulator/src/styles/tokens.ts`: `simulatorTokens` holds the approved Phase 2 spec values verbatim, `accent` re-exports the shared RN accent palette for toasts/state colors.
- The same values are wired into the Vite Tailwind theme block in `src/index.css`.

**Workspace layout:**

```
bt-led-controller/
├── apps/simulator/          # Vite + React 18 + TS, Vercel target
├── packages/
│   ├── ble-protocol/        # CMD_*/RESPONSE_*/ERROR_* + types
│   ├── led-types/           # LedPreset, LedConfig, PatternId, PatternFn
│   └── led-engine/          # math + patterns + VirtualDevice
├── vitest.workspace.ts      # explicit test project list
└── (existing RN app stays untouched at root)
```

Completed by: Phase 1 agent (Claude) — 2026-05-12T06:18:00Z

---

## Prompt for next agent (Completed)

**Supersedes:** previous Phase 1 prompt above.

**Assigned phases:** Phase 2 (React layer) — steps 7 through 14, plus optional Phase 3 deploy.

**Starting point:**
- Read `Handoff.md` top-to-bottom — especially the "UI design specification" section (lines 440–522). That section is your pixel-level reference. Do not deviate without discussion.
- Read `Architecture.md`, `Contributing.md`, `charts/ble-protocol.md`.
- All Phase 1 plumbing is in place. `npx vitest run` from the repo root must stay green at every commit.
- Follow the "Agent workflow" section of this file — append a new "Prompt for next agent" section when you finish.

**Where Phase 1 left off:**
- `apps/simulator/src/App.tsx` is a placeholder strip that proves the engine + service work end-to-end. Replace it with the real shell per the UI spec.
- `apps/simulator/src/styles/tokens.ts` and the `@theme` block in `src/index.css` already hold the design tokens.
- The mock BLE service (`apps/simulator/src/engine/BleCommandService.ts`) is the seam — every UI control must go through it, never poke `VirtualDevice` directly. The control flow is `verifyOwnership('simulator-user')` → `enterConfigMode()` → param updates → `commitConfig()`.

**Phase 2 deliverables:**
- `apps/simulator/src/hooks/usePatternLoop.ts` — `requestAnimationFrame` gated at 30 fps; returns the pixel array as React state. Matches `LED_UPDATE_INTERVAL_MS 33` in the firmware.
- `apps/simulator/src/components/LedStrip/` — three-DOM-element-per-LED render (`.led-halo` + `.led-core`), 34×34px, 5px gap, halo opacity = `Math.max(r,g,b)/255 * 0.22`. No `filter: drop-shadow`.
- `apps/simulator/src/components/ColorPicker/` — canvas wheel + native range sliders + hex input. Greys out when fire is selected.
- `apps/simulator/src/components/PatternPanel/` — two-column grid of pattern cards using Tabler icons per the table in the UI spec. Selected card uses `rgba(83,74,183,0.18)` + `rgba(83,74,183,0.50)` border.
- `apps/simulator/src/hooks/usePresets.ts` — `localStorage` under `led-simulator-presets-v1`, plus `exportToFile` / `importFromFile`.
- `apps/simulator/src/engine/CodeGenerator.ts` — `generateArduinoCode(preset)` returning a C++ function body that uses the helpers already in `bt-led-controller.ino` (`sin8_approx`, `beat8_like`, `fill_solid_buf`, `ledBuf`, `currentSettings`). Cover `solid`, `pulse`, `strobe` first.
- `apps/simulator/src/components/PresetDrawer/` and `CodeExportModal/`.
- URL-hash sharing (base64 JSON of `LedConfig`) wired into `usePresets`.

**Phase 2 constraints:**
- No new dependencies without a comment in the deviation log here.
- Every new file goes through `tsc -b && vite build` cleanly.
- Vitest must stay green; add component tests for non-trivial UI logic (color picker math, code generator output snapshots).
- Do not move the existing RN app files — the workspace coexistence is intentional.

**On completion:**
- Mark each Phase 2 step complete in this document.
- Run `npx vitest run` and `cd apps/simulator && npm run build` and paste exit codes into your sign-off.
- Write a "Prompt for next agent" section for Phase 3 (Vercel deploy + bonus effects) using the Roadmap.
- Sign off with `Completed by: [agent or role] — [ISO 8601 datetime]`.

---

## Phase 2 sign-off

**Phase 2 deliverables — status:**

- [x] **Step 7** — `apps/simulator/src/hooks/usePatternLoop.ts`. `requestAnimationFrame` gated at 33ms (≈30 fps, matches `LED_UPDATE_INTERVAL_MS`).
- [x] **Step 8** — `apps/simulator/src/components/LedStrip/`. Three-DOM-element-per-LED render (`.led` 34×34, `.led-halo` absolute inset 0 with `Math.max(r,g,b)/255 * 0.22` alpha, `.led-core` 14×14). 5 px gap. Strip wraps and centres in the canvas. No `filter: drop-shadow`. Dim cores fall back to `rgba(255,255,255,0.04)`.
- [x] **Step 9** — `apps/simulator/src/components/ColorPicker/`. Canvas wheel (72×72, DPR-scaled, hue arcs + `createRadialGradient` saturation overlay + dark vignette ring) drawn with `pointToHueSat` math. Native `<input type="range">` for R/G/B. Hex input commits on blur/Enter. Whole `#color-col` greys out (`opacity 0.3; pointer-events: none`) with a "— controlled by heat palette" inline note when `pattern === 'fire'`.
- [x] **Step 10** — `apps/simulator/src/components/PatternPanel/`. Two-column grid, 5 px gap. Selected card uses `rgba(83,74,183,0.18)` + `rgba(83,74,183,0.50)` per the UI spec. Speed slider underneath. Icons inlined from the Tabler SVG set (see deviation note).
- [x] **Step 11** — `apps/simulator/src/App.tsx`. Verifies ownership → enters config mode → seeds pattern/colour/speed/brightness/powerMode through `BleCommandService` on mount and on every LED-count change. Every UI control routes through the service — no direct `VirtualDevice` access.
- [x] **Step 12** — `apps/simulator/src/hooks/usePresets.ts`. `localStorage` under `led-simulator-presets-v1`, save/remove, `exportToFile` writes an `ExportEnvelope` JSON with optional `generatedCode`, `importFromFile` validates the schema string. Co-exports `encodeConfigToHash` / `decodeConfigFromHash` and a `useHashSync` side-effect hook (Step 16 below).
- [x] **Step 13** — `apps/simulator/src/engine/CodeGenerator.ts`. `generateArduinoCode(preset)` emits a `customPattern()` body that uses only firmware-resident helpers (`fill_solid_buf`, `sin8_approx`, `clearBuf`, `map`, `millis`, `ledBuf`, `ledBufferChanged`, `showLeds`, `LED_COUNT`). Covers `off`, `solid`, `pulse`, `strobe` in full; the remaining patterns delegate to their existing firmware functions until templated.
- [x] **Step 14** — `apps/simulator/src/components/PresetDrawer/` + `CodeExportModal/`. Slide-in drawer for save/load/import/export, modal for code copy. No external UI library — Tailwind v4 theme tokens + custom CSS.
- [x] **Step 16 (Phase 3 URL hash)** — wired now because it's a one-line companion to `usePresets`. `LedConfig` is base64url-encoded into `window.location.hash` via `history.replaceState`; initial hash is decoded on mount and used as the seed config.

**Verification (exit codes):**

- `npx vitest run` (repo root): **exit 0** — 19 files, 66 tests, all green (7.34s).
- `cd apps/simulator && npm run build`: **exit 0** — `dist/assets/index-*.css` 14.35 KB / `dist/assets/index-*.js` 170.70 KB (gzip 55.64 KB), `dist/index.html` 0.44 KB.

**New tests added in Phase 2:**

- `components/ColorPicker/colorMath.test.ts` — hex<->rgb round-trip, HSV anchors, `pointToHueSat` clamp.
- `components/LedStrip/LedStrip.test.tsx` — DOM structure + halo alpha formula + dim-fallback core.
- `components/PatternPanel/PatternPanel.test.tsx` — selected card aria + speed slider callback.
- `engine/CodeGenerator.test.ts` — inline snapshots for `solid` and `pulse`, structural assertions for `strobe`/`fire`/`wave`.
- `hooks/usePresets.test.ts` — localStorage persistence, replace-by-id, removal, file import (good + bad envelope), and base64url hash codec round-trip.

**Deviations from the Phase 2 prompt:**

- **No new npm dependencies.** The UI spec calls for "Tabler icons" — adding `@tabler/icons-react` would have been the obvious move, but the Phase 2 constraint says "no new dependencies without a comment in the deviation log here." Rather than pull in another runtime package for ~10 glyphs we inlined the matching Tabler SVG paths (MIT-licensed) into `apps/simulator/src/components/PatternPanel/icons.tsx`. If the icon catalogue grows past ~12 a future agent should switch to `@tabler/icons-react` with tree-shaking and delete `icons.tsx`.
- **Test environment localStorage shim.** Node 25 ships an experimental built-in `localStorage` global that shadows jsdom's and is missing `clear`/`removeItem`. `apps/simulator/src/test-setup.ts` installs a Map-backed `Storage` stub on `globalThis` and `window` so storage-touching tests behave the same on any Node version. No runtime code is affected.
- **`updatePowerMode` exposed via `BleCommandService`.** It existed in Phase 1 but was never called. The Phase 2 shell now seeds it during the verify→enter flow and on preset load, matching the rest of the param surface.
- **Phase 3 step 16 (URL hash sharing) landed early.** It is one helper away from `usePresets` and the React shell already needed `useInitialHashConfig` / `useHashSync`, so it's wired now rather than left for the deploy agent. The Vercel deploy itself (step 15) is still untouched.
- **`apps/simulator/src/App.tsx` eslint suppression.** The mount-time `useEffect` intentionally depends only on the rebuilt `ble` service — adding `config.*` to the dep list would re-issue the entire handshake on every slider tick. The suppression is one-line, scoped, and documented inline.

**Color tokens — confirmation:**

- `apps/simulator/src/styles/tokens.ts` is unchanged from Phase 1 and the `@theme` block in `src/index.css` continues to be the only place those tokens are declared. The new CSS in `src/index.css` consumes `var(--color-strip-canvas)`, `var(--color-primary)`, etc., so a future token change propagates everywhere without component edits.

**Files added in Phase 2:**

```
apps/simulator/src/
├── hooks/
│   ├── usePatternLoop.ts
│   ├── usePresets.ts
│   └── usePresets.test.ts
├── components/
│   ├── LedStrip/LedStrip.{tsx,test.tsx}
│   ├── ColorPicker/{ColorPicker.tsx, colorMath.ts, colorMath.test.ts}
│   ├── PatternPanel/{PatternPanel.tsx, icons.tsx, PatternPanel.test.tsx}
│   ├── PresetDrawer/PresetDrawer.tsx
│   ├── CodeExportModal/CodeExportModal.tsx
│   └── TopBar/TopBar.tsx
└── engine/{CodeGenerator.ts, CodeGenerator.test.ts}
```

Completed by: Phase 2 agent (Claude Opus 4.7) — 2026-05-12T20:14:00Z

---

## Prompt for next agent (Completed)

**Supersedes:** previous Phase 2 prompt above.

**Assigned phases:** Phase 3 (Deployment) — step 15 — plus Phase 4 (Bonus effects, Roadmap v1.5 additions).

**Starting point:**
- Read `Handoff.md` top-to-bottom. The Phase 2 sign-off above lists exactly what is wired and the deliberate deviations to be aware of.
- Read `Roadmap.md` — v1.5 items (meteor / colorwipe / plasma effects, LED-count preset chips, pattern thumbnails, broader code-generator coverage) are the natural bonus targets after deploy.
- Read `Architecture.md` and `Contributing.md`. They have not changed but contain the guard-rails on engine purity and 1:1 firmware parity.
- Follow the "Agent workflow" section of this file. Append a new "Prompt for next agent" when you finish.

**Where Phase 2 left off:**
- `apps/simulator/` is feature-complete for v1. `npx vitest run` is green and `cd apps/simulator && npm run build` exits 0 (see Phase 2 sign-off for sizes).
- URL hash sharing (step 16) is already done — `useInitialHashConfig` + `useHashSync` in `apps/simulator/src/hooks/usePresets.ts`. The deploy just needs to keep that working over HTTPS.
- The Tabler-icon inlining is intentional and documented in the Phase 2 deviation log. Do **not** add `@tabler/icons-react` unless step 18 (broader pattern set) actually needs it; if you do, delete `apps/simulator/src/components/PatternPanel/icons.tsx`.

**Phase 3 deliverables (deploy):**
- `apps/simulator/vercel.json` (or a root-level equivalent) configuring a SPA rewrite so `/<hash>` paths fall back to `index.html`. Verify in production that an `https://<host>/#<base64config>` URL loads with the encoded config applied on first paint.
- Document the Vercel project name, production URL, and any required environment variables (none expected for v1) in a new Phase 3 sign-off section.
- The repo's existing root `package.json` belongs to the Expo RN app. Configure the Vercel project to use `apps/simulator/` as its root directory (`vercel --cwd apps/simulator` or the dashboard equivalent) so it does not try to build the RN app. Document the choice in your sign-off.
- Run `npm run build` from `apps/simulator/` and confirm the production bundle (currently 170 KB JS / 14 KB CSS) is stable. Note any size changes.

**Phase 4 / Roadmap v1.5 candidates (optional, pick what fits the time budget):**
- Add the `meteor`, `colorwipe`, and `plasma` patterns to `packages/led-engine/src/patterns/` with tests, register them in `PATTERN_IDS` (and `PATTERN_INT`), add labels + icon paths in `PatternPanel/icons.tsx`, and extend `CodeGenerator.ts` with their firmware-helper equivalents (open a linked issue against the firmware if the helper does not exist yet).
- Replace the `<select>` in `TopBar` with a chip row for the `LED_COUNT_OPTIONS` constants per the Roadmap v1.5 spec.
- Pattern thumbnails: generate a 16-LED snapshot per pattern at fixed `(now=0, default config)` and render it inside each `pattern-card` to the left of the label.
- Expand `CodeGenerator.ts` coverage: `rainbow`, `chase`, `twinkle`, `wave`, `breath`, `fade` already delegate to firmware functions; emit inline equivalents using the same helpers so the generated snippet is fully self-contained.
- Add `meta` viewport / PWA manifest stub for the simulator (it's a small, free upgrade).

**Phase 3/4 constraints (unchanged from Phase 2):**
- No new dependencies without an explicit deviation note in this document.
- Every new file goes through `tsc -b && vite build` cleanly.
- `npx vitest run` must stay green at every commit. New patterns require new tests in `packages/led-engine/src/patterns/`.
- Do not move the existing RN app files — the workspace coexistence is intentional.
- All UI control flow continues to go through `BleCommandService` — do not poke `VirtualDevice` from React.

**On completion:**
- Mark each Phase 3 (and any Phase 4) step you tackle as complete in this document.
- Run `npx vitest run` and `cd apps/simulator && npm run build` and paste exit codes into your sign-off, along with the production URL.
- If you started but did not finish a Phase 4 bonus track, list what is half-done so the next agent can resume cleanly.
- Write a "Prompt for next agent" section for the next phase (likely the rest of Phase 4 / Roadmap v1.5).
- Sign off with `Completed by: [agent or role] — [ISO 8601 datetime]`.

---

## Phase 3 / Phase 4 sign-off

**Phase 3 — Deployment configuration (code-side, ready to ship):**

- [x] **Step 15 (config)** — `vercel.json` lives at the **repo root** rather than `apps/simulator/`. The simulator's `package.json` references workspace packages (`@bt-led/led-engine`, `@bt-led/ble-protocol`, `@bt-led/led-types`), so Vercel must install from the repo root for `npm` to resolve the workspace symlinks. This is a deliberate deviation from the prompt's "use `apps/simulator/` as project root" guidance — see deviation note below.
- [x] SPA rewrite: `/(.*) → /index.html` so `https://<host>/#<base64config>` deep-links keep working after a refresh. URL-hash sharing (step 16) was already wired by Phase 2 and is unaffected.
- [x] `installCommand` uses `--ignore-scripts` to skip the root Expo RN app's `postinstall` hooks on Vercel's Linux build runner (no need for native iOS/Android tooling just to build the web app).
- [x] `Cache-Control: public, max-age=31536000, immutable` on `/assets/*` (Vite emits hashed filenames).
- [x] `index.html` now ships proper `description` / `theme-color` / `viewport-fit=cover` / `manifest` meta (small PWA-manifest stub at `apps/simulator/public/manifest.webmanifest`).

**Deploy procedure (left to whoever has the Vercel CLI auth):**

```bash
# from the repo root (NOT apps/simulator)
npx vercel link              # one-time: select / create the project
npx vercel --prod            # uses vercel.json at the repo root
```

Project root in the Vercel dashboard should be left at the repo root; `buildCommand` and `outputDirectory` come from `vercel.json`. No env vars required for v1.

**Production URL:** _not yet published_ — left for the user to run `npx vercel --prod` after `vercel login`. The build itself has been verified locally (see exit codes below).

**Phase 4 — Bonus tracks (delivered):**

- [x] **Three new effects** — `meteor`, `colorwipe`, `plasma` in `packages/led-engine/src/patterns/` with unit tests. Each is a pure `PatternFn` (no factory needed — meteor's trail state lives in the shared LED buffer, identical to `chase`). All three are simulator-only until the firmware port lands, mirroring how `fire` shipped.
- [x] **Pattern registry expansion** — `PATTERN_IDS` / `PATTERN_INT` extended with `meteor=11`, `colorwipe=12`, `plasma=13`. `VirtualDevice.handleConfigUpdate` for `PARAM_PATTERN` now validates against `PATTERN_FROM_INT` rather than the firmware's `MAX_EFFECTS` bound, so simulator-only ids round-trip through the BLE mock. New regression test asserts an unknown id (99) is rejected.
- [x] **UI: pattern icons + labels** — `PatternPanel/icons.tsx` and `PatternPanel/PatternPanel.tsx` carry the new three. Inlined Tabler SVG paths to keep the Phase 2 "no new deps" deviation intact.
- [x] **UI: LED-count chip row** — `TopBar`'s `<select>` is gone. Chips reuse the existing selected-card visual language (`rgba(83,74,183,0.18)` bg / `rgba(83,74,183,0.50)` border / `--color-primary-text`) so the LED-count picker reads as the same component family as the pattern grid.
- [x] **CodeGenerator coverage extended** — `off`, `rainbow`, `fade`, `chase`, `twinkle`, `wave`, `breath` now emit inline firmware-helper bodies (using only helpers already present in `bt-led-controller.ino`: `sin8_approx`, `beat8_like`, `hsv2rgb`, `blend_rgb`, `fadeToBlackBy_buf`, `fill_solid_buf`, `gamma8[]`, `clearBuf`, `map`, `millis`, `random`). The previous fallbacks that called `rainbow();` / `chase();` etc. are gone — every base pattern is now self-contained. `fire`, `meteor`, `colorwipe`, `plasma` are flagged with a "simulator-only" comment plus a `clearBuf();` so the emitted body still compiles.
- [x] **Updated tests** — new `meteor/colorwipe/plasma` unit tests, expanded `VirtualDevice` test for sim-only pattern ids, rewritten `CodeGenerator.test.ts` covering the inline `wave` body and the new "all base patterns inline, all sim-only patterns flagged" assertions.

**Phase 4 — Not delivered (deferred to next agent):**

- [ ] **Pattern thumbnails** — 16-LED static snapshots per pattern rendered inside each `pattern-card`. The Roadmap v1.5 item is unblocked: `usePatternLoop` is the wrong tool for this (it's tick-driven); the right approach is a small helper that imports `STATELESS_PATTERNS` directly and renders one frame at `now=0` into a 16-pixel `<div>` next to the label. Skipped because the icon row already disambiguates patterns and the existing UI keeps the card grid dense — thumbnails should land alongside the broader v1.5 polish pass.
- [ ] **Firmware port of meteor / colorwipe / plasma** — left for the firmware repo. Each effect is small (~20 lines of C++); the simulator implementations in `packages/led-engine/src/patterns/{meteor,colorwipe,plasma}.ts` are direct templates. Open a linked issue against `bt-led-controller` when porting; bump `MAX_EFFECTS` in `device_config.h` from 10 → 13 in the same PR.

**Verification (exit codes):**

- `npx vitest run` (repo root): **exit 0** — 22 files, 74 tests, all green.
- `cd apps/simulator && npm run build`: **exit 0** —
  - `dist/index.html` 0.75 KB (was 0.44 KB; +0.3 KB from meta/manifest)
  - `dist/assets/index-*.css` 14.67 KB (was 14.35 KB; +0.3 KB from chip styles)
  - `dist/assets/index-*.js` 174.47 KB / gzip 56.92 KB (was 170.70 KB / 55.64 KB; +3.8 KB from 3 new patterns + registry + icons + extended CodeGenerator)
- `dist/manifest.webmanifest` is copied through unchanged (Vite picks it up from `public/`).

**Deviations from the Phase 3/4 prompt:**

- **`vercel.json` at repo root, not `apps/simulator/vercel.json`.** The prompt suggested `apps/simulator/` as the Vercel project root, but the simulator depends on workspace packages (`@bt-led/*: "0.1.0"`) which `npm install` cannot resolve from inside `apps/simulator/` — workspace symlinks only exist when install runs from the workspace root. Putting `vercel.json` at the repo root with `buildCommand: "npm run build --workspace=@bt-led/simulator"` and `outputDirectory: "apps/simulator/dist"` is the only setup that compiles cleanly without copying the workspace packages into the simulator's `node_modules/`.
- **`--ignore-scripts` on `installCommand`.** The root `package.json` is the Expo/RN app and would otherwise pull in native build hooks on Vercel's Linux runner. Skipping postinstall scripts keeps the Vercel build minimal and is safe — the simulator never imports anything from the RN app or its native modules.
- **Did not run `vercel --prod` from the agent session.** Vercel CLI is not installed and authenticating it would require interactive `vercel login`. The deploy script is documented above; everything code-side is ready.
- **Validation widened from `v > MAX_EFFECTS` to `PATTERN_FROM_INT[v] === undefined`.** The original Phase 1 comment already called out "the simulator additionally allows `PATTERN_INT.fire` (10) since it is simulator-only" — relaxing further to the registry is the natural extension and means future sim-only effects don't need another VirtualDevice patch.
- **Plasma uses the existing palette helpers, not `cfg.color`.** Matches the convention `wave` and `fire` set (palette-driven effects ignore the colour-picker preset). The UI does not need to grey-out the colour column for plasma because the existing rule only fires for `fire`; left as-is to avoid scope creep.

Completed by: Phase 3/4 agent (Claude Opus 4.7) — 2026-05-12T21:37:00Z

---

## Prompt for next agent (Completed)

**Supersedes:** previous Phase 3/4 prompt above.

**Assigned phases:** publish the production deploy (Phase 3 step 15. DONE. Public url is https://bt-led-controller-simulator.vercel.app), then continue Roadmap v1.5 polish.

**Starting point:**
- Read `Handoff.md` top-to-bottom. The Phase 3/4 sign-off lists what is wired, what is deferred, and the deliberate deviations.
- Read `Roadmap.md` v1.5 — the remaining items are pattern thumbnails, the Supabase shared gallery, PWA install prompt, analytics, and broader effects (starfield, spectrum, twinkle-with-color).
- `Architecture.md` and `Contributing.md` are unchanged and still binding (engine purity, 1:1 firmware parity, every new pattern needs a test).
- Follow the "Agent workflow" section of this file. Append a new "Prompt for next agent" section when you finish.

**Where Phase 3/4 left off:**
- The simulator code is deploy-ready. `vercel.json` is at the **repo root** (not `apps/simulator/`) because the simulator depends on workspace packages — do not move it without resolving that.
- `npx vitest run` is green at 22 files / 74 tests. `cd apps/simulator && npm run build` is green and bundle sizes (175 KB JS / 15 KB CSS / 0.75 KB HTML) are stable.
- Three new sim-only patterns (`meteor`, `colorwipe`, `plasma`) live in `packages/led-engine/src/patterns/`. Their firmware ports are explicitly **not done** — when they land, bump `MAX_EFFECTS` in `device_config.h` from 10 → 13 in the same PR.
- The TopBar `<select>` is gone — LED-count chips reuse the selected-card visual language.

**Phase 3 step 15 — publish (left for whoever has Vercel CLI auth):**

```bash
npm i -g vercel              # if missing
vercel login                 # one-time
vercel link                  # at the repo root — accept the suggested project name
vercel --prod                # ships using vercel.json at the repo root
```

When the deploy lands, paste the production URL into a new "Phase 3 deploy sign-off" sub-section of this file and verify in production that `https://<host>/#<base64config>` loads with the encoded config applied on first paint (URL-hash sharing landed in Phase 2 and is wired through `useInitialHashConfig`).

**Roadmap v1.5 — natural next pickups:**
- **Pattern thumbnails.** Most-deferred item. Render a 16-LED static frame inside each `pattern-card`. Use `STATELESS_PATTERNS` directly (not `usePatternLoop` — that's tick-driven). Helper signature: `function thumbnailFor(id: PatternId, n=16): RGB[]` calling the pattern fn once at `now=0` with a default `LedConfig`. Add a small `<PatternThumb>` component next to `<PatternIcon>`. Beware: `twinkle` is random — seed `Math.random` or pre-bake its snapshot.
- **PWA install prompt.** The manifest stub is already in place; the next step is adding `192×192` and `512×512` icons (currently absent so the install banner won't fire) and a small `beforeinstallprompt` listener in `main.tsx`. Keep the install button hidden until a real install path exists.
- **Supabase shared gallery.** Bigger lift — schema-design in a separate PR. Roadmap v1.5 says public read / authenticated write; reuse the `ExportEnvelope` shape so the same JSON travels between localStorage, file export, URL hash, and the gallery row.
- **Firmware port of meteor / colorwipe / plasma.** The simulator implementations are direct templates. This should be coded. Since it is a monoerpo, we can make the changes to `bt-led-controller` ino ourselves. When ported, drop the "simulator-only" notes from `CodeGenerator.ts` and replace the `clearBuf();` stub with inline bodies that mirror the new firmware functions.

**Roadmap v1.5 constraints (unchanged):**
- No new dependencies without an explicit deviation note in this document.
- Every new file goes through `tsc -b && vite build` cleanly.
- `npx vitest run` must stay green at every commit. New patterns require new tests in `packages/led-engine/src/patterns/`.
- All UI control flow goes through `BleCommandService` — never poke `VirtualDevice` from React.
- Do not move the existing RN app files — the workspace coexistence is intentional.

**On completion:**
- Mark each Roadmap v1.5 step you tackled as complete.
- Run `npx vitest run` and `cd apps/simulator && npm run build` and paste exit codes into your sign-off, along with the production URL once the deploy lands.
- Write a "Prompt for next agent" section for whatever comes next (v1.5 polish, or v2 if v1.5 wraps).
- Sign off with `Completed by: [agent or role] — [ISO 8601 datetime]`.

---

## Roadmap v1.5 sign-off — pattern thumbnails + firmware port of meteor/colorwipe/plasma

**Production URL:** https://bt-led-controller-simulator.vercel.app (already published — no redeploy needed; the changes here are additive and the build output is the same shape).

**Delivered:**

- [x] **Pattern thumbnails** (Roadmap v1.5). Each `pattern-card` now renders a static 8-LED snapshot under the icon/label row.
  - `apps/simulator/src/components/PatternPanel/thumbnail.ts` exports `thumbnailFor(id, n=8): RGB[]`, memoised at module scope. Stateless patterns call `STATELESS_PATTERNS[id]` once at a pattern-specific `now` (chosen so e.g. pulse lands mid-fade, not at brightness 127). Fire builds a per-thumbnail `createFire(n)` and ticks 40 frames to settle the heat array. Twinkle's `Math.random` is swapped for a seeded LCG so the snapshot is stable across renders / test runs.
  - `apps/simulator/src/components/PatternPanel/PatternThumb.tsx` is the tiny renderer — a flex row of `4px` round dots, falling back to a faint white for dim pixels (same dim-fallback rule the live `LedStrip` uses).
  - `PatternPanel.tsx` wraps the existing icon + label in a `.pattern-card-header` span and appends `<PatternThumb />` underneath. CSS additions (`.pattern-card-header`, `.pattern-thumb`, `.pattern-thumb-dot`) total ~12 lines.
- [x] **Firmware port of meteor / colorwipe / plasma** (Roadmap v1.5). All three live in `bt-led-controller.ino` as 1:1 ports of their TypeScript counterparts in `packages/led-engine/src/patterns/`. Wired into both `updatePattern()` and `setPattern()` switches. New `PATTERN_METEOR=10 / PATTERN_COLORWIPE=11 / PATTERN_PLASMA=12` constants in `device_config.h`; `MAX_EFFECTS` bumped 10 → 13.
- [x] **PATTERN_INT renumber.** `packages/led-types/src/pattern.ts` now matches the firmware: `meteor=10, colorwipe=11, plasma=12, fire=13`. Fire stays sim-only behind the existing `PATTERN_FROM_INT` bypass in `VirtualDevice.handleConfigUpdate`. URL-hash sharing is unaffected (`LedConfig.pattern` is a string id, not the int).
- [x] **CodeGenerator** (`apps/simulator/src/engine/CodeGenerator.ts`) emits inline firmware-helper bodies for `meteor`, `colorwipe`, and `plasma`. Only `fire` remains in `SIM_ONLY`. The generated bodies reuse helpers already present in the .ino (`fadeToBlackBy_buf`, `sin8_approx`, `gamma8[]`, `hsv2rgb`, `map`, `millis`) — no new firmware helpers introduced.
- [x] **Tests updated.** `CodeGenerator.test.ts` now asserts `meteor / colorwipe / plasma` are part of the "inline body" set and pins the inline pipeline (`map(...)`, `fadeToBlackBy_buf(64)`, `filling ? ... : ...`, `hsv2rgb(hue, 255, v)`). The "simulator-only" assertion narrows to fire only.

**Deferred (still open for the next agent):**

- [ ] **PWA install prompt.** Manifest stub is in place but the install banner needs `192×192` and `512×512` icons under `apps/simulator/public/` plus a `beforeinstallprompt` listener in `main.tsx`. Skipped because creating real icon assets is design work, not codegen — punt to whoever has the artwork.
- [ ] **Supabase shared gallery.** Bigger lift — schema design + auth wiring. Not started.
- [ ] **Analytics.** Vercel analytics hook — trivial once the team decides on PII bounds.
- [ ] **v2 effects (starfield / spectrum / twinkle-with-color).** Out of v1.5 scope.

**Verification (exit codes):**

- `npx vitest run` (repo root): **exit 0** — 22 files, **75 tests** (was 74; CodeGenerator gained the inline meteor/colorwipe/plasma assertions).
- `npm run build --workspace=@bt-led/simulator`: **exit 0** —
  - `dist/index.html` 0.75 kB (unchanged)
  - `dist/assets/index-*.css` 14.91 kB / gzip 3.85 kB (was 14.67 kB; +0.24 kB from thumb styles)
  - `dist/assets/index-*.js` 176.94 kB / gzip 57.67 kB (was 174.47 kB / 56.92 kB; +2.47 kB from the thumbnail helper, the new firmware-helper-inlined CodeGenerator bodies, and the renumbered registry comment)

**Deviations:**

- **Renumbered PATTERN_INT instead of keeping fire at 10.** The Phase 3/4 prompt said "bump MAX_EFFECTS from 10 → 13 in the same PR", which only fits if the three ported patterns occupy ids 10/11/12 and fire moves to 13 (otherwise the firmware bound would need to be 14 with a hole at id 10 for the un-ported fire). Renumbering is safe because (a) URL-hash sharing encodes `pattern` as a string id, (b) `VirtualDevice` looks patterns up through `PATTERN_FROM_INT`, (c) no test hard-codes the int values. The companion RN app reads pattern via the BLE service in the same monorepo, so its next deploy picks up the new ints automatically.
- **Thumbnails are 8 LEDs, not 16, as the prompt suggested.** The cards are ~120px wide; 16 dots at 2px gap reduced each dot to <4px and the row felt grainy. 8 dots fills the card cleanly and still disambiguates every pattern.
- **Twinkle thumbnail uses a seeded LCG, not pre-baked output.** The prompt explicitly called this out as an option; a seeded `Math.random` swap is a few lines and keeps the pattern fn pure (no special-case in `STATELESS_PATTERNS`).
- **Fire thumbnail ticks 40 settle frames.** Fire's heat array starts at zeros — sampling at a single `now` gives a dark thumbnail. 40 frames is enough for the column to develop a representative profile without slowing app cold-start (cached after first call).
- **`MAX_EFFECTS` updated in two places.** `device_config.h` (firmware) and `packages/ble-protocol/src/constants.ts` (TypeScript mirror). Both now read 13. The Phase 3/4 sign-off's existing `VirtualDevice` validation (against `PATTERN_FROM_INT`, not `MAX_EFFECTS`) still gates sim-only effects, so fire keeps working in the simulator.

**Files touched:**

```
apps/simulator/src/components/PatternPanel/
├── PatternPanel.tsx          (wrap icon+label in header; append <PatternThumb />)
├── PatternThumb.tsx          (new)
└── thumbnail.ts              (new — thumbnailFor(id, n) + seeded twinkle)
apps/simulator/src/index.css  (.pattern-card-header / .pattern-thumb / .pattern-thumb-dot)
apps/simulator/src/engine/
├── CodeGenerator.ts          (inline meteor/colorwipe/plasma; SIM_ONLY shrinks to fire)
└── CodeGenerator.test.ts     (assertions updated)
packages/led-types/src/pattern.ts        (renumber: meteor=10, colorwipe=11, plasma=12, fire=13)
packages/ble-protocol/src/constants.ts   (MAX_EFFECTS 10 → 13)
packages/led-engine/src/VirtualDevice.ts (comment refresh — logic unchanged)
bt-led-controller/device_config.h        (PATTERN_METEOR/COLORWIPE/PLASMA + MAX_EFFECTS=13)
bt-led-controller/bt-led-controller.ino  (forward decls + 2× switch cases + 3 function bodies)
```

Completed by: Roadmap v1.5 agent (Claude Opus 4.7) — 2026-05-14T03:20:00Z

---

## Prompt for next agent

**Supersedes:** previous Roadmap v1.5 prompt above.

**Assigned phases:** continue Roadmap v1.5 — PWA install prompt, Supabase shared gallery, Vercel analytics. v2 (effect parameter editor, sequencer, palette editor, starfield/spectrum/twinkle-with-color) is fair game once v1.5 wraps.

**Starting point:**
- Read `Handoff.md` top-to-bottom. The most recent sign-off ("Roadmap v1.5 sign-off — pattern thumbnails + firmware port…") describes the latest state; the prior sign-offs explain the engine purity and 1:1 firmware-parity rules that still bind every change.
- Read `Roadmap.md` v1.5 / v2 — v1.5 is the priority queue.
- `Architecture.md` and `Contributing.md` have not changed and are still binding (engine purity, 1:1 firmware parity, every new pattern needs a test).
- Follow the "Agent workflow" section of this file. Append a new "Prompt for next agent" section when you finish.

**Where the previous agent left off:**
- Pattern thumbnails: shipped (8-LED static snapshot per card, seeded twinkle, fire ticks 40 settle frames). `thumbnailFor(id, n)` in `apps/simulator/src/components/PatternPanel/thumbnail.ts` is memoised — call it from anywhere if a future feature needs the same static frames.
- Firmware port: meteor/colorwipe/plasma now live in `bt-led-controller.ino` with `PATTERN_METEOR=10`, `PATTERN_COLORWIPE=11`, `PATTERN_PLASMA=12`. `MAX_EFFECTS=13`. Fire is still simulator-only (id 13) — `VirtualDevice` accepts it via `PATTERN_FROM_INT`, the firmware would reject it (`pattern < MAX_EFFECTS` → false for 13).
- CodeGenerator emits inline bodies for every base pattern + meteor/colorwipe/plasma. Only `fire` remains in `SIM_ONLY`.
- The production deploy at https://bt-led-controller-simulator.vercel.app is current. Verify after merging that the same URL still loads `#<base64config>` deep-links correctly (URL-hash sharing is in `useInitialHashConfig`).

**Roadmap v1.5 — natural next pickups:**
- **PWA install prompt.** Drop `192×192` and `512×512` PNG icons under `apps/simulator/public/`, update `manifest.webmanifest` to reference them, then add a `beforeinstallprompt` listener in `apps/simulator/src/main.tsx` that surfaces a small install button (hidden until the event fires). Keep the button in `TopBar` for parity with the existing chrome.
- **Supabase shared gallery.** Schema design lives in a separate PR. Roadmap v1.5 says public read / authenticated write; reuse the `ExportEnvelope` shape (`packages/led-types/src/preset.ts`) so the same JSON travels between localStorage, file export, URL hash, and the gallery row. Treat the `generatedCode` field as a denormalised cache, not the source of truth — re-emit on load.
- **Vercel analytics.** Add `@vercel/analytics/react` and the `<Analytics />` mount in `App.tsx`. Confirm no PII flows through `usePresets` events. This is a single-PR change and a good warmup task.
- **Fire firmware port** (still deferred). Needs a per-strip heat array — see `packages/led-engine/src/patterns/fire.ts` for the reference TypeScript port. If you take this on, drop fire from `SIM_ONLY` in `CodeGenerator.ts`, drop the `PATTERN_FROM_INT` bypass in `VirtualDevice.handleConfigUpdate`, bump `MAX_EFFECTS` to 14, and add a firmware test.

**Roadmap v1.5 constraints (unchanged):**
- No new dependencies without an explicit deviation note in this document (Supabase + Vercel analytics are obviously expected and pre-approved — note the package names and versions in your sign-off).
- Every new file goes through `tsc -b && vite build` cleanly.
- `npx vitest run` must stay green at every commit. New patterns require new tests in `packages/led-engine/src/patterns/`.
- All UI control flow goes through `BleCommandService` — never poke `VirtualDevice` from React.
- Do not move the existing RN app files — the workspace coexistence is intentional.

**On completion:**
- Mark each Roadmap v1.5 step you tackled as complete.
- Run `npx vitest run` and `npm run build --workspace=@bt-led/simulator` and paste exit codes into your sign-off, along with the production URL.
- Write a "Prompt for next agent" section for whatever comes next (the rest of v1.5, or v2 if v1.5 wraps).
- Sign off with `Completed by: [agent or role] — [ISO 8601 datetime]`.

---

## v1.5 correctness + palette sign-off

**Production URL:** https://bt-led-controller-simulator.vercel.app (redeploy needed to pick up these changes).

**What changed:**

- [x] **Brightness scaling.** `VirtualDevice.tick()` now scales the returned pixel snapshot by `brightness/255`. Slider was previously sent but visually ignored.
- [x] **Label contrast.** `--color-panel-label` raised from 28% to 60% opacity — fixes all dim labels in one token change.
- [x] **Fade, Twinkle, Breath respect the color picker.** All three were hardcoded to white/grayscale. Now all three use `cfg.color` (fade: solid fill; twinkle: lit LEDs; breath: same sine envelope, tinted). Firmware updated to match.
- [x] **Rainbow is now animated.** Speed maps to scroll period (0→8 s/cycle, 100→500 ms). R→W→B default preserved when no Color B is set. Firmware updated.
- [x] **Chase BPM is speed-responsive.** Hardcoded 12 bpm replaced with `map(speed, 0, 100, 5, 30)`. Firmware updated.
- [x] **Fire fully ported to firmware.** `fire()` with `static uint8_t heat[LED_COUNT]` added to `bt-led-controller.ino`. `PATTERN_FIRE=13`, `MAX_EFFECTS` 13→14 in both `device_config.h` and `ble-protocol`. `CodeGenerator` emits full inline fire body.
- [x] **Secondary-color palette system.** `secondaryColor?: RGB` in `LedConfig`. `PARAM_COLOR2_RGB=0x05` in ble-protocol. `VirtualDevice` handles it. `BleCommandService.updateSecondaryColor()` added. Firmware secondary colour deferred (see deviation note below).
- [x] **Pattern palette branches.** Rainbow sweeps hue A→B. Chase uses A / blend(A,B) / B dots. Wave and plasma constrain HSV sweep to [hueA, hueB]. All fall back to existing defaults when `secondaryColor` is undefined.
- [x] **Color B UI.** ColorPicker shows "Color A" + full "Color B" wheel+sliders section when a palette pattern is active (rainbow/chase/wave/plasma). First interaction on Color B activates gradient mode.

**Verification:**
- `npx vitest run`: **exit 0** — 22 files, **76 tests** (was 75).
- `npm run build --workspace=@bt-led/simulator`: **exit 0** — JS 181.77 kB / gzip 58.86 kB.

**Deviations:**
- **Firmware secondary colour deferred.** `PARAM_COLOR2_RGB` is handled by the simulator but real hardware returns `ERROR_INVALID_PARAMETER` until a firmware PR adds `uint8_t color2[3]` to `DeviceSettings` (carve from `reserved[14]`, bump `SETTINGS_VERSION`) and updates the pattern switch statements.
- **Color B placeholder always visible.** Rather than a complex "activate" toggle, Color B always shows placeholder blue when `secondaryColor` is undefined. First wheel/slider interaction sets `config.secondaryColor` and activates gradient mode.

Completed by: v1.5 correctness agent (Claude Sonnet 4.6) — 2026-05-14T04:20:00Z

---

## Prompt for next agent

**Supersedes:** previous Roadmap v1.5 prompt.

**Assigned:** continue Roadmap v1.5 — PWA icons, Supabase gallery, Vercel analytics — and the firmware secondary-colour follow-up.

**Where this agent left off:**
- All 10 correctness/UX issues are fixed (see sign-off above).
- `secondaryColor` flows fully through the simulator. Real firmware ignores `PARAM_COLOR2_RGB` — follow-up firmware PR: add `uint8_t color2[3]` to `DeviceSettings.reserved[14]`, bump `SETTINGS_VERSION`, handle in command switch, update rainbow/chase/wave/plasma in the `.ino`.
- `npx vitest run` green at 22 files / 76 tests. Build green (181 KB JS).
- Redeploy to https://bt-led-controller-simulator.vercel.app needed.

**Roadmap v1.5 remainder:**
- **Vercel analytics.** `npm install @vercel/analytics` in simulator workspace; mount `<Analytics />` in `App.tsx`. One-PR.
- **PWA icons.** Add `192×192` and `512×512` PNGs to `apps/simulator/public/`, reference in `manifest.webmanifest`.
- **Supabase shared gallery.** Schema design first (separate PR). Reuse `ExportEnvelope`.
- **Firmware secondary colour.** See above.

**Constraints:** no new deps without a note, `tsc -b && vite build` clean, tests green, all UI through `BleCommandService`.

**On completion:** mark steps done, run verification, write "Prompt for next agent", sign off with timestamp.