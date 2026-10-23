# Handoff archive

This file holds every completed sign-off and superseded status section moved out of `docs/Handoff.md`. Nothing in it is ever deleted, only appended.

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

## Simulator pattern pack (21 effects) — sign-off

**Maintainer:** Approved the full suite as shipped; no further simulator-only pattern work is queued.

**What shipped (BLE ids 16–36, simulator-only until individually ported to firmware)**

| Id | Slug | UI label |
|----|------|----------|
| 16 | `glitter` | Glitter |
| 17 | `fairy` | Fairy |
| 18 | `sparkle_plus` | Sparkle+ |
| 19 | `pacifica` | Pacifica |
| 20 | `aurora` | Aurora |
| 21 | `sunrise` | Sunrise |
| 22 | `gradient` | Gradient |
| 23 | `lighthouse` | Lighthouse |
| 24 | `icu` | ICU |
| 25 | `chase_rainbow` | Chase Rainbow |
| 26 | `running_saw` | Running Saw |
| 27 | `railway` | Railway |
| 28 | `bpm` | BPM |
| 29 | `perlin_move` | Perlin Move |
| 30 | `distortion_waves` | Distortion Waves |
| 31 | `lightning` | Lightning |
| 32 | `rain` | Rain |
| 33 | `fireworks` | Fireworks |
| 34 | `candle` | Candle |
| 35 | `bouncing_balls` | Bouncing Balls |
| 36 | `dissolve` | Dissolve |

**Engine / types**

- `packages/led-types/src/pattern.ts`: `PATTERN_IDS` and `PATTERN_INT` extended through **36**.
- `packages/led-engine/src/patterns/*.ts`: one module per effect; `simNoise.ts` for deterministic noise helpers (simulator-only, not firmware parity).
- `bouncing_balls`: stateful factory `createBouncingBalls(ledCount)` (same role as `createFire`).
- `packages/led-engine/src/patterns/index.ts`: registry wires all ids; `extendedPack.test.ts` asserts RGB bounds and non-zero energy per effect.

**Simulator UI**

- `PatternPanel`: labels and icons for every `PatternId`; grid scrolls (`max-height` + `overflow-y` on `.pattern-grid`).
- `thumbnail.ts`: preview ticks for new ids (including stateful `bouncing_balls`).
- `App.tsx`: `PALETTE_PATTERNS` adds `fade`, `glitter`, `running_saw`, `railway` for Color B where the engine uses `secondaryColor`.

**Codegen**

- `CodeGenerator.ts`: `SIM_ONLY` is derived from `PATTERN_IDS` minus patterns with inline `BODY` templates (no manual list to maintain). Export for ids 14+ still emits `clearBuf()` with a simulator-only comment.

**Not in scope for this slice**

- Firmware ports for ids 14–36 (larson/confetti remain 14–15; new pack is 16–36).
- RN app pattern picker parity.

**Simulator / CI verification**

- `npx vitest run`: **exit 0** — **25** test files / **125** tests.
- `npm run build --workspace=@bt-led/simulator`: **exit 0** — JS **~198.4 kB** (gzip **~63.3 kB**).

Completed by: Cursor agent — 2026-05-19T12:00:00Z

---

## Remove orphaned duplicate Jest manual mocks — sign-off

**What changed**

- Deleted `__tests__/__mocks__/react-native.ts` and `__tests__/__mocks__/@react-native-async-storage/async-storage.ts` — byte-for-byte duplicates of `src/__tests__/__mocks__/*`, which is what `jest.config.js`'s `moduleNameMapper` actually points to. Jest's haste-map auto-discovers `__mocks__` folders regardless of the mapper, so the repo was indexing two manual mocks for the same module names and printing a `duplicate manual mock found` warning on every run.
- No source or test behavior changed. This is repo hygiene only.

**Also verified while in the repo (no code change)**

- PR #3's EMI domain code and tests: sound, all 15 tests passing.
- Firmware bitbang clock table (`CLOCK_DELAYS[]`, `DATA_PIN`/`CLOCK_PIN`) matches what is already documented on the Build Bench.

