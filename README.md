# 🎸 BT LED Guitar Dashboard PWA

A modern Progressive Web App (PWA) built with Blazor WebAssembly for controlling guitar LED systems.

## 📁 Project Structure

```
bt-led-guitar-dashboard/
├── Pages/                    # Blazor pages
│   ├── Home.razor           # Landing page
│   ├── Login.razor          # Authentication page
│   ├── AddListing.razor     # Configuration management
│   ├── PrivacyPolicy.razor  # Privacy policy
│   └── TermsOfService.razor # Terms of service
├── Shared/                  # Shared components
│   ├── NavMenu.razor        # Navigation menu
│   ├── AppFooter.razor      # Footer component
│   └── AuthLayout.razor     # Authenticated layout
├── Services/                # Service classes
│   ├── FirebaseService.cs   # Firebase integration
│   └── FirebaseAuthService.cs # Authentication service
├── wwwroot/                 # Static assets
│   ├── css/                 # Stylesheets
│   ├── js/                  # JavaScript files
│   └── images/              # Images and icons
└── bt-led-guitar-dashboard.csproj       # .NET project file
```

## 🚀 Getting Started

### Prerequisites

- .NET 8.0 SDK
- Node.js (for package management)
- Firebase project (for authentication and database)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bt-led-guitar-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Create a Firebase project
   - Enable Authentication (Google sign-in)
   - Enable Firestore Database
   - Update `wwwroot/index.html` with your Firebase config

4. Run the application:
```bash
dotnet run
```

5. Open your browser and navigate to `https://localhost:5001`

## 🔧 Configuration

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication with Google sign-in
4. Enable Firestore Database
5. Update the Firebase configuration in `wwwroot/index.html`:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.firebasestorage.app",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

## 🎨 Features

- **LED Configuration Management**: Create and manage guitar LED configurations
- **Real-time Control**: Control your guitar's LED system in real-time
- **Mobile Responsive**: Works seamlessly on all devices
- **Offline Support**: PWA features for offline functionality
- **Secure Authentication**: Google sign-in integration
- **Cloud Sync**: All configurations stored securely in the cloud

## 🛠️ Development

### Project Structure

- **Blazor WebAssembly**: Frontend framework
- **Firebase**: Backend services (Auth, Firestore)
- **PWA**: Progressive Web App features
- **Bootstrap**: UI framework

### Key Files

- `Program.cs`: Application entry point
- `App.razor`: Root component
- `wwwroot/index.html`: Main HTML file
- `wwwroot/manifest.webmanifest`: PWA manifest
- `Services/FirebaseService.cs`: Firebase integration

## 📦 Deployment

### Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase:
```bash
firebase use bt-led-guitar-dashboard
```

4. Build and deploy:
```bash
dotnet publish -c Release
firebase deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions, please:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

---

**Note**: This is a PWA, so users can install it on their devices for a native app-like experience. 