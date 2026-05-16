# Local Development Build Setup for iOS (macOS)

This guide will help you create a local development build for iOS testing without using EAS Build.

## ✅ Completed Steps

1. ✅ **Project prebuild completed** - Native iOS project generated
2. ✅ **CocoaPods installed** - Dependencies resolved automatically
3. ✅ **Xcode project opened** - Ready for building
4. ✅ **Metro bundler started** - Development server running

## Current Status

Your project is now ready for iOS development! Here's what's been set up:

- **iOS Project**: `ios/MyLedGuitarApp.xcworkspace` (opened in Xcode)
- **Metro Bundler**: Running on background (development server)
- **Dependencies**: All native dependencies including `react-native-linear-gradient` are properly linked

## Next Steps in Xcode

### 1. Select Target Device
1. In Xcode, look at the top toolbar
2. Click on the device selector (next to the play/stop buttons)
3. Choose an iOS Simulator (e.g., "iPhone 16 Pro")
4. Make sure it shows "iOS Simulator" not "Any iOS Device"

### 2. Build and Run
1. Click the **Play button** (▶️) in Xcode
2. Wait for the build to complete
3. The simulator will launch automatically
4. Your app should appear and connect to the Metro bundler

### 3. Development Workflow
- **Make code changes** in your React Native files
- **Save the files** - changes will automatically reload in the simulator
- **Use Cmd+R** in the simulator to manually reload if needed
- **Use Cmd+D** in the simulator to open the developer menu

## Troubleshooting

### If the app doesn't load:
1. **Check Metro bundler**: Make sure it's running in your terminal
2. **Restart Metro**: Press `r` in the terminal where Metro is running
3. **Clear cache**: Press `c` in the Metro terminal
4. **Reset simulator**: Simulator → Device → Erase All Content and Settings

### If you get build errors:
1. **Clean build**: In Xcode, Product → Clean Build Folder
2. **Delete derived data**: Xcode → Preferences → Locations → Derived Data → Delete
3. **Restart Xcode** and try again

### If react-native-linear-gradient has issues:
1. **Clean and rebuild**:
   ```bash
   /opt/homebrew/bin/npx expo prebuild --clean
   cd ios && pod install && cd ..
   ```
2. **Check iOS deployment target** in Xcode (should be 13.0+)

## Environment Setup Notes

- **Node.js**: Using `/opt/homebrew/bin/node` (v22.10.0)
- **npm**: Using `/opt/homebrew/bin/npm` (v10.9.0)
- **Expo CLI**: Installed locally in project
- **CocoaPods**: Installed automatically during prebuild

## Commands Reference

```bash
# Start Metro bundler
/opt/homebrew/bin/npx expo start

# Clean and rebuild project
/opt/homebrew/bin/npx expo prebuild --clean

# Install iOS dependencies
cd ios && pod install && cd ..

# Open Xcode project
open ios/MyLedGuitarApp.xcworkspace
```

## Benefits of This Setup

- ✅ **No EAS Build required** - Everything runs locally
- ✅ **Native dependencies work** - Including react-native-linear-gradient
- ✅ **Fast development** - Hot reloading works
- ✅ **Full debugging** - Can debug native code in Xcode
- ✅ **No code signing issues** - Simulator doesn't require certificates

## Testing on Physical Device (Optional)

If you want to test on a real iPhone later:

1. **Connect iPhone via USB**
2. **Trust the computer** on your iPhone
3. **In Xcode**: Select your iPhone as the target device
4. **Sign the app**: Use your Apple Developer account or create a free one
5. **Build and run**: Click the play button

## Notes

- This approach completely avoids EAS Build
- All native dependencies are handled locally
- You can debug native code directly in Xcode
- Hot reloading works as expected
- No need for Expo Go app
