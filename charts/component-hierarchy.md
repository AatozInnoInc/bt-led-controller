# Component hierarchy

```mermaid
graph TD
    App --> SimulatorShell

    SimulatorShell --> LedStripCanvas
    SimulatorShell --> ControlPanel
    SimulatorShell --> PresetBar

    ControlPanel --> PatternPanel
    ControlPanel --> ColorPicker
    ControlPanel --> BrightnessSlider
    ControlPanel --> SpeedSlider

    PatternPanel --> PatternCard
    ColorPicker --> HsvWheel
    ColorPicker --> RgbSliders
    ColorPicker --> HexInput

    PresetBar --> PresetDrawer
    PresetBar --> CodeExportButton

    PresetDrawer --> PresetList
    PresetDrawer --> PresetImport
    CodeExportButton --> CodeExportModal

    SimulatorShell --> useBleTransport
    useBleTransport --> BleCommandService["BleCommandService (apps/simulator)"]
    BleCommandService --> VirtualDevice["VirtualDevice (packages/led-engine)"]
    VirtualDevice --> PatternRunner["PatternRunner (packages/led-engine)"]
    VirtualDevice --> ConfigModeHandler["ConfigModeHandler (packages/led-engine)"]
    VirtualDevice --> OwnershipHandler["OwnershipHandler (packages/led-engine)"]
```

## Hook responsibilities

| Hook | Responsibility |
|---|---|
| `useBleTransport` | Wraps BleCommandService, exposes typed send/receive, manages connection state |
| `useDeviceConfig` | Sends CMD_CONFIG_UPDATE commands, tracks local mirror of currentSettings |
| `usePatternLoop` | Runs rAF loop against VirtualDevice.tick(), feeds pixels to LedStripCanvas |
| `usePresets` | localStorage CRUD + file import/export in RN-compatible format |
