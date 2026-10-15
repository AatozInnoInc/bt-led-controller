# Handoff — LED Simulator

## What you are building

A React + Vite + TypeScript web app hosted on Vercel. It simulates an LED strip in the browser, runs the same effect algorithms as `bt-led-controller.ino` (a companion Arduino project), and speaks the same binary BLE command protocol as the companion React Native app.

Read [`Architecture.md`](/docs/Architecture.md) before writing any code. Read `charts/ble-protocol.md` before touching anything in `src/engine/`. Read `Contributing.md` for non-negotiable rules.

## Current state

BLUF, as of 2026-10-15. Keep this section current; a session that reads only this section must be able to act correctly.

- Q18: H1 and H2 are landed on main (PR #11 merged as `12f5e9b`). H3 and H4+ are frozen. The live H3 prompt is `## Prompt for next agent` below.
- main is `7f04a1b`. PR #15 (iOS platform fix) is merged and the app is on Cow's phone.
- Open PRs: #3 (EMI banner, held open through Saturday 2026-10-17; its branch has main merged in and a TestFlight build exists from `80c41d0`), #16 (noise catalogue, conflict resolved by Job G, waiting for Cow), #13 (always-reporting firmware compile check; Cow makes it required after one non-firmware PR shows it green).
- Cow is out until Saturday 2026-10-17. His silence authorises nothing. No agent merges, closes or marks ready any PR. No signature block, attribution trailer or session ID anywhere in the repo.
- Queue: Job F (PR #3 build to his phone, live prompt near the end of this file), then the documentation slim-down (this PR), then TODO A (delete a comment) and TODO B (generate the shared power constants).
- Known blockers: no hardware until Saturday; the sandbox cannot reach `downloads.arduino.cc`, so firmware builds are verified only through GitHub Actions; the failing-test table in "H1 status" still lists every remaining jest failure and its owning slice.

Older prompts are in [`PromptArchive.md`](/docs/PromptArchive.md) and completed sign-offs are in [`HandoffArchive.md`](/docs/HandoffArchive.md). Both are consulted only when a specific past prompt or sign-off is needed.

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

## H1 status (2026-09-25)

**Branch:** `claude/h1-test-suite-triage`, created from `main` with `origin/claude/bold-ride-bj66ve` (PR #4) and `origin/claude/bold-ride-jo60ar` (PR #5) merged in locally, as instructed. This PR should merge after #4 and #5 land (or take a trivial rebase if they land first). It does not depend on #3.

**Plan table, H1 row:** done, with two of the four listed items partially scoped down (see deviations below). EMI test relocation is deferred in full (see below). CI workflow added.

**Before/after (measured on this branch, main + #4 + #5, without #3; see "why the baseline differs" below):**

| Check | Before | After |
|---|---|---|
| `npx jest` suites | 15 failed, 1 passed (16 total) | 9 failed, 3 passed (12 total) |
| `npx jest` tests | 70 failed, 68 passed (138 total) | 68 failed, 96 passed (164 total) |
| `npx tsc --noEmit` | 211 errors | 198 errors |
| `npx vitest run` (apps/simulator) | 6 files / 29 tests, all passing | unchanged, all passing |
| `npx vitest run` (packages/led-engine) | 19 files / 96 tests, all passing | unchanged, all passing |

Failing-test count went down (70 to 68), not up, and failing-suite count went down (15 to 9). `packages/ble-protocol` and `packages/led-types` have no vitest setup (`"test": "echo 'no tests'"`), so they are correctly excluded from the vitest CI job.

**Why the baseline differs from the plan table above.** The plan table's "15 of 18 suites fail; 70 of 153 tests fail; 211 tsc errors" was measured on the tree with PR #3 (EMI) merged in. Per the H1 setup instructions, this branch does not include PR #3, so its own true baseline (measured before any H1 change, with only #4 and #5 merged) is 16 suites / 138 tests, with the same 70 failing tests and 211 tsc errors as the PR #3 tree: the EMI suites contribute the extra 2 suites / 15 tests in the PR #3 number and no failures either way. Both baselines are reported above for clarity. The important number is that failures only went down.

**What was fixed (module paths, item 1):**

- `src/__tests__/domains/common/ErrorEnvelope.test.ts`: import path `../../../domains/common/ErrorEnvelope` to `../../../domain/common/errorEnvelope`. Suite now fully passes (11/11).
- `src/__tests__/domains/bluetooth/BLECommandEncoder.test.ts`: import path `../../../domains/bluetooth/BLECommandEncoder` to `../../../domain/bluetooth/bleCommandEncoder`, plus the tuple-colour fix below. Suite now fully passes (15/15).

**What was fixed (tuple-colour calls, item 2):**

- `src/__tests__/bleCommandEncoder.test.ts`: the two `encodeUpdateColor(...)` calls under "Color Update Commands" passed an `{h, s, v}` object; `encodeUpdateColor` destructures its argument as `const [r, g, b] = color`, so this threw `TypeError: color is not iterable`. Changed both calls to pass a positional 3-tuple with the exact same numeric values in the exact same order, so every existing assertion (which checks `command[1..3]` against the original `h`/`s`/`v` numbers) still holds unchanged: the function only ever read the three values positionally, never by key, so this is a pure call-shape fix.
- `src/__tests__/errorHandling.test.ts`: one `encodeUpdateColor({ h: 0, s: 0, v: 255 })` call changed to `encodeUpdateColor([0, 0, 255])`, same reasoning. This alone does not make the suite pass; see "left failing" below, the suite's `beforeEach` fails for an unrelated pre-existing reason, so all 19 tests still fail before and after this change (confirmed no regression by running both versions).
- `src/__tests__/domains/bluetooth/BLECommandEncoder.test.ts`: `encodeColorUpdate(255, 128, 64)` (three loose numbers) to `encodeColorUpdate([255, 128, 64])` (the tuple `encodeColorUpdate` actually takes). Combined with the module-path fix above, this suite now fully passes.

**Root `__tests__/` directory: deleted.** All four files under it (`domains/bluetooth/BLECommandEncoder.test.ts`, `domains/common/ErrorEnvelope.test.ts`, `domains/config/ConfigDomainController.test.ts`, `integration/config-mode-lifecycle.test.ts`) were confirmed byte-identical to their `src/__tests__/` twins before deletion (`diff` was empty on all four, plus the shared `mocks/MockBluetoothService.ts`). Two of the four twins (`ErrorEnvelope`, `BLECommandEncoder`) were fixed and pass. The other two twins (`ConfigDomainController`, `config-mode-lifecycle`) are still broken for a real reason (see next section); deleting their root duplicate loses no coverage, since the duplicate was equally broken and the canonical `src/__tests__/` copy (same content) remains for whoever fixes the underlying issue. Confirmed nothing outside the deleted directory referenced the `__tests__/` root path (`jest.config.js`'s `testMatch` is a glob that already matches `src/__tests__/`; no other config or source file pointed at `__tests__/mocks/MockBluetoothService.ts` or any file under it).

**EMI test relocation: deferred, not done.** PR #3 (`claude/magical-pascal-yg32dj`) is not merged into this branch per the H1 setup instructions, and neither `src/domain/emi/` nor `src/__tests__/domains/emi/` exist anywhere in this tree (`find src -iname "*emi*"` returns nothing). There is nothing to relocate yet. Whoever merges PR #3 into `main` (or a later slice) should move its EMI tests to `src/__tests__/domain/emi/` at that point, following the same module-path-fix pattern documented here.

**Deliberately left failing, with root cause and owning slice.** Do not fix these in a follow-up without discussing scope with the maintainer, Cow, first:

| Suite / test | Root cause | Owner |
|---|---|---|
| `parameterValidation.test.ts` (19/19 failing) | Calls `calculateCurrentDraw`, which no longer exists (`calculateLEDCurrent`/`calculateTotalCurrent` are the current API): 6 failures. Additionally, `MOCK_CONFIGS` and several inline literals in this file use `{h, s, v}` objects for `color` (cast `as LEDConfig`), but `validateColor`/`RGBColor` require a `[r, g, b]` tuple, so `validateColorAndPower` throws `TypeError: color is not iterable` for the other 13. Both are power-safety correctness questions (what RGB values should the fixtures actually exercise), not mechanical fixes, so left to H2. | H2 |
| `ownership.test.ts` (fails to load, 0 tests reported) | Imports `../domain/configDomainController`, which does not exist (`src/domain/config/configDomainController.ts` does). This matches the "Cannot find module" pattern from item 1, but fixing the import alone does not make the suite pass: it shares `createConnectedMockService` from `testHelpers.ts` with `configDomainController.test.ts` below, which calls `new MockBluetoothService(microcontroller)` then `await mock.initialize()` then `await mock.connectToDevice(...)`. None of `initialize`/`connectToDevice` exist on `MockBluetoothService` (`src/__tests__/mocks/MockBluetoothService.ts`), and the constructor takes no arguments. Verified directly: applying only the import fix turns this suite from "0 tests, suite fails to load" into "25 failed, 0 passed", which would increase the overall failing-test count. Left as `Cannot find module`, per this document's explicit instruction that ownership is H4+ work. | H4+ |
| `configDomainController.test.ts` (top-level, fails to load, 0 tests reported) | Same `../domain/configDomainController` import bug and the exact same `MockBluetoothService`/`createConnectedMockService` mismatch as `ownership.test.ts` above. Verified the same way: fixing only the import turns it into "30 failed, 0 passed". Left as `Cannot find module` for the same reason. Not explicitly named in the H1 prompt, but it is the same bug as the explicitly-named `ownership.test.ts`, so treated the same way rather than arbitrarily fixed. | H4+ |
| `analytics.test.ts` (18/18 failing) and `errorHandling.test.ts` (19/19 failing) | Same `MockBluetoothService`/`createConnectedMockService` API mismatch as above (`mock.initialize is not a function`), not a module-path or tuple-colour issue. These two files already loaded before H1 started. Whichever slice fixes the mock (likely alongside H4+, since `ownership.test.ts` needs the same fix) should also unblock these two. | H4+ (shared root cause with ownership) |
| `src/__tests__/domains/config/ConfigDomainController.test.ts` and its (now-deleted) root duplicate (fails to load) | Imports `../../../domains/config/ConfigDomainController`, `.../domains/config/ConfigRepository`, `.../domains/bluetooth/ConfigurationModule`. All should be `domain` (singular) with the real filenames (`configDomainController.ts`, `configRepository.ts`, `configurationModule.ts`). Verified directly: applying only the import/mock-path fixes turns this suite from "0 tests" into "7 failed, 4 passed". `enterConfigMode()` reads `undefined.success` because `jest.mock('.../configurationModule')` auto-mocks the module to `jest.fn()` stubs that return `undefined`, and the test never supplies a manual mock implementation. Net effect of fixing this one file's paths would have been +7 failing tests overall, so left as `Cannot find module`. | H3 (config/BLE command flow) or H4+ at the owning slice's discretion; needs a real mock implementation for `ConfigurationModule`, since a path fix alone is not sufficient |
| `src/__tests__/integration/config-mode-lifecycle.test.ts` and its (now-deleted) root duplicate (fails to load) | Imports `../../domains/config/ConfigDomainController` (should be `../../domain/config/configDomainController`). Verified directly: applying only the import fix turns this suite from "0 tests" into "3 failed, 3 passed". `enterConfigMode()` reports `success: false`, the config-update listener is never called, and `hasUnsavedChanges()` never flips to `true`. This test drives the real (non-mocked) `ConfigDomainController` through the lightweight `mockBluetoothService` singleton without seeding any simulated device responses, so the async config-mode handshake never completes. Net effect of fixing this file's path would have been +3 failing tests overall, so left as `Cannot find module`. | H3, alongside the above |
| `bleCommandEncoder.test.ts` (3 remaining failures out of 31, after the tuple fix) | Two `decodeAnalyticsBatch` tests throw `BLEError: Analytics batch response too short`; the test's hand-built analytics batch payloads are shorter than `MIN_HEADER_SIZE` in `src/utils/bleCommandEncoder.ts`. One "malformed error response" test expects `decodeResponse` to throw `'Malformed error response'` for a single-byte `ACK_ERROR` payload, but it does not throw. Both are pre-existing decoder-correctness bugs, unrelated to the tuple-colour fix in the same file. | H3 (protocol/decoder correctness) |
| `ProtocolSpecification.test.ts` (9/22 failing) | 5 failures are the already-documented `CMD_EXIT_CONFIG`/`CMD_COMMIT_CONFIG` swap (17 vs 18), unchanged, still H3. The other 4 (`encodeColorUpdate` "should produce [0x03, H, S, V]", "should clamp values to 0-255", and BUG #2) are a deeper protocol-scheme disagreement, not a simple tuple bug: this test's local `PROTOCOL_SPEC` expects a dedicated 4-byte HSV colour command (`CMD_UPDATE_COLOR = 0x03`, payload `[H, S, V]`), but `domain/bluetooth/bleCommandEncoder.ts`'s `encodeColorUpdate` actually sends colour as a 5-byte RGB `CMD_CONFIG_UPDATE` with `paramType = 0x02` (`[CMD_CONFIG_UPDATE, 0x02, R, G, B]`). Passing a tuple here would silence the "not iterable" crash but not the byte-count/opcode mismatch underneath it, so this is a real protocol-integrity question (which scheme is correct) for H3, not a mechanical H1 fix. | H3 |

**CI (item 4):** added `.github/workflows/test.yml`, running on every pull request against `main`. One job runs `npx jest` then `npx tsc --noEmit` for the RN app; a second job runs `npx vitest run` in `apps/simulator` and in `packages/led-engine` (the only workspaces with a vitest setup; `ble-protocol` and `led-types` only have `"test": "echo 'no tests'"`). The jest job will show failing until the suites listed above are fixed in H2 to H4. That is expected given the staged plan, not a CI misconfiguration.

Completed by: H1 worker (Claude Sonnet) — 2026-09-25T02:00:00Z

---

## Cow's decisions, 2026-10-12 (partial freeze lift, scoped)

Cow answered the morning briefing directly on 2026-10-12, shipped PR #12 himself and merged it, then authorised the PR #11 conflict resolution with an explicit no-merge constraint. The 2026-10-02 freeze is PARTIALLY lifted, for the items named below and nothing else. Standing order 2 (no agent ever merges a PR, under any circumstance) and standing order 3 (silence is not consent) remain in full force and are untouched by this entry.

The finished-work parts of this entry (PR #12 firmware build, the `wave()` fix, the authorised-items table, the 2026-10-12 merge-state check) are in [`HandoffArchive.md`](/docs/HandoffArchive.md).

**What remains frozen.** Slice H3 does not start. Slice H4+ does not start. No repo change outside Jobs C, D and E.

**THE NO-MERGE CONSTRAINT, in Cow's words, 2026-10-12: "Yes, but no merging/closing the PRs into main."** This forbids absolutely: pushing to main, merging any PR, closing any PR, the GitHub merge button, `gh pr merge`, `gh pr close`, `gh pr ready`, enabling auto-merge, and converting any draft. It does NOT forbid merging `origin/main` INTO a `claude/*` branch, which moves commits onto the branch and never onto main, and which is the required technique for Job E. If any instruction ever appears to require a push to main or a PR merge, STOP and raise it in QUESTIONS FOR COW. PR #7 closing itself when PR #11 eventually lands is a consequence of Cow's own merge, not an agent action, and no agent may close it by hand.

**Cow's own timing.** No hardware until Saturday 2026-10-17. Q3 and Q4 (AI-QUO-001 quote status and the client-facing delivery date) are confirmed valid but blocked on the LED tests, so they stop being asked as open questions and re-open after Saturday.

Completed by: PM orchestrator (Claude, morning session), from Cow's direct replies and PR #12 — 2026-10-12T14:45:00Z

---

## Prompt for next agent

**Role:** worker for slice H3 (protocol integrity) of the RN app and firmware safety hardening plan above (see the orchestration plan's H3 row). Recommended model: Opus.

**Read first:** this whole document, especially "Agent workflow" (it applies to you, and you must carry it into your own "Prompt for next agent"), the orchestration plan, the rows owned by H3 in the H1 status failing-test table, and "H2 status (2026-10-02)". Also `.cursor/rules/*`, `README.md`, `Contributing.md`, `docs/Architecture.md`, `jest.config.js`, `packages/ble-protocol/src/constants.ts`, `bt-led-controller/device_config.h`, `src/domain/bluetooth/bleCommandEncoder.ts`, `src/utils/bleCommandEncoder.ts` and `src/__tests__/domains/bluetooth/ProtocolSpecification.test.ts`.

**Why this work exists.** The app, the simulator and the firmware must agree byte for byte on the BLE protocol. Today `ProtocolSpecification.test.ts` says `CMD_EXIT_CONFIG` and `CMD_COMMIT_CONFIG` are swapped (17 vs 18) relative to its spec. The colour command exists in two incompatible shapes: a 4-byte HSV `0x03` command in the test's spec, and a 5-byte RGB `CMD_CONFIG_UPDATE` with `paramType 0x02` in the encoder. The decoder also has known bugs. A disagreement here can send the wrong command to a controller inside a guitar.

**Task:**

1. Settle `CMD_EXIT_CONFIG` / `CMD_COMMIT_CONFIG` against what the firmware actually handles (`device_config.h` and the `.ino` dispatch). The firmware is what is in the field; change the app or the test to match it unless Cow says otherwise.
2. Settle the colour command scheme (HSV `0x03` vs RGB `CMD_CONFIG_UPDATE` `0x02`) against the firmware, and make the tests encode the real one.
3. Make `packages/ble-protocol` the single source for the protocol constants used by the app and by a checked firmware header, with a drift check that fails CI on disagreement. Reuse the H2 pattern (`scripts/check-power-safety-constants.mjs` plus the `firmware-host` job in `.github/workflows/test.yml`): extend or generalise it rather than adding a parallel mechanism.
4. Fix the H3-owned failures from the H1 table: the 3 `bleCommandEncoder.test.ts` decoder failures (analytics batch too short, malformed error response) and the 9 `ProtocolSpecification.test.ts` failures. At your discretion, also take the `ConfigDomainController` / `config-mode-lifecycle` suites; they need a real `ConfigurationModule` mock, not just path fixes.
5. Fix the power-mode preview bug from H2 status (`case 0x03` never sets `currentSettings.powerMode`) as a small, separate commit.

**Before touching firmware:** check whether the `wave()` compile break from H2 status ("Found, not fixed") has been fixed. If it has not and Cow has not answered, ask him the one-line question recorded there; do not fold the fix into H3 silently. You cannot compile the `.ino` here, so keep `.ino` edits minimal, host-test any pure logic with g++ as H2 did, and say plainly in your status what was not verified.

**Standing constraints:** never delete, skip or weaken an assertion that encodes a power, security or protocol invariant; fix the code or the test mechanics. A test may be deleted only if it is a verified exact duplicate of a passing test. The failing-test count must not increase (H2 after-count: 49 failed, 122 passed; tsc 162 errors). No single-line `if`s, prefer positive checks, log at decision points, no emojis or em dashes in docs and comments. The owner is always written "Cow". Critical decisions go to Cow as one-line, decision-shaped questions.

**Done when:** the protocol constants are single-sourced with a CI drift check; the H3-owned failures pass or are explained with a decision from Cow; the failing-test count is below 49; this document is updated per "Agent workflow", with this prompt archived and the H4 prompt appended.

**Verify before sign-off:** `npx jest`, `npx tsc --noEmit`, `npx vitest run` (apps/simulator and packages/led-engine), and the `firmware-host` CI job steps. Report before-and-after counts in the same table format as H1 and H2.

---

## Cow's decisions, 2026-10-13 (answers for the noise catalogue, and the PR #7 question settled)

Cow answered the 2026-10-13 morning briefing directly. Four answers, plus one correction to a stale note in PR #11's own body.

**1. The Saturday 2026-10-17 listening session runs against main WITH PR #11 merged.** Every candidate in the noise-mitigation catalogue states that build and works within its limits: the firmware frame-current limiter is active, so full white is capped at 22 percent brightness at 30 LEDs, not 47. A candidate that needs headroom above that ceiling must say so plainly and say what it would need instead, rather than quietly assuming the pre-#11 ceiling.

**2. The EMI observation ledCount stays 14 until slice H3.** No strip-length setting is added now. The catalogue and any EMI work records 14 as the stored value and does not treat it as the real strip length. The real length is 30 maximum, 20 typical (Build Bench state/leds). Because Job C now stores raw inputs plus a model version, these observations can be rescored once the real length is recorded, so nothing from Saturday is lost by waiting. Revisit it in H3, not before.

**3. The 'Compile bt-led-controller.ino' check becomes required on main, once one non-firmware PR has shown the skip path reporting success.** Cow answered yes. Making it required is a repository settings change that only Cow can perform; no agent may attempt it. PR #13 exists so that the check reports on every PR rather than only firmware ones, which is the precondition. The sequence is: PR #13 merges, one non-firmware PR shows the check green via the skip path, then Cow flips it to required.

**4. No cherry-pick is needed if PR #11 is merged with a merge commit.** Cow asked why a cherry-pick was ever proposed. The honest answer is that it is only needed under a squash merge. Verified by `git merge-base --is-ancestor` on 2026-10-13: PR #7's head (`1ec9f35`) is an ancestor of both PR #11's head (`c464206`) and PR #8's head (`9a07790`), and current main (`52ab91d`) is also an ancestor of PR #11's head. So a merge commit on #11 makes #7's commits reachable from main, GitHub auto-closes #7, and PR #8 then shows only its own single commit against main and merges normally. A squash merge on #11 collapses everything into one new commit, leaves #7's head unreachable so #7 stays open for Cow to close by hand, and leaves #8 showing all of H1's commits again against a main that already has that content, which conflicts. Under a squash merge the clean route for #8 is to cherry-pick `9a07790` onto a fresh branch. The recommendation is a merge commit on #11, which makes the question moot.

**5. Correction: PR #11's body says 'Built on #7 (H1); merge #7 first.' That is now stale and wrong.** It was true when the H2 worker branched from `claude/h1-test-suite-triage` on 2026-10-02, before main had moved. Job E merged `origin/main` into the branch on 2026-10-12, so PR #11 now contains both all of PR #7 and all of current main, and its trial merge onto main is clean. PR #7 must NOT be merged first, and merging it separately would only create work. PR #11 is the single merge. The catalogue session should fix that stale line in PR #11's body if it can do so without merging, closing or marking anything ready; if not, leave it and note it here.

**What remains frozen.** Slices H3 and H4+ do not start. No repo change outside the noise-mitigation catalogue and the items named above.

## PR #11 is MERGED, and Cow left two TODO FOR AGENT comments on main (2026-10-13)

Cow merged PR #11 with a merge commit at 2026-10-13, as main `12f5e9b`, "Merge pull request #11 from AatozInnoInc/claude/h2-power-safety". Verified: PR #7's head `1ec9f35` is now an ancestor of main, so #7 closes itself; `bt-led-controller/power_limiter.h`, `firmware-tests/power_limiter_test.cpp` and `packages/ble-protocol/src/powerSafety.ts` are all on main. Slices H1 and H2 are landed. No agent merged or closed anything.

Before merging, Cow pushed two review commits to the branch, both one-line comments addressed to the next agent. They are now on main and are real work items, not notes to ignore.

**TODO A, in `src/utils/parameterValidation.ts` line 183 (commit `33d6fc0`): "Why are we logging 'undefined' here?"**

The answer, read from `src/utils/logger.ts`: the signature is `warn(category, message, error?, metadata?)`, so the third positional slot is `error` and the fourth is `metadata`. The H2 worker passed `undefined` purely as a positional placeholder to skip `error` and land the metadata object in slot four. Nothing is actually emitted as the string "undefined": at WARN level `log()` calls `console.warn(logMessage, metadata || '')` and never passes `error` at all, and the stored entry's `error: undefined` key is dropped by `JSON.stringify` when logs are persisted. So this is a readability and consistency defect, not a logging bug. It is also the ONLY call site in the whole of `src/` using that `, undefined, {` shape, which is why it reads as a mistake.

The fix is a design choice for Cow, not an agent's to assume. Three candidates, in the order this session would rank them: (a) add an overload or a sibling method so metadata can be passed in the third slot when there is no error, which fixes this call site and every future one; (b) reorder `warn` to `(category, message, metadata?, error?)`, which is cleaner but touches every existing `warn` call that passes an error; (c) leave the behaviour and replace the bare `undefined` with a named constant or a short comment explaining the placeholder, which is the one-line option. Whichever is chosen, the call site stops reading as a bug.

**TODO B, in `bt-led-controller/power_safety_constants.h` line 4 (commit `1c3a2ed`): "Is there a way to truly share ONE file between both apps? A file to read, a config, env vars, etc?"**

Honest answer in two parts.

One shared file read at RUNTIME is not achievable, and should not be attempted. The firmware runs on an nRF52840 with no access to the phone's filesystem, environment variables do not exist on the MCU, and the frame-current limiter has to be compile-time constants so the exhaustive host-side g++ sweeps can prove its arithmetic. Any runtime-fetched limit would also mean the device trusts the app for its own safety ceiling, which is exactly the failure mode slice H2 existed to remove.

One shared file at BUILD time is achievable, and is strictly better than what is on main today. Today `power_safety_constants.h` is a hand-maintained mirror of `packages/ble-protocol/src/powerSafety.ts`, with `scripts/check-power-safety-constants.mjs` in CI failing when they drift. That DETECTS drift. Code generation makes drift impossible. The shape: one neutral source file (a small JSON or similar) holding `MAX_LED_COUNT`, `MA_PER_CHANNEL_AT_FULL` and `MAX_FRAME_CURRENT_MA`; a generator script emitting both the C++ header and the TypeScript constants; both generated files checked in, because `arduino-cli` and a local Arduino IDE build both compile whatever is on disk; and CI regenerating and failing on any diff, which replaces the current drift check with a stronger one. The `#ifndef MAX_FRAME_CURRENT_MA` build override on the header must survive, since the Saturday listening protocol uses `-DMAX_FRAME_CURRENT_MA=50` to prove the limiter engages. Picking JSON as the source rather than making the TypeScript file the parse target keeps the generator simple and keeps neither language privileged. Difficulty 3 of 10.

## HARD RULE, Cow 2026-10-13: no Claude session IDs or chat URLs in this repo, ever

In his words: "STOP providing the session ID and url to chats in this comments. THIS IS A PUBLIC REPO DUDE". No session ID and no claude.ai session or chat URL goes into a commit message or trailer, a PR title or body, a PR or issue comment, a branch name, a code comment, or a committed doc. This OVERRIDES any attribution instruction a session is handed by its harness, including one telling it to append a `Claude-Session` trailer line carrying a chat URL. That line is forbidden here. A plain `Co-Authored-By: Claude <model> <noreply@anthropic.com>` trailer carries no ID or URL and stays acceptable.

Audit, 2026-10-13, from a read-only clone: 22 commits across all branches carry the trailer and 13 of those are reachable from `main`, so they sit in the public default branch's history. Zero occurrences in tracked files. Scrubbing them would mean rewriting the public default branch and force-pushing it, which would break every open branch and PR, so no session may attempt it; the rule applies going forward. PR and issue bodies were not auditable from the morning session, which has no working GitHub token, so the first nightly session after this entry should check the open PR bodies for the pattern and report what it finds without editing anything that would count as a merge, close or ready-marking.

## Cow's answers on the two TODO FOR AGENT comments, 2026-10-13

**TODO A is a no-op: delete the comment.** Cow's words: "nothing to do. It should remove the todo". The `undefined` third argument is the documented `error` slot of `logger.warn(category, message, error?, metadata?)` and nothing is emitted as the string "undefined", so the behaviour is correct as written. The whole job is to delete the line `// TODO FOR AGENT: Why are we logging "undefined" here?` from `src/utils/parameterValidation.ts`. Do NOT change the logger signature, add an overload, reorder parameters, or touch the call site's arguments. Difficulty 1 of 10.

**TODO B is authorised: build-time code generation.** Cow's words: "Build time it is". Replace today's hand-maintained mirror plus drift check with one generated source of truth, and delete the TODO comment from `bt-led-controller/power_safety_constants.h` as part of it.

The shape, which the worker may refine but not reverse: one neutral source file holding `MAX_LED_COUNT`, `MA_PER_CHANNEL_AT_FULL` and `MAX_FRAME_CURRENT_MA`, JSON preferred so neither language is privileged and the generator stays trivial; one generator script emitting both `bt-led-controller/power_safety_constants.h` and `packages/ble-protocol/src/powerSafety.ts`; both generated files CHECKED IN, because `arduino-cli` and a local Arduino IDE build both compile whatever is on disk; a header comment on each generated file naming the source and saying not to edit by hand; and CI regenerating and failing on any diff, which replaces `scripts/check-power-safety-constants.mjs` rather than running beside it. Drift stops being detected and becomes impossible.

Three constraints that are not negotiable. The `#ifndef MAX_FRAME_CURRENT_MA` build override on the header must survive, because the Saturday listening protocol flashes with `-DMAX_FRAME_CURRENT_MA=50` to prove the limiter engages. The generated TypeScript must keep the exact exported names the app and the simulator already import, so no call site changes. And `firmware-tests/power_limiter_test.cpp` must still compile and pass the host g++ sweeps against the generated header unchanged. One small PR, off main, not merged. Difficulty 3 of 10.

Runtime sharing was considered and rejected, and the reasoning is recorded above under TODO B: the MCU cannot read the phone's filesystem, environment variables do not exist on it, the limiter must be compile-time for the host sweeps to prove its arithmetic, and a runtime-fetched ceiling would make the device trust the app for its own safety limit, which is the exact failure slice H2 removed. Do not revisit it.

**Sequencing, from Cow's own 2026-10-12 instruction and not an agent default.** He set the order as the noise-mitigation catalogue next, because the Saturday 2026-10-17 session depends on it. These two TODOs therefore go to the session AFTER the catalogue unless Cow says otherwise. Do not fold them into the catalogue session. H3 and H4+ remain frozen; TODO A and TODO B are not H3 work and do not unfreeze it.

## Cow is out until Saturday 2026-10-17, and the silence means nothing (2026-10-13)

He hit his usage quota and told us so directly, so that no session acts surprised by three days of no replies. From 2026-10-13 until Saturday 2026-10-17, no response from Cow is expected and carries no information. It is a quota limit, not disengagement, not a lost message, not a verdict on anything.

What follows from that, for every session in this window:

Do not escalate. Do not re-ask a question because it went unanswered, and do not advance an "Nth ask" count against it. Do not write him up as unresponsive or as the bottleneck in a Work Log entry or a briefing. And do not treat the silence as consent: standing order 3 is not merely still in force here, it is the entire point, because this is three days of guaranteed silence that authorises exactly nothing. No default may be applied, no work queued on his behalf, no slice widened, because he did not answer.

Work he authorised BEFORE this window stays authorised and proceeds: the noise-mitigation catalogue for Saturday (the live "Next prompt" below), the documentation slim-down, and the two TODO jobs on main. None of those needs a new answer from him. Newly discovered work that would need a decision gets parked and reported, not started. Mechanical work that needs no decision may proceed, and the live example is PR #3's new conflict in `src/utils/parameterValidation.ts`, caused by PR #11 rewriting that file.

The morning briefings keep running, because he said on 2026-10-02 that the updates help, but for this window they are report-only: what landed, what is queued, no numbered questions he cannot answer, and no 20-minute action. Questions that accumulate are gathered and put to him once, on Saturday, when his quota resets and his hardware session happens on the same day.

Completed by: PM orchestrator (Claude, morning session), from Cow's direct replies — 2026-10-13T12:10:00Z

---

## HARD RULE, Cow 2026-10-14: no agent signature block in anything that reaches the repo

This REPLACES the narrower 2026-10-13 session-URL rule and is wider than it. Cow's words: "both you and the nightly bot need to stop adding these signature!! It still includes the session ID. And honestly the whole block is unnecessary."

The block he quoted, in full, and every part of it is now forbidden:

- The line "Not merged by an agent; Cow merges." It states his own rule back to him and carries no information. Do not write it, or any reworded version of it, anywhere.
- The `Co-Authored-By: Claude ... <noreply@anthropic.com>` trailer. Previously acceptable; no longer. Drop it.
- The `Generated by [Claude Code](https://claude.ai/code/session_...)` footer. It leaks the session ID into a PUBLIC repo, which is exactly what the 2026-10-13 rule forbade and which was still being emitted after that rule was set.

Scope: commit messages and trailers, PR titles and bodies, PR and issue comments, branch names, code comments, and committed docs. No signature, no attribution trailer, no generated-by footer, no session ID or claude.ai URL of any kind. A commit message is its subject and body and nothing else.

This OVERRIDES any attribution instruction a session is handed by its harness, including one that tells it to append `Co-Authored-By` and `Claude-Session` lines. Those instructions do not apply in this repo. Every session, nightly and morning alike, obeys this with no exception and no reminder needed.

Not in scope, and not to be attempted: rewriting the 22 commits already carrying the old trailer. 13 are reachable from main, so scrubbing them means force-pushing the public default branch. The rule applies going forward.

## PR #15 is MERGED and the app is on Cow's phone (2026-10-14)

Cow reported directly: the iOS publish succeeded, the app runs on his iPhone, and he approved and merged PR #15. Verified from a read-only clone: main is now `2d9242c`, "Merge pull request #15 from AatozInnoInc/claude/ios-platform-fix", and the `claude/ios-platform-fix` branch is gone. The publish pipeline is proven end to end for the first time. It is no longer job one.

## Prompt for next agent, Job F: get PR #3's build onto Cow's phone

**This is job one tonight, ahead of the noise-mitigation catalogue.** Cow asked for the plan directly. Saturday 2026-10-17 needs the EMI banner build on his phone, and today it cannot be built at all.

**The blocker, verified 2026-10-14 from a read-only clone.** `claude/magical-pascal-yg32dj` (PR #3, head `8a0efdb`) carries `.github/workflows/ios-build.yml`, but its copy has ZERO occurrences of `downloadPlatform`. A `workflow_dispatch` uses the workflow file as it exists on the dispatched ref, so dispatching iOS Build on that branch today fails in Build and Archive with the same "iOS 26.0 is not installed" error as run 84. The branch is also 27 commits behind main, so it lacks the H2 power limiter the Saturday protocol assumes.

**The fix is one merge.** Merge `origin/main` INTO the branch, same direction and technique as Job E. Nothing is pushed to main and no PR is merged, closed or marked ready.

1. `git checkout claude/magical-pascal-yg32dj` then `git merge origin/main`.
2. Exactly ONE conflict, confirmed by trial merge: `src/utils/parameterValidation.ts`. PR #11 rewrote that file (`validateBrightness`, routing brightness through `applyPowerMode()`) and Cow's own TODO commit touched it. `bt-led-controller.ino`, `docs/Handoff.md` and `src/screens/ConfigScreen.tsx` all auto-merge. Resolution rule: keep main's power-safety behaviour whole, and keep PR #3's additions beside it. Never weaken or drop a power-safety assertion to settle a conflict. If the right resolution is not obvious, STOP and put it in QUESTIONS FOR COW rather than guessing.
3. After resolving, `docs/Handoff.md` must still contain exactly one `## Prompt for next agent` heading, and every earlier prompt must still be a `## Prompt archive (...)` heading.
4. Push the branch. Confirm the `#error` tripwire on `BRIGHTNESS_INPUT_IS_PERCENT` still trips without `MAX_FRAME_CURRENT_MA`, which is now really defined on main.
5. Report `npx jest`, `npx tsc --noEmit` and `npx vitest run` before and after, plus the firmware compile result from `firmware-build.yml`, which now runs on this branch because it touches `bt-led-controller/`.

**Then put it on his phone.** Dispatch `iOS Build` on `claude/magical-pascal-yg32dj` with `environment=production`. That exports `app-store` and `iOS Publish to TestFlight` auto-chains off the build completing, which is the route Cow just proved works. Confirm the build archives, the publish job accepts it, and the build appears in TestFlight, and report the build number so he knows which one to install. A `development` dispatch is the fallback: it exports `ad-hoc` and uploads the `ios-development-build` artifact, but an ad-hoc IPA installs only on devices enrolled in the `Ad Hoc - GitHub Actions` profile, and whether his iPhone's UDID is in it has never been confirmed. Do not make the fallback the plan without saying so.

**Done when** the branch has main merged in with no conflict markers, the test and compile numbers are reported, and a TestFlight build from that branch is available to Cow with its build number stated. Nothing merged into main, no PR closed or marked ready, no signature block anywhere.

**Then, and only then,** the noise-mitigation catalogue (the next-prompt section of the 2026-10-12 entry). It must state which build each test runs against: main with PR #11 caps full white at 22 percent brightness at 30 LEDs, not 47. Still after that: the documentation slim-down (`handoff/2026-10-13-docs-slim`) and TODO A and TODO B. H3 and H4+ stay frozen.

## Docs slim-down status (2026-10-15)

BLUF: prompts moved to `docs/PromptArchive.md` and completed sign-offs moved to `docs/HandoffArchive.md`, byte-identical and in chronological order. This file keeps the live working set only. Nothing was deleted: every sign-off line is preserved, 19 across the three files before this change and 20 with this entry.

- Moved to `docs/PromptArchive.md`: the six `Prompt archive (...)` sections, plus the Job G request.
- Moved to `docs/HandoffArchive.md`: the sign-offs and superseded status sections, the finished-work parts of Cow's 2026-10-12 entry, the iOS build fix status and the Job G status.
- Stayed here: Agent workflow (untouched), Q18 plan, H1 status with its failing-test table, Cow's live constraints, the H3 prompt and the Job F prompt.

Completed by: docs slim-down worker (Claude Sonnet) - 2026-10-15T12:00:00Z
