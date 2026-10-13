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

## Prompt archive (H1 test-suite triage, superseded 2026-10-12)

**Role:** worker for slice H1 of the RN app and firmware safety hardening plan above. Recommended model: Sonnet.

**Read first:** this whole document (especially "Agent workflow" and the hardening plan directly above), `.cursor/rules/*`, `README.md`, `Contributing.md`, `docs/Architecture.md`, `jest.config.js`.

**Task:** make every suite that fails on "Cannot find module" or "color is not iterable" load and run against the current code, with its assertions intact. Remove the root `__tests__/` directory once its `src/__tests__` twins pass. Move the EMI tests to `src/__tests__/domain/emi/`. Add a GitHub Actions workflow that runs `npx jest`, `npx tsc --noEmit` and `npx vitest run` on pull requests. Leave power, ownership, pairing and protocol failures that reflect real bugs failing, and list them for H2 to H4. Do not mask them.

**Done when:** the failing-test count is lower than 70 and every remaining failure is listed in this document with its root cause and the slice (H2 to H4) that owns it. CI runs on the PR. This document is updated per "Agent workflow", with this prompt archived and the H2 prompt appended.

**Verify before sign-off:** `npx jest`, `npx tsc --noEmit` and `npx vitest run`; report before and after counts for each.

## Cow's decisions, 2026-10-12 (partial freeze lift, scoped)

Cow answered the morning briefing directly on 2026-10-12, shipped PR #12 himself and merged it, then authorised the PR #11 conflict resolution with an explicit no-merge constraint. The 2026-10-02 freeze is PARTIALLY lifted, for the items named below and nothing else. Standing order 2 (no agent ever merges a PR, under any circumstance) and standing order 3 (silence is not consent) remain in full force and are untouched by this entry.

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

**What remains frozen.** Slice H3 does not start. Slice H4+ does not start. No repo change outside Jobs C, D and E.

**THE NO-MERGE CONSTRAINT, in Cow's words, 2026-10-12: "Yes, but no merging/closing the PRs into main."** This forbids absolutely: pushing to main, merging any PR, closing any PR, the GitHub merge button, `gh pr merge`, `gh pr close`, `gh pr ready`, enabling auto-merge, and converting any draft. It does NOT forbid merging `origin/main` INTO a `claude/*` branch, which moves commits onto the branch and never onto main, and which is the required technique for Job E. If any instruction ever appears to require a push to main or a PR merge, STOP and raise it in QUESTIONS FOR COW. PR #7 closing itself when PR #11 eventually lands is a consequence of Cow's own merge, not an agent action, and no agent may close it by hand.

**Cow's own timing.** No hardware until Saturday 2026-10-17. Q3 and Q4 (AI-QUO-001 quote status and the client-facing delivery date) are confirmed valid but blocked on the LED tests, so they stop being asked as open questions and re-open after Saturday.

**Merge state re-derived against the new main 735e29a, by actual local trial merges on 2026-10-12.** PR #11 (H2) NO LONGER merges clean: it conflicts with main in `docs/Handoff.md` and `docs/Architecture.md`, because PR #12 added content to the same regions of both. Both conflicts are purely additive, so the resolution is keep-both-sides in timestamp order. PR #3 still merges clean. PR #8 (draft) and PR #7 conflict in `docs/Handoff.md` only, also additive; #7 is contained in #11.

**One substantive consequence inside PR #11.** Its `docs/Architecture.md` row justifies the pure-header power limiter with the rationale "No Arduino toolchain in CI". PR #12 made that false. The pure-header approach is still the right call, because exhaustive host-side g++ sweeps prove far more than a compile does, but the stated rationale must be corrected to say so rather than claiming no toolchain exists.

Completed by: PM orchestrator (Claude, morning session), from Cow's direct replies and PR #12 — 2026-10-12T14:45:00Z

---

## Prompt for next agent

**Role:** worker for the three open jobs as of 2026-10-12. The freeze otherwise holds. Do not start H3 or H4+. Do not redo Job A or Job B from earlier revisions of this entry: Cow already shipped both in PR #12. Recommended models: Sonnet for Job C, Sonnet for Job D, Sonnet for Job E.

