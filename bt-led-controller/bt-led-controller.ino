/**
 * nRF52 LED Controller Firmware
 * - Uses FastLED
 * - Implements new BLE command protocol (no backwards compatibility)
 * - Matches React Native app commands (tx-config.mmd / config-design.mmd)
 */

#include <Arduino.h>
#include <FastLED.h>
#include <bluefruit.h>
#include <Adafruit_LittleFS.h>
#include <InternalFileSystem.h>
using namespace Adafruit_LittleFS_Namespace;

// --------- LED Configuration ---------
#define LED_DATA_PIN   30          // Feather nRF52832 default; adjust as needed
#define LED_CLOCK_PIN  31          // APA102 clock pin (choose a free GPIO)
#define LED_COUNT      14          // Worst-case number of LEDs on the guitar
#define LED_TYPE       APA102
#define COLOR_ORDER    BGR

// Power constraints
#define BATTERY_VOLTS        3      // 3.3v rail (FastLED uses integer volts)
#define SAFE_CURRENT_MA      400    // 80% of 500mA battery for headroom
#define MAX_LED_CURRENT_MA   60     // per LED at full white/full brightness

// --------- BLE Command Protocol ---------
enum CommandType : uint8_t {
  CMD_ENTER_CONFIG  = 0x10,
  CMD_EXIT_CONFIG   = 0x11,
  CMD_COMMIT_CONFIG = 0x12,
  CMD_UPDATE_PARAM  = 0x02,
  CMD_UPDATE_COLOR  = 0x03,
  CMD_REQUEST_ANALYTICS = 0x20,
  CMD_CONFIRM_ANALYTICS  = 0x21,
  CMD_CLAIM_DEVICE = 0x13,      // Claim device ownership (one-time, sets owner)
  CMD_VERIFY_OWNERSHIP = 0x14,  // Verify user can access device (per-session)
  CMD_UNCLAIM_DEVICE = 0x15,    // Unclaim device ownership (removes owner)
};

enum ResponseType : uint8_t {
  RESP_ACK_SUCCESS = 0x90,
  RESP_ACK_ERROR   = 0x91,
  RESP_ANALYTICS_BATCH = 0xA0, // Analytics batch response
};

enum ParameterId : uint8_t {
  PARAM_BRIGHTNESS      = 0x01,
  PARAM_SPEED           = 0x02,
  PARAM_COLOR_HUE       = 0x03,
  PARAM_COLOR_SATURATION= 0x04,
  PARAM_COLOR_VALUE     = 0x05,
  PARAM_EFFECT_TYPE     = 0x06,
  PARAM_POWER_STATE     = 0x07,
};

enum ErrorCode : uint8_t {
  ERR_INVALID_COMMAND      = 0x01,
  ERR_INVALID_PARAMETER    = 0x02,
  ERR_OUT_OF_RANGE         = 0x03,
  ERR_NOT_IN_CONFIG_MODE   = 0x04,
  ERR_ALREADY_IN_CONFIG    = 0x05,
  ERR_FLASH_WRITE_FAILED   = 0x06,
  ERR_VALIDATION_FAILED    = 0x07,
  ERR_NOT_OWNER            = 0x08,  // User is not the owner and not a developer/test user
  ERR_ALREADY_CLAIMED      = 0x09,  // Device already has an owner
  ERR_UNKNOWN              = 0xFF,
};

// --------- Config Structures ---------
struct HSVColor {
  uint8_t h; // 0-255
  uint8_t s; // 0-255
  uint8_t v; // 0-255
};

struct Config {
  uint8_t brightness; // 0-100
  uint8_t speed;      // 0-100
  HSVColor color;     // HSV (FastLED-friendly)
  uint8_t effectType; // 0-5
  bool powerState;    // on/off
};

// --------- Ownership Structures ---------
#define MAX_USER_ID_LENGTH 64  // Maximum length for user ID string
char ownerUserId[MAX_USER_ID_LENGTH + 1] = {0};  // Owner user ID (null-terminated string)
char verifiedUserId[MAX_USER_ID_LENGTH + 1] = {0}; // Verified user ID for current session (cleared on disconnect)
bool hasOwner = false;  // True if device has been claimed

// --------- Analytics Structures ---------
struct AnalyticsSession {
  uint32_t startTime;    // Unix timestamp (seconds)
  uint32_t endTime;      // Unix timestamp (seconds)
  uint32_t duration;     // milliseconds
  bool turnedOn;         // Session started with power on
  bool turnedOff;        // Session ended with power off
};

struct AnalyticsData {
  uint8_t sessionCount;           // Number of completed sessions (max 10 per batch)
  AnalyticsSession sessions[10];   // Completed sessions
  uint16_t flashReads;             // Total flash read operations
  uint16_t flashWrites;            // Total flash write operations
  uint16_t errorCount;              // Total errors encountered
  uint8_t lastErrorCode;            // Most recent error code (0 = no error)
  uint32_t lastErrorTimestamp;     // Unix timestamp (seconds) of last error
  uint16_t averagePowerConsumption; // Average power in mA (0 = not tracked)
  uint16_t peakPowerConsumption;   // Peak power in mA (0 = not tracked)
  uint8_t batchId;                  // Unique batch ID (increments)
  bool hasData;                     // True if this batch has data to send
};

