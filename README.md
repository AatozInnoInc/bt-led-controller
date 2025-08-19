# BT LED Guitar Dashboard

A React Native app for controlling LED guitar systems via Bluetooth Low Energy (BLE) connection to Adafruit ItsyBitsy nRF52840 Express devices.

## Features

- **Bluetooth Device Discovery**: Scan for and connect to nearby BLE devices
- **Configuration Profiles**: Create and manage LED configuration profiles for your devices
- **LED Control**: Configure brightness, color, patterns, and speed for multiple LEDs
- **Cross-Platform**: Works on iOS, Android, and Web
- **Modern UI**: iOS/meta-inspired design with dark theme

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI
- iOS Simulator or Android Emulator (for mobile testing)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on your preferred platform:
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Usage

### Adding a New Configuration

1. Tap "Add New Configuration" on the home screen
2. The app will scan for nearby Bluetooth devices using native Bluetooth APIs
3. Select your ItsyBitsy nRF52840 Express device from the discovered devices
4. The app will connect to the device and verify the connection
5. Create a configuration profile with:
   - Profile name
   - LED configurations (brightness, color, pattern, speed)
6. Save the profile for future use

### Bluetooth Device Requirements

The app is designed to work with devices that support the Nordic UART Service (NUS):
- **Service UUID**: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- **Write Characteristic**: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- **Read Characteristic**: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

This includes Adafruit ItsyBitsy nRF52840 Express and similar Nordic-based devices.

### LED Configuration Options

- **Brightness**: 0-100% control
- **Colors**: Red, Green, Blue, Yellow, Magenta, Cyan
- **Patterns**: Solid, Pulse, Rainbow, Custom
- **Speed**: 0-100% for animated patterns

## Bluetooth Permissions

The app requires Bluetooth permissions to function:

- **iOS**: Bluetooth usage descriptions are configured in app.json. The app uses `react-native-ble-plx` for native Bluetooth functionality.
- **Android**: Bluetooth and location permissions are required for device scanning
- **Web**: Uses Web Bluetooth API (supported in Chrome and Edge)

## Platform Support

- **iOS**: Full native Bluetooth Low Energy support with device discovery, connection, and message sending
- **Android**: Full native Bluetooth Low Energy support (requires development build)
- **Web**: Web Bluetooth API support for testing and development

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
│   ├── HomeScreen.tsx
│   ├── DeviceDiscoveryScreen.tsx
│   ├── CreateProfileScreen.tsx
│   └── ...
├── types/              # TypeScript type definitions
│   └── bluetooth.ts
└── utils/              # Utility functions and themes
    └── theme.ts
```

### Key Components

- **DeviceDiscoveryScreen**: Handles Bluetooth device scanning and selection
- **CreateProfileScreen**: Manages LED configuration profile creation
- **Bluetooth Types**: TypeScript interfaces for device and profile management

## Future Enhancements

- Real-time LED control via BLE communication
- Profile management and editing
- Cloud sync for configurations
- Advanced LED patterns and effects
- Device firmware updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