**Flagged, not fixed here:** on plain `main`, `npx jest` with no path filter shows 15 of 16 suites failing, 70 of 138 tests failing, almost all "Cannot find module" errors from test files importing paths that no longer match the source tree. `npx tsc --noEmit` cannot even start (`tsconfig.json` conflicts with `expo/tsconfig.base`). Both predate this PR and reproduce on a clean `main` checkout. This became the top-priority Q18 hardening program (see the plan and H1-H4 slices later in this document).

**Verification**

- `npx jest --silent` before and after deleting the mocks: identical `15 failed / 1 passed` suites, `70 failed / 68 passed` tests both times — zero regression, only the duplicate-mock warning disappears.
- `npx jest src/__tests__/domains/emi` (on PR #3's branch): 15/15 passing.

Completed by: nightly session worker (Claude Sonnet) — 2026-09-22T01:20:00Z

---

## tsconfig fix + dead bleCommunicationService removal + ts-jest — sign-off

**What changed**

- Fixed `tsconfig.json`: dropped the local `moduleResolution: "node"` override, which conflicted with `customConditions` inherited from `expo/tsconfig.base` (needs `bundler`/`node16`/`nodenext`). This is what let `npx tsc --noEmit` run to completion again instead of dying immediately on `TS5098`.
- Installed `ts-jest` as an actual dev dependency (`jest.config.js` already required it via `preset: 'ts-jest'`, but it was never declared, so `npm test` could not run at all before this).
- Deleted `src/utils/bleCommunicationService.ts` — confirmed by repo-wide grep to be imported nowhere. It called `BLECommandEncoder.encodeColorUpdate(r, g, b)` with three loose numbers against a signature that takes a single `[r, g, b]` tuple, which is the same "color is not iterable" bug pattern seen elsewhere in the live suite. Removing it removes the dead code and the footgun in one pass.
- No source or test files were fixed or deleted beyond the above — every "Cannot find module" import investigated resolves to a module that still exists under a different path or name, so nothing qualified as genuinely dead code under a conservative bar. That triage work carried forward into the Q18 hardening plan's H1 slice (below).

**Verification**

- `npx tsc --noEmit`: before this PR, immediate `TS5098` crash. After the tsconfig fix, 212 errors (211 in test files, 1 in the now-deleted dead file). After deleting the dead file: 211 errors, all in test files, zero in `src/`.
- `npx jest`: unchanged at 15/16 suites failing, 70/138 tests failing, before and after (expected, since no test files were touched).

Completed by: nightly session worker (Claude Sonnet) — 2026-09-23T01:25:00Z

---

## H2 status (2026-10-02)

**Branch:** `claude/h2-power-safety`, created from `origin/claude/h1-test-suite-triage` (PR #7, unmerged). Merge #7 first; this branch is built on it.

**Plan table, H2 row:** done. All six task items are complete. The orchestrator supplied the settled decisions (see also "H2 decisions applied by default (2026-09-28)" on the `claude/handoff-h2-decisions` branch), so they were not re-asked: constants live in `packages/ble-protocol`; 400 mA is hard-coded as an overridable `MAX_FRAME_CURRENT_MA` with a battery TODO; the `showLeds()` 30 FPS bypass is left alone; the limiter keeps the `MAX_FRAME_CURRENT_MA` name so PR #3's `#error` tripwire composes with it.

**Before/after (measured on this branch; "before" is the H1 after-state, re-measured here before any H2 change):**

| Check | Before | After |
|---|---|---|
| `npx jest` suites | 9 failed, 3 passed (12 total) | 8 failed, 4 passed (12 total) |
| `npx jest` tests | 68 failed, 96 passed (164 total) | 49 failed, 122 passed (171 total) |
| `npx tsc --noEmit` | 198 errors | 162 errors (the 36 in `parameterValidation.test.ts` are gone; no new errors) |
| `npx vitest run` (apps/simulator) | 6 files / 29 tests, all passing | unchanged, all passing |
| `npx vitest run` (packages/led-engine) | 19 files / 96 tests, all passing | unchanged, all passing |
| g++ firmware job (new `firmware-host` job) | did not exist | constants drift check passes; `power_limiter_test`: 232,709,924 checks, 0 failures |
| `npm run build --workspace=@bt-led/simulator` | passing | passing (it consumes `@bt-led/ble-protocol`, which gained one export) |
| `npx expo export --platform android` (RN bundle, run locally, not in CI) | not measured | bundles (1208 modules), so Metro resolves the new shared-constants import |

The 19 failing `parameterValidation.test.ts` tests now pass. The file has 26 tests: the 19 originals translated, 4 new unit tests and 3 property sweeps. Every remaining jest failure is unchanged from the H1 table above and keeps its owner (H3 or H4+).

**What changed**

| Task | Change |
|---|---|
| 1. Firmware limiter | `bt-led-controller/power_limiter.h`: pure C++ header, only `<stdint.h>`. `powerLimitFrameBrightness(channelSum, brightness, limitMa, maPerChannel)` returns the largest brightness at or under the requested one that keeps the frame at or under the limit, in exact integer math. `bitbangShow()` sums the frame's R+G+B bytes and sends the limited brightness. `globalBrightness` is not modified; only the value on the wire is capped. Every frame goes through `bitbangShow()` (it is the only caller of `sendLED()`). Serial logs once when the limiter engages and once when it releases. |
| 2. Shared constants | Single source of truth: `packages/ble-protocol/src/powerSafety.ts` (`MAX_LED_COUNT = 30`, `MA_PER_CHANNEL_AT_FULL = 20`, `MAX_FRAME_CURRENT_MA = 400`), exported from the package index. Firmware mirror: `bt-led-controller/power_safety_constants.h`, checked in rather than generated. `scripts/check-power-safety-constants.mjs` fails CI on any drift (verified by changing 400 to 401). `MAX_FRAME_CURRENT_MA` is `#ifndef`-guarded so a build can override it. The header is included right after `device_config.h`, before where PR #3 puts its `#error`, so the two compose once both land. The `.ino` also refuses to compile if `LED_COUNT > MAX_LED_COUNT`. |
| 3. `validateBrightness` | Now takes `int` and checks `0..MAX_BRIGHTNESS` through `powerIsBrightnessInRange` (host-tested). The old `uint8_t` parameter made `brightness <= 255` always true and silently wrapped `-1` (no data) to 255. Rejections are logged. Honest scope note: the protocol sends one byte, so every value that arrives intact is in range; the real power protection is the limiter. |
| 4. Brightness `case 0x00` | Sets `currentSettings.brightness`, then calls `applyPowerMode()` (which applies the power-mode divisor and calls `showLeds()`) instead of writing `globalBrightness` directly. |
| 5. Power tests revived | `src/__tests__/parameterValidation.test.ts` rewritten against `calculateLEDCurrent` / `calculateTotalCurrent` / `validateColorAndPower` with `[r, g, b]` tuples and 0-100 brightness. Each original assertion is kept and translated (see "Test translation notes"). |
| 6. Property tests | Firmware: every per-LED channel sum 0..765 and a 16-level RGB grid, each x brightness 0..255 x LED count 0..30, plus 200,000 seeded mixed-colour frames at seven limits. Each case checks that the linear model, the APA102 5-bit global field and per-channel scaling (PR #3's mode 1) all stay at or under the limit, that safe frames are untouched, and that the limiter dims no more than needed. App: every channel sum x brightness 0..100 x LED count 0..30 (2.4M cases) proves `validatePowerConsumption` accepts exactly the configurations at or under the limit; a colour grid with fractional brightness; and `calculateMaxSafeBrightness` is always safe and tight. Mutation-checked: an off-by-one in the firmware limiter and a 5 mA slack in the app guard both make the sweeps fail. |

**App-side changes beyond the test file**

- `src/utils/parameterValidation.ts`: constants now come from the shared file (`MAX_LED_COUNT` goes from 14 to 30, so every default is sized for the real worst case). The unused `BATTERY_MAX_CURRENT = 500` is removed; the battery TODO now lives on `MAX_FRAME_CURRENT_MA`. New `calculateMaxSafeBrightness()` backs the "Reduce brightness to N%" hint, which the old inline formula could put a hair over the limit at exact boundaries. Blocked and warning decisions log through `logger`.
- `src/screens/ConfigScreen.tsx`: the power indicator's four hard-coded `400`s now read `MAX_FRAME_CURRENT_MA`.
- **Behaviour change Cow will see in the app:** with the default now 30 LEDs instead of 14, the app blocks more combinations. Full white is blocked above 22% brightness (was above 47%). This is the intended direction.
- The app imports the shared file by relative path (`../../packages/ble-protocol/src/powerSafety`), not `@bt-led/ble-protocol`. The RN app had no `@bt-led/*` import before, and the relative path keeps Metro, ts-jest and tsc on plain file resolution. Verified with jest, tsc and a local `expo export`.
- `.github/workflows/test.yml`: new `firmware-host` job (drift check, g++ build with `-Wall -Wextra -Werror`, run). The existing `rn-app` and `simulator-and-packages` jobs are untouched.

**The current model and its limits (read this before trusting the number)**

- Model: frame mA = (sum of all R, G, B bytes) x 20 mA x brightness / (255 x 255). The app uses the same model with brightness as a percentage. It is an upper bound for both APA102 dimming modes.
- Not modelled: APA102 idle current (about 1 mA per LED even when dark, so about 10 mA at 10 LEDs and 30 mA at 30), plus the controller and BLE radio. The 400 mA limit covers LED colour current only.
- 20 mA per channel is the APA102 datasheet nominal, not a measurement of this strip.
- Today the app sends brightness 0-100 and the firmware treats it as 0-255 (PR #3's `BRIGHTNESS_INPUT_IS_PERCENT` addresses this). With today's `LED_COUNT 10` that caps full white at about 235 mA, so the limiter will not engage from the app alone until PR #3's flag is on or `LED_COUNT` grows.

**Test translation notes (`parameterValidation.test.ts`)**

- Brightness values on the old 0-255 scale (255, 128, 200, 191, 154) became 100, 50, 80, an exact-limit case and 18 on the 0-100 scale. Each new value exercises the same boundary under the current model with the default of 30 LEDs. The "840 mA at 14 LEDs" and "half brightness about 420 mA" checks pass `ledCount = 14` explicitly so the original numbers still hold.
- `result.currentDrawMa` and `result.error.severity` do not exist in the current `ValidationResult`. Severity maps to the existing contract: "error" is `isValid: false`; "warning" is `isValid: true` with `error` set. Current draw is asserted through `calculateTotalCurrent`, and the blocked message is asserted to contain the mA figure and the limit.
- "exactly 400 mA" was a conditional assertion; it is now deterministic: 20 LEDs of pure red is exactly 400 mA and must be allowed (the limit is inclusive), 21 must be blocked.
- `toContain('power')` became `toMatch(/power/i)`: the real message starts with "Power".
- "invalid HSV values" became out-of-range RGB `[300, 300, 300]`, and the test now also asserts it is rejected, which is stronger.
- "effect type should not affect power" is kept: the power API takes no effect type, and two configurations that differ only in effect type get identical results.
- `testFixtures.ts` is untouched (its HSV fixtures are still used by other suites); the RGB fixtures are local to this file.

**Not verified (no hardware or Arduino toolchain in this session)**

- The `.ino` was not compiled for the nRF52. As a substitute, the whole sketch was syntax-checked on the host with g++ against hand-written stubs of `Arduino.h`, `bluefruit.h` and the LittleFS headers. H2's edits add no errors or warnings, and the old "comparison is always true" warning on `validateBrightness` is gone. That is not a real build.
- No current was measured on a real strip.

**Found, not fixed (pre-existing, outside H2's one concern)**

- **The sketch on `main` does not compile.** `wave()` uses `positionPhase` and `g`, which no longer exist: commit a830801 (Colour B) deleted the `positionPhase` line and renamed `g` to `gv` without updating the uses. The same two errors show on `origin/main` with the same stub check. The fix mirrors `packages/led-engine/src/patterns/wave.ts`: restore `uint8_t positionPhase = (uint8_t)((i * 255) / LED_COUNT);` inside the loop and call `hsv2rgb(hue, 255, gv)`. Until this is fixed, nothing can be flashed, including this PR. See the question for Cow below.
- Power mode `case 0x03` sets `ramBuffer.powerMode` but not `currentSettings.powerMode`, and `applyPowerMode()` reads `currentSettings.powerMode`, so a power-mode change does not preview until commit. The frame limiter still caps every frame, so this is a UX bug, not a power hazard. Handed to H3 (config flow).
- `MAX_POWER_MILLIAMPS 500` and `BRIGHTNESS_FACTOR` in `device_config.h` are defined but unused. Left alone; the limiter uses `MAX_FRAME_CURRENT_MA`.
- Firmware `validateColor()` still returns true. With three single-byte channels every value is in range, so there is nothing to reject; current from colour is bounded by the limiter instead.
- The `showLeds()` 30 FPS limiter bypass is left alone, per the settled decision.

**Question for Cow (one line):** Fix the two-line `wave()` compile break (matching the simulator's `wave.ts`) as its own small PR now, yes or no?

**Hands-on step for Cow (needs the guitar and a USB cable; about 15 minutes; only after the `wave()` fix lands):**

1. Add `#define MAX_FRAME_CURRENT_MA 50` as the first line of `bt-led-controller.ino` (a temporary low limit so the limiter trips with today's 0-100 app brightness). Flash, with the Serial Monitor open at 115200 baud. (5 min)
2. In the app, enter config mode, pick Solid White with colour white, set brightness to 22. Done when Serial shows `Power limiter engaged: requested brightness=22, sent=21, frame current=50 mA (limit 50 mA)` and the strip stays lit. (3 min)
3. Drop brightness to 10. Done when Serial shows `Power limiter released`. (2 min)
4. Delete the temporary line, flash again, repeat step 2. Done when no `Power limiter` line appears and brightness changes still preview immediately. (5 min)

Completed by: H2 worker (Claude Opus) — 2026-10-02T01:20:00Z

---

## Cow's decisions, 2026-10-12: finished-work parts (moved from Handoff.md)

**Firmware compilation is SOLVED, by Cow, in PR #12, merged as main 735e29a.** The repo now has `scripts/build-firmware.sh` (arduino-cli pinned 1.5.1, Adafruit board index, core `adafruit:nrf52@1.7.0`, adafruit-nrfutil, FQBN `adafruit:nrf52:itsybitsy52840`), `.github/workflows/firmware-build.yml` running a real sketch compile on firmware PRs, and `npm run build:firmware`. The same PR fixed the `wave()` compile break. The sketch compiles for the first time since 2026-05-15.

**Cow's wave() fix was more correct than the brief this project had queued for it.** The brief in Build Bench state/open_prs said the fix was one missing declaration plus swapping `g` for `gv`. That was incomplete. On main, `hue` was also being computed in the loop and then discarded, because the call read `hsv2rgb(wavePhase, 255, g)` instead of `hsv2rgb(hue, 255, gv)`. The queued brief would have made the sketch compile while leaving Colour B silently ignored on the wave pattern. Any future agent taking a one-line diagnosis from a Build Bench note must re-read the surrounding function before trusting it.

**What Cow authorised, and what is now left**

| Item | State |
|---|---|
| wave() compile fix | DONE by Cow, PR #12, merged. Struck from the queue. |
| arduino-cli compile for the Adafruit board | DONE by Cow, PR #12, merged. Struck from the queue. |
| Storing raw EMI calibration inputs (review item N2 on PR #3) | OPEN. Job C below. Hard deadline Saturday 2026-10-17. |
| Hardening the CI Cow just landed | OPEN. Job D below. |
| Resolving PR #11's conflicts with the new main | OPEN, authorised 2026-10-12 with a no-merge constraint. Job E below. |
| More noise-mitigation approaches | Next session. Prompt at the end of this entry. |

**Merge state re-derived against the new main 735e29a, by actual local trial merges on 2026-10-12.** PR #11 (H2) NO LONGER merges clean: it conflicts with main in `docs/Handoff.md` and `docs/Architecture.md`, because PR #12 added content to the same regions of both. Both conflicts are purely additive, so the resolution is keep-both-sides in timestamp order. PR #3 still merges clean. PR #8 (draft) and PR #7 conflict in `docs/Handoff.md` only, also additive; #7 is contained in #11.

**One substantive consequence inside PR #11.** Its `docs/Architecture.md` row justifies the pure-header power limiter with the rationale "No Arduino toolchain in CI". PR #12 made that false. The pure-header approach is still the right call, because exhaustive host-side g++ sweeps prove far more than a compile does, but the stated rationale must be corrected to say so rather than claiming no toolchain exists.

---

## Arduino sketch build support — sign-off

**What changed**

- Added `scripts/build-firmware.sh`: installs `arduino-cli` (pinned `1.5.1`), Adafruit board index, core `adafruit:nrf52@1.7.0`, and `adafruit-nrfutil`, then compiles `bt-led-controller/` for FQBN `adafruit:nrf52:itsybitsy52840`.
- Added `.github/workflows/firmware-build.yml` so PRs that touch firmware run a real nRF52 sketch compile and upload the binaries.
- Root `npm run build:firmware` wires the script; README / `bt-led-controller/README.md` / Contributing checklist document it.
- Fixed the `wave()` compile break on `main` (missing `positionPhase`, wrong value channel / hue args) to match `packages/led-engine/src/patterns/wave.ts`. H2 had flagged this as blocking any flash; answered by making the sketch compile as part of this build work.

**Verification**

- `./scripts/build-firmware.sh` (and a direct `arduino-cli compile --fqbn adafruit:nrf52:itsybitsy52840`): exit 0. Sketch uses ~161228 bytes flash / ~16280 bytes RAM on ItsyBitsy nRF52840.

**Not verified**

- No hardware flash or BLE smoke test in this session.

Completed by: cloud agent (Arduino sketch build support) — 2026-10-12T18:20:00Z

---

## Job E (PR #11 conflict resolution): sign-off

**What changed**

- Merged `origin/main` (735e29a plus the 2026-10-12 decisions commit 52ab91d) into `claude/h2-power-safety`. Nothing went to main; no PR was merged, closed or marked ready.
- `docs/Handoff.md`: kept both sides ordered by sign-off timestamp (H1 status 2026-09-25, H2 sign-off 2026-10-02, Cow's decisions 2026-10-12T14:45:00Z, the Arduino sketch build sign-off 2026-10-12T18:20:00Z). The PM's Jobs E, C and D prompt is archived below as "Prompt archive (jobs E, C, D, 2026-10-12)", so the H3 prompt is the single live "Prompt for next agent".
- `docs/Architecture.md`: kept all decision rows. The H2 limiter row no longer says "No Arduino toolchain in CI". It now says exhaustive host-side g++ sweeps over colour, brightness and LED count prove the limiter arithmetic in a way a single compile cannot, and that the compile job and the host sweeps are complementary.
- No code changed. Only the two docs files had conflicts; every other file in the merge is main's content as it stands.

**Verification (before the merge and after it, identical, so no code changed)**

| Check | Before | After |
|---|---|---|
| `npx jest` | 8 suites failed, 4 passed; 49 tests failed, 122 passed (171) | same |
| `npx tsc --noEmit` | 162 errors | 162 errors |
| `npx vitest run` | 25 files, 125 tests, all passing | same |

`grep -rn '<<<<<<<\|=======\|>>>>>>>' docs/` returns nothing, and there is exactly one `## Prompt for next agent` heading. The `firmware-build` result on PR #11 is reported on the PR and to Cow; it is a new signal on this branch because main's workflow now runs against H2's firmware changes.

Completed by: Job E worker (Claude Sonnet) - 2026-10-13T01:12:00Z

---

## Firmware CI hardening (Job D) - sign-off

Done on branch `claude/ci-firmware-hardening`, one concern: make the firmware compile check safe to require and cheaper to run.

- [x] Always-reporting check: the `paths` filters were removed and one job named "Compile bt-led-controller.ino" always runs. A detect step diffs base against head over `bt-led-controller/`, `scripts/build-firmware.sh` and the workflow file. When none changed, the compile steps are skipped and the check still reports success. Chosen over a companion job because one workflow cannot hold two jobs with the same name and a second file would report two checks under one name.
- [x] Cache: `actions/cache@v4` over `~/.local` and `~/.arduino15`, keyed on CLI 1.5.1, core 1.7.0, nrfutil version and Python 3.12.
- [x] `adafruit-nrfutil` pinned to 0.5.3.post16 (kept, not removed), overridable with `ARDUINO_NRFUTIL_VERSION`.
- [x] Dead `develop` push trigger removed.
- Measured on Actions (workflow_dispatch, same commit): cold run 72 s total, compile step 54 s; warm run 32 s total, compile step 19 s.
- Not exercised: the skip path (no firmware files changed). Dispatch runs always compile. It first runs for real on the next PR that touches no firmware path.

Decision: the check name was kept identical so it can be made a required status check after Cow merges this.

Completed by: Job D worker (Claude Sonnet) - 2026-10-13T01:20:00Z

---

## iOS build fix (PR #15) status, 2026-10-14

BLUF: iOS Build run 84 failed because Xcode 26.0.1 on the runner had no iOS platform component, not because of signing or the Apple subscription. PR #15 (`claude/ios-platform-fix`, workflow only, not merged) fixes it; a development build on that branch is green end to end (run 38494125022, about 19 minutes).

- Root cause: `xcodebuild: error: ... iOS 26.0 is not installed` in Build & Archive. Signing, profile install and `agvtool` all passed.
- First attempt failed (run 86): the guard `xcrun --sdk iphoneos --show-sdk-path` passes while the platform component is absent, so it never downloaded. Do not reintroduce a conditional on the SDK path.
- Fix: `xcodebuild -downloadPlatform iOS` runs unconditionally ("Ensure iOS platform is installed", about 4 minutes). The verify step now prints `xcodebuild -showsdks` and the iOS SDK. Dead `develop` trigger removed.
- A production dispatch from the branch was queued to exercise the TestFlight chain. Its outcome was not observed by this session (the monitoring command was denied by the permission classifier). Read the `iOS Build` and `iOS Publish to TestFlight` runs on `claude/ios-platform-fix` first.
- Run logs print the signing identity common name, which includes a personal name; do not copy log output into commits, PRs or docs.
- The live `## Prompt for next agent` (H3) above is unchanged. The queued noise catalogue, the docs slim-down and the two TODO jobs are not started: PR #3 and PR #15 are open, and iOS was declared job one.

Completed by: nightly WORK orchestrator (Claude Sonnet) — 2026-10-14T02:00:00Z

## Job G status (PR #16 conflict, 2026-10-15)

BLUF: Job G is done. `claude/noise-catalogue` (PR #16) now contains `claude/magical-pascal-yg32dj` at `80c41d0` through merge commit `4b4cc7f`, and a read-only trial merge of it onto the PR #3 branch reports clean.

- One conflict in `docs/Handoff.md`, resolved by keeping both appended sections in sign-off order: noise catalogue (15:05) first, Job F (22:00) second. Both `Completed by:` lines survive verbatim.
- `docs/NoiseCatalogue.md` is byte-identical to `b8084ad`. Both `## Prompt for next agent` headings are untouched; no conflict markers remain.
- Nothing was merged, closed or marked ready. Next pending: documentation slim-down (`handoff/2026-10-13-docs-slim`), then TODO A and TODO B. H3 and H4+ stay frozen.

Completed by: nightly WORK orchestrator (Claude) - 2026-10-15T01:30:00Z