// Combined storage structure (bundled config + analytics + owner to minimize flash ops)
struct PersistentData {
  Config config;
  AnalyticsData analytics;
  char ownerUserId[MAX_USER_ID_LENGTH + 1]; // Owner user ID (null-terminated string)
  bool hasOwner;  // True if device has been claimed
  uint8_t magic; // Magic number to verify data integrity (0xAA)
};

// Default config
Config currentConfig = {
  50,        // brightness
  30,        // speed
  {160,255,255}, // HSV: iOS blue
  0,         // effect: SOLID
  false      // power off
};

Config pendingConfig = currentConfig;
bool inConfigMode = false;

// --------- Ownership & Security ---------

// Developer/test user IDs (hardcoded for now, can be read from config file)
// These users can ALWAYS access the device, even if not the owner
const char* DEVELOPER_USER_IDS[] = {
  // Add developer user IDs here (comma-separated, max 10)
  // Example: "000705.a1f264ac9b024361b8d829d3724dea86.2039",
  nullptr  // Terminator
};

const char* TEST_USER_IDS[] = {
  // Add test user IDs here (comma-separated, max 10)
  nullptr  // Terminator
};

// --------- Analytics State ---------
AnalyticsData currentAnalytics = {0};
AnalyticsSession activeSession = {0, 0, 0, false, false};
bool hasActiveSession = false;
uint32_t sessionStartTime = 0;
uint16_t flashReadCount = 0;
uint16_t flashWriteCount = 0;
uint16_t errorCount = 0;
uint16_t powerReadings[10] = {0}; // Circular buffer for power readings
uint8_t powerReadingIndex = 0;
uint8_t nextBatchId = 1;

// Update analytics flash counters
void updateFlashCounters() {
  currentAnalytics.flashReads = flashReadCount;
  currentAnalytics.flashWrites = flashWriteCount;
  currentAnalytics.errorCount = errorCount;
}

// Flash storage configuration
#define FLASH_CONFIG_FILENAME "/config.dat"
#define FLASH_MAGIC_VALUE 0xAA

// --------- FastLED State ---------
CRGB leds[LED_COUNT];
uint32_t lastEffectUpdate = 0;
bool strobeOn = false;

// --------- BLE Services ---------
BLEDfu  bledfu;
BLEDis  bledis;
BLEUart bleuart;

// Check if user ID is a developer or test user
bool isDeveloperOrTestUser(const char* userId) {
  if (!userId || strlen(userId) == 0) return false;
  
  // Check developer list
  for (int i = 0; DEVELOPER_USER_IDS[i] != nullptr; i++) {
    if (strcmp(userId, DEVELOPER_USER_IDS[i]) == 0) {
      return true;
    }
  }
  
  // Check test list
  for (int i = 0; TEST_USER_IDS[i] != nullptr; i++) {
    if (strcmp(userId, TEST_USER_IDS[i]) == 0) {
      return true;
    }
  }
  
  return false;
}

// Check if user has verified ownership for this session
bool isOwnershipVerified() {
  return strlen(verifiedUserId) > 0;
}

// Helper function to read user ID from BLE (DRY)
// Returns true if successful, false on error (error already sent)
bool readUserIdFromBle(char* userId, uint8_t maxLen) {
  if (!bleuart.available()) {
    sendError(ERR_INVALID_PARAMETER);
    return false;
  }
  
  // Read user ID length (1 byte)
  uint8_t userIdLen = bleuart.read();
  if (userIdLen == 0 || userIdLen > maxLen) {
    sendError(ERR_INVALID_PARAMETER);
    return false;
  }
  
  // Read user ID bytes
  memset(userId, 0, maxLen + 1);
  for (uint8_t i = 0; i < userIdLen; i++) {
    if (!bleuart.available()) {
      sendError(ERR_INVALID_PARAMETER);
      return false;
    }
    userId[i] = (char)bleuart.read();
  }
  userId[userIdLen] = '\0';
  
  return true;
}

// Helper macro to check ownership at start of command handlers
// Returns early if ownership check fails
#define CHECK_OWNERSHIP_OR_RETURN() \
  do { \
    if (hasOwner && !isOwnershipVerified()) { \
      sendError(ERR_NOT_OWNER); \
      return; \
    } \
  } while(0)

// Clear session ownership (called on disconnect)
void clearSessionOwnership() {
  memset(verifiedUserId, 0, sizeof(verifiedUserId));
}

// Connection callback to auto-send analytics and clear session ownership
void connect_callback(uint16_t conn_handle) {
  // Clear previous session ownership
  clearSessionOwnership();
  
  // Auto-send analytics on connection if there are completed sessions
  delay(500); // Wait for connection to stabilize
  if (currentAnalytics.hasData && currentAnalytics.sessionCount > 0) {
    sendAnalyticsBatch();
  }
}

