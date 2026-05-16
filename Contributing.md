# Contributing

## Before you start

Read [`Architecture.md`](docs/Architecture.md) and the charts in `charts/`. The most important thing to understand is that the engine is a port — not an adaptation — of `bt-led-controller.ino`. Changes to the engine must preserve 1:1 parity with the firmware.

---

## Development setup

```bash
npm install
npm run dev      # dev server at localhost:5173
npm run test     # Vitest unit tests
npm run build    # production build
```

---

## Rules

These apply to every change.

**Keep changes surgical.** Small, reviewable diffs. One concern per PR. Sweeping renames and reformats go in their own PR.

**Shared packages have zero framework dependencies.** Files in `packages/led-engine/`, `packages/ble-protocol/`, and `packages/led-types/` must not import from React, React Native, or any browser or Node API. They must be testable in Node with `vitest` and no DOM. The simulator's `hooks/` and `components/` are the correct place for React.

**Math helpers are 1:1 ports.** Do not optimise or rewrite `sin8`, `hsv2rgb`, `beat8`, `qadd8`, `qsub8`, `blendRgb`, or `gamma8` in `packages/led-engine/src/math.ts`. The goal is behavioral parity with `bt-led-controller.ino`, not TypeScript idiom. If the numbers match in the browser they will match on hardware. If you find a bug, fix it in the firmware too and note the change in your PR.

**Pattern functions are pure.** A `PatternFn` receives `(buf, cfg, now)` and writes to `buf`. It must not read from or write to anything else. The only exception is the `fire` effect, which uses a heat array in a closure scoped to a single device instance.

**Every new pattern needs a test.** The test should verify that given a known `cfg` and `now`, the output `buf` matches an expected pixel array. Use the C++ output as the reference.

**No failing tests.** Run `npm test` before pushing. CI will block on failures.

---

## Adding a new effect

1. Create `packages/led-engine/src/patterns/your-effect.ts` implementing `PatternFn`
2. Add it to the registry in `packages/led-engine/src/patterns/index.ts`
3. Add the corresponding `PatternId` to `packages/led-types/src/pattern.ts`
4. Add a `PatternCard` entry in `apps/simulator/src/components/PatternPanel/`
5. Add a C++ code generator case in `apps/simulator/src/engine/CodeGenerator.ts`
6. Write a unit test in `packages/led-engine/src/patterns/your-effect.test.ts`
7. If the effect is new to the firmware, open a linked issue in `bt-led-controller` to track the hardware port

---

## Adding a new BLE command

The command table lives in `src/engine/VirtualDevice.ts`, mirroring `loop()` in the `.ino`. Add the case there, add the encoder in `src/engine/BleCommandService.ts`, add the response decoder in the same file, and write an integration test that sends a command and asserts the response bytes.

---

## Preset format changes

The preset format is consumed by the companion RN app. Any change to `ExportEnvelope` or `LedConfig` in `src/types/preset.ts` must be coordinated with the companion app team. Bump the schema version string.

---

## PR checklist

- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] No new dependencies added without discussion
- [ ] If engine changed: behaviour matches `bt-led-controller.ino`
- [ ] If preset format changed: companion RN app team informed
- [ ] Charts in `charts/` updated if architecture changed
- [ ] [`Architecture.md`](docs/Architecture.md) decision log updated if a significant decision was made
