# Pattern animation loop

Mirrors the `loop()` → `updatePattern()` → `showLeds()` cycle in `bt-led-controller.ino`.
The 30 fps gate matches `LED_UPDATE_INTERVAL_MS 33` in the firmware.

```mermaid
flowchart TD
    A[requestAnimationFrame tick] --> B{delta >= 33ms?}
    B -- no --> A
    B -- yes --> C[getConfig from VirtualDevice]
    C --> D{currentPattern}

    D -- off --> E[clear ledBuf]
    D -- solid --> F[fill_solid_buf with cfg.color]
    D -- rainbow --> G[rainbow]
    D -- pulse --> H[pulse - sine brightness on cfg.color]
    D -- chase --> I[chase - beat8 positions]
    D -- twinkle --> J[twinkle - random sparkle]
    D -- wave --> K[wave - HSV traveling wave]
    D -- breath --> L[breath - grayscale sine]
    D -- strobe --> M[strobe - on/off at cfg.speed rate]
    D -- fire --> N[fire - heat decay simulation]

    E --> O[onFrame callback - emit ledBuf copy to React]
    F --> O
    G --> O
    H --> O
    I --> O
    J --> O
    K --> O
    L --> O
    M --> O
    N --> O

    O --> P[LedStripCanvas re-renders SVG circles]
    P --> A
```

## Math helpers — 1:1 port from .ino

| C++ | TypeScript | Purpose |
|---|---|---|
| `sin8_approx(x)` | `sin8(x)` | 0–255 sine, 0–255 input |
| `hsv2rgb(h,s,v)` | `hsv2rgb(h,s,v)` | HSV to RGB, 0–255 all |
| `rgb2hsv(r,g,b)` | `rgb2hsv(r,g,b)` | RGB to HSV, 0–255 all |
| `beat8_like(bpm, phase)` | `beat8(bpm, phase, now)` | 0–255 ramp at BPM |
| `qadd8(a,b)` | `qadd8(a,b)` | Saturating add |
| `qsub8(a,b)` | `qsub8(a,b)` | Saturating subtract |
| `fadeToBlackBy_buf(amt)` | `buf.fadeToBlackBy(amt)` | Scale each channel down |
| `blend_rgb(a,b,t)` | `blendRgb(a,b,t)` | Linear RGB blend |
| `gamma8[]` | `GAMMA8[]` | Gamma correction table |
