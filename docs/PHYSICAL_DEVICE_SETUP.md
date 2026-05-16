# Setting Up Your App on Physical iPhone Device

## Prerequisites

1. **Apple ID** (free account is sufficient for development)
2. **iPhone 12 Pro** connected via USB cable
3. **Xcode** (already installed)
4. **Trusted computer** - Your iPhone must trust your Mac

## Step-by-Step Setup

### 1. Connect Your iPhone
1. **Connect your iPhone 12 Pro** to your Mac via USB cable
2. **Trust this computer** when prompted on your iPhone
3. **Unlock your iPhone** and keep it unlocked during setup

### 2. Open Xcode Project
```bash
open ios/MyLedGuitarApp.xcworkspace
```

### 3. Configure Code Signing

#### Option A: Using Your Apple ID (Recommended for Development)

1. **In Xcode**, select your project in the navigator (top-left)
2. **Select the "MyLedGuitarApp" target**
3. **Go to "Signing & Capabilities" tab**
4. **Check "Automatically manage signing"**
5. **Select your Team** (your Apple ID)
6. **Bundle Identifier** should be unique (e.g., `com.yourname.myledguitar`)

#### Option B: Using Apple Developer Account (If you have one)

1. **Follow the same steps as Option A**
2. **Select your paid Apple Developer Team** instead of personal team

### 4. Select Your Device

1. **In Xcode toolbar**, click the device selector (next to play button)
2. **Select your iPhone 12 Pro** from the list
3. **Make sure it shows your device name**, not "Any iOS Device"

### 5. Build and Run

1. **Click the Play button** (▶️) in Xcode
2. **Wait for the build** to complete
3. **On your iPhone**, you may see a "Untrusted Developer" message
4. **Go to Settings → General → VPN & Device Management**
5. **Tap your Apple ID** and select "Trust"

### 6. Start Metro Bundler

In your terminal, start the development server:
```bash
/opt/homebrew/bin/node ./node_modules/.bin/expo start
```

## Troubleshooting

### If you get "No code signing certificates" error:

1. **Make sure you're signed into Xcode** with your Apple ID:
   - Xcode → Preferences → Accounts
   - Click "+" and add your Apple ID
   - Select your Apple ID and click "Manage Certificates"
   - Click "+" to create a new certificate

### If your device doesn't appear in Xcode:

1. **Check USB connection** - try a different cable
2. **Restart Xcode** and reconnect your device
3. **On your iPhone**: Settings → General → Reset → Reset Location & Privacy
4. **Trust the computer again** when prompted

### If you get "Untrusted Developer" error:

1. **On your iPhone**: Settings → General → VPN & Device Management
2. **Find your Apple ID** in the list
3. **Tap it and select "Trust"**
4. **Enter your passcode** to confirm

### If the app doesn't connect to Metro:

1. **Make sure Metro is running** in your terminal
2. **Check your iPhone's IP address** - it should be on the same network as your Mac
3. **Try shaking your device** to open the developer menu
4. **Select "Settings"** and update the server IP if needed

## Development Workflow

### Daily Development:
1. **Connect your iPhone** via USB
2. **Start Metro bundler**: `/opt/homebrew/bin/node ./node_modules/.bin/expo start`
3. **Build and run** in Xcode (or use `Cmd+R` in the app)
4. **Make code changes** - they'll automatically reload on your device

### Hot Reloading:
- **Shake your device** to open developer menu
- **Select "Reload"** to refresh the app
- **Or just save your files** - they should auto-reload

## Benefits of Physical Device Testing

- ✅ **Real Bluetooth functionality** - Test actual BLE connections
- ✅ **Real performance** - See how your app performs on actual hardware
- ✅ **Real user experience** - Test touch interactions, haptics, etc.
- ✅ **Debug native code** - Full debugging capabilities in Xcode

## Notes

- **Free Apple ID works** for development (7-day certificate)
- **App will expire** after 7 days if using free account - just rebuild
- **No App Store submission** required for development
- **Can test all features** including Bluetooth, camera, etc.

## Commands Reference

```bash
# Start Metro bundler
/opt/homebrew/bin/node ./node_modules/.bin/expo start

# Open Xcode project
open ios/MyLedGuitarApp.xcworkspace

# Clean build if needed
/opt/homebrew/bin/npx expo prebuild --clean
cd ios && pod install && cd ..
```