// Disconnection callback to clear session ownership
void disconnect_callback(uint16_t conn_handle, uint8_t reason) {
  clearSessionOwnership();
}

// --------- Helpers ---------
template<typename T> T clampVal(T v, T lo, T hi) { return v < lo ? lo : (v > hi ? hi : v); }

uint8_t percentTo255(uint8_t pct) { return (uint16_t)pct * 255 / 100; }

uint16_t estimateTotalCurrentmA(const HSVColor& color, uint8_t brightnessPct, uint8_t ledCount = LED_COUNT) {
  // Convert HSV to RGB to estimate white proportion
  CHSV hsv(color.h, color.s, color.v);
  CRGB rgb;
  hsv2rgb_rainbow(hsv, rgb);
  uint16_t rgbSum = rgb.r + rgb.g + rgb.b; // 0..765
  float colorFactor = rgbSum / 765.0f;     // white ~1.0, others <1
  float brightnessFactor = brightnessPct / 100.0f;
  float perLed = MAX_LED_CURRENT_MA * colorFactor * brightnessFactor;
  return (uint16_t)(perLed * ledCount);
}

bool validateConfig(const Config& cfg) {
  // Range checks
  if (cfg.brightness > 100 || cfg.speed > 100 || cfg.effectType > 5) return false;
  // HSV ranges already 0-255 by type
  // Power check
  if (cfg.powerState) {
    uint16_t total = estimateTotalCurrentmA(cfg.color, cfg.brightness);
    if (total > SAFE_CURRENT_MA) return false;
  }
  return true;
}

// --------- Effect Rendering ---------
uint16_t speedToIntervalMs(uint8_t speed) {
  // Map 0-100 to 1200..60 ms (slower..faster)
  return (uint16_t)(1200 - ((uint16_t)speed * 114) / 10); // approx linear
}

void renderSolid() {
  fill_solid(leds, LED_COUNT, CHSV(currentConfig.color.h, currentConfig.color.s, currentConfig.color.v));
}

void renderPulse() {
  uint8_t beat = beatsin8(20 + currentConfig.speed / 4, 40, currentConfig.color.v); // speed influences pulse
  fill_solid(leds, LED_COUNT, CHSV(currentConfig.color.h, currentConfig.color.s, beat));
}

void renderRainbow() {
  uint8_t delta = 2 + (currentConfig.speed / 8);
  static uint8_t hueBase = 0;
  hueBase += delta;
  fill_rainbow(leds, LED_COUNT, hueBase, 4);
  // Apply saturation/value from config
  for (uint8_t i = 0; i < LED_COUNT; i++) {
    leds[i].nscale8_video(currentConfig.color.v);
  }
}

void renderWave() {
  uint8_t t = millis() / speedToIntervalMs(currentConfig.speed);
  for (uint8_t i = 0; i < LED_COUNT; i++) {
    uint8_t wave = sin8(t * 4 + i * 16);
    leds[i] = CHSV(currentConfig.color.h, currentConfig.color.s, scale8(currentConfig.color.v, wave));
  }
}

void renderStrobe() {
  uint16_t interval = max<uint16_t>(30, speedToIntervalMs(currentConfig.speed) / 4);
  if (millis() - lastEffectUpdate >= interval) {
    lastEffectUpdate = millis();
    strobeOn = !strobeOn;
  }
  if (strobeOn) {
    fill_solid(leds, LED_COUNT, CHSV(currentConfig.color.h, currentConfig.color.s, currentConfig.color.v));
  } else {
    fill_solid(leds, LED_COUNT, CRGB::Black);
  }
}

void renderCustom() {
  // Placeholder: behave like solid for now
  renderSolid();
}

void renderEffect() {
  if (!currentConfig.powerState) {
    fill_solid(leds, LED_COUNT, CRGB::Black);
    FastLED.show();
    return;
  }

  switch (currentConfig.effectType) {
    case 0: renderSolid(); break;
    case 1: renderPulse(); break;
    case 2: renderRainbow(); break;
    case 3: renderWave(); break;
    case 4: renderStrobe(); break;
    case 5: renderCustom(); break;
    default: renderSolid(); break;
  }
  FastLED.show();
}

// --------- BLE Response Helpers ---------
void sendAckSuccess() {
  uint8_t resp[1] = { RESP_ACK_SUCCESS };
  bleuart.write(resp, 1);
}

