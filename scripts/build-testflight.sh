#!/bin/bash

# TestFlight Build and Submit Script
# This script automates the process of building and submitting to TestFlight

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="MyLedGuitarApp"
BUILD_PROFILE="production"
SUBMIT_TO_TESTFLIGHT=true
EAS_CMD="npx eas-cli"  # Default to npx, will be updated by check_eas_cli

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if EAS CLI is installed
check_eas_cli() {
    # Try to use npx first (works without global install)
    if command -v eas &> /dev/null; then
        EAS_CMD="eas"
        print_success "EAS CLI is installed globally"
    elif command -v npx &> /dev/null; then
        EAS_CMD="npx eas-cli"
        print_info "Using EAS CLI via npx (no global install needed)"
    else
        print_error "Neither 'eas' nor 'npx' is available. Please install Node.js/npm."
        exit 1
    fi
}

# Check if logged in to EAS
check_eas_login() {
    if ! $EAS_CMD whoami &> /dev/null; then
        print_warning "Not logged in to EAS. Please log in..."
        $EAS_CMD login
    else
        print_success "Logged in to EAS"
        $EAS_CMD whoami
    fi
}

# Update build number
update_build_number() {
    print_info "Checking current build number..."
    
    # Read current build number from app.json
    CURRENT_BUILD=$(grep -o '"buildNumber": "[^"]*"' app.json | cut -d'"' -f4)
    
    if [ -z "$CURRENT_BUILD" ]; then
        print_warning "Could not find buildNumber in app.json, starting at 1"
        NEW_BUILD=1
    else
        print_info "Current build number: $CURRENT_BUILD"
        NEW_BUILD=$((CURRENT_BUILD + 1))
    fi
    
    print_info "Updating build number to: $NEW_BUILD"
    
    # Update app.json (works on both macOS and Linux)
    # Note: Expo/EAS will automatically set CFBundleVersion in Info.plist from this value
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"buildNumber\": \"[^\"]*\"/\"buildNumber\": \"$NEW_BUILD\"/" app.json
    else
        # Linux
        sed -i "s/\"buildNumber\": \"[^\"]*\"/\"buildNumber\": \"$NEW_BUILD\"/" app.json
    fi
    
    print_success "Build number updated to $NEW_BUILD (Expo will set CFBundleVersion automatically)"
}

# Build the app
build_app() {
    print_header "Building iOS App for TestFlight"
    
    print_info "Starting EAS build with profile: $BUILD_PROFILE"
    print_info "This may take 15-30 minutes..."
    
    if $EAS_CMD build --platform ios --profile $BUILD_PROFILE --non-interactive; then
        print_success "Build completed successfully!"
        return 0
    else
        print_error "Build failed!"
        return 1
    fi
}

# Submit to TestFlight
submit_to_testflight() {
    print_header "Submitting to TestFlight"
    
    print_info "Submitting latest build to App Store Connect..."
    
    if $EAS_CMD submit --platform ios --profile production --non-interactive; then
        print_success "Successfully submitted to TestFlight!"
        print_info "You can check the status in App Store Connect"
        print_info "https://appstoreconnect.apple.com"
    else
        print_error "Submission failed!"
        return 1
    fi
}

# Main execution
main() {
    print_header "TestFlight Build & Submit Script"
    print_info "App: $APP_NAME"
    print_info "Profile: $BUILD_PROFILE"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-submit)
                SUBMIT_TO_TESTFLIGHT=false
                shift
                ;;
            --profile)
                BUILD_PROFILE="$2"
                shift 2
                ;;
            --internal)
                BUILD_PROFILE="preview"
                SUBMIT_TO_TESTFLIGHT=false
                print_info "Using preview profile for internal distribution (no dev client required)"
                shift
                ;;
            --skip-build-number)
                SKIP_BUILD_NUMBER=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --no-submit          Build only, don't submit to TestFlight"
                echo "  --profile PROFILE     Use specific build profile (default: production)"
                echo "                        Options: production (TestFlight), preview (internal), development (dev client)"
                echo "  --internal           Shortcut for --profile preview --no-submit (internal distribution)"
                echo "  --skip-build-number   Don't auto-increment build number"
                echo "  --help                Show this help message"
                echo ""
                echo "Build Profiles:"
                echo "  production  - App Store/TestFlight build (requires submission)"
                echo "  preview     - Internal distribution build (standalone, no dev client)"
                echo "  development - Development client build (requires expo dev start)"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Pre-flight checks
    check_eas_cli
    check_eas_login
    
    # Update build number (unless skipped)
    if [ "$SKIP_BUILD_NUMBER" != true ]; then
        update_build_number
    fi
    
    # Build the app
    if build_app; then
        print_success "Build process completed!"
        
        # Submit to TestFlight if requested
        if [ "$SUBMIT_TO_TESTFLIGHT" = true ]; then
            echo ""
            read -p "Do you want to submit this build to TestFlight? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                submit_to_testflight
            else
                print_info "Skipping TestFlight submission"
                print_info "You can submit later with: npm run eas:submit"
            fi
        else
            print_info "Skipping TestFlight submission (--no-submit flag used)"
            print_info "You can submit later with: npm run eas:submit"
        fi
        
        print_header "All Done!"
        print_success "Your build is ready!"
        print_info "Check build status: $EAS_CMD build:list"
        print_info "View in App Store Connect: https://appstoreconnect.apple.com"
    else
        print_error "Build failed. Please check the error messages above."
        exit 1
    fi
}

# Run main function
main "$@"
