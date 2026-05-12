# bt-led-controller

Monorepo for the LED Guitar Controller system — firmware, mobile app, and a browser-based effect simulator.

| Workspace | What it is |
|---|---|
| `bt-led-controller/` | Arduino firmware for Adafruit ItsyBitsy nRF52840 Express |
| Root (Expo/RN) | Mobile + desktop app for controlling real hardware over BLE |
| `apps/simulator/` | Browser-based effect designer (Vite + React, deploys to Vercel) |
| `packages/ble-protocol/` | `CMD_*` / `RESPONSE_*` / `ERROR_*` — single source of truth for both apps |
| `packages/led-types/` | `LedConfig`, `LedPreset`, `PatternId`, `PatternFn` |
| `packages/led-engine/` | 1:1 TypeScript port of the `.ino` math + pattern engine, plus `VirtualDevice` |

The mobile app and the simulator speak the same binary BLE protocol. Effects designed in the simulator can be pasted directly into `bt-led-controller.ino` or exported as JSON that the RN app imports.

---

## Getting started

```bash
npm install        # workspace install from repo root
```

### Simulator (web)

```bash
cd apps/simulator
npm run dev        # http://localhost:5173
npm run build      # static dist/ ready for Vercel
npx vercel --prod  # deploy
```

Pick a pattern, tune color + speed, then:
- Save the preset (localStorage) or share via URL hash
- Export `.json` for the RN app to import
- Open the code modal to copy an Arduino C++ snippet for `bt-led-controller.ino`

The simulator runs entirely in the browser — no backend, no hardware required.

### Mobile / desktop app (Expo RN)

```bash
npm start          # Metro dev server
npm run ios        # iOS simulator
npm run android    # Android emulator (requires a dev build)
npm run web        # Web Bluetooth (Chrome / Edge only)
```

The app scans for devices advertising the Nordic UART Service:

- Service UUID — `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- Write — `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- Notify — `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

This includes the Adafruit ItsyBitsy nRF52840 Express running the firmware in `bt-led-controller/`. Bluetooth permissions live in `app.json` (iOS usage strings) and the Android manifest. The web runtime uses Web Bluetooth (Chrome and Edge).

#### Adding a new configuration

1. Tap **Add New Configuration** on the home screen
2. Select your ItsyBitsy device from the scan results
3. Pick LEDs and set brightness (0–100%), color, pattern (Solid / Pulse / Rainbow / Custom), speed (0–100%)
4. Save the profile

#### TestFlight

```bash
npm run eas:login
npm run build:testflight             # build + submit
npm run build:testflight:no-submit   # build only
npm run build:internal               # internal distribution
```

Full deployment instructions in [`TESTFLIGHT_DEPLOYMENT.md`](./TESTFLIGHT_DEPLOYMENT.md).

---

## Repository structure

```
bt-led-controller/
├── apps/simulator/         # browser simulator (Vite + React + TS)
├── packages/
│   ├── ble-protocol/       # CMD_* / RESPONSE_* / ERROR_*
│   ├── led-types/          # shared preset + pattern types
│   └── led-engine/         # math.ts, VirtualDevice, patterns/
├── bt-led-controller/      # Arduino firmware (.ino + device_config.h)
├── src/                    # Expo/RN mobile app
└── charts/                 # architecture docs (Mermaid)
```

See [`Architecture.md`](./Architecture.md) for design decisions, [`Handoff.md`](./Handoff.md) for the simulator build plan, and [`charts/repository-structure.md`](./charts/repository-structure.md) for the full diagram.

---

## Simulator ↔ firmware parity

| Firmware (`bt-led-controller.ino`) | Simulator (`apps/simulator/`) |
|---|---|
| nRF52 C++ pattern loop | 1:1 TypeScript port in `packages/led-engine` |
| BLE UART over hardware | In-process mock transport (`BleCommandService`) |
| Real LED strip | DOM strip with glow halos |
| Flash storage | localStorage |
| `CMD_*` / `RESPONSE_*` bytes | Same `CMD_*` / `RESPONSE_*` bytes |

Effects that run in the simulator run on hardware — they share the same math helpers and protocol bytes. Parity is a hard correctness requirement; see [`charts/Contributing.md`](./charts/Contributing.md).

---

## Testing

```bash
npx vitest run     # simulator + engine (Vitest, 44 tests)
npm test           # RN app (Jest)
```

Both must stay green at every commit.

---

## Contributing

1. Read [`charts/Contributing.md`](./charts/Contributing.md) — non-negotiable rules for the shared engine
2. Create a feature branch
3. Keep changes surgical; one concern per PR
4. Run both test suites
5. Open a PR

## License

MIT.