void sendError(ErrorCode code) {
  uint8_t resp[2] = { RESP_ACK_ERROR, (uint8_t)code };
  bleuart.write(resp, 2);
  
  // Log error to serial monitor
  Serial.print("[ERROR] Code: 0x");
  Serial.print((uint8_t)code, HEX);
  Serial.print(" (");
  switch (code) {
    case ERR_INVALID_COMMAND: Serial.print("INVALID_COMMAND"); break;
    case ERR_INVALID_PARAMETER: Serial.print("INVALID_PARAMETER"); break;
    case ERR_OUT_OF_RANGE: Serial.print("OUT_OF_RANGE"); break;
    case ERR_NOT_IN_CONFIG_MODE: Serial.print("NOT_IN_CONFIG_MODE"); break;
    case ERR_ALREADY_IN_CONFIG: Serial.print("ALREADY_IN_CONFIG"); break;
    case ERR_FLASH_WRITE_FAILED: Serial.print("FLASH_WRITE_FAILED"); break;
    case ERR_VALIDATION_FAILED: Serial.print("VALIDATION_FAILED"); break;
    case ERR_NOT_OWNER: Serial.print("NOT_OWNER"); break;
    case ERR_ALREADY_CLAIMED: Serial.print("ALREADY_CLAIMED"); break;
    default: Serial.print("UNKNOWN"); break;
  }
  Serial.println(")");
  trackError(code);
}

// --------- Flash Storage (Bundled Config + Analytics) ---------
void loadPersistentData() {
  File file(InternalFS);
  PersistentData data = {0};
  
  // Try to open and read the config file
  if (file.open(FLASH_CONFIG_FILENAME, FILE_O_READ)) {
    size_t bytesRead = file.read((uint8_t*)&data, sizeof(PersistentData));
    file.close();
    
    if (bytesRead == sizeof(PersistentData)) {
      // Verify magic number
      if (data.magic == FLASH_MAGIC_VALUE) {
        currentConfig = data.config;
        currentAnalytics = data.analytics;
        // Load owner data from bundled structure
        strncpy(ownerUserId, data.ownerUserId, MAX_USER_ID_LENGTH);
        ownerUserId[MAX_USER_ID_LENGTH] = '\0';
        hasOwner = data.hasOwner;
        
        if (currentAnalytics.batchId >= nextBatchId) {
          nextBatchId = currentAnalytics.batchId + 1;
        }
        flashReadCount++;
        // Restore flash counters from analytics
        flashReadCount = max(flashReadCount, currentAnalytics.flashReads);
        flashWriteCount = max(flashWriteCount, currentAnalytics.flashWrites);
        errorCount = max(errorCount, currentAnalytics.errorCount);
        Serial.println("[FLASH] Loaded persistent data successfully");
        if (hasOwner) {
          Serial.print("[OWNERSHIP] Loaded owner: ");
          Serial.println(ownerUserId);
        } else {
          Serial.println("[OWNERSHIP] No owner found - device is unclaimed");
        }
        return;
      } else {
        Serial.print("[FLASH] WARNING: Invalid magic number (0x");
        Serial.print(data.magic, HEX);
        Serial.println(")");
      }
    } else {
      Serial.print("[FLASH] WARNING: File size mismatch (expected ");
      Serial.print(sizeof(PersistentData));
      Serial.print(", got ");
      Serial.print(bytesRead);
      Serial.println(")");
    }
  } else {
    Serial.println("[FLASH] No existing config file found");
  }
  
  // First boot or corrupted data - use defaults
  currentAnalytics = {0};
  currentAnalytics.batchId = nextBatchId++;
}

// Ownership data is now bundled with PersistentData - no separate load/save needed

void savePersistentData() {
  updateFlashCounters(); // Update counters before saving
  PersistentData data;
  data.config = currentConfig;
  data.analytics = currentAnalytics;
  // Save owner data in bundled structure
  strncpy(data.ownerUserId, ownerUserId, MAX_USER_ID_LENGTH);
  data.ownerUserId[MAX_USER_ID_LENGTH] = '\0';
  data.hasOwner = hasOwner;
  data.magic = FLASH_MAGIC_VALUE;
  
  File file(InternalFS);
  if (file.open(FLASH_CONFIG_FILENAME, FILE_O_WRITE)) {
    size_t bytesWritten = file.write((uint8_t*)&data, sizeof(PersistentData));
    file.close();
    
    if (bytesWritten == sizeof(PersistentData)) {
      flashWriteCount++;
      currentAnalytics.flashWrites = flashWriteCount;
      Serial.println("[FLASH] Saved persistent data (config + analytics)");
    } else {
      Serial.print("[FLASH] ERROR: Failed to write all data (wrote ");
      Serial.print(bytesWritten);
      Serial.print(" of ");
      Serial.print(sizeof(PersistentData));
      Serial.println(" bytes)");
      trackError(ERR_FLASH_WRITE_FAILED);
    }
  } else {
    Serial.println("[FLASH] ERROR: Failed to open file for writing");
    trackError(ERR_FLASH_WRITE_FAILED);
  }
}

// --------- Analytics Tracking ---------
void startSession(bool turnedOn) {
  if (!hasActiveSession) {
    hasActiveSession = true;
    sessionStartTime = millis();
    activeSession.startTime = (uint32_t)(millis() / 1000); // Unix timestamp approximation
    activeSession.turnedOn = turnedOn;
    activeSession.turnedOff = false;
  }
}

