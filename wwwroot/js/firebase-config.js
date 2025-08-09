// Firebase Configuration - Secure Version
// This file loads Firebase configuration from a separate config file that should be excluded from Git

let firebaseConfig = null;

// Function to load configuration from a separate config file
async function loadFirebaseConfig() {
    try {
        // Check if secret config is available (loaded from firebase-config-secret.js)
        if (window.firebaseConfigSecret) {
            firebaseConfig = window.firebaseConfigSecret;
            console.log('Using secret Firebase configuration');
        } else {
            // Use the default (public) config - this should be replaced with your actual config
            firebaseConfig = {
                apiKey: "YOUR_API_KEY_HERE",
                authDomain: "bt-led-guitar-dashboard.firebaseapp.com",
                projectId: "bt-led-guitar-dashboard",
                storageBucket: "bt-led-guitar-dashboard.firebasestorage.app",
                messagingSenderId: "735826062364",
                appId: "1:735826062364:web:4c40aa3100bc265d0dc3d9"
            };
            console.log('Using default Firebase configuration');
        }
    } catch (error) {
        console.error('Error loading Firebase config:', error);
        // Use default config as fallback
        firebaseConfig = {
            apiKey: "YOUR_API_KEY_HERE",
            authDomain: "bt-led-guitar-dashboard.firebaseapp.com",
            projectId: "bt-led-guitar-dashboard",
            storageBucket: "bt-led-guitar-dashboard.firebasestorage.app",
            messagingSenderId: "735826062364",
            appId: "1:735826062364:web:4c40aa3100bc265d0dc3d9"
        };
    }
}

// Initialize Firebase with secure configuration
async function initializeFirebase() {
    await loadFirebaseConfig();
    
    if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
        console.error('Firebase configuration not found. Please ensure firebase-config-secret.js is properly configured.');
        return false;
    }
    
    try {
        firebase.initializeApp(firebaseConfig);
        window.firebaseInitialized = true;
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return false;
    }
}

// Export for use in other scripts
window.initializeFirebase = initializeFirebase; 