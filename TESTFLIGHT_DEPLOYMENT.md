# TestFlight Deployment Guide

This guide walks you through the process of building and publishing your app to TestFlight using EAS (Expo Application Services).

## Prerequisites

1. **EAS CLI**: The EAS CLI is used via `npx` (no global installation needed), but you can install it globally for convenience:
   ```bash
   # Option 1: Use npx (recommended, no install needed)
   npm run eas:login
   
   # Option 2: Install globally (optional)
   npm run eas:install
   # or
   npm install -g eas-cli
   ```

2. **EAS Account**: Make sure you're logged in:
   ```bash
   npm run eas:login
   ```

2. **Apple Developer Account**: You need:
   - An active Apple Developer Program membership
   - App Store Connect access
   - Your app registered in App Store Connect

3. **App Store Connect Setup**:
   - Your app must be created in App Store Connect
   - Bundle ID: `com.aatozinnovations.myledguitar` (already configured)
   - You'll need your App Store Connect App ID (ascAppId) for automatic submission

## Initial Setup (One-Time)

### 1. Configure EAS Credentials

EAS can automatically manage your credentials, or you can provide them manually.

**Automatic (Recommended):**
```bash
npx eas-cli build:configure
```

**Note:** If you have EAS CLI installed globally, you can use `eas` directly instead of `npx eas-cli`.

This will guide you through setting up credentials. EAS will:
- Generate certificates and provisioning profiles
- Store them securely
- Automatically renew them when needed

**Manual (if needed):**
If you prefer to use your own certificates, you can configure them in `eas.json` or through the EAS dashboard.

### 2. Provide Apple Credentials (without committing them)

Do **not** commit credentials to `eas.json`. Use one of these approaches when running submit:

**Option A: CLI flags (single use)**
```bash
npx eas-cli submit --platform ios --profile production \
  --apple-id "<appleId>" \
  --asc-app-id "<ascAppId>" \
  --apple-team-id "<teamId>"
```

**Option B: EAS secrets (preferred for CI)**
```bash
eas secret:create --scope project --name APPLE_ID --value "<appleId>"
eas secret:create --scope project --name ASC_APP_ID --value "<ascAppId>"
eas secret:create --scope project --name APPLE_TEAM_ID --value "<teamId>"

npx eas-cli submit --platform ios --profile production \
  --apple-id "$APPLE_ID" \
  --asc-app-id "$ASC_APP_ID" \
  --apple-team-id "$APPLE_TEAM_ID"
```

**Finding your App Store Connect App ID:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. The App ID is in the URL or under "App Information"

**Finding your Apple Team ID:**
1. Go to [Apple Developer](https://developer.apple.com/account)
2. Click on "Membership" in the sidebar
3. Your Team ID is displayed there

### 3. Verify Configuration

Check your EAS project:
```bash
npx eas-cli project:info
```

## Build and Deploy Process

### Quick Start (Automated)

Use the provided script for the easiest experience:

```bash
npm run build:testflight
```

This script will:
1. Check EAS CLI installation
2. Verify you're logged in
3. Auto-increment build number
4. Build the iOS app
5. Prompt to submit to TestFlight

### Manual Process

If you prefer to run commands manually:

#### Step 1: Update Build Number (Optional)

The build script does this automatically, but you can manually update `app.json`:

```json
"ios": {
  "buildNumber": "1"  // Increment this for each build
}
```

#### Step 2: Build the App

```bash
# Production build for TestFlight (recommended)
npm run eas:build:ios

# Or with the full command:
npx eas-cli build --platform ios --profile production
```

**Build Options:**
- `--profile production`: Uses the production profile (for TestFlight/App Store)
- `--profile preview`: Internal distribution build (standalone app, no dev client required)
- `--profile development`: Development build with dev client (requires `expo dev start`)

**Quick Internal Build:**
```bash
npm run build:internal
```
This builds a standalone app for internal testing without requiring a dev server.

The build will run on EAS servers and typically takes 15-30 minutes.

#### Step 3: Monitor Build Progress

```bash
# List all builds
npx eas-cli build:list

# View specific build details
npx eas-cli build:view [BUILD_ID]
```

You can also monitor progress in the EAS dashboard: https://expo.dev/accounts/[your-account]/projects/[your-project]/builds

#### Step 4: Submit to TestFlight

Once the build completes successfully:

```bash
npm run eas:submit

# Or:
npx eas-cli submit --platform ios --profile production
```

**First Time Submission:**
- EAS will ask for your Apple ID credentials
- You may need to provide an app-specific password (if 2FA is enabled)
- EAS will handle the upload to App Store Connect

#### Step 5: Process in App Store Connect

After submission:

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app → TestFlight tab
3. Wait for processing (usually 10-30 minutes)
4. Once processed, you can:
   - Add testers
   - Create test groups
   - Submit for Beta App Review (if needed)

## Build Script Options

The `build-testflight.sh` script supports several options:

```bash
# Build only, don't submit
npm run build:testflight:no-submit
# or
./scripts/build-testflight.sh --no-submit

# Use a different build profile
./scripts/build-testflight.sh --profile preview

# Skip auto-incrementing build number
./scripts/build-testflight.sh --skip-build-number

# Show help
./scripts/build-testflight.sh --help
```

## Common Workflows

### First Time Setup
```bash
# 1. Login to EAS
npm run eas:login

# 2. Configure credentials (one-time)
npx eas-cli build:configure

# 3. Build and submit
npm run build:testflight
```

### Regular Updates
```bash
# Just run the script - it handles everything
npm run build:testflight
```

### Build Only (No Submission)
```bash
# Build but don't submit (useful for testing)
npm run build:testflight:no-submit

# Submit later when ready
npm run eas:submit
```

### Preview Build (Internal Testing)
```bash
# Build for internal distribution (standalone app, no dev client required)
npm run build:internal
# or
npm run eas:build:ios:internal
# or
./scripts/build-testflight.sh --internal
```

**Note:** The `preview` profile creates a standalone app that can be installed via:
- TestFlight (if submitted)
- Ad-hoc distribution (via QR code or direct link)
- Internal testing

This is different from the `development` profile which requires `expo dev start` to run.

## Troubleshooting

### Build Fails

1. **Check build logs:**
   ```bash
   npx eas-cli build:view [BUILD_ID]
   ```

2. **Common issues:**
   - **Credentials expired**: Run `npx eas-cli build:configure` again
   - **Missing dependencies**: Check `package.json` and ensure all dependencies are listed
   - **Code signing issues**: EAS usually handles this, but check App Store Connect

### Submission Fails

1. **Authentication issues:**
   - Ensure your Apple ID has App Store Connect access
   - Use an app-specific password if 2FA is enabled
   - Check that your Team ID is correct

2. **App Store Connect issues:**
   - Verify the app exists in App Store Connect
   - Check that the bundle ID matches
   - Ensure you have the correct permissions

### Build Number Conflicts

If you get a build number conflict:
1. Check current build number in App Store Connect
2. Update `app.json` with a higher build number
3. Rebuild

### Viewing Build Status

```bash
# List recent builds
npx eas-cli build:list

# View specific build
npx eas-cli build:view [BUILD_ID]

# View in browser (requires jq)
npx eas-cli build:list --json | jq '.[0].url'
```

## Best Practices

1. **Version Management:**
   - Update version in `app.json` for major releases
   - Build number increments automatically with the script
   - Follow semantic versioning (e.g., 1.0.0 → 1.0.1)

2. **Testing Before Submission:**
   - Test preview builds internally first
   - Use `--no-submit` to build and test locally before submitting

3. **Build Profiles:**
   - `production`: For TestFlight and App Store
   - `preview`: For internal testing
   - `development`: For development with dev client

4. **Credentials:**
   - Let EAS manage credentials automatically (recommended)
   - Credentials are stored securely and auto-renewed

5. **Monitoring:**
   - Set up email notifications in EAS dashboard
   - Check App Store Connect regularly for processing status

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)

## Quick Reference

```bash
# Login
npm run eas:login

# Build for TestFlight
npm run build:testflight

# Build only (no submit)
npm run build:testflight:no-submit

# Submit existing build
npm run eas:submit

# Check who you're logged in as
npm run eas:whoami

# List builds
npx eas-cli build:list

# View build details
npx eas-cli build:view [BUILD_ID]
```

## Notes

- Builds typically take 15-30 minutes
- TestFlight processing takes 10-30 minutes after submission
- You can have multiple builds in progress
- Builds are stored in EAS for 30 days (free tier) or longer (paid tier)
- Each build consumes one build slot (check your EAS plan limits)
