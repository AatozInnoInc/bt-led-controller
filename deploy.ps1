# BT LED Guitar Dashboard Deployment Script

param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly
)

Write-Host "🎸 BT LED Guitar Dashboard Deployment Script" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if Firebase CLI is installed
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in to Firebase
try {
    $firebaseUser = firebase projects:list 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Not logged in to Firebase. Please run 'firebase login' first." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Logged in to Firebase" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase authentication failed. Please run 'firebase login' first." -ForegroundColor Red
    exit 1
}

# Deploy Frontend (Blazor PWA)
if (-not $BackendOnly) {
    Write-Host "`n🚀 Deploying Frontend (Blazor PWA)..." -ForegroundColor Cyan
    
    # Build the Blazor app
    Write-Host "📦 Building Blazor application..." -ForegroundColor Yellow
    dotnet build --configuration Release
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    
    # Publish the app
    Write-Host "📤 Publishing application..." -ForegroundColor Yellow
    dotnet publish --configuration Release --output ./publish
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Publish failed!" -ForegroundColor Red
        exit 1
    }
    
    # Deploy to Firebase Hosting
    Write-Host "🌐 Deploying to Firebase Hosting..." -ForegroundColor Yellow
    firebase deploy --only hosting
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend deployment failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
}

# Deploy Backend (Python API)
if (-not $FrontendOnly) {
    Write-Host "`n🐍 Deploying Backend (Python API)..." -ForegroundColor Cyan
    
    # Check if backend directory exists
    if (-not (Test-Path "./backend")) {
        Write-Host "❌ Backend directory not found!" -ForegroundColor Red
        exit 1
    }
    
    # Navigate to backend directory
    Push-Location "./backend"
    
    # Deploy to Firebase Functions
    Write-Host "🔧 Deploying to Firebase Functions..." -ForegroundColor Yellow
    firebase deploy --only functions
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
}

Write-Host "`n🎉 Your BT LED Guitar Dashboard PWA is now live!" -ForegroundColor Green
Write-Host "Frontend: https://bt-led-guitar-dashboard.web.app" -ForegroundColor Cyan
Write-Host "Backend: https://bt-led-guitar-dashboard-api.web.app" -ForegroundColor Cyan
Write-Host "`nHappy coding! 🎸" -ForegroundColor Green 