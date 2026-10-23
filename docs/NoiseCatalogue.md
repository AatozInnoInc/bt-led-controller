# Noise-mitigation catalogue, listening session Saturday 2026-10-17

BLUF: seven new physical mechanisms beside the two tests already planned (APA102_BRIGHTNESS_MODE and BITBANG_FREQUENCY_MODE). Five of the seven need no firmware change at all; one is a single existing `#define`; one needs new code and is NOT a Saturday candidate until a small PR compiles it in CI. The session plan below brackets every test with the same reference take (R, B, R), records everything on the phone, and scores the recordings blind afterwards, so the session still says something even if every single A/B is ambiguous.

Difficulty of this work: 4 of 10. Core bench session: about 60 minutes. Optional hardware add-ons: up to 75 more.

---

## 1. The build under test (verified from the repo)

| Item | Value | Where it comes from |
|---|---|---|
| Flash this commit | `claude/magical-pascal-yg32dj` head `80c41d0` (PR #3) | It is the only branch carrying `APA102_BRIGHTNESS_MODE`. It already contains main `0c1641b`, which contains the PR #11 merge `12f5e9b`. |
| Compile proof | `firmware-build.yml` run 38584809595 on `80c41d0`: success, real compile (45 s) | GitHub Actions |
| Fallback | main `0c1641b`. Firmware files are unchanged since `07c2a6b`, which compiled green in run 38438497448. | `git diff 07c2a6b origin/main -- bt-led-controller` is empty |
| `LED_COUNT` | 10 | `device_config.h` |
| Pins | `DATA_PIN 24` (strip DI), `CLOCK_PIN 25` (strip CI) | `device_config.h` |
| Reference flags | `BITBANG_FREQUENCY_MODE 3`, `APA102_BRIGHTNESS_MODE 0`, `BRIGHTNESS_INPUT_IS_PERCENT 0`, `BLE_TX_POWER 4` | `.ino`, `device_config.h` |
| Observation `ledCount` | 14, fixed until H3. Do not change it. | `EMI_OBSERVATION_LED_COUNT` in `src/domain/emi/emiCalibration.ts` (PR #3) |

### The 22 percent ceiling, checked

- App side (`src/utils/parameterValidation.ts`, sized for `MAX_LED_COUNT = 30`): full white is 60 mA per LED at 100 percent, so 30 LEDs draw 1,800 mA. 400 / 1,800 = 22.2 percent. The app blocks full white above **22 percent**. Pure red or pure blue is allowed up to 66 percent.
- Firmware side (`power_limiter.h`, 30 LEDs): budget 400 x 65,025 = 26,010,000; full white step 30 x 765 x 20 = 459,000; max byte 56, which is 56 / 255 = **22.0 percent**. The figure in the Handoff holds.
- What actually binds on Saturday: the sketch drives `LED_COUNT 10`, where the firmware cap for full white is byte 170 (66.7 percent). With `BRIGHTNESS_INPUT_IS_PERCENT 0` the app's 0-100 value goes on the wire unscaled, so the app's own 22 percent block is the limit Cow will hit, and the firmware limiter will not engage. App brightness 22 puts byte 22 on the wire, which is 8.6 percent of true intensity and a 5-bit global field of 2 of 31.
- **Headroom note:** no test below needs more than app brightness 22 for white. A test of "global field wide open" in mode 0 is not reachable from the app at all on this build (app 100 is byte 100, field 12 of 31). Mode 1 reaches field 31 by design, which is why T1 still works.

---

## 2. Catalogue

Every row runs against the build in section 1. "Zero code" means nothing is edited or reflashed. Bench minutes include the R takes around the test.

### Already designed (kept as the anchors)

| Id | Mechanism (one sentence) | Change | Switch | Bench | A null result still tells Cow |
|---|---|---|---|---|---|
| T1 | The APA102 5-bit global brightness field adds its own PWM stage; PR #3's comment puts it in the audible band (claim from the code comment, not measured). | None, flag exists on PR #3 | `#define APA102_BRIGHTNESS_MODE 1` | 10 min (2 flashes) | At app brightness 22, the global field is not the dominant audible source. |
| T2 | The bitbang clock rate sets both the bit edge rate on the data and clock wires and, as a side effect, how often a whole frame repeats. | None, flag exists | `#define BITBANG_FREQUENCY_MODE 0` (B) vs 3 (R) | 10 min (2 flashes) | Neither the bit rate nor the frame repetition rate it drives is audible. See C7 for why T2 alone cannot tell those two apart. |

Why T2 confounds two things (arithmetic from the code, not measured): a frame is (LED_COUNT + 2) x 32 = 384 bits, and every bit has two `delayMicroseconds(CURRENT_CLOCK_DELAY)` calls. Mode 3 is at least 20 us per bit, so at least 7.7 ms per frame, at most about 130 frames per second. Mode 0 is at least 200 us per bit, so about 13 frames per second. `showLeds()` sends a new frame on every `loop()` pass, because every pattern, including Solid, sets `ledBufferChanged = true` each pass. So changing the mode changes the clock rate and the frame rate by the same 10x.

### New mechanisms

| Id | Mechanism (one sentence) | Change | Switch | Bench | Build | A null result still tells Cow |
|---|---|---|---|---|---|---|
| C1 | Noise reaches the amp either through the pickup coil (magnetic) or after the volume pot (wiring, jack, cable, ground). | Zero code | Guitar volume knob to 0 for B | 4 min | `80c41d0`, any | If the noise does NOT vanish at volume 0, it bypasses the pickup entirely, and every LED-side test below is chasing the wrong path. |
| C2 | The 2.4 GHz radio transmits in bursts at a fixed connection rate, and electronics demodulate the burst envelope into an audible buzz. | Zero code | Phone Bluetooth off for B (advertising continues) | 5 min | `80c41d0`, any | Connection traffic is not the source. Advertising still runs, so it does not clear the radio fully; C2b does that more. |
| C2b | Same as C2, with the transmit amplitude lowered instead of the traffic. | One existing define | `#define BLE_TX_POWER 0` in `device_config.h` (R is 4) | 10 min (2 flashes) | `80c41d0` | A 4 dB change in radio power is not audible. 0 is the lowest value the repo's comment documents; lower values were not verified here. Run only if C2 moved. |
| C3 | The size of the switched LED current sets the amplitude of every current-borne artifact, whatever its path. | Zero code | App colour pure red (255, 0, 0) vs white (255, 255, 255), both at brightness 22 | 4 min | `80c41d0`, within the 22 percent cap | If one third of the current sounds the same, the noise is not current-borne, which points at the signal wires (T2, C5, C7) or the radio (C2). |
| C4 | A ground loop forms when the controller's supply and the amp both reach mains earth. | Zero code | Power the controller from a battery power bank (B) instead of a mains-connected USB source (R) | 6 min | `80c41d0` | Earth-referenced loops are not the path. Only meaningful if the controller is on USB on Saturday; skip if it already runs from a battery. |
| C5 | Common-mode current on the controller-to-strip cable bundle makes the bundle an antenna. | Hardware, no solder | Snap-on ferrite around the whole bundle near the controller | 8 min | `80c41d0` | Cable common-mode radiation is not the path. |
| C6 | Fast edges on DATA_PIN and CLOCK_PIN carry harmonics far above the bit rate, which the long wires radiate. | Hardware, solder | Series resistor in each line at the controller end | 30 min | `80c41d0`, mode 3 only | Edge harmonics are not the path; the bit rate itself (T2) still could be. |
| C7 | Frame repetition: re-sending an identical frame about 130 times a second makes a burst of bus and current activity at an audible repetition rate. | **New code, not in repo, not compiled** | Proposed `#define FRAME_PUSH_MODE 1` (send only when the frame changed) | 10 min (2 flashes) | Needs a PR first | Not a Saturday candidate. If it lands and runs: with Solid and the bus silent, any noise left comes from the LEDs' own PWM and current, never the bus. |
| C8 | The strip's PWM current is drawn through the supply wiring, and that pulsed current loop couples into the guitar. | Hardware, solder | Bulk capacitor at the strip's supply input | 25 min | `80c41d0` | Supply ripple and loop current are not the path. |

### Suggested parts (suggestions only, not measured on this guitar)

| Part | Suggested value | Reasoning |
|---|---|---|
| C5 ferrite | Snap-on ferrite sized to the bundle; two turns through it if the bundle fits | Common-mode choke for the cable; no electrical change to the signals. |
| C6 resistor | 220 ohm (range 100 to 330), one per line | With a few tens of pF of wire and input capacitance, rise time grows to a few ns or tens of ns. The code comment puts mode 3 at about 10 us per half-bit, so the data still arrives intact. Do not combine with mode 7. |
| C8 capacitor | 470 uF electrolytic, plus 100 nF ceramic in parallel, rated at least twice the supply voltage | Keeps the PWM current loop local to the strip. Observe polarity. A large capacitor draws an inrush at power-on; check that the supply tolerates it. |

### Wiring for C6 (only pins named in the sketch)

<svg xmlns="http://www.w3.org/2000/svg" width="520" height="150" viewBox="0 0 520 150" role="img" aria-label="Series resistor in DATA_PIN and CLOCK_PIN lines">
  <rect x="0" y="0" width="520" height="150" fill="#ffffff"/>
  <g fill="none" stroke="#222222" stroke-width="2">
    <rect x="20" y="20" width="120" height="110"/>
    <rect x="380" y="20" width="120" height="110"/>
    <line x1="140" y1="50" x2="220" y2="50"/>
    <rect x="220" y="40" width="60" height="20"/>
    <line x1="280" y1="50" x2="380" y2="50"/>
    <line x1="140" y1="100" x2="220" y2="100"/>
    <rect x="220" y="90" width="60" height="20"/>
    <line x1="280" y1="100" x2="380" y2="100"/>
  </g>
  <g font-family="sans-serif" font-size="13" fill="#222222">
    <text x="30" y="42">Controller</text>
    <text x="30" y="55">DATA_PIN (24)</text>
    <text x="30" y="105">CLOCK_PIN (25)</text>
    <text x="390" y="42">Strip</text>
    <text x="390" y="55">DI</text>
    <text x="390" y="105">CI</text>
    <text x="222" y="35">220 ohm</text>
    <text x="222" y="85">220 ohm</text>
  </g>
</svg>

Text version, in case the picture does not render: DATA_PIN (24) to resistor to strip DI; CLOCK_PIN (25) to resistor to strip CI. Resistors at the controller end. Supply and ground are unchanged.

### C7 code sketch (not compiled, not in this PR)

Shown so a later PR can pick it up. It would sit in `showLeds()`, compare `ledBuf` with a copy of the last frame sent, and skip `bitbangShow()` when they are equal and `FRAME_PUSH_MODE` is 1. Written as a plain `if (FRAME_PUSH_MODE == 1)` (as PR #3 did for `APA102_BRIGHTNESS_MODE`) so CI compiles both branches with the default 0. It must keep the power limiter in the path for every frame that is sent. Until `firmware-build.yml` shows that PR green, C7 is off the Saturday list.

---

## 3. Session plan

### Fixed conditions (never change between takes)

- R, the reference: build `80c41d0` with the reference flags in section 1, pattern Solid, colour white (255, 255, 255), app brightness 22, phone connected, same power source, same guitar pickup selector, tone and volume (full), same amp settings, strings muted with a cloth, hands off the guitar.
- F, the floor: controller unplugged. The only take with no LED system at all.
- Every B differs from R in exactly one thing.

### Recording protocol (phone mic)

- [ ] Phone on a fixed mark, 30 cm in front of the amp speaker, on-axis. Tape the spot. Done when the mark is taped and photographed. (2 min)
- [ ] Photo of the amp knobs and the guitar knobs. Done when both photos are on the phone. (1 min)
- [ ] If the recording app has noise reduction or "enhance", turn it off. If a second phone is free, record on that one, in airplane mode, so the app phone's radio is not next to the mic. If you use the app phone, confirm the recorder keeps running while you switch to the LED app. Done when a 10 s test recording plays back with the amp hum audible. (3 min)
- [ ] One continuous recording per block. Each take: say "take N" out loud, wait 2 s, then 15 s of silence from you. Done when the take sheet has the number and the condition for that take.
- [ ] After each take, write one line on the take sheet: take number, condition id, time, anything odd (for example the green connect flash).

### Blinding, alone

You cannot be blind while you flip the switch, so the blinding happens at scoring time.

- [ ] Before the session, shuffle the order of the B conditions inside each block (write ids on slips, draw them). Done when the drawn order is written on the take sheet. (2 min)
- [ ] After the session, split the recordings into one file per take, named only by take number. Cover the condition column on the take sheet. (10 min)
- [ ] Listen in this order, which is a fixed shuffle of take numbers: 19, 6, 2, 3, 9, 17, 24, 23, 8, 15, 11, 1, 22, 13, 5, 18, 20, 10, 12, 4, 7, 14, 21, 16 (skip numbers you did not record). Score each take 0 (silent), 1 (faint), 2 (clear), 3 (loud). Done when every take has a score before you uncover the key. (15 min)
- [ ] Uncover the key and compare each B with the average of the two R takes around it. Done when every candidate has "lower", "same" or "higher". (5 min)

### Order (A/B/A, every B bracketed by R)

Takes chain as R, B, R, B, R, so each R serves two tests. Drift shows up as the R scores changing across the session; the F and R takes at both ends measure it.

| Block | Takes | Minutes | Done when |
|---|---|---|---|
| 0. Setup | Flash `80c41d0` with reference flags, Serial Monitor at 115200, recording protocol above | 15 | Serial shows `Bitbang SPI initialized: Mode 3` and the strip is lit white at app brightness 22 |
| 1. Floor and reference | F, R | 3 | Two takes on the sheet |
| 2. Zero flash, shuffled | C1, C2, C3, C4, each followed by R | 20 | Eight takes on the sheet |
| 3. One-line flashes, shuffled | T1, T2, each followed by R (reflash R after each). C2b only if C2 moved. | 20 (30 with C2b) | Serial shows the expected mode line after each flash |
| 4. Close | R, F | 3 | Two takes on the sheet |
| 5. Optional hardware | C5, then C8, then C6, each followed by R | up to 75 | Only if blocks 0 to 4 finished; one at a time, never two parts at once |
| Later. Blind scoring | See "Blinding, alone" | 30 | Every take scored before the key is uncovered |

Core total: about 60 minutes on the bench plus 30 minutes of scoring, which can wait until after Saturday.

### Steps per B condition

Each B is one take, recorded straight after its change, then an R take after you undo it.

- [ ] C1: turn the guitar volume to 0. Done when the knob is at 0 and the take is recorded. Undo: volume full. (4 min)
- [ ] C2: turn the phone's Bluetooth off, wait 30 s (`BLE_FAST_TIMEOUT` is 30) so advertising drops to its slow interval. Done when the strip is still white and the take is recorded. Undo: Bluetooth on, reconnect; the strip flashes green three times on connect, so wait for it to settle before the R take. (5 min)
- [ ] C3: in the app, set colour to pure red (255, 0, 0), brightness still 22. Done when the strip is red and the take is recorded. Undo: white. (4 min)
- [ ] C4: move the controller's USB lead from the mains-connected source to a battery power bank. Done when the strip relights white and the take is recorded. Undo: back to the mains source. (6 min)
- [ ] T1: set `#define APA102_BRIGHTNESS_MODE 1`, flash. Done when the strip relights white at app brightness 22 and the take is recorded. Undo: set 0, flash. (10 min)
- [ ] T2: set `#define BITBANG_FREQUENCY_MODE 0`, flash. Done when Serial shows `Mode 0` and the take is recorded. Undo: set 3, flash. (10 min)
- [ ] C2b (only if C2 moved): set `#define BLE_TX_POWER 0` in `device_config.h`, flash. Done when the app reconnects and the take is recorded. Undo: set 4, flash. (10 min)
- [ ] C5: snap the ferrite around the bundle. Done when it is closed and the take is recorded. Undo: remove it. (8 min)
- [ ] C8: fit the capacitor at the strip's supply input with power disconnected. Done when the strip relights and the take is recorded. Undo: remove it with power disconnected, then record R. (25 min)
- [ ] C6: fit both resistors with power disconnected. Done when Solid white shows the right colour on all LEDs and the take is recorded. If colours glitch, stop and remove them. (30 min)

### Optional: app taps

If PR #3's app build is on the phone, tap Quiet or I hear it once per take, after the take is recorded. The stored record keeps raw inputs with `ledCount` 14, so it can be rescored later. The recordings are the primary evidence; the taps are a secondary log.

---

## 4. Reading the results

- The F take is your zero. Anything at F level is noise outside the LED system.
- C1 first: if volume 0 does not remove the noise, the coupling is after the pickup, and C4 and C5 matter most.
- C3 "lower" with T1 and T2 "same": current-borne coupling. C8 and C5 are the next hardware steps.
- T2 "lower" with C3 "same": the bus. C6 and, once compiled, C7 separate edge harmonics from frame repetition.
- Every result "same": the noise does not come from any of these paths at app brightness 22, which is still an answer, and it bounds the next session to higher brightness or the radio with advertising stopped.

---

## 5. Verified and not verified

| Claim | Status |
|---|---|
| `80c41d0` compiles for `adafruit:nrf52:itsybitsy52840` | Verified, Actions run 38584809595, success |
| main firmware compiles | Verified indirectly: run 38438497448 on `07c2a6b`, and no firmware file changed since |
| T1, T2, C2b compile with the flag flipped | Not compiled. Reasoned: `APA102_BRIGHTNESS_MODE` and `BRIGHTNESS_INPUT_IS_PERCENT` are plain `if`s, so both branches already compile; `BITBANG_FREQUENCY_MODE` 0 to 7 indexes an 8-entry array; `BLE_TX_POWER` is an integer argument. To prove it, push a branch with the one-line change and read the "Compile bt-led-controller.ino" step in the `firmware-build` Actions log. arduino-cli cannot run in the sandbox that wrote this (egress blocked). |
| C7 compiles | Not written, not compiled. Not a Saturday candidate. |
| 22 percent ceiling at 30 LEDs | Verified by arithmetic from `power_limiter.h`, `power_safety_constants.h` and `parameterValidation.ts` |
| Frame time and rates in T2 | Arithmetic from the code's delay values; digitalWrite overhead not known; not measured |
| Audible-band claim for the 5-bit global field | From the PR #3 code comment; not measured |
| Part values in section 2 | Suggestions with reasoning; not tested on this guitar |
| Flash time per build (about 3 minutes) | Estimate; the CI compile step is 19 to 54 s, upload time not measured |
| The physical strip length, supply voltage and power source on Saturday | Unknown from the repo; record them on the take sheet |