void endSession(bool turnedOff) {
  if (hasActiveSession) {
    uint32_t sessionDuration = millis() - sessionStartTime;
    activeSession.endTime = (uint32_t)(millis() / 1000);
    activeSession.duration = sessionDuration;
    activeSession.turnedOff = turnedOff;
    
    // Only save completed sessions (not active ones)
    // Add to batch if there's room
    if (currentAnalytics.sessionCount < 10) {
      currentAnalytics.sessions[currentAnalytics.sessionCount] = activeSession;
      currentAnalytics.sessionCount++;
      currentAnalytics.hasData = true;
      Serial.print("[ANALYTICS] Session ended: duration=");
      Serial.print(sessionDuration);
      Serial.print("ms, total sessions=");
      Serial.println(currentAnalytics.sessionCount);
    } else {
      Serial.println("[ANALYTICS] WARNING: Session buffer full, session discarded");
    }
    
    hasActiveSession = false;
  }
}

void trackPowerConsumption(uint16_t powerMa) {
  // Track power in circular buffer
  powerReadings[powerReadingIndex] = powerMa;
  powerReadingIndex = (powerReadingIndex + 1) % 10;
  
  // Calculate average
  uint32_t sum = 0;
  uint8_t count = 0;
  for (uint8_t i = 0; i < 10; i++) {
    if (powerReadings[i] > 0) {
      sum += powerReadings[i];
      count++;
    }
  }
  if (count > 0) {
    currentAnalytics.averagePowerConsumption = (uint16_t)(sum / count);
  }
  
  // Track peak
  for (uint8_t i = 0; i < 10; i++) {
    if (powerReadings[i] > currentAnalytics.peakPowerConsumption) {
      currentAnalytics.peakPowerConsumption = powerReadings[i];
    }
  }
}

void trackError(ErrorCode code) {
  errorCount++;
  currentAnalytics.errorCount = errorCount;
  currentAnalytics.lastErrorCode = (uint8_t)code;
  currentAnalytics.lastErrorTimestamp = (uint32_t)(millis() / 1000);
}

// Track flash operations (called when config is read/written)
void trackFlashRead() {
  flashReadCount++;
}

void trackFlashWrite() {
  flashWriteCount++;
}

// --------- Analytics Batch Sending ---------
void sendAnalyticsBatch() {
  // Only send if there are completed sessions (not just active session)
  // Rule: Don't send if only 1 session exists (it's the active session)
  if (!currentAnalytics.hasData || currentAnalytics.sessionCount == 0) {
    // No data to send - send success with 0 sessions
    uint8_t resp[2] = { RESP_ACK_SUCCESS, 0 }; // 0 = no data
    bleuart.write(resp, 2);
    return;
  }
  
  // Update flash counters before sending
  updateFlashCounters();
  
  // Calculate payload size dynamically based on structure
  const uint8_t RESPONSE_TYPE_SIZE = 1;        // RESP_ANALYTICS_BATCH
  const uint8_t BATCH_ID_SIZE = 1;
  const uint8_t SESSION_COUNT_SIZE = 1;
  const uint8_t FLASH_READS_SIZE = 2;
  const uint8_t FLASH_WRITES_SIZE = 2;
  const uint8_t ERROR_COUNT_SIZE = 2;
  const uint8_t LAST_ERROR_CODE_SIZE = 1;
  const uint8_t LAST_ERROR_TIMESTAMP_SIZE = 4;
  const uint8_t AVG_POWER_SIZE = 2;
  const uint8_t PEAK_POWER_SIZE = 2;
  const uint8_t SESSION_SIZE = 13; // startTime(4) + endTime(4) + duration(4) + flags(1)
  
  const uint8_t HEADER_SIZE = RESPONSE_TYPE_SIZE + BATCH_ID_SIZE + SESSION_COUNT_SIZE +
    FLASH_READS_SIZE + FLASH_WRITES_SIZE + ERROR_COUNT_SIZE +
    LAST_ERROR_CODE_SIZE + LAST_ERROR_TIMESTAMP_SIZE +
    AVG_POWER_SIZE + PEAK_POWER_SIZE;
  
  uint8_t payloadSize = HEADER_SIZE + (currentAnalytics.sessionCount * SESSION_SIZE);
  uint8_t* payload = new uint8_t[payloadSize];
  uint8_t idx = 0;
  
  payload[idx++] = RESP_ANALYTICS_BATCH;
  payload[idx++] = currentAnalytics.batchId;
  payload[idx++] = currentAnalytics.sessionCount;
  
  // Flash reads (2 bytes, big-endian)
  payload[idx++] = (currentAnalytics.flashReads >> 8) & 0xFF;
  payload[idx++] = currentAnalytics.flashReads & 0xFF;
  
  // Flash writes (2 bytes)
  payload[idx++] = (currentAnalytics.flashWrites >> 8) & 0xFF;
  payload[idx++] = currentAnalytics.flashWrites & 0xFF;
  
  // Error count (2 bytes)
  payload[idx++] = (currentAnalytics.errorCount >> 8) & 0xFF;
  payload[idx++] = currentAnalytics.errorCount & 0xFF;
  
  // Last error code (1 byte)
  payload[idx++] = currentAnalytics.lastErrorCode;
  
  // Last error timestamp (4 bytes, big-endian)
  payload[idx++] = (currentAnalytics.lastErrorTimestamp >> 24) & 0xFF;
  payload[idx++] = (currentAnalytics.lastErrorTimestamp >> 16) & 0xFF;
  payload[idx++] = (currentAnalytics.lastErrorTimestamp >> 8) & 0xFF;
  payload[idx++] = currentAnalytics.lastErrorTimestamp & 0xFF;
  
  // Average power (2 bytes)
  payload[idx++] = (currentAnalytics.averagePowerConsumption >> 8) & 0xFF;
  payload[idx++] = currentAnalytics.averagePowerConsumption & 0xFF;
  
  // Peak power (2 bytes)
  payload[idx++] = (currentAnalytics.peakPowerConsumption >> 8) & 0xFF;
  payload[idx++] = currentAnalytics.peakPowerConsumption & 0xFF;
  
  // Sessions
  for (uint8_t i = 0; i < currentAnalytics.sessionCount; i++) {
    AnalyticsSession& sess = currentAnalytics.sessions[i];
    // startTime (4 bytes, big-endian)
    payload[idx++] = (sess.startTime >> 24) & 0xFF;
    payload[idx++] = (sess.startTime >> 16) & 0xFF;
    payload[idx++] = (sess.startTime >> 8) & 0xFF;
    payload[idx++] = sess.startTime & 0xFF;
    // endTime (4 bytes)
    payload[idx++] = (sess.endTime >> 24) & 0xFF;
    payload[idx++] = (sess.endTime >> 16) & 0xFF;
    payload[idx++] = (sess.endTime >> 8) & 0xFF;
    payload[idx++] = sess.endTime & 0xFF;
    // duration (4 bytes)
    payload[idx++] = (sess.duration >> 24) & 0xFF;
    payload[idx++] = (sess.duration >> 16) & 0xFF;
    payload[idx++] = (sess.duration >> 8) & 0xFF;
    payload[idx++] = sess.duration & 0xFF;
    // flags (1 byte: bit 0 = turnedOn, bit 1 = turnedOff)
    payload[idx++] = (sess.turnedOn ? 0x01 : 0x00) | (sess.turnedOff ? 0x02 : 0x00);
  }
  
  // Send in chunks if needed (BLE MTU is typically 20-23 bytes)
  uint8_t chunkSize = 20;
  for (uint8_t i = 0; i < payloadSize; i += chunkSize) {
    uint8_t chunkLen = min(chunkSize, (uint8_t)(payloadSize - i));
    bleuart.write(&payload[i], chunkLen);
    delay(10); // Small delay between chunks
  }
  
  delete[] payload;
}

