# Bluetooth Setup Guide

This guide explains how to use the Bluetooth functionality in the MyLedGuitar app to connect to your nRF52 microcontroller.

## Prerequisites

1. **nRF52 Microcontroller**: Your ItsyBitsy nRF52840 Express or similar nRF52 board
2. **Arduino Code**: The provided .ino file uploaded to your microcontroller
3. **React Native App**: This app with the updated Bluetooth functionality

## Setup Instructions

### 1. Microcontroller Setup

1. Upload the provided Arduino code to your nRF52 board
2. The board will start advertising with the name "Bluefruit Feather52" (or similar)
3. The board provides a UART service for communication

### 2. App Permissions

The app will request the following permissions:
- **iOS**: Bluetooth permissions (automatically requested)
- **Android**: Location and Bluetooth permissions (required for BLE scanning)

### 3. Using the App

1. **Open the Device Discovery Screen**
   - Navigate to the device discovery screen in the app

2. **Scan for Devices**
   - Tap "Scan for Devices" to start scanning
   - The scan will run for 10 seconds automatically
   - Your nRF52 device should appear in the list

3. **Connect to Device**
   - Tap on your nRF52 device in the list
   - Confirm the connection when prompted
   - The device will show as "Connected" with a green badge

4. **Send Message**
   - Once connected, a "Send Message" button will appear
   - Tap it to send "Hello World!" to your microcontroller
   - The message will be sent via the UART service

## Technical Details

### BLE Service UUIDs
- **UART Service**: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- **Write Characteristic**: `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
- **Notify Characteristic**: `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`

### Message Format
The app sends text messages as UTF-8 encoded strings through the UART service. Your microcontroller code already handles this format.

### Troubleshooting

1. **Device Not Found**
   - Ensure Bluetooth is enabled on your phone
   - Make sure the microcontroller is powered and advertising
   - Try restarting the scan

2. **Connection Failed**
   - Check that the device is not already connected to another app
   - Ensure the microcontroller code is running correctly
   - Try disconnecting and reconnecting

3. **Message Not Received**
   - Verify the UART service is properly configured
   - Check the microcontroller's serial monitor for debugging
   - Ensure the message format matches what the code expects

## Development Notes

- The app uses `react-native-ble-plx` for Bluetooth communication
- Device scanning is limited to 10 seconds to conserve battery
- The app automatically handles device discovery and connection management
- Error messages are displayed to help with troubleshooting

## Next Steps

To extend the functionality:
1. Add support for receiving messages from the microcontroller
2. Implement LED control commands (V, S, C, B, P, I)
3. Add device configuration and profile management
4. Implement automatic reconnection on app restart
