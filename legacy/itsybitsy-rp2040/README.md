# Legacy ItsyBitsy RP2040 controller

Standalone home for the older Adafruit **ItsyBitsy RP2040** LED hardware path.

This tree is intentional isolation from `bt-led-controller/`, which is the current official firmware for the Adafruit **ItsyBitsy nRF52840 Express** and the BLE protocol used by the React Native app and simulator. Nothing under `legacy/` is compiled by `npm run build:firmware` or `.github/workflows/firmware-build.yml`.

## Official sketch

| Sketch | Role |
|---|---|
| [`sketches/no-noise-moriah-eric-official/`](./sketches/no-noise-moriah-eric-official/) | Official legacy source for the RP2040 "no-noise" build |

Board: Adafruit ItsyBitsy RP2040  
Libraries: FastLED, Adafruit NeoPixel  
Pins (from the sketch):

| Signal | GPIO | Notes |
|---|---|---|
| External NeoPixel data | GP14 (D5) | FastLED `NEOPIXEL` |
| Built-in NeoPixel power | GP16 | Drive high to enable |
| Built-in NeoPixel data | GP17 | Adafruit_NeoPixel |

## Historical sketches

Kept for reference and hardware bring-up. Prefer the official sketch above for new flashes of this legacy board.

| Sketch | Notes |
|---|---|
| `12-17-24-official-uploaded_no-noise-latest-tests` | Earlier no-noise test (brightness factor, halt-after-setup) |
| `bunny-v2-soldered` | APA102 on GP14/GP18 (data/clock), orange solid test |
| `bunny-flash-mem-cycles-6-9-25` | APA102 + flash-sector effect rotation |

## Bootloader / recovery UF2s

| File | Use |
|---|---|
| `bootloader/ItsyBitsy_RP2040.uf2` | Board bootloader image for ItsyBitsy RP2040 |
| `bootloader/flash_nuke.uf2` | Erases RP2040 flash (recovery when a sketch bricks the board) |

### Flash a UF2

1. Hold **BOOT** on the ItsyBitsy RP2040, tap **RESET**, then release **BOOT**.
2. A USB mass-storage volume (often `RPI-RP2`) appears.
3. Copy the UF2 onto that volume; the board reboots when the copy finishes.

### Flash a sketch

1. Open the sketch folder in Arduino IDE (folder name must match the `.ino` name).
2. Board: **Adafruit ItsyBitsy RP2040** (Earle Philhower or Adafruit RP2040 core, matching your existing setup).
3. Install FastLED and Adafruit NeoPixel if prompted.
4. Upload.

## Archive batch

[`archive/upload-batch/`](./archive/upload-batch/) holds extra files that arrived with the same asset dump (Feather M0 Express UF2s, Pi-hole teleporter tarball). They are preserved for provenance. They are not used by the RP2040 LED controller path.

## Relationship to the main product

| Path | Board | BLE app / simulator |
|---|---|---|
| `bt-led-controller/` | ItsyBitsy nRF52840 | Supported (current) |
| `legacy/itsybitsy-rp2040/` | ItsyBitsy RP2040 | Legacy hardware only; no BLE protocol parity claim |

Do not merge RP2040 FastLED sketches into `bt-led-controller.ino`. Keep changes for this board under `legacy/itsybitsy-rp2040/`.
