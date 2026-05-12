# LED Simulator

Browser-based tool for designing and previewing LED strip effects without hardware.

A companion to the [bt-led-controller](https://github.com/AatozInnoInc/bt-led-controller) Arduino project.

---

## What it does

- Renders a live, glowing LED strip in the browser
- Runs the same effect algorithms as the firmware (TypeScript port of `bt-led-controller.ino`)
- Uses the same binary BLE command protocol as the companion React Native app — no shortcuts
- Exports presets as `.json` files that the companion RN app can import
- Generates Arduino C++ code that can be pasted directly into `bt-led-controller.ino`

The goal is to remove the hardware from the inner loop when designing new effects. Iterating on a fire effect in a browser tab is far faster than flashing a microcontroller.

---

## Getting started

```bash
git clone https://github.com/your-org/led-simulator.git
cd led-simulator
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Deployment

```bash
npm run build
npx vercel --prod
```

The app is static. No server. Presets are stored in `localStorage`.

---

## Usage

1. Select an effect from the pattern panel
2. Choose a color using the HSV wheel or RGB sliders
3. Adjust speed and brightness
4. Tweak until the strip looks right
5. Save the preset or export it:
   - Export `.json` to import into the companion RN app
   - Click "Code" to get the Arduino C++ snippet
   - Copy the share link from the URL bar

---

## Relationship to bt-led-controller

| bt-led-controller | LED Simulator |
|---|---|
| nRF52 firmware, C++ | TypeScript port of the same logic |
| BLE UART over hardware | In-process mock transport |
| Real LED strip | SVG canvas with glow effect |
| Flash storage | localStorage |
| Patterns in `bt-led-controller.ino` | Same patterns in `src/engine/patterns/` |

Any effect that works in the simulator will work on hardware, because they share the same math.

---

## Project structure

See `charts/repository-structure.md` for the full tree and `Architecture.md` for design decisions.

---

## Contributing

See `Contributing.md`.

---

## License

MIT
