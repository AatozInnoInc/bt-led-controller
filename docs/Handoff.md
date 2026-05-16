# Handoff — LED Simulator

## What you are building

A React + Vite + TypeScript web app hosted on Vercel. It simulates an LED strip in the browser, runs the same effect algorithms as `bt-led-controller.ino` (a companion Arduino project), and speaks the same binary BLE command protocol as the companion React Native app.

Read [`Architecture.md`](/docs/Architecture.md) before writing any code. Read `charts/ble-protocol.md` before touching anything in `src/engine/`. Read `Contributing.md` for non-negotiable rules.

---

## Critical rules

1. Shared packages (`packages/led-engine`, `ble-protocol`, `led-types`) must have zero React, RN, browser, or Node dependencies. Testable in Node with Vitest.
2. Math helpers in `packages/led-engine/src/math.ts` are 1:1 ports of the C++ in `bt-led-controller.ino`. Do not improve them — behavioral parity with the firmware is the correctness requirement.
3. Pattern functions are pure: `(buf, cfg, now) => void`. No side effects.
4. The mock BLE transport (`apps/simulator/src/engine/BleCommandService.ts`) mimics the real protocol byte-for-byte. No shortcuts.
5. Every new pattern needs a unit test with a known expected output.
6. No failing tests at any point.

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

This workflow is also documented in [`Architecture.md`](/docs/Architecture.md) under "Agent handoff workflow".

---

## Prompt for next agent

**Supersedes:** previous Roadmap v1.5 prompt above.

**Assigned phases:** continue Roadmap v1.5 — PWA install prompt, Supabase shared gallery, Vercel analytics. v2 (effect parameter editor, sequencer, palette editor, starfield/spectrum/twinkle-with-color) is fair game once v1.5 wraps.

**Starting point:**
- Read `Handoff.md` top-to-bottom. The most recent sign-off ("Roadmap v1.5 sign-off — pattern thumbnails + firmware port…") describes the latest state; the prior sign-offs explain the engine purity and 1:1 firmware-parity rules that still bind every change.
- Read `Roadmap.md` v1.5 / v2 — v1.5 is the priority queue.
- [`Architecture.md`](/docs/Architecture.md) and [`Contributing.md`](../Contributing.md) have not changed and are still binding (engine purity, 1:1 firmware parity, every new pattern needs a test).
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

**Production URL:** https://bt-led-controller-simulator.vercel.app (redeployed).

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
- Redeploy to https://bt-led-controller-simulator.vercel.app needed (DONE).

**Roadmap v1.5 remainder:**
- **Vercel analytics.** `npm install @vercel/analytics` in simulator workspace; mount `<Analytics />` in `App.tsx`. One-PR.
- **PWA icons.** Add `192×192` and `512×512` PNGs to `apps/simulator/public/`, reference in `manifest.webmanifest`.
- **Supabase shared gallery.** Schema design first (separate PR). Reuse `ExportEnvelope`.
- **Firmware secondary colour.** See above.
- Work WITH THE USER to find good LED patterns on the internet. Start with a web search for popular, good LED patterns, then ask the user for approval on a set of patterns, with the goal of implementing 5 patterns E2E

**Constraints:** no new deps without a note, `tsc -b && vite build` clean, tests green, all UI through `BleCommandService`.

**On completion:** mark steps done, run verification, write "Prompt for next agent", sign off with timestamp.