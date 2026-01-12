# LED Guitar Controller - Arduino Setup

This Arduino sketch provides a Bluetooth Low Energy (BLE) controller for LED guitar systems using Adafruit nRF52 microcontrollers with persistent settings storage and robust error handling.

## Quick Setup

1. **Configure Your Device**:
   - Open `device_config.h`
   - Change `DEVICE_NAME` to a unique identifier for your guitar
   - Example: `#define DEVICE_NAME "LED_GUITAR_MY_STRAT"`

2. **Upload the Code**:
   - Connect your nRF52 board to your computer
   - Open `my-led-controller.ino` in Arduino IDE
   - Select your board (nRF52 Feather, ItsyBitsy, etc.)
   - Upload the code

3. **Test the Connection**:
   - Open the React Native app
   - Scan for devices
   - Your device should appear as `LED_GUITAR_[YOUR_NAME]`

## Device Configuration

### Required Settings in `device_config.h`:

```cpp
// Change this to a unique name for your guitar
#define DEVICE_NAME "LED_GUITAR_001"

// Hardware configuration
#define LED_PIN 8        // Pin connected to LED data line
#define LED_COUNT 16     // Number of LEDs in your strip
```

### Device Naming Convention

Use this format for `DEVICE_NAME`:
- `LED_GUITAR_[UNIQUE_IDENTIFIER]`
- Examples:
  - `LED_GUITAR_001`
  - `LED_GUITAR_MY_GUITAR`
  - `LED_GUITAR_STRAT_001`
  - `LED_GUITAR_LES_PAUL`

**Important**: The React Native app will only detect devices that start with `LED_GUITAR_`

## Enhanced Communication Protocol

The controller uses a robust two-way communication protocol with the React Native app:

### Command Structure
- **Single Character Commands**: `V`, `C`, `I`, `G`, `A`, `L`, `R`, `W`, `F`
- **Parameter Commands**: `S`, `B`, `P`, `T` (followed by data bytes)

### Response Types
- **SUCCESS**: `SUCCESS:message`
- **ERROR**: `ERROR:code:message`
- **DATA**: `TYPE:key:value,key:value`

### Available Commands

#### Basic Control
- `V` - Get device version
- `S` - Set individual LED (followed by LED index, R, G, B values)
- `C` - Clear all LEDs
- `B` - Set brightness (followed by brightness value 0-255)
- `P` - Set pattern (followed by pattern number)
- `I` - Get device information

#### Settings Management
- `G` - Get current settings
- `T` - Set settings (followed by settings data)
- `A` - Save settings to EEPROM
- `L` - Load settings from EEPROM
- `R` - Reset settings to defaults

#### System Information
- `W` - Get power consumption info
- `F` - Get available effects list

### Settings Storage

The device stores settings persistently using the Adafruit LittleFS file system. Settings are saved to `/settings.dat` and include validation with magic numbers, version checking, and checksums for data integrity.

```cpp
struct DeviceSettings {
  uint32_t magic;              // Magic number for validation
  uint8_t version;             // Settings version
  uint8_t brightness;          // Current brightness (0-255)
  uint8_t currentPattern;      // Current pattern
  uint8_t powerMode;           // Power mode (0=normal, 1=low power, 2=eco)
  uint8_t autoOff;             // Auto-off timeout in minutes (0=disabled)
  uint8_t maxEffects;          // Maximum number of effects
  uint8_t color[3];     // Default RGB color
  uint8_t reserved[16];        // Reserved for future use
  uint32_t checksum;           // Settings checksum
};
```

### Error Handling

The device provides detailed error responses:

- `ERROR:1:Invalid command`
- `ERROR:2:Invalid parameter`
- `ERROR:3:Settings corrupted`
- `ERROR:4:LittleFS failure`
- `ERROR:5:LED hardware failure`
- `ERROR:6:Memory low`
- `ERROR:7:Power low`

## LED Patterns

- `0` - All LEDs off
- `1` - Solid white
- `2` - Rainbow effect
- `3` - Red pulse
- `4` - Fade effect
- `5` - Chase pattern
- `6` - Twinkle effect
- `7` - Wave pattern
- `8` - Breathing effect
- `9` - Strobe effect

## Power Management

### Power Modes
- **Normal (0)**: Full brightness
- **Low Power (1)**: 50% brightness
- **Eco (2)**: 25% brightness

### Auto-Off Feature
- Set `autoOff` to number of minutes (0 = disabled)
- Device automatically turns off LEDs after inactivity
- Saves battery when not in use

## Hardware Requirements

- Adafruit nRF52 board (Feather, ItsyBitsy, etc.)
- WS2812B LED strip (or compatible)
- Power supply for LEDs
- Wiring connections

## LED Strip Connection

1. **Data Line**: Connect to pin defined in `LED_PIN` (default: pin 8)
2. **Power**: Connect to 5V power supply
3. **Ground**: Connect to common ground

## React Native Integration

The React Native app uses the `BLECommunicationService` to communicate with the device:

```typescript
// Connect to device
await bleCommunication.connect(device);

// Get device settings
const settings = await bleCommunication.getSettings();

// Set brightness
await bleCommunication.setBrightness(128);

// Set pattern
await bleCommunication.setPattern(LED_PATTERNS.RAINBOW);

// Save settings
await bleCommunication.saveSettings();
```

## Troubleshooting

### Device Not Found
- Ensure `DEVICE_NAME` starts with `LED_GUITAR_`
- Check that Bluetooth is enabled on your phone
- Verify the code uploaded successfully

### LEDs Not Working
- Check wiring connections
- Verify `LED_PIN` and `LED_COUNT` settings
- Ensure adequate power supply

### Connection Issues
- Restart the nRF52 board
- Clear Bluetooth cache on your phone
- Check for interference from other devices

### Settings Issues
- Use `R` command to reset settings to defaults
- Settings are automatically saved to LittleFS on disconnect
- Check device responses for specific issues
- If settings become corrupted, use `R` to reset to defaults

## Customization

### Adding New Patterns
1. Add pattern definition to `device_config.h`
2. Add case in the pattern switch statement
3. Implement the pattern function

### Changing LED Type
Update `LED_TYPE` in `device_config.h`:
- WS2812B: `NEO_GRB + NEO_KHZ800`
- WS2811: `NEO_RGB + NEO_KHZ800`
- SK6812: `NEO_GRB + NEO_KHZ800`

### Extending Settings
1. Add new fields to `DeviceSettings` struct
2. Update `resetToDefaultSettings()` function
3. Modify settings parsing in React Native app

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify your configuration settings
3. Test with the provided example patterns
4. Check device error responses for specific issues
