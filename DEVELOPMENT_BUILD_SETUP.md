# Development Build Setup Guide

Since `react-native-ble-plx` is a native module, it requires a development build to work on iOS. Expo Go doesn't support native modules.

## Prerequisites

1. **Expo Account**: You need an Expo account to use EAS Build
2. **Apple Developer Account**: For iOS builds (optional for development builds)
3. **EAS CLI**: Already installed in this project

## Step 1: Create Expo Account

1. Go to [expo.dev](https://expo.dev) and create an account
2. Or run: `npx eas-cli@latest login`

## Step 2: Build Development Version

### Option A: iOS Development Build (Recommended)

```bash
# Build for iOS
npx eas build --platform ios --profile development
```

This will:
- Create a development build in the cloud
- Provide a link to download the .ipa file
- Allow you to install it on your iOS device

### Option B: Android Development Build

```bash
# Build for Android
npx eas build --platform android --profile development
```

## Step 3: Install Development Build

### iOS:
1. Download the .ipa file from the build link
2. Install using one of these methods:
   - **TestFlight**: Upload to App Store Connect and use TestFlight
   - **Sideloading**: Use tools like AltStore or 3uTools
   - **Xcode**: Install directly through Xcode if you have a Mac

### Android:
1. Download the .apk file from the build link
2. Enable "Install from Unknown Sources" in your device settings
3. Install the .apk file

## Step 4: Test Bluetooth Functionality

1. Install the development build on your device
2. Open the app and navigate to Device Discovery
3. Grant Bluetooth permissions when prompted
4. Test the device scanning and connection

## Alternative: Local Development

If you have a Mac, you can also build locally:

```bash
# Install Expo CLI
npm install -g @expo/cli

# Run prebuild to generate native code
npx expo prebuild

# Open in Xcode
npx expo run:ios
```

## Troubleshooting

### Build Fails
- Check that your Expo account is properly set up
- Ensure you have the latest EAS CLI: `npm install -g @expo/cli`
- Check the build logs for specific errors

### Bluetooth Not Working
- Ensure you're using the development build, not Expo Go
- Check that Bluetooth permissions are granted
- Verify your nRF52 device is advertising

### Installation Issues
- For iOS: Make sure you have a valid Apple Developer account
- For Android: Enable developer options and USB debugging

## Next Steps

Once you have the development build working:
1. Test device discovery
2. Test device connection
3. Test message sending
4. Implement additional LED control features

## Cost Notes

- EAS Build has a free tier with limited builds per month
- iOS builds require an Apple Developer account ($99/year)
- Android builds are free
- Development builds count towards your monthly quota