void handleRequestAnalytics() {
  // Analytics can be requested without ownership (read-only operation)
  // But if device has owner, verify ownership
  CHECK_OWNERSHIP_OR_RETURN();
  
  sendAnalyticsBatch();
}

void handleConfirmAnalytics() {
  CHECK_OWNERSHIP_OR_RETURN();
  
  if (!bleuart.available()) {
    sendError(ERR_INVALID_PARAMETER);
    return;
  }
  
  uint8_t confirmedBatchId = bleuart.read();
  
  // Only clear if this batch was confirmed
  if (confirmedBatchId == currentAnalytics.batchId && currentAnalytics.hasData) {
    // Clear analytics data
    currentAnalytics = {0};
    currentAnalytics.batchId = nextBatchId++;
    currentAnalytics.hasData = false;
    
    // Save to flash (bundled with config)
    savePersistentData();
    sendAckSuccess();
  } else {
    sendAckSuccess(); // Still acknowledge even if batch ID doesn't match
  }
}

// --------- Ownership Command Handlers ---------
void handleClaimDevice() {
  char userId[MAX_USER_ID_LENGTH + 1] = {0};
  if (!readUserIdFromBle(userId, MAX_USER_ID_LENGTH)) {
    return; // Error already sent
  }
  
  // Check if device is already claimed
  if (hasOwner) {
    // Allow developer/test users to reclaim, or if it's the same owner
    if (isDeveloperOrTestUser(userId) || strcmp(userId, ownerUserId) == 0) {
      // Update owner (developer reclaim or same owner)
      strncpy(ownerUserId, userId, MAX_USER_ID_LENGTH);
      ownerUserId[MAX_USER_ID_LENGTH] = '\0';
      savePersistentData(); // Save bundled data
      sendAckSuccess();
      Serial.print("[OWNERSHIP] Device reclaimed by: ");
      Serial.println(userId);
    } else {
      sendError(ERR_ALREADY_CLAIMED);
      Serial.print("[OWNERSHIP] Claim rejected - device already owned by: ");
      Serial.println(ownerUserId);
    }
  } else {
    // Device is unclaimed - allow anyone to claim it
    strncpy(ownerUserId, userId, MAX_USER_ID_LENGTH);
    ownerUserId[MAX_USER_ID_LENGTH] = '\0';
    hasOwner = true;
    savePersistentData(); // Save bundled data (config + analytics + owner)
    sendAckSuccess();
    Serial.print("[OWNERSHIP] Device claimed by: ");
    Serial.println(userId);
  }
}

