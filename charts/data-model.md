# Data model

## Preset and config types

```mermaid
classDiagram
    class LedConfig {
        +PatternId pattern
        +RGB color
        +number speed 0-100
        +number brightness 0-255
        +number powerMode 0-2
    }

    class LedPreset {
        +string id
        +string name
        +string createdAt ISO8601
        +number version
        +LedConfig config
    }

    class ExportEnvelope {
        +string schema "led-simulator-preset-v1"
        +LedPreset preset
        +string generatedCode optional C++ snippet
    }

    LedPreset --> LedConfig
    ExportEnvelope --> LedPreset
```

## Export destinations

```mermaid
flowchart LR
    P[LedPreset] --> A[Export to .json file]
    P --> B[URL hash share link]
    P --> C[Generated Arduino C++]

    A -->|imported by| RN[Companion RN app]
    B -->|opened by| Browser[Another browser session]
    C -->|pasted into| INO[bt-led-controller.ino]
```

## PatternId values

These map 1:1 to the PATTERN_* constants in `device_config.h`:

| PatternId | .ino constant | Value |
|---|---|---|
| off | PATTERN_OFF | 0 |
| solid | PATTERN_SOLID_WHITE | 1 |
| rainbow | PATTERN_RAINBOW | 2 |
| pulse | PATTERN_PULSE | 3 |
| fade | PATTERN_FADE | 4 |
| chase | PATTERN_CHASE | 5 |
| twinkle | PATTERN_TWINKLE | 6 |
| wave | PATTERN_WAVE | 7 |
| breath | PATTERN_BREATH | 8 |
| strobe | PATTERN_STROBE | 9 |
| fire | (new, add to .ino) | 10 |
