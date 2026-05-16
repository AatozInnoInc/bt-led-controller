# Web Bluetooth Testing Guide

This guide explains how to test the Bluetooth functionality in your web browser using the Web Bluetooth API.

## Browser Requirements

### Supported Browsers
- **Chrome** (version 56+) - Best support
- **Edge** (Chromium-based, version 79+)
- **Opera** (Chromium-based)
- **Brave** (Chromium-based)

### Not Supported
- **Firefox** - No Web Bluetooth support
- **Safari** - No Web Bluetooth support
- **Internet Explorer** - No Web Bluetooth support

## Testing Setup

### 1. Enable Web Bluetooth (if needed)

In Chrome, navigate to `chrome://flags/` and search for "Web Bluetooth":
- Set "Web Bluetooth" to "Enabled"
- Restart Chrome

### 2. HTTPS Requirement

Web Bluetooth only works on secure connections:
- **Localhost** is considered secure for development
- **HTTPS** is required for production
- **HTTP** will not work

### 3. User Gesture Requirement

Bluetooth operations must be triggered by a user action:
- Click/tap events
- Cannot be called from page load or background scripts

## How to Test

### 1. Start the Development Server

```bash
npm start
# Press 'w' to open in web browser
```

### 2. Check Browser Support

The app will automatically detect if Web Bluetooth is supported:
- Look for the blue "🌐 Web Platform" banner at the top
- It will show "Bluetooth Supported" or "Bluetooth Not Supported"

### 3. Test Device Discovery

1. **Click "Scan for Devices"**
   - Browser will show a device selection dialog
   - Select your nRF52 device from the list
   - The device should appear in the app

2. **Expected Behavior**
   - Browser permission dialog appears
   - Device selection dialog shows available BLE devices
   - Selected device appears in the app list

### 4. Test Device Connection

1. **Click on your device** in the list
2. **Confirm connection** when prompted
3. **Check for success** - device should show "Connected" badge

### 5. Test Message Sending

1. **Ensure device is connected** (green badge visible)
2. **Click "Send Message"** button
3. **Check for success** - should show "Message Sent!" alert

## Troubleshooting

### "Web Bluetooth is not supported"

**Solution**: Use a supported browser (Chrome, Edge, Opera, Brave)

### "Failed to scan for devices"

**Possible causes**:
- Bluetooth is disabled on your computer
- No BLE devices are advertising
- Device is already connected to another app

**Solutions**:
1. Enable Bluetooth on your computer
2. Ensure your nRF52 device is powered and advertising
3. Disconnect from other Bluetooth apps

### "Failed to connect to device"

**Possible causes**:
- Device is already connected elsewhere
- Device is out of range
- Device doesn't have the required UART service

**Solutions**:
1. Disconnect from other apps
2. Move device closer
3. Check that your Arduino code is running correctly

### "Failed to send message"

**Possible causes**:
- Device disconnected
- UART service not found
- Write characteristic not available

**Solutions**:
1. Reconnect to the device
2. Verify your Arduino code has the UART service
3. Check the browser console for detailed errors

## Browser Console Debugging

Open Developer Tools (F12) and check the Console tab for detailed error messages:

```javascript
// Example error messages you might see:
"Failed to scan for devices: User cancelled the requestDevice() chooser."
"Failed to connect to device: GATT operation failed for unknown reason."
"Failed to send message: Characteristic not found."
```

## Limitations of Web Bluetooth

### What Works
- ✅ Device discovery (one at a time)
- ✅ Device connection
- ✅ Reading/writing characteristics
- ✅ Service discovery

### What Doesn't Work
- ❌ Continuous scanning
- ❌ Background connections
- ❌ RSSI values
- ❌ Manufacturer data
- ❌ Multiple simultaneous connections

## Testing Your nRF52 Device

### 1. Upload Arduino Code
Make sure your nRF52 has the provided Arduino code uploaded and running.

### 2. Verify Device Advertising
Your device should advertise as "Bluefruit Feather52" or similar.

### 3. Check Serial Monitor
Open Arduino IDE Serial Monitor to see if the device receives messages:
- Baud rate: 115200
- You should see "Hello World!" when messages are sent

## Alternative Testing Methods

### 1. Chrome DevTools
You can also test Web Bluetooth directly in Chrome DevTools:
1. Open DevTools (F12)
2. Go to Console tab
3. Run: `navigator.bluetooth.requestDevice({acceptAllDevices: true})`

### 2. Web Bluetooth Samples
Visit [Google's Web Bluetooth samples](https://googlechrome.github.io/samples/web-bluetooth/) for more examples.

## Next Steps

Once web testing is working:
1. Test with your actual nRF52 device
2. Verify message sending works
3. Implement additional LED control commands
4. Move to mobile development build for full functionality

## Security Notes

- Web Bluetooth requires user permission for each operation
- Only works on secure connections (HTTPS/localhost)
- Cannot access all Bluetooth features like native apps
- Permissions are temporary and reset when page is closed