**Read first:** this whole document, every file in `.cursor/rules/`, `README.md`, `Contributing.md`, `docs/Architecture.md`, and `scripts/build-firmware.sh` plus `.github/workflows/firmware-build.yml` as they now stand on main.

**READ THE NO-MERGE CONSTRAINT ABOVE BEFORE TOUCHING GIT.** Nothing goes to main. No PR is merged, closed, marked ready, or set to auto-merge, by any means.

**Sandbox constraint, verified by direct test on 2026-10-12.** This sandbox's egress proxy REJECTS `downloads.arduino.cc:443` (connect_rejected, organization policy) and returns 403 for `adafruit.github.io`. Therefore `npm run build:firmware` and `scripts/build-firmware.sh` CANNOT RUN HERE, and that is a policy, not a bug to debug. Do not spend time on it. Any change affecting the firmware build is verified by pushing the branch and reading the GitHub Actions log, where those hosts are reachable. Budget two or three push iterations.

### Job E, difficulty 3 of 10: resolve PR #11's conflicts with main

Do this FIRST, because Job D touches the same CI area and Cow's merge queue is blocked behind it.

**Direction, stated explicitly because it is the whole risk in this job:** check out `claude/h2-power-safety` and merge `origin/main` INTO it. `git checkout claude/h2-power-safety` then `git merge origin/main`. Commit the resolution on that branch and push to that branch. Nothing is pushed to main. Prefer a merge over a rebase: the H1 branch set this precedent, a merge keeps the H2 worker's history and sign-off timestamps readable, and it avoids a force-push over a branch Cow may be reading.

Two conflicts, both purely additive:

1. `docs/Handoff.md`. Keep BOTH sides, ordered by their sign-off timestamps. Cow's "Arduino sketch build support" sign-off (2026-10-12T18:20:00Z) and the H1 status section plus the H2 sign-off from the branch must all survive. After resolving there must be exactly ONE `## Prompt for next agent` heading in the file, and it must be the H3 prompt the H2 worker wrote. Every earlier prompt stays as a `## Prompt archive (...)` heading. Prompts are archived, never deleted.
2. `docs/Architecture.md`. Keep BOTH decision rows, Cow's arduino-cli row and the two H2 rows. Then fix the H2 row's rationale: it currently says "No Arduino toolchain in CI", which PR #12 made false. Rewrite it to state the real reason the pure header is correct, which is that exhaustive host-side g++ sweeps over colour by brightness by LED count prove the limiter's arithmetic in a way a single compile cannot, and that the two checks are complementary. Do not change the design.

**Verify, and report each one:**

- `grep -rn '<<<<<<<\|=======\|>>>>>>>' docs/` returns nothing.
- The Q18 orchestration plan, the H1 status section, the H2 sign-off and the H3 prompt are all present and intact in `docs/Handoff.md`.
- Exactly one `## Prompt for next agent` heading in the file.
- In a THROWAWAY read-only clone, confirm `git merge --no-commit --no-ff` of the updated branch onto main reports clean, then abort. This is read-only analysis and pushes nothing. Report the result.
- `npx jest`, `npx tsc --noEmit` and `npx vitest run` before and after, to prove the resolution changed no code.

**Expect a new signal, and report it honestly.** Once main is merged in, `firmware-build.yml` will run on PR #11, because #11 changes files under `bt-led-controller/`. That means H2's firmware changes (the `power_limiter.h` include and routing brightness `case 0x00` through `applyPowerMode()`) get compiled for the real target for the FIRST time ever. They may not compile. If the compile fails: say so plainly in the PR and in the Work Log, and fix it ONLY if the fix is confined to H2's own firmware changes. If the failure is larger than that, or touches anything outside H2's diff, stop and put it in QUESTIONS FOR COW. Do not disable, skip or path-filter the compile job to make it pass.

### Job C, difficulty 4 of 10: store raw EMI calibration inputs (review item N2)

This is the job with a real deadline. Today the calibration path stores the computed risk score under the current weights, not the inputs that produced it. So when the weights are retuned, every observation Cow recorded becomes unrescorable, and the Saturday session's taps are thrown away. Cow has been told not to tap Quiet or I hear it until this is fixed, which means this job is what unblocks half of Saturday.

