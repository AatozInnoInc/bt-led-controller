# Prompt archive

This file holds every superseded or completed agent prompt moved out of `docs/Handoff.md`. Nothing in it is ever deleted, only appended.

---

## Prompt archive (superseded 2026-05-15)

Older prompts queued PWA, Supabase preset gallery, and Vercel analytics alongside firmware Colour B.

**User reorder (2026-05-15):** finish **firmware secondary colour** first, then **PWA** (icons + install affordance), then **five approved LED patterns** E2E. **Supabase** and **Vercel analytics** are deferred; they now live under **Deferred near term** in `Roadmap.md`.

---

## Prompt archive (PWA work assigned 2026-05-15)

**Was:** Queue item 1: PWA; Queue item 2: five LED patterns.

**Status:** **PWA** slice completed (sign-off above). **Deferred** analytics / Supabase remain in `Roadmap.md`.

---

## Prompt archive (five LED patterns assigned 2026-05-15)

**Was:** Research plus maintainer-approved list → five patterns E2E in `led-engine` and simulator.

**Status:** Superseded. Maintainer expanded scope to **21** simulator effects (sign-off above). Suite is **closed** unless a new pattern is explicitly requested.

---

## Prompt archive (simulator next steps, superseded 2026-09-24)

**Context:** Simulator has **37** patterns (ids **0–36**). Ids **0–13** have firmware equivalents; **14–36** are simulator-only (`larson` through `dissolve`).

**Not assigned:** Additional simulator-only effects (maintainer satisfied with current pack).

**Reasonable next work (pick only what the user asks for)**

1. **Firmware:** Port selected ids from 14–36 (start with `larson` / `confetti` if aligning with `Roadmap.md` v2 notes, or any single effect from the 21-pack table above)
2. **Deferred near term** (`Roadmap.md`): Supabase shared preset gallery; Vercel analytics

**Verify before sign-off:** `npx vitest run` and `npm run build --workspace=@bt-led/simulator` exit **0** -- DONE

---

## Prompt archive (H1 completed, superseded 2026-09-25)

**Role:** worker for slice H1 of the RN app and firmware safety hardening plan above. Recommended model: Sonnet.

**Read first:** this whole document (especially "Agent workflow" and the hardening plan directly above), `.cursor/rules/*`, `README.md`, `Contributing.md`, `docs/Architecture.md`, `jest.config.js`.

**Task:** make every suite that fails on "Cannot find module" or "color is not iterable" load and run against the current code, with its assertions intact. Remove the root `__tests__/` directory once its `src/__tests__` twins pass. Move the EMI tests to `src/__tests__/domain/emi/`. Add a GitHub Actions workflow that runs `npx jest`, `npx tsc --noEmit` and `npx vitest run` on pull requests. Leave power, ownership, pairing and protocol failures that reflect real bugs failing, and list them for H2 to H4. Do not mask them.

**Done when:** the failing-test count is lower than 70 and every remaining failure is listed in this document with its root cause and the slice (H2 to H4) that owns it. CI runs on the PR. This document is updated per "Agent workflow", with this prompt archived and the H2 prompt appended.

**Verify before sign-off:** `npx jest`, `npx tsc --noEmit` and `npx vitest run`; report before and after counts for each.

**Status:** done. See "H1 status (2026-09-25)" above for the full result, deviations, and the final failing-test list handed to H2 to H4. EMI relocation could not be done, because PR #3 is not on this branch yet, and is deferred to whoever merges it. Two of the ten originally-listed "Cannot find module" suites (`configDomainController.test.ts` top-level, `ownership.test.ts`) and two more discovered during this slice (`domains/config/ConfigDomainController.test.ts`, `integration/config-mode-lifecycle.test.ts`) were deliberately left unfixed because fixing only their import path would have increased the overall failing-test count. See the table above for the verified per-file numbers.

---

## Prompt archive (H2 completed, superseded 2026-10-02)

**Status:** done. See "H2 status (2026-10-02)" below for the result, decisions and deviations.

