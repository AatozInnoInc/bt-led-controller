#ifndef DEVICE_CONFIG_H
#define DEVICE_CONFIG_H

// ========================================
// LED GUITAR CONTROLLER CONFIGURATION
// ========================================
// Modify these settings for your specific guitar setup

// Device Identification
#define DEVICE_NAME "LED_GUITAR_001"  // Change this to a unique name for your guitar
#define MANUFACTURER_NAME "LED_GUITAR_CONTROLLER"

// Hardware Configuration - APA102 (DotStar) LEDs
// Using software SPI with explicit pins for reliable operation
// Hardware SPI (pins 0, 0) was causing issues, so using software SPI
#define DATA_PIN 24                     // Data pin for APA102 (DI)
#define CLOCK_PIN 25                    // Clock pin for APA102 (CI)
#define LED_COUNT 10                    // Number of LEDs in your strip
#define MAX_POWER_MILLIAMPS 500       // Max current draw in milliamps
#define BRIGHTNESS_FACTOR 0.50f       // Brightness factor (0.0-1.0)

// Bluetooth Configuration
#define BLE_TX_POWER 4                // Bluetooth transmission power (0-4)
#define BLE_FAST_INTERVAL 32          // Fast advertising interval (ms)
#define BLE_SLOW_INTERVAL 244         // Slow advertising interval (ms)
#define BLE_FAST_TIMEOUT 30           // Fast mode timeout (seconds)

// LED Patterns Configuration
#define MAX_BRIGHTNESS 255            // Maximum brightness (0-255)
#define DEFAULT_BRIGHTNESS 128        // Default brightness on startup
#define MAX_EFFECTS 10                // Maximum number of effects

// Settings Storage
#define SETTINGS_VERSION 1            // Settings version for migration
#define SETTINGS_MAGIC 0x4C454447     // "LEDG" magic number for settings validation

// ========================================
// DEVICE NAMING CONVENTION
// ========================================
// Use this format for DEVICE_NAME:
// LED_GUITAR_[UNIQUE_IDENTIFIER]
//
// Examples:
// - LED_GUITAR_001
// - LED_GUITAR_MY_GUITAR
// - LED_GUITAR_STRAT_001
// - LED_GUITAR_LES_PAUL
//
// This ensures the React Native app can identify your device!

// ========================================
// ADVANCED CONFIGURATION
// ========================================
// Only modify these if you know what you're doing

// Serial Configuration
#define SERIAL_BAUD_RATE 115200

// LED Pattern Definitions
#define PATTERN_OFF 0
#define PATTERN_SOLID_WHITE 1
#define PATTERN_RAINBOW 2
#define PATTERN_PULSE 3
#define PATTERN_FADE 4
#define PATTERN_CHASE 5
#define PATTERN_TWINKLE 6
#define PATTERN_WAVE 7
#define PATTERN_BREATH 8
#define PATTERN_STROBE 9

// Command Definitions
#define CMD_VERSION 'V'
#define CMD_SET_LED 'S'
#define CMD_CLEAR 'C'
#define CMD_BRIGHTNESS 'B'
#define CMD_PATTERN 'P'
#define CMD_INFO 'I'
#define CMD_SETTINGS_GET 'G'    // Get settings
#define CMD_SETTINGS_SET 'T'    // Set settings
#define CMD_SETTINGS_SAVE 'A'   // Save settings to Flash
#define CMD_SETTINGS_LOAD 'L'   // Load settings from Flash
#define CMD_SETTINGS_RESET 'R'  // Reset settings to defaults
#define CMD_ERROR 'E'           // Error response
#define CMD_SUCCESS 'K'         // Success response
#define CMD_POWER_GET 'W'       // Get power consumption
#define CMD_EFFECTS_GET 'F'     // Get available effects

// Config Mode Commands (binary)
#define CMD_STATUS 0x00           // Status/ping command for connection verification
#define CMD_CONFIG_UPDATE 0x02  // Update config parameter (staged in RAM)
#define CMD_ENTER_CONFIG 0x10    // Enter configuration mode
#define CMD_COMMIT_CONFIG 0x11  // Commit staged config to flash
#define CMD_EXIT_CONFIG 0x12    // Exit configuration mode
#define CMD_CLAIM_DEVICE 0x13    // Claim device ownership (one-time, sets owner)
#define CMD_VERIFY_OWNERSHIP 0x14 // Verify user can access device (per-session)
#define CMD_UNCLAIM_DEVICE 0x15   // Unclaim device ownership (removes owner)
#define CMD_REQUEST_ANALYTICS 0x20 // Request analytics batch from controller
#define CMD_CONFIRM_ANALYTICS 0x21 // Confirm receipt of analytics batch

// Message Types
#define MSG_TYPE_COMMAND 0x01
#define MSG_TYPE_RESPONSE 0x02
#define MSG_TYPE_ERROR 0x03
#define MSG_TYPE_SETTINGS 0x04
#define MSG_TYPE_STATUS 0x05

// Error Codes (must match TypeScript ErrorCode enum in src/types/errors.ts)
#define ERROR_NONE 0x00
#define ERROR_INVALID_COMMAND 0x01
#define ERROR_INVALID_PARAMETER 0x02
#define ERROR_OUT_OF_RANGE 0x03
#define ERROR_NOT_IN_CONFIG_MODE 0x04
#define ERROR_ALREADY_IN_CONFIG_MODE 0x05
#define ERROR_FLASH_WRITE_FAILED 0x06
#define ERROR_VALIDATION_FAILED 0x07
#define ERROR_NOT_OWNER 0x08        // User is not the owner and not a developer/test user
#define ERROR_ALREADY_CLAIMED 0x09   // Device already has an owner
#define ERROR_SETTINGS_CORRUPT 0x10
#define ERROR_FLASH_FAILURE 0x11
#define ERROR_LED_FAILURE 0x12
#define ERROR_MEMORY_LOW 0x13
#define ERROR_POWER_LOW 0x14

// Response Codes
#define RESPONSE_ACK_CONFIG_MODE 0x90  // Acknowledge config mode entry
#define RESPONSE_ACK_COMMIT 0x91       // Acknowledge config commit
#define RESPONSE_ACK_SUCCESS 0x92      // General success acknowledgment
#define RESPONSE_ANALYTICS_BATCH 0xA0  // Analytics batch response

// Ownership Configuration
#define MAX_USER_ID_LENGTH 64  // Maximum length for user ID string

// Settings Structure (for LittleFS persistent storage)
struct DeviceSettings {
  uint32_t magic;              // Magic number for validation
  uint8_t version;             // Settings version
  uint8_t brightness;          // Current brightness (0-255)
  uint8_t currentPattern;      // Current pattern
  uint8_t powerMode;           // Power mode (0=normal, 1=low power, 2=eco)
  uint8_t autoOff;             // Auto-off timeout in minutes (0=disabled)
  uint8_t maxEffects;          // Maximum number of effects
  uint8_t color[3];            // RGB color
  uint8_t speed;               // Animation speed (0-100)
  char ownerUserId[MAX_USER_ID_LENGTH + 1]; // Owner user ID (null-terminated string)
  bool hasOwner;               // True if device has been claimed
  uint8_t reserved[14];        // Reserved for future use (reduced to make room for ownership)
  uint32_t checksum;           // Settings checksum
};

#endif // DEVICE_CONFIG_H