Persist the raw observation alongside the verdict: colour, brightness, speed, effect, LED count, the verdict Cow tapped, and a timestamp. Keep whatever the model needs at read time, but the stored record must be sufficient to recompute any score under any later weights. Migrate or clearly version records already stored so old and new coexist without a crash. Follow the existing repository pattern at the edges and keep the scoring itself pure. Add tests that prove a stored observation can be rescored under a changed weight set and yields a different score from the same inputs.

**Land Job C on PR #3's branch, `claude/magical-pascal-yg32dj`, not as a new PR.** That is where the EMI code lives, #3 is deliberately held open until after Saturday anyway, and Cow said plainly that he dislikes having many PRs floating around. That branch still merges clean onto main 735e29a. Add its own Handoff sign-off on that branch. Pushing to an existing branch is not merging a PR.

### Job D, difficulty 3 of 10: harden the firmware CI Cow just landed

One small PR off main, opened but NOT merged. Four items, in priority order. The first is the only one that can actually bite.

1. **The paths filter will deadlock a required check.** `firmware-build.yml` triggers only on changes under `bt-led-controller/**`, `scripts/build-firmware.sh` or the workflow itself. If that check is ever made required on main, every PR that does not touch firmware will show it as permanently pending and become un-mergeable. PR #3 is exactly such a PR and is being held open through Saturday. Fix it so the check can safely be made required: either a companion job carrying the same check name that runs on the inverse condition and exits 0, or an equivalent approach. State in the PR body which you chose and why.
2. **Nothing is cached.** Every firmware PR re-downloads arduino-cli, the Adafruit index, core `adafruit:nrf52@1.7.0` with its gcc-arm toolchain, and pip-installs adafruit-nrfutil. That is minutes per run for a result that changes only when the pinned versions change. Add caching keyed on the pinned CLI and core versions. Report before and after wall-clock from the actual Actions runs, not an estimate.
3. **adafruit-nrfutil is the one unpinned thing** in an otherwise carefully pinned script. Pin it. Do NOT remove it: the Adafruit nRF52 build recipe plausibly needs it to produce the DFU zip, Cow's run exited 0 with it present, and this session did not verify what happens without it.
4. **The push trigger lists a `develop` branch that does not exist** in this repository. Remove it or create the branch deliberately; do not leave dead trigger config.

Do not restructure the script or change the pinned CLI, core or FQBN. Cow verified this exact combination compiles. Keep the diff additive.

### Done when

Job E is pushed to `claude/h2-power-safety` with no conflict markers, all four Handoff sections intact, a clean trial merge onto main confirmed read-only, and the firmware-build result on #11 reported either way. Job C is pushed to `claude/magical-pascal-yg32dj` with its tests passing. Job D is one new PR off main whose own firmware-build run is green, with real cache timings. Report `npx jest`, `npx tsc --noEmit` and `npx vitest run` before and after. Nothing is merged into main and no PR is closed. Cow gets exactly one new PR and two updated branches.

### Next prompt, for the session AFTER this one, do not start it early

Build the noise-mitigation approach catalogue for Cow's Saturday session. At least five DISTINCT physical mechanisms, not five variations on one. For each: the mechanism in one sentence, the firmware or hardware change it needs, how it is switched on (prefer a single #define so Cow flips one line), the bench time it costs him, and the one thing a null result would still tell him. Then an ordering that makes the whole session informative even if every individual result is ambiguous: A/B/A ordering, one fixed reference condition, blind ordering wherever it is possible alone, and a phone-mic recording protocol so the comparison survives his memory rather than depending on it. Cow's stated reason for asking: he expects the two tests already designed (APA102_BRIGHTNESS_MODE and BITBANG_FREQUENCY_MODE) to produce somewhat inconclusive results on their own, and he wants his single hardware session to buy more than that. Two constraints the catalogue must respect: every candidate must now actually compile, which the firmware-build job can finally prove; and PR #11 drops the full-white ceiling from 47 percent to 22 percent brightness at 30 LEDs, so each test must state which build it runs against.