void handleVerifyOwnership() {
  char userId[MAX_USER_ID_LENGTH + 1] = {0};
  if (!readUserIdFromBle(userId, MAX_USER_ID_LENGTH)) {
    return; // Error already sent
  }
  
  // Check ownership: owner, developer, or test user
  bool isAuthorized = false;
  
  if (!hasOwner) {
    // No owner - anyone can access
    isAuthorized = true;
  } else if (strcmp(userId, ownerUserId) == 0) {
    // User is the owner
    isAuthorized = true;
  } else if (isDeveloperOrTestUser(userId)) {
    // User is a developer or test user - always allowed
    isAuthorized = true;
  }
  
  if (isAuthorized) {
    // Store verified user ID for this session
    strncpy(verifiedUserId, userId, MAX_USER_ID_LENGTH);
    verifiedUserId[MAX_USER_ID_LENGTH] = '\0';
    sendAckSuccess();
    Serial.print("[OWNERSHIP] Ownership verified for: ");
    Serial.println(userId);
  } else {
    sendError(ERR_NOT_OWNER);
    Serial.print("[OWNERSHIP] Ownership verification failed for: ");
    Serial.println(userId);
  }
}

void handleUnclaimDevice() {
  char userId[MAX_USER_ID_LENGTH + 1] = {0};
  if (!readUserIdFromBle(userId, MAX_USER_ID_LENGTH)) {
    return; // Error already sent
  }
  
  // Only owner or developer/test users can unclaim
  if (!hasOwner) {
    // Device is already unclaimed
    sendAckSuccess();
    return;
  }
  
  // Check if user is authorized to unclaim
  bool isAuthorized = false;
  if (strcmp(userId, ownerUserId) == 0) {
    // User is the owner
    isAuthorized = true;
  } else if (isDeveloperOrTestUser(userId)) {
    // User is a developer or test user - always allowed
    isAuthorized = true;
  }
  
  if (isAuthorized) {
    // Clear owner
    memset(ownerUserId, 0, sizeof(ownerUserId));
    hasOwner = false;
    savePersistentData(); // Save bundled data
    sendAckSuccess();
    Serial.println("[OWNERSHIP] Device unclaimed");
  } else {
    sendError(ERR_NOT_OWNER);
    Serial.print("[OWNERSHIP] Unclaim rejected - not authorized: ");
    Serial.println(userId);
  }
}

// Check if command requires ownership verification
bool requiresOwnershipVerification(uint8_t cmd) {
  // CMD_VERIFY_OWNERSHIP can always be called
  if (cmd == CMD_VERIFY_OWNERSHIP) return false;
  
  // If device has no owner, no verification needed
  if (!hasOwner) return false;
  
  // All other commands require verification
  return true;
}

// --------- Command Handlers ---------
void handleEnterConfig() {
  CHECK_OWNERSHIP_OR_RETURN();
  
  if (inConfigMode) {
    sendError(ERR_ALREADY_IN_CONFIG);
    return;
  }
  // Load config + analytics from flash (bundled read)
  loadPersistentData();
  pendingConfig = currentConfig;
  inConfigMode = true;
  sendAckSuccess();
}

void handleExitConfig() {
  CHECK_OWNERSHIP_OR_RETURN();
  
  inConfigMode = false;
  sendAckSuccess();
}

void handleCommitConfig() {
  CHECK_OWNERSHIP_OR_RETURN();
  
  if (!inConfigMode) {
    sendError(ERR_NOT_IN_CONFIG_MODE);
    return;
  }
  if (!validateConfig(pendingConfig)) {
    sendError(ERR_VALIDATION_FAILED);
    return;
  }
  currentConfig = pendingConfig;
  FastLED.setBrightness(percentTo255(currentConfig.brightness));
  inConfigMode = false;
  
  // Save config + analytics together to minimize flash writes
  savePersistentData();
  sendAckSuccess();
}

bool applyParameter(ParameterId pid, uint8_t value, Config& cfg) {
  switch (pid) {
    case PARAM_BRIGHTNESS:      cfg.brightness = clampVal<uint8_t>(value, 0, 100); return true;
    case PARAM_SPEED:           cfg.speed      = clampVal<uint8_t>(value, 0, 100); return true;
    case PARAM_COLOR_HUE:       cfg.color.h    = value; return true;
    case PARAM_COLOR_SATURATION:cfg.color.s    = value; return true;
    case PARAM_COLOR_VALUE:     cfg.color.v    = value; return true;
    case PARAM_EFFECT_TYPE:     cfg.effectType = clampVal<uint8_t>(value, 0, 5); return true;
    case PARAM_POWER_STATE:     cfg.powerState = (value > 0); return true;
    default: return false;
  }
}