**Role:** worker for slice H2 of the RN app and firmware safety hardening plan above (see the "RN app and firmware safety hardening (Q18): orchestration plan" section, H2 row). Recommended model: Opus. This is safety-critical design, not mechanical repair.

**Read first:** this whole document, especially "Agent workflow", the orchestration plan's H2 row, and the "H1 status (2026-09-25)" section above (in particular the `parameterValidation.test.ts` row of its failing-test table, and the CI workflow it added). Also `.cursor/rules/*`, `README.md`, `Contributing.md`, `docs/Architecture.md`, `jest.config.js`, `bt-led-controller/bt-led-controller.ino`, `bt-led-controller/device_config.h`, and `src/utils/parameterValidation.ts`.

**Why this work exists.** The LEDs are installed inside a guitar. Full white at 30 LEDs draws roughly 1,800 mA; the only power guard today is app-side (`validatePowerConsumption`), sized for `MAX_LED_COUNT = 14` against 400 mA, and the firmware applies no current limiting of its own. `validateBrightness(uint8_t)` is always true, `validateColor()` returns true, and the brightness handler (`case 0x00`) sets `globalBrightness` directly, bypassing `applyPowerMode()`. A configuration that exceeds the real current budget can overdrive the LEDs, the controller, or other parts of the guitar.

**Task:**

1. Add a firmware frame-current limiter as a pure C/C++ header (no Arduino-only APIs), unit-tested with `g++` in CI (add a job or step to `.github/workflows/test.yml` alongside the existing jest/tsc/vitest jobs; do not remove those).
2. Define the shared safety constants once and use them from both the firmware and the app: 30 LEDs, mA per channel, and a 400 mA limit that stays configurable until the battery is chosen. Decide where this single source of truth lives (likely alongside or referenced from `packages/ble-protocol`, matching how the rest of the protocol constants are shared) and say so explicitly in your Handoff update.
3. Fix `validateBrightness` in the firmware so it actually validates.
4. Route the brightness case (`0x00`) through `applyPowerMode()` instead of setting `globalBrightness` directly.
5. Revive `src/__tests__/parameterValidation.test.ts` against the current API: replace `calculateCurrentDraw` calls with `calculateLEDCurrent`/`calculateTotalCurrent` as appropriate, and fix the `{h, s, v}` vs `[r, g, b]` mismatch in `MOCK_CONFIGS` and this file's inline color literals. See the H1 status table above for the precise failure list and line-level detail. This requires picking real, meaningful RGB test values, which is why H1 left it for you rather than doing a mechanical swap.
6. Add property-style tests over colour x brightness x LED count <= 30, proving computed current stays <= the limit, in both the firmware (g++-tested header) and the app (`parameterValidation.ts`).

