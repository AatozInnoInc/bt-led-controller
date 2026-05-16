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

## Prompt archive (superseded 2026-05-15)

Older prompts queued PWA, Supabase preset gallery, and Vercel analytics alongside firmware Colour B.

**User reorder (2026-05-15):** finish **firmware secondary colour** first, then **PWA** (icons + install affordance), then **five approved LED patterns** E2E. **Supabase** and **Vercel analytics** are deferred; they now live under **Deferred near term** in `Roadmap.md`.

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
- [x] **Secondary-color palette system.** `secondaryColor?: RGB` in `LedConfig`. `PARAM_COLOR2_RGB=0x05` in ble-protocol. `VirtualDevice` handles it. `BleCommandService.updateSecondaryColor()` added. Firmware parity shipped 2026-05-15 (`SETTINGS_VERSION` 2, see sign-off below).
- [x] **Pattern palette branches.** Rainbow sweeps hue A→B. Chase uses A / blend(A,B) / B dots. Wave and plasma constrain HSV sweep to [hueA, hueB]. All fall back to existing defaults when `secondaryColor` is undefined.
- [x] **Color B UI.** ColorPicker shows "Color A" + full "Color B" wheel+sliders section when a palette pattern is active (rainbow/chase/wave/plasma). First interaction on Color B activates gradient mode.

**Verification:**
- `npx vitest run`: **exit 0** — 22 files, **76 tests** (was 75).
- `npm run build --workspace=@bt-led/simulator`: **exit 0** — JS 181.77 kB / gzip 58.86 kB.

**Deviations:**
- **Firmware secondary colour (historical deviation).** Resolved on hardware 2026-05-15 (`SETTINGS_VERSION` 2, `PARAM_COLOR2_RGB` `0x05`, pattern parity). This bullet is left for traceability.
- **Color B placeholder always visible.** Rather than a complex "activate" toggle, Color B always shows placeholder blue when `secondaryColor` is undefined. First wheel/slider interaction sets `config.secondaryColor` and activates gradient mode.

Completed by: v1.5 correctness agent (Claude Sonnet 4.6) — 2026-05-14T04:20:00Z

---

## Firmware secondary colour (hardware) — sign-off

**What changed**

- **`device_config.h`:** `SETTINGS_VERSION` → **2**; **`reserved[14]`** tail replaced by **`color2[3]`**, **`hasSecondaryColor`**, **`reserved[10]`** (still 14 bytes in that region).
- **`bt-led-controller.ino`:** `handleConfigUpdate` handles **`0x05`** (`PARAM_COLOR2_RGB`); previews via `setPattern` / `showLeds`. `rainbow`, `chase`, `wave`, `plasma` match the Colour B branches in `packages/led-engine`.
- **`packages/ble-protocol/src/constants.ts`:** JSDoc for `PARAM_COLOR2_RGB` no longer implies firmware lacks support.

**Operational note:** On-disk settings with **`SETTINGS_VERSION` 1** no longer validate — device follows the existing **invalid settings → defaults** flow until the user recommits (**one-time wipe of saved settings**, same as prior version bumps).

**Physical hardware verify:** BLE config Colour A + Colour B on rainbow/chase/wave/plasma → commit → power-cycle persists gradient behaviour.

**Simulator / CI verification**

- `npx vitest run`: **exit 0** — 24 test files / **83** tests.
- `npm run build --workspace=@bt-led/simulator`: **exit 0** — JS approx **183.7 kB** (gzip approx **59.5 kB**).

Completed by: Cursor agent — 2026-05-15T23:20:00Z

---

## PWA install (simulator) — sign-off

**What shipped**

- **`public/icons/icon-192.png`**, **`public/icons/icon-512.png`** (theme-aligned art; regenerate with **`npm run icons:pwa`** in `@bt-led/simulator`).
- **`manifest.webmanifest`** `icons[]`; **`index.html`** `apple-touch-icon`.
- **`src/pwaInstall.ts`** captures `beforeinstallprompt`; **`main.tsx`** calls `initPwaInstallListeners()` and registers **`/sw.js`** in **production** only (minimal pass-through SW for Chromium install eligibility).
- **`TopBar`** **Install app** button (shown only when the deferred prompt exists).

**How to smoke-test**

- Production or **HTTPS**: open site, satisfy browser installability; confirm **Install app** appears and opens the OS/browser install sheet. Local **`npm run preview --workspace=@bt-led/simulator`** after a build is enough to confirm manifest, icons, and SW are copied to `dist/`.

**Simulator / CI**

- `npx vitest run`: **exit 0** — **24** files / **83** tests.
- `npm run build --workspace=@bt-led/simulator`: **exit 0** — JS **~184.7 kB** (gzip **~59.8 kB**).

Completed by: Cursor agent — 2026-05-15T23:50:00Z

---

## Prompt archive (PWA work assigned 2026-05-15)

**Was:** Queue item 1: PWA; Queue item 2: five LED patterns.

**Status:** **PWA** slice completed (sign-off above). **Deferred** analytics / Supabase remain in `Roadmap.md`.

---

## Prompt for next agent

**Assigned:** **Five LED patterns E2E** — web research plus explicit maintainer-approved list → `packages/led-engine` + Vitest assertions; simulator UI only through `BleCommandService`.

**Deferred:** Shared Supabase gallery, Vercel analytics (`Roadmap.md` » Deferred near term).

**Verify:** `npx vitest run` and `npm run build --workspace=@bt-led/simulator` exit **0**; redeploy simulator when convenient.