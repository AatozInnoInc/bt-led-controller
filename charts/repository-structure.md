# Repository structure

The simulator lives inside the bt-led-controller monorepo as `apps/simulator/`.
Shared logic lives in workspace packages consumed by both the simulator and the companion RN app.

```mermaid
graph TD
    Root[bt-led-controller/] --> Apps[apps/]
    Root --> Packages[packages/]
    Root --> Firmware[bt-led-controller/]

    Apps --> Sim[simulator/]
    Apps --> RN[rn-app/ - companion app]

    Packages --> LedEngine[led-engine/]
    Packages --> BleProto[ble-protocol/]
    Packages --> LedTypes[led-types/]

    LedEngine --> E1[src/math.ts - TypeScript port of .ino helpers]
    LedEngine --> E2[src/patterns/ - one file per effect]
    LedEngine --> E3[src/VirtualDevice.ts - .ino state machine port]

    BleProto --> B1[src/constants.ts - CMD RESPONSE ERROR matching device_config.h]
    BleProto --> B2[src/types.ts - BLE message shape types]

    LedTypes --> T1[src/preset.ts - LedPreset LedConfig ExportEnvelope]
    LedTypes --> T2[src/pattern.ts - PatternId PatternFn PATTERN_INT]

    Sim --> SimSrc[src/]
    SimSrc --> SimEngine[engine/]
    SimSrc --> SimHooks[hooks/]
    SimSrc --> SimComp[components/]

    SimEngine --> SE1[BleCommandService.ts - mock transport only]
    SimEngine --> SE2[CodeGenerator.ts - Arduino C++ output]

    SimHooks --> SH1[useBleTransport.ts]
    SimHooks --> SH2[useDeviceConfig.ts]
    SimHooks --> SH3[usePatternLoop.ts]
    SimHooks --> SH4[usePresets.ts]

    SimComp --> SC1[LedStrip/]
    SimComp --> SC2[ColorPicker/]
    SimComp --> SC3[PatternPanel/]
    SimComp --> SC4[PresetDrawer/]
    SimComp --> SC5[CodeExportModal/]

    Firmware --> F1[bt-led-controller.ino]
    Firmware --> F2[device_config.h]
```

## Dependency rules

| Package or app | May depend on | May not depend on |
|---|---|---|
| `packages/led-engine` | `led-types`, `ble-protocol` | React, RN, browser APIs, Node APIs |
| `packages/ble-protocol` | nothing | anything |
| `packages/led-types` | `ble-protocol` | anything else |
| `apps/simulator` | all packages, React | React Native |
| `apps/rn-app` | all packages, React Native | browser APIs |

`packages/led-engine` must be testable in Node with Vitest and no DOM.

## What the monorepo eliminates

Without shared packages, both the simulator and the RN app would define their own copies of BLE command constants, preset and pattern types, and math helpers. With shared packages, there is one source of truth. A change to the preset format is made once in `packages/led-types/` and both apps pick it up on the next build.

## What the monorepo does not eliminate

The TypeScript math helpers in `packages/led-engine/src/math.ts` are still a necessary port of the C++ functions in `bt-led-controller.ino`. C++ cannot run in a browser or in React Native. The port is unavoidable. What the monorepo changes is that the port lives once in a shared package rather than being duplicated per app.