**Standing constraints (see "Agent workflow" above and the orchestration plan's "Standing constraints for every slice"):** never delete, skip, or weaken a test assertion that encodes a power, security, or protocol invariant. Fix the code or the test's mechanics so the invariant still holds and is actually checked. A test may be deleted only if it is a verified exact duplicate of a passing test. No slice may increase the failing-test count; verify with a before/after count the same way H1 did (see its table above for the exact `npx jest` / `npx tsc --noEmit` / `npx vitest run` before-numbers to compare against). Critical decisions, especially the exact shared-constants location and the 400 mA-vs-real-battery number, go to the maintainer, Cow, as questions, and wait for an answer before finalizing.

**Done when:** the firmware has a real frame-current limiter proven correct by property-style g++ tests in CI; `validateBrightness` and the `0x00` brightness path are fixed; `parameterValidation.test.ts` passes against the current API; the failing-test count is lower than H1's after-count (68); this document is updated per "Agent workflow", with this prompt archived and the H3 prompt appended.

**Verify before sign-off:** `npx jest`, `npx tsc --noEmit`, `npx vitest run` (apps/simulator and packages/led-engine), and the new g++ firmware test job. Report before-and-after counts for each, same format as the H1 status table above.

---

## Prompt archive (jobs E, C, D, 2026-10-12)

**Status:** Job E is done (see "Job E (PR #11 conflict resolution): sign-off" above). Jobs C and D are not part of this branch and remain open on their own branches.

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

---

## Job G, Cow's request 2026-10-14: make PR #16 mergeable

His words: "Have the nightly bot fix the merge conflict". Do this FIRST tonight, ahead of the documentation slim-down and TODO A and TODO B. It is small, it is the only thing standing between Cow and a one-click merge, and Saturday 2026-10-17 is three days out.

**The state, verified 2026-10-14 by read-only clone and an actual trial merge.** PR #16 is `claude/noise-catalogue`, head `b8084ad`, correctly based on `claude/magical-pascal-yg32dj` (head `80c41d0`, which now contains main `0c1641b` after Job F). Its content is markdown only: `docs/NoiseCatalogue.md` (+184, new) and `docs/Handoff.md` (+10/-1), one commit, no signature block in the message. Merging it starts no iOS build and no TestFlight publish, and `firmware-build.yml` takes the always-reporting skip path, so nothing needs rebuilding.

**The one conflict.** `git merge b8084ad` into `80c41d0` conflicts in `docs/Handoff.md` only, 22 lines across both sides, purely additive. Both sides appended a status section at the END of the file:

- PR #16's side: `## Noise catalogue status (2026-10-14)`, signed off `2026-10-14T15:05:00Z`.
- The base branch's side: `## Job F status (PR #3 branch, 2026-10-14)`, signed off `2026-10-14T22:00:00Z`.

**What to do.** Check out `claude/noise-catalogue` and merge the BASE BRANCH into it: `git checkout claude/noise-catalogue` then `git merge origin/claude/magical-pascal-yg32dj`. That direction moves commits onto the PR branch and never onto main or onto the base, and pushing to a `claude/*` branch is not merging a PR. Do NOT rebase: Cow may be reading the branch, and a force-push over an open PR he is about to merge is the wrong risk to take.

Resolve by keeping BOTH sections, ordered by sign-off timestamp: the noise catalogue section (15:05) first, then Job F (22:00). Nothing is dropped, nothing is reworded, no sign-off line is touched. Then push the branch.

**Verify, and report each one:**

- `grep -rn '<<<<<<<\|=======\|>>>>>>>' docs/` returns nothing.
- Both sign-off lines survive verbatim: `Completed by: noise catalogue worker (Claude Opus) - 2026-10-14T15:05:00Z` and `Completed by: nightly WORK orchestrator (Claude Sonnet) - 2026-10-14T22:00:00Z`.
- `docs/NoiseCatalogue.md` is unchanged by the resolution, byte for byte against `b8084ad`.
- Every `## Prompt for next agent` and `## Prompt archive (...)` heading is intact and no prompt was deleted.
- In a THROWAWAY read-only clone, `git merge --no-commit --no-ff` of the updated `claude/noise-catalogue` onto `claude/magical-pascal-yg32dj` reports clean, then abort. Report the result; this is the check that tells Cow his merge button is green.
- No signature block, no attribution trailer, no session ID or claude.ai URL in the merge commit message, per the 2026-10-14 hard rule.

**Do not** merge, close or mark ready PR #16 or any other PR, touch main except for this entry's own Handoff-only commit, or rebuild or re-publish anything for Saturday. The app binary does not change, and the TestFlight build already produced from `80c41d0` stays the one Cow installs.

**One note for Saturday.** Once #16 merges, the `claude/magical-pascal-yg32dj` head moves past `80c41d0`. The Build Bench Saturday card's "PR #3 head 80c41d0" label then reads stale; it should be read as "the PR #3 branch". Do not re-dispatch a build to make the label true.

**After Job G:** the documentation slim-down (`handoff/2026-10-13-docs-slim`, still pending), then TODO A and TODO B. H3 and H4+ stay frozen.
