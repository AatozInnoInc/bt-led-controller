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

## Prompt archive (PWA work assigned 2026-05-15)

**Was:** Queue item 1: PWA; Queue item 2: five LED patterns.

**Status:** **PWA** slice completed (sign-off above). **Deferred** analytics / Supabase remain in `Roadmap.md`.

---

## Prompt archive (five LED patterns assigned 2026-05-15)

**Was:** Research plus maintainer-approved list → five patterns E2E in `led-engine` and simulator.

**Status:** Superseded. Maintainer expanded scope to **21** simulator effects (sign-off above). Suite is **closed** unless a new pattern is explicitly requested.

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

## Prompt archive (simulator next steps, superseded 2026-09-24)

**Context:** Simulator has **37** patterns (ids **0–36**). Ids **0–13** have firmware equivalents; **14–36** are simulator-only (`larson` through `dissolve`).

**Not assigned:** Additional simulator-only effects (maintainer satisfied with current pack).

**Reasonable next work (pick only what the user asks for)**

1. **Firmware:** Port selected ids from 14–36 (start with `larson` / `confetti` if aligning with `Roadmap.md` v2 notes, or any single effect from the 21-pack table above)
2. **Deferred near term** (`Roadmap.md`): Supabase shared preset gallery; Vercel analytics

**Verify before sign-off:** `npx vitest run` and `npm run build --workspace=@bt-led/simulator` exit **0** -- DONE

---

## RN app and firmware safety hardening (Q18): orchestration plan

**Why this work exists.** The Jest suite for the RN app is the project's safety net, and today most of it does not run. It protects against drawing too much power, which can burn out the LEDs, the controller or other parts. The LEDs are installed inside a guitar, so a burnout can ruin the instrument. It also protects ownership security: a claimed controller accepts commands only from its claimed device, except the claim/pair command while the controller is unclaimed. Device pairing does not work today. The maintainer has made this the top-priority program. It spans several nights.

**Verified state on `main` at a093930 (2026-09-24, merged tree of PRs #3, #4 and #5):**

| Area | Finding |
|---|---|
| Suite totals | 15 of 18 suites fail; 70 of 153 tests fail. `tsc --noEmit` reports 211 errors, all in test files. |
| Module paths | 10 suites fail with "Cannot find module". Tests import `../domains/...` or `../domain/configDomainController`, but the code lives under `src/domain/...` with different file names. 4 of these suites are duplicate copies under the root `__tests__/`. |
| Power safety | `parameterValidation.test.ts` calls `calculateCurrentDraw`, which no longer exists (the API is `calculateLEDCurrent` / `calculateTotalCurrent`). None of the power tests run. |
| Ownership security | `ownership.test.ts` fails to load. |
| Pairing | `devicePairing.test.ts` passes against mocks while real pairing is broken, so it does not cover the real path. |
| Protocol | `ProtocolSpecification.test.ts`: `CMD_EXIT_CONFIG` and `CMD_COMMIT_CONFIG` disagree with the spec (17 and 18 are swapped). `packages/ble-protocol` is meant to be the single source of truth. |
| Encoder tests | `bleCommandEncoder` and `errorHandling` fail with "color is not iterable". The tests pass `(r, g, b)`, but `encodeColorUpdate` takes an `[r, g, b]` tuple. Fix the tests. |
| Firmware | The firmware does no current limiting of its own. `validateBrightness(uint8_t)` is always true, `validateColor()` returns true, and the brightness handler (`case 0x00`) sets `globalBrightness` directly, bypassing `applyPowerMode()`. The only power guard is app-side: `validatePowerConsumption`, sized for `MAX_LED_COUNT = 14` against 400 mA. The build runs up to 30 LEDs; full white at 30 LEDs is about 1,800 mA. |

**Open PRs at plan time:** #4 (approved), #5 (approved), #3 (changes requested: owner's name in code comments, no firmware limiter behind `BRIGHTNESS_INPUT_IS_PERCENT`, no Handoff entry, plus rule-compliance items). Review comments are on each PR.

**Sequence (one small PR per slice, maintainer merges each):**

| Slice | Scope | Recommended worker model |
|---|---|---|
| H1 | Triage and mechanical repair: fix test import paths to `src/domain/...`, rewrite tuple-colour tests, delete the root `__tests__/` only after its `src/__tests__` twins pass, move the EMI tests under `src/__tests__/domain/`, and add a CI workflow running jest, `tsc --noEmit` and vitest on every PR. | Sonnet (mechanical, high volume) |
| H2 | Power safety: firmware frame-current limiter as a pure C/C++ header, host-tested with g++ in CI; shared constants with the app (30 LEDs, mA per channel, 400 mA limit configurable until the battery is chosen); fix `validateBrightness`; route `case 0x00` through `applyPowerMode()`; revive the power tests; property-style tests over colour × brightness × LED count ≤ 30, proving computed current ≤ limit in both the firmware and the app. | Opus (safety-critical design) |
| H3 | Protocol integrity: settle `CMD_EXIT_CONFIG` / `CMD_COMMIT_CONFIG` against the firmware; `packages/ble-protocol` feeds the app and a checked firmware header; a drift test fails when the two disagree. | Opus |
| H4+ | Ownership and pairing: an unclaimed controller accepts only claim/pair; a claimed controller rejects every command from a non-owner; the claim persists across reboot; factory reset is the only way to unclaim. Firmware enforcement first, then `ownership.test.ts` loading and passing, then pairing tests that exercise the real encode-to-handler path, then diagnose and fix pairing. Steps that need a phone and a device become short, time-boxed hands-on steps for the maintainer. | Opus (security) |

**Standing constraints for every slice.** Follow `.cursor/rules/*`, `README.md` and `Contributing.md`. Never delete, skip or weaken an assertion that encodes a power, security or protocol invariant; fix the code or the test so the invariant holds. A test may be deleted only if it is a verified duplicate of a passing test. No slice may increase the failing-test count, and the program ends with zero failures. Critical decisions go to the maintainer as questions and wait for an answer.

Completed by: PM orchestrator (Claude, morning session) — 2026-09-24T16:00:00Z

---

## Prompt for next agent

**Role:** worker for slice H1 of the RN app and firmware safety hardening plan above. Recommended model: Sonnet.

**Read first:** this whole document (especially "Agent workflow" and the hardening plan directly above), `.cursor/rules/*`, `README.md`, `Contributing.md`, `docs/Architecture.md`, `jest.config.js`.

**Task:** make every suite that fails on "Cannot find module" or "color is not iterable" load and run against the current code, with its assertions intact. Remove the root `__tests__/` directory once its `src/__tests__` twins pass. Move the EMI tests to `src/__tests__/domain/emi/`. Add a GitHub Actions workflow that runs `npx jest`, `npx tsc --noEmit` and `npx vitest run` on pull requests. Leave power, ownership, pairing and protocol failures that reflect real bugs failing, and list them for H2 to H4. Do not mask them.

**Done when:** the failing-test count is lower than 70 and every remaining failure is listed in this document with its root cause and the slice (H2 to H4) that owns it. CI runs on the PR. This document is updated per "Agent workflow", with this prompt archived and the H2 prompt appended.

**Verify before sign-off:** `npx jest`, `npx tsc --noEmit` and `npx vitest run`; report before and after counts for each.