void handleUpdateParameter(uint8_t pidRaw, uint8_t val) {
  CHECK_OWNERSHIP_OR_RETURN();
  
  if (!inConfigMode) {
    sendError(ERR_NOT_IN_CONFIG_MODE);
    return;
  }
  ParameterId pid = (ParameterId)pidRaw;
  Config testCfg = pendingConfig;
  bool powerStateChanged = (pid == PARAM_POWER_STATE);
  bool wasOn = testCfg.powerState;
  
  if (!applyParameter(pid, val, testCfg)) {
    sendError(ERR_INVALID_PARAMETER);
    return;
  }
  if (!validateConfig(testCfg)) {
    sendError(ERR_VALIDATION_FAILED);
    return;
  }
  pendingConfig = testCfg;
  
  // Track power state changes for analytics
  if (powerStateChanged) {
    if (pendingConfig.powerState && !wasOn) {
      startSession(true);
      uint16_t powerMa = estimateTotalCurrentmA(pendingConfig.color, pendingConfig.brightness);
      trackPowerConsumption(powerMa);
    } else if (!pendingConfig.powerState && wasOn) {
      endSession(true);
    }
  }
  
  sendAckSuccess();
}

void handleUpdateColor(uint8_t h, uint8_t s, uint8_t v) {
  CHECK_OWNERSHIP_OR_RETURN();
  
  if (!inConfigMode) {
    sendError(ERR_NOT_IN_CONFIG_MODE);
    return;
  }
  Config testCfg = pendingConfig;
  testCfg.color = {h, s, v};
  if (!validateConfig(testCfg)) {
    sendError(ERR_VALIDATION_FAILED);
    return;
  }
  pendingConfig = testCfg;
  sendAckSuccess();
}

// --------- BLE Command Processing ---------
void processCommand() {
  if (!bleuart.available()) return;

  uint8_t cmd = bleuart.read();
  switch (cmd) {
    case CMD_ENTER_CONFIG:
      handleEnterConfig();
      break;
    case CMD_EXIT_CONFIG:
      handleExitConfig();
      break;
    case CMD_COMMIT_CONFIG:
      handleCommitConfig();
      break;
    case CMD_UPDATE_PARAM: {
      if (bleuart.available() < 2) { sendError(ERR_INVALID_PARAMETER); return; }
      uint8_t pid = bleuart.read();
      uint8_t val = bleuart.read();
      handleUpdateParameter(pid, val);
      break;
    }
    case CMD_UPDATE_COLOR: {
      if (bleuart.available() < 3) { sendError(ERR_INVALID_PARAMETER); return; }
      uint8_t h = bleuart.read();
      uint8_t s = bleuart.read();
      uint8_t v = bleuart.read();
      handleUpdateColor(h, s, v);
      break;
    }
    case CMD_REQUEST_ANALYTICS:
      handleRequestAnalytics();
      break;
    case CMD_CONFIRM_ANALYTICS:
      handleConfirmAnalytics();
      break;
    case CMD_CLAIM_DEVICE:
      handleClaimDevice();
      break;
    case CMD_VERIFY_OWNERSHIP:
      handleVerifyOwnership();
      break;
    case CMD_UNCLAIM_DEVICE:
      handleUnclaimDevice();
      break;
    default:
      sendError(ERR_INVALID_COMMAND);
      break;
  }
}

// --------- BLE Setup ---------
void startAdv(void) {  
  Bluefruit.Advertising.clearData();
  Bluefruit.ScanResponse.clearData();

  Bluefruit.setName("LED Guitar");

  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addTxPower();
  Bluefruit.Advertising.addService(bleuart);
  Bluefruit.ScanResponse.addName();

  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(32, 244);
  Bluefruit.Advertising.setFastTimeout(30);
  Bluefruit.Advertising.start(0);
}

// --------- Arduino Setup/Loop ---------
void setup() {
  Serial.begin(115200);
  delay(100);

  // FastLED init with power limit
  FastLED.addLeds<LED_TYPE, LED_DATA_PIN, LED_CLOCK_PIN, COLOR_ORDER>(leds, LED_COUNT);
  FastLED.setMaxPowerInVoltsAndMilliamps(BATTERY_VOLTS, SAFE_CURRENT_MA);
  FastLED.setBrightness(percentTo255(currentConfig.brightness));
  fill_solid(leds, LED_COUNT, CRGB::Black);
  FastLED.show();

  // Initialize internal file system for flash storage
  if (!InternalFS.begin()) {
    Serial.println("[FLASH] ERROR: Failed to mount InternalFS!");
    // Continue anyway - will use defaults
  } else {
    Serial.println("[FLASH] InternalFS mounted successfully");
  }
  
  // Load persistent data (config + analytics + owner bundled)
  loadPersistentData();
  
  // BLE init
  Bluefruit.begin();
  Bluefruit.setTxPower(4);
  Bluefruit.Periph.setConnectCallback(connect_callback);
  Bluefruit.Periph.setDisconnectCallback(disconnect_callback);

  bledfu.begin();
  bledis.setManufacturer("LED Guitar");
  bledis.setModel("Controller");
  bledis.begin();

  bleuart.begin();
  startAdv();

  Serial.println("BLE LED Controller ready");
}

void loop() {
  processCommand();
  renderEffect();
}