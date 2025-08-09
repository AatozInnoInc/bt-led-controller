# 🔥 Firebase Configuration Setup

This project uses a secure approach to handle Firebase configuration to avoid exposing sensitive API keys in the public repository.

## 🛡️ Security Approach

The Firebase configuration is split into two parts:
1. **Public configuration** - Stored in `wwwroot/js/firebase-config.js` (safe for public repos)
2. **Secret configuration** - Stored in `wwwroot/js/firebase-config-secret.js` (excluded from Git)

## 🚀 Quick Setup

### Step 1: Create Secret Configuration File

1. Copy the template file:
   ```bash
   cp wwwroot/js/firebase-config-secret.js.template wwwroot/js/firebase-config-secret.js
   ```

2. Edit `wwwroot/js/firebase-config-secret.js` and replace the placeholder values with your actual Firebase configuration:

   ```javascript
   // Firebase Configuration - Secret Version
   // DO NOT commit this file to Git!
   
   window.firebaseConfigSecret = {
       apiKey: "YOUR_ACTUAL_API_KEY_HERE",
       authDomain: "bt-led-guitar-dashboard.firebaseapp.com",
       projectId: "bt-led-guitar-dashboard",
       storageBucket: "bt-led-guitar-dashboard.firebasestorage.app",
       messagingSenderId: "735826062364",
       appId: "1:735826062364:web:4c40aa3100bc265d0dc3d9"
   };
   ```

### Step 2: Verify .gitignore

Ensure the following lines are in your `.gitignore` file:

```gitignore
# Firebase secret configuration files
wwwroot/js/firebase-config-secret.js
*.secret.js
*.secret.json
```

### Step 3: Test Configuration

1. Start the application:
   ```bash
   dotnet run
   ```

2. Open the browser console and check for:
   - "Using secret Firebase configuration" (if secret file exists)
   - "Using default Firebase configuration" (if secret file doesn't exist)
   - "Firebase initialized successfully"

## 🔧 Configuration Details

### File Structure

```
wwwroot/js/
├── firebase-config.js              # Main configuration loader (public)
├── firebase-config-secret.js       # Secret configuration (local only)
└── firebase-config-secret.js.template  # Template file (public)
```

### How It Works

1. **firebase-config.js** - Main configuration loader that:
   - Checks for `window.firebaseConfigSecret` (from secret file)
   - Falls back to default configuration if secret file doesn't exist
   - Initializes Firebase with the available configuration

2. **firebase-config-secret.js** - Contains your actual Firebase credentials:
   - Created locally from the template
   - Excluded from Git tracking
   - Contains the real API keys and configuration

3. **index.html** - Loads both files:
   - Loads the main configuration loader first
   - Attempts to load the secret configuration (fails gracefully if not found)
   - Initializes Firebase when the page loads

## 🚨 Security Notes

- ✅ **DO** commit `firebase-config-secret.js.template` to Git
- ✅ **DO** commit `firebase-config.js` to Git
- ❌ **DON'T** commit `firebase-config-secret.js` to Git
- ❌ **DON'T** commit any files with `.secret.js` or `.secret.json` extensions

## 🔄 Updating Configuration

If you need to update your Firebase configuration:

1. Update `wwwroot/js/firebase-config-secret.js` with your new values
2. Test the application to ensure it works
3. The changes will be automatically picked up on the next page load

## 🆘 Troubleshooting

### "Firebase configuration not found" Error

This means the secret configuration file doesn't exist or is malformed:

1. Check if `wwwroot/js/firebase-config-secret.js` exists
2. Verify the file contains valid JavaScript
3. Ensure the `window.firebaseConfigSecret` object is properly defined

### "Using default Firebase configuration" Message

This is normal if you haven't created the secret configuration file yet. The application will still work with the default configuration.

### Firebase Initialization Fails

1. Check the browser console for specific error messages
2. Verify your Firebase project is properly configured
3. Ensure all required Firebase services are enabled in your Firebase console

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules) 