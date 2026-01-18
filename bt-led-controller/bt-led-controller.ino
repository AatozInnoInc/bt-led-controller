/*********************************************************************
 This is an example for our nRF52 based Bluefruit LE modules

 Pick one up today in the adafruit shop!

 Adafruit invests time and resources providing this open source code,
 please support Adafruit and open-source hardware by purchasing
 products from Adafruit!

 MIT license, check LICENSE for more information
 All text above, and the splash screen below must be included in
 any redistribution
*********************************************************************/

// LED Guitar Controller with Settings Storage and Error Handling
// Using custom bitbang SPI for full control over clock frequency (reduces EMI/noise)

#include <Arduino.h>
#include <bluefruit.h>
#include <Adafruit_LittleFS.h>
#include <InternalFileSystem.h>
#include <string.h>

#include "device_config.h"

// BLE Services
BLEDfu bledfu;
BLEDis bledis;
BLEUart bleuart;

// Frame rate limiting for LED updates to reduce noise
// FastLED typically runs at 30-60 FPS, we'll use 30 FPS (33ms between frames)
#define LED_UPDATE_INTERVAL_MS 33  // ~30 FPS
unsigned long lastLedUpdate = 0;
bool ledBufferChanged = false;

// ----------------------------------------
// Bitbang SPI Configuration for EMI Control
// ----------------------------------------
// Clock delay controls the time between clock transitions
// Longer delay = Slower frequency = Less EMI
// Shorter delay = Faster frequency = More EMI risk
//
// Mode 0: 100µs delay  (~5 kHz) - EXTREMELY slow, guaranteed no EMI
// Mode 1: 50µs delay   (~10 kHz) - Very slow
// Mode 2: 20µs delay   (~25 kHz) - Slow
// Mode 3: 10µs delay   (~50 kHz) - Moderately slow [RECOMMENDED START]
// Mode 4: 5µs delay    (~100 kHz) - Medium-slow
// Mode 5: 2µs delay    (~250 kHz) - Medium
// Mode 6: 1µs delay    (~500 kHz) - Fast
// Mode 7: 0µs delay    (~2 MHz) - Maximum speed (limited by digitalWrite)

#define BITBANG_FREQUENCY_MODE 3  // Start with Mode 3 for EMI reduction

const uint8_t CLOCK_DELAYS[] = {
  100,  // Mode 0: ~5 kHz (extremely slow baseline)
  50,   // Mode 1: ~10 kHz
  20,   // Mode 2: ~25 kHz
  10,   // Mode 3: ~50 kHz (RECOMMENDED START - should eliminate EMI)
  5,    // Mode 4: ~100 kHz
  2,    // Mode 5: ~250 kHz
  1,    // Mode 6: ~500 kHz
  0     // Mode 7: ~2 MHz (maximum bitbang speed)
};

const uint8_t CURRENT_CLOCK_DELAY = CLOCK_DELAYS[BITBANG_FREQUENCY_MODE];

// Global brightness level (0-255) - applied per-LED in APA102 protocol
uint8_t globalBrightness = DEFAULT_BRIGHTNESS;

// A small staging buffer so we can keep most of your pattern logic intact
// while moving away from FastLED's CRGB/CHSV APIs.
struct RGB {
  uint8_t r, g, b;
};
static RGB ledBuf[LED_COUNT];

// ----------------------------------------
// Low-Level APA102 Bitbang Functions
// ----------------------------------------

// Send a single bit with configurable clock delay
static inline void sendBit(bool bit) {
  digitalWrite(DATA_PIN, bit ? HIGH : LOW);
  if (CURRENT_CLOCK_DELAY > 0) delayMicroseconds(CURRENT_CLOCK_DELAY);
  digitalWrite(CLOCK_PIN, HIGH);
  if (CURRENT_CLOCK_DELAY > 0) delayMicroseconds(CURRENT_CLOCK_DELAY);
  digitalWrite(CLOCK_PIN, LOW);
}

// Send a byte MSB first
static inline void sendByte(uint8_t byte) {
  for (int i = 7; i >= 0; i--) {
    sendBit(byte & (1 << i));
  }
}

// Send start frame (32 bits of 0)
static inline void sendStartFrame() {
  for (int i = 0; i < 32; i++) {
    sendBit(0);
  }
}

// Send end frame (32 bits of 1)
static inline void sendEndFrame() {
  for (int i = 0; i < 32; i++) {
    sendBit(1);
  }
}

// Send LED frame: 111 + 5-bit brightness + B + G + R
// APA102 uses BGR order, not RGB
static inline void sendLED(uint8_t r, uint8_t g, uint8_t b, uint8_t brightness) {
  // APA102 LED frame: 0b111BBBBB BBBBBBBB GGGGGGGG RRRRRRRR
  // Where BBBBB is 5-bit brightness (0-31)
  uint8_t brightnessBits = map(brightness, 0, 255, 0, 31);
  uint8_t ledHeader = 0b11100000 | brightnessBits;

  sendByte(ledHeader);
  sendByte(b);  // APA102 uses BGR order
  sendByte(g);
  sendByte(r);
}

// Update all LEDs - this is our "show()" function
static inline void bitbangShow() {
  sendStartFrame();

  for (int i = 0; i < LED_COUNT; i++) {
    sendLED(ledBuf[i].r, ledBuf[i].g, ledBuf[i].b, globalBrightness);
  }

  sendEndFrame();
}

// Idle the data line low to reduce floating-line artifacts
static inline void idle_low() {
  digitalWrite(DATA_PIN, LOW);
  digitalWrite(CLOCK_PIN, LOW);
}

// Apply ledBuf -> LEDs and show.
// Frame rate limited to reduce noise - only updates at ~30 FPS max
// This matches FastLED's approach of consistent timing
static inline void showLeds() {
  unsigned long now = millis();
  
  // Frame rate limiting: only update if enough time has passed
  if (now - lastLedUpdate < LED_UPDATE_INTERVAL_MS && !ledBufferChanged) {
    return; // Skip update if too soon and buffer hasn't changed
  }
  
  // Use bitbang SPI to send all LED data
  bitbangShow();
  
  // Small delay to let signals settle (similar to FastLED's timing)
  // This helps reduce noise by ensuring clean signal transitions
  delayMicroseconds(50);
  
  idle_low();
  
  lastLedUpdate = now;
  ledBufferChanged = false;
}

static inline void clearBuf() {
  for (int i = 0; i < LED_COUNT; i++) {
    ledBuf[i] = {0, 0, 0};
  }
  ledBufferChanged = true; // Mark buffer as changed
}

// "FastLED-like" helpers (minimal subset)

static inline void fill_solid_buf(uint8_t r, uint8_t g, uint8_t b) {
  for (int i = 0; i < LED_COUNT; i++) {
    ledBuf[i] = {r, g, b};
  }
  ledBufferChanged = true; // Mark buffer as changed
}

static inline uint8_t qadd8(uint8_t a, uint8_t b) {
  uint16_t s = (uint16_t)a + (uint16_t)b;
  return (s > 255) ? 255 : (uint8_t)s;
}

static inline uint8_t qsub8(uint8_t a, uint8_t b) {
  return (a > b) ? (uint8_t)(a - b) : 0;
}

// Approx of FastLED fadeToBlackBy: scale each channel down by (255-amount)/255
static inline void fadeToBlackBy_buf(uint8_t amount) {
  uint16_t scale = 255 - amount;
  for (int i = 0; i < LED_COUNT; i++) {
    ledBuf[i].r = (uint8_t)((uint16_t)ledBuf[i].r * scale / 255);
    ledBuf[i].g = (uint8_t)((uint16_t)ledBuf[i].g * scale / 255);
    ledBuf[i].b = (uint8_t)((uint16_t)ledBuf[i].b * scale / 255);
  }
  ledBufferChanged = true; // Mark buffer as changed
}

// Linear blend between two RGB colors (t=0..255)
static inline RGB blend_rgb(const RGB& a, const RGB& b, uint8_t t) {
  uint16_t it = 255 - t;
  RGB out;
  out.r = (uint8_t)((a.r * it + b.r * t) / 255);
  out.g = (uint8_t)((a.g * it + b.g * t) / 255);
  out.b = (uint8_t)((a.b * it + b.b * t) / 255);
  return out;
}

// HSV -> RGB conversion (0-255 ranges), sufficient for your wave/breath effects
static inline RGB hsv2rgb(uint8_t h, uint8_t s, uint8_t v) {
  // Standard integer HSV->RGB (similar to FastLED-ish behavior)
  if (s == 0) return {v, v, v};

  uint8_t region = h / 43;               // 0..5
  uint8_t remainder = (h - region * 43) * 6;

  uint8_t p = (uint8_t)((uint16_t)v * (255 - s) / 255);
  uint8_t q = (uint8_t)((uint16_t)v * (255 - (uint16_t)s * remainder / 255) / 255);
  uint8_t t = (uint8_t)((uint16_t)v * (255 - (uint16_t)s * (255 - remainder) / 255) / 255);

  switch (region) {
    case 0: return {v, t, p};
    case 1: return {q, v, p};
    case 2: return {p, v, t};
    case 3: return {p, q, v};
    case 4: return {t, p, v};
    default:return {v, p, q};
  }
}

// RGB -> HSV conversion (0-255 ranges)
static inline void rgb2hsv(uint8_t r, uint8_t g, uint8_t b, uint8_t* h, uint8_t* s, uint8_t* v) {
  uint8_t minVal = (r < g) ? ((r < b) ? r : b) : ((g < b) ? g : b);
  uint8_t maxVal = (r > g) ? ((r > b) ? r : b) : ((g > b) ? g : b);
  
  *v = maxVal;
  
  if (maxVal == 0) {
    *s = 0;
    *h = 0;
    return;
  }
  
  uint16_t delta = maxVal - minVal;
  *s = (uint8_t)((uint16_t)delta * 255 / maxVal);
  
  if (delta == 0) {
    *h = 0;
    return;
  }
  
  if (maxVal == r) {
    *h = (uint8_t)(43 * ((g - b) * 255 / delta) / 255);
    if (*h > 42) *h = 0;
  } else if (maxVal == g) {
    *h = (uint8_t)(85 + 43 * ((b - r) * 255 / delta) / 255);
  } else {
    *h = (uint8_t)(170 + 43 * ((r - g) * 255 / delta) / 255);
  }
}

// Sine approximation for 0..255 input -> 0..255 output (FastLED sin8-like)
static inline uint8_t sin8_approx(uint8_t x) {
  // Use Arduino's float sin for simplicity (nRF52 can handle it),
  // but keep it deterministic and bounded.
  float rad = (x / 255.0f) * 2.0f * 3.14159265f;
  float s = sinf(rad);
  int v = (int)((s + 1.0f) * 127.5f);
  if (v < 0) v = 0;
  if (v > 255) v = 255;
  return (uint8_t)v;
}

// beat8-like: returns 0..255 ramp at bpm, with phase offset in [0..255]
static inline uint8_t beat8_like(uint8_t bpm, uint8_t phase) {
  // 256 units per cycle. bpm cycles per minute.
  // t(ms) * bpm / 60000 gives cycles, multiply 256 gives position.
  uint32_t t = millis();
  uint32_t pos = (uint32_t)((uint64_t)t * bpm * 256 / 60000);
  return (uint8_t)(pos + phase);
}

// Gamma correction table (unchanged)
const uint8_t gamma8[] = {
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,
  1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,
  2,3,3,3,3,3,3,3,4,4,4,4,4,5,5,5,
  5,6,6,6,6,7,7,7,7,8,8,8,9,9,9,10,
  10,10,11,11,11,12,12,13,13,13,14,14,15,15,16,16,
  17,17,18,18,19,19,20,20,21,21,22,22,23,24,24,25,
  25,26,27,27,28,29,29,30,31,32,32,33,34,35,35,36,
  37,38,39,39,40,41,42,43,44,45,46,47,48,49,50,50,
  51,52,54,55,56,57,58,59,60,61,62,63,64,66,67,68,
  69,70,72,73,74,75,77,78,79,81,82,83,85,86,87,89,
  90,92,93,95,96,98,99,101,102,104,105,107,109,110,112,114,
  115,117,119,120,122,124,126,127,129,131,133,135,137,138,140,142,
  144,146,148,150,152,154,156,158,160,162,164,167,169,171,173,175,
  177,180,182,184,186,189,191,193,196,198,200,203,205,208,210,213,
  215,218,220,223,225,228,231,233,236,239,241,244,247,249,252,255
};

// ----------------------------------------
// Original globals (unchanged)
// ----------------------------------------
DeviceSettings currentSettings;
DeviceSettings ramBuffer;
DeviceSettings lastSavedSettings;
bool settingsLoaded = false;
unsigned long lastActivityTime = 0;
unsigned long autoOffTimer = 0;

bool configModeActive = false;
bool configDirty = false;
bool lastSavedStateValid = false;

char verifiedUserId[MAX_USER_ID_LENGTH + 1] = {0};


const char* DEVELOPER_USER_IDS[] = { nullptr };
const char* TEST_USER_IDS[] = { nullptr };

// Forward declarations for functions referenced before defined
void startAdv(void);
void connect_callback(uint16_t conn_handle);
void disconnect_callback(uint16_t conn_handle, uint8_t reason);

void initializeSettings();
void resetToDefaultSettings();
bool loadSettingsFromFlash();
bool saveSettingsToFlash();
bool loadSettingsFromFlashInternal(DeviceSettings* settings);
uint32_t calculateChecksum(DeviceSettings* settings);
void applySettings();

bool validateConfig(DeviceSettings* settings);
bool validateBrightness(uint8_t brightness);
bool validatePattern(uint8_t pattern);
bool validatePowerMode(uint8_t powerMode);
bool validateColor(uint8_t r, uint8_t g, uint8_t b);
void applyPowerMode();

bool isDeveloperOrTestUser(const char* userId);
bool isOwnershipVerified();
bool readUserIdFromBle(char* userId, uint8_t maxLen);

void handleClaimDevice();
void handleVerifyOwnership();
void handleUnclaimDevice();

void handleEnterConfigMode();
void handleExitConfigMode();
void handleCommitConfig();
void handleConfigUpdate();
void handleRequestAnalytics();
void handleConfirmAnalytics();

void sendErrorResponse(uint8_t errorCode, const char* message);
void sendConfigModeAck();
void sendCommitAck();
void sendSuccessAck();

void updatePattern();
void setPattern(uint8_t pattern);

// pattern implementations
void rainbow();
void pulse();
void fade();
void chase();
void twinkle();
void wave();
void breath();
void strobe();

// ----------------------------------------
// Setup / Loop
// ----------------------------------------

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  delay(100);

  Serial.println("LED Guitar Controller");
  Serial.println("====================");
  Serial.printf("Device Name: %s\n", DEVICE_NAME);
  Serial.printf("Manufacturer: %s\n", MANUFACTURER_NAME);

  // Initialize FS + settings
  initializeSettings();

  // Initialize bitbang SPI pins for APA102 LEDs
  pinMode(DATA_PIN, OUTPUT);
  pinMode(CLOCK_PIN, OUTPUT);
  digitalWrite(DATA_PIN, LOW);
  digitalWrite(CLOCK_PIN, LOW);

  // Set initial global brightness
  globalBrightness = currentSettings.brightness;
  
  clearBuf();
  showLeds(); // ensure off
  
  Serial.printf("Bitbang SPI initialized: Mode %d (~%d kHz) on pins %d (data), %d (clock)\n", 
                BITBANG_FREQUENCY_MODE,
                CURRENT_CLOCK_DELAY > 0 ? (1000 / (CURRENT_CLOCK_DELAY * 2)) : 2000,
                DATA_PIN, CLOCK_PIN);

  // Init Bluefruit
  Bluefruit.begin();
  Bluefruit.setTxPower(BLE_TX_POWER);

  Bluefruit.Periph.setConnectCallback(connect_callback);
  Bluefruit.Periph.setDisconnectCallback(disconnect_callback);

  bledfu.begin();

  bledis.setManufacturer(MANUFACTURER_NAME);
  bledis.setModel(DEVICE_NAME);
  bledis.begin();

  bleuart.begin();

  startAdv();

  applySettings();

  Serial.println("Device ready for connections!");
}

void loop() {
  // Handle auto-off timer
  if (currentSettings.autoOff > 0 && Bluefruit.connected()) {
    if (millis() - lastActivityTime > (currentSettings.autoOff * 60000UL)) {
      Serial.println("Auto-off timeout reached");
      clearBuf();
      showLeds();
      sendErrorResponse(ERROR_POWER_LOW, "Auto-off timeout");
    }
  }

  // Update and display current pattern/effect (non-blocking patterns recommended;
  // your current ones are mostly quick, except strobe toggling.)
  updatePattern();

  // Echo received data
  if (Bluefruit.connected() && bleuart.available()) {
    lastActivityTime = millis();

    int command = bleuart.read();
    Serial.printf("Received command: 0x%02X (ASCII: %d)\n", command, command);

    if (command == CMD_STATUS) {
      uint8_t ack = RESPONSE_ACK_SUCCESS;
      bleuart.write(&ack, 1);
      Serial.println("Status command acknowledged");
      return;
    }

    if (command == CMD_ENTER_CONFIG) { handleEnterConfigMode(); return; }
    if (command == CMD_COMMIT_CONFIG) { handleCommitConfig(); return; }
    if (command == CMD_EXIT_CONFIG)   { handleExitConfigMode(); return; }
    if (command == CMD_CONFIG_UPDATE) { handleConfigUpdate(); return; }
    if (command == CMD_CLAIM_DEVICE)  { handleClaimDevice(); return; }
    if (command == CMD_VERIFY_OWNERSHIP) { handleVerifyOwnership(); return; }
    if (command == CMD_UNCLAIM_DEVICE) { handleUnclaimDevice(); return; }
    if (command == CMD_REQUEST_ANALYTICS) { handleRequestAnalytics(); return; }
    if (command == CMD_CONFIRM_ANALYTICS) { handleConfirmAnalytics(); return; }

    sendErrorResponse(ERROR_INVALID_COMMAND, "Unknown command");
  }
}

// ========================================
// BLE advertising (unchanged)
// ========================================

void startAdv(void) {
  Bluefruit.setName(DEVICE_NAME);

  Bluefruit.Advertising.clearData();
  Bluefruit.ScanResponse.clearData();

  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addTxPower();
  Bluefruit.Advertising.addService(bleuart);

  uint8_t manufacturerData[] = {0xFF, 0xFF};
  Bluefruit.Advertising.addData(BLE_GAP_AD_TYPE_MANUFACTURER_SPECIFIC_DATA,
                                manufacturerData, sizeof(manufacturerData));

  Bluefruit.ScanResponse.addName();

  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(BLE_FAST_INTERVAL, BLE_SLOW_INTERVAL);
  Bluefruit.Advertising.setFastTimeout(BLE_FAST_TIMEOUT);
  Bluefruit.Advertising.start(0);

  Serial.printf("BLE Advertising started with name: %s\n", DEVICE_NAME);
}

void connect_callback(uint16_t conn_handle) {
  BLEConnection* connection = Bluefruit.Connection(conn_handle);

  char central_name[32] = {0};
  connection->getPeerName(central_name, sizeof(central_name));

  Serial.print("Connected to ");
  Serial.println(central_name);

  memset(verifiedUserId, 0, sizeof(verifiedUserId));
  Serial.println("LED Guitar Controller ready for commands!");
  
  // Flash LEDs to indicate connection (3 quick flashes)
  for (int flash = 0; flash < 3; flash++) {
    fill_solid_buf(0, 255, 0); // Green flash
    showLeds();
    delay(100);
    clearBuf();
    showLeds();
    delay(100);
  }
  
  // Restore previous pattern if any
  if (currentSettings.currentPattern != PATTERN_OFF) {
    setPattern(currentSettings.currentPattern);
    showLeds();
  }
}

void disconnect_callback(uint16_t conn_handle, uint8_t reason) {
  Serial.printf("Disconnected, reason: %d\n", reason);

  memset(verifiedUserId, 0, sizeof(verifiedUserId));

  if (configModeActive) {
    configModeActive = false;
    configDirty = false;
    Serial.println("Config mode exited due to disconnect");
  }

  if (!configModeActive) {
    saveSettingsToFlash();
  }
}

// ========================================
// Settings Management (unchanged)
// ========================================

void initializeSettings() {
  if (loadSettingsFromFlash()) {
    Serial.println("Settings loaded from Flash");
    settingsLoaded = true;
  } else {
    Serial.println("No valid settings found, using defaults");
    resetToDefaultSettings();
    saveSettingsToFlash();
  }
}

void resetToDefaultSettings() {
  currentSettings.magic = SETTINGS_MAGIC;
  currentSettings.version = SETTINGS_VERSION;
  currentSettings.brightness = DEFAULT_BRIGHTNESS;
  currentSettings.currentPattern = PATTERN_OFF;
  currentSettings.powerMode = 0;
  currentSettings.autoOff = 0;
  currentSettings.maxEffects = MAX_EFFECTS;
  currentSettings.color[0] = 255;
  currentSettings.color[1] = 255;
  currentSettings.color[2] = 255;
  currentSettings.speed = 50;

  memset(currentSettings.ownerUserId, 0, sizeof(currentSettings.ownerUserId));
  currentSettings.hasOwner = false;

  for (int i = 0; i < 14; i++) currentSettings.reserved[i] = 0;

  currentSettings.checksum = calculateChecksum(&currentSettings);
}

bool loadSettingsFromFlash() {
  DeviceSettings loadedSettings;

  if (!InternalFS.begin()) {
    Serial.println("Failed to initialize LittleFS");
    return false;
  }

  Adafruit_LittleFS_Namespace::File file =
      InternalFS.open("/settings.dat", Adafruit_LittleFS_Namespace::FILE_O_READ);
  if (!file) {
    Serial.println("No settings file found");
    return false;
  }

  size_t bytesRead = file.read((uint8_t*)&loadedSettings, sizeof(DeviceSettings));
  file.close();

  if (bytesRead != sizeof(DeviceSettings)) {
    Serial.println("Settings file corrupted - wrong size");
    return false;
  }

  if (loadedSettings.magic != SETTINGS_MAGIC) {
    Serial.println("Invalid settings magic number");
    return false;
  }

  if (loadedSettings.version != SETTINGS_VERSION) {
    Serial.println("Settings version mismatch");
    return false;
  }

  uint32_t calculatedChecksum = calculateChecksum(&loadedSettings);
  if (loadedSettings.checksum != calculatedChecksum) {
    Serial.println("Settings checksum mismatch");
    return false;
  }

  memcpy(&currentSettings, &loadedSettings, sizeof(DeviceSettings));
  memcpy(&lastSavedSettings, &loadedSettings, sizeof(DeviceSettings));
  lastSavedStateValid = true;

  Serial.println("Settings loaded successfully from LittleFS");
  return true;
}

bool saveSettingsToFlash() {
  if (lastSavedStateValid) {
    if (memcmp(&currentSettings, &lastSavedSettings, sizeof(DeviceSettings)) == 0) {
      Serial.println("Settings unchanged, skipping flash write");
      return true;
    }
  }

  currentSettings.checksum = calculateChecksum(&currentSettings);
  Serial.printf("Calculated checksum before save: %lu\n", currentSettings.checksum);
  Serial.printf("DeviceSettings struct size: %zu bytes\n", sizeof(DeviceSettings));

  if (!InternalFS.begin()) {
    Serial.println("Failed to initialize LittleFS");
    return false;
  }

  if (InternalFS.exists("/settings.dat")) {
    if (!InternalFS.remove("/settings.dat")) {
      Serial.println("Warning: Failed to remove old settings file");
    }
    delay(10);
  }

  Adafruit_LittleFS_Namespace::File file =
      InternalFS.open("/settings.dat", Adafruit_LittleFS_Namespace::FILE_O_WRITE);
  if (!file) {
    Serial.println("Failed to create settings file");
    return false;
  }

  size_t bytesWritten = file.write((uint8_t*)&currentSettings, sizeof(DeviceSettings));
  Serial.printf("Bytes written: %zu (expected: %zu)\n", bytesWritten, sizeof(DeviceSettings));

  file.truncate(sizeof(DeviceSettings));
  file.flush();
  file.close();

  delay(100);

  if (bytesWritten != sizeof(DeviceSettings)) {
    Serial.println("Failed to write settings file - size mismatch");
    return false;
  }

  DeviceSettings verifySettings;
  memset(&verifySettings, 0, sizeof(DeviceSettings));

  file = InternalFS.open("/settings.dat", Adafruit_LittleFS_Namespace::FILE_O_READ);
  if (!file) {
    Serial.println("Failed to verify settings file");
    return false;
  }

  file.seek(0);
  size_t bytesRead = file.read((uint8_t*)&verifySettings, sizeof(DeviceSettings));
  Serial.printf("Bytes read: %zu (expected: %zu)\n", bytesRead, sizeof(DeviceSettings));
  Serial.printf("Stored checksum in file: %lu\n", verifySettings.checksum);
  file.close();

  if (bytesRead != sizeof(DeviceSettings)) {
    Serial.println("Settings save verification failed - wrong size");
    return false;
  }

  uint32_t verifyChecksum = calculateChecksum(&verifySettings);
  Serial.printf("Recalculated checksum from read-back: %lu\n", verifyChecksum);

  if (verifyChecksum != verifySettings.checksum) {
    Serial.println("Settings save verification failed - checksum mismatch");
    Serial.printf("Stored checksum: %lu, Recalculated: %lu, Expected: %lu\n",
                  verifySettings.checksum, verifyChecksum, currentSettings.checksum);
    return false;
  }

  if (verifySettings.checksum != currentSettings.checksum) {
    Serial.println("Settings save verification failed - stored checksum doesn't match");
    Serial.printf("Written checksum: %lu, Stored checksum: %lu\n",
                  currentSettings.checksum, verifySettings.checksum);
    return false;
  }

  size_t compareSize = sizeof(DeviceSettings) - sizeof(uint32_t);
  if (memcmp(&currentSettings, &verifySettings, compareSize) != 0) {
    Serial.println("Settings save verification failed - data mismatch after checksum verification");
    return false;
  }

  Serial.println("Settings saved successfully to LittleFS");

  memcpy(&lastSavedSettings, &currentSettings, sizeof(DeviceSettings));
  lastSavedStateValid = true;

  return true;
}

bool loadSettingsFromFlashInternal(DeviceSettings* settings) {
  if (!InternalFS.begin()) return false;

  Adafruit_LittleFS_Namespace::File file =
      InternalFS.open("/settings.dat", Adafruit_LittleFS_Namespace::FILE_O_READ);
  if (!file) return false;

  size_t bytesRead = file.read((uint8_t*)settings, sizeof(DeviceSettings));
  file.close();

  if (bytesRead != sizeof(DeviceSettings)) return false;
  if (settings->magic != SETTINGS_MAGIC) return false;
  if (settings->version != SETTINGS_VERSION) return false;

  uint32_t calculatedChecksum = calculateChecksum(settings);
  if (settings->checksum != calculatedChecksum) return false;

  return true;
}

uint32_t calculateChecksum(DeviceSettings* settings) {
  uint32_t checksum = 0;
  uint8_t* data = (uint8_t*)settings;

  for (size_t i = 0; i < sizeof(DeviceSettings) - sizeof(uint32_t); i++) {
    checksum += data[i];
  }
  return checksum;
}

void applySettings() {
  // Brightness - update global brightness for bitbang
  globalBrightness = currentSettings.brightness;

  // Pattern
  setPattern(currentSettings.currentPattern);

  // Power mode
  applyPowerMode();
}

// ========================================
// Validation (unchanged)
// ========================================

bool validateConfig(DeviceSettings* settings) {
  return validateBrightness(settings->brightness) &&
         validatePattern(settings->currentPattern) &&
         validatePowerMode(settings->powerMode) &&
         validateColor(settings->color[0], settings->color[1], settings->color[2]);
}

bool validateBrightness(uint8_t brightness) { return brightness <= MAX_BRIGHTNESS; }
bool validatePattern(uint8_t pattern) { return pattern < MAX_EFFECTS; }
bool validatePowerMode(uint8_t powerMode) { return powerMode <= 2; }
bool validateColor(uint8_t r, uint8_t g, uint8_t b) { (void)r; (void)g; (void)b; return true; }

void applyPowerMode() {
  switch (currentSettings.powerMode) {
    case 0: globalBrightness = currentSettings.brightness; break;
    case 1: globalBrightness = currentSettings.brightness / 2; break;
    case 2: globalBrightness = currentSettings.brightness / 4; break;
  }
  showLeds();
}

// ========================================
// Ownership helpers + BLE parsing (unchanged)
// ========================================

bool isDeveloperOrTestUser(const char* userId) {
  if (!userId || strlen(userId) == 0) return false;

  for (int i = 0; DEVELOPER_USER_IDS[i] != nullptr; i++) {
    if (strcmp(userId, DEVELOPER_USER_IDS[i]) == 0) return true;
  }
  for (int i = 0; TEST_USER_IDS[i] != nullptr; i++) {
    if (strcmp(userId, TEST_USER_IDS[i]) == 0) return true;
  }
  return false;
}

bool isOwnershipVerified() { return strlen(verifiedUserId) > 0; }

bool readUserIdFromBle(char* userId, uint8_t maxLen) {
  if (!bleuart.available()) {
    sendErrorResponse(ERROR_INVALID_PARAMETER, "Insufficient data");
    return false;
  }

  uint8_t userIdLen = bleuart.read();
  if (userIdLen == 0 || userIdLen > maxLen) {
    sendErrorResponse(ERROR_INVALID_PARAMETER, "Invalid user ID length");
    return false;
  }

  memset(userId, 0, maxLen + 1);
  for (uint8_t i = 0; i < userIdLen; i++) {
    if (!bleuart.available()) {
      sendErrorResponse(ERROR_INVALID_PARAMETER, "Insufficient data");
      return false;
    }
    userId[i] = (char)bleuart.read();
  }
  userId[userIdLen] = '\0';
  return true;
}

#define CHECK_OWNERSHIP_OR_RETURN() \
  do { \
    if (currentSettings.hasOwner && !isOwnershipVerified()) { \
      Serial.print("[CHECK_OWNERSHIP] ERROR: NOT OWNER!\n"); \
      sendErrorResponse(ERROR_NOT_OWNER, "Not authorized"); \
      return; \
    } \
  } while(0)

// ========================================
// Ownership handlers (unchanged)
// ========================================

void handleClaimDevice() {
  char userId[MAX_USER_ID_LENGTH + 1] = {0};
  if (!readUserIdFromBle(userId, MAX_USER_ID_LENGTH)) return;

  if (currentSettings.hasOwner) {
    if (isDeveloperOrTestUser(userId) || strcmp(userId, currentSettings.ownerUserId) == 0) {
      strncpy(currentSettings.ownerUserId, userId, MAX_USER_ID_LENGTH);
      currentSettings.ownerUserId[MAX_USER_ID_LENGTH] = '\0';
      saveSettingsToFlash();
      sendSuccessAck();
      Serial.print("[OWNERSHIP] Device reclaimed by: ");
      Serial.println(userId);
    } else {
      sendErrorResponse(ERROR_ALREADY_CLAIMED, "Device already claimed");
      Serial.print("[OWNERSHIP] Claim rejected - device already owned by: ");
      Serial.println(currentSettings.ownerUserId);
    }
  } else {
    strncpy(currentSettings.ownerUserId, userId, MAX_USER_ID_LENGTH);
    currentSettings.ownerUserId[MAX_USER_ID_LENGTH] = '\0';
    currentSettings.hasOwner = true;
    saveSettingsToFlash();
    sendSuccessAck();
    Serial.print("[OWNERSHIP] Device claimed by: ");
    Serial.println(userId);
  }
}

void handleVerifyOwnership() {
  char userId[MAX_USER_ID_LENGTH + 1] = {0};
  if (!readUserIdFromBle(userId, MAX_USER_ID_LENGTH)) return;

  bool isAuthorized = false;

  if (!currentSettings.hasOwner) {
    isAuthorized = true;
  } else if (strcmp(userId, currentSettings.ownerUserId) == 0) {
    isAuthorized = true;
  } else if (isDeveloperOrTestUser(userId)) {
    isAuthorized = true;
  }

  if (isAuthorized) {
    strncpy(verifiedUserId, userId, MAX_USER_ID_LENGTH);
    verifiedUserId[MAX_USER_ID_LENGTH] = '\0';
    sendSuccessAck();
    Serial.print("[OWNERSHIP] Ownership verified for: ");
    Serial.println(userId);
  } else {
    sendErrorResponse(ERROR_NOT_OWNER, "Not authorized");
    Serial.print("[OWNERSHIP] Ownership verification failed for: ");
    Serial.println(userId);
  }
}

void handleUnclaimDevice() {
  char userId[MAX_USER_ID_LENGTH + 1] = {0};
  if (!readUserIdFromBle(userId, MAX_USER_ID_LENGTH)) return;

  if (!currentSettings.hasOwner) {
    sendSuccessAck();
    return;
  }

  bool isAuthorized = false;
  if (strcmp(userId, currentSettings.ownerUserId) == 0) isAuthorized = true;
  else if (isDeveloperOrTestUser(userId)) isAuthorized = true;

  if (isAuthorized) {
    memset(currentSettings.ownerUserId, 0, sizeof(currentSettings.ownerUserId));
    currentSettings.hasOwner = false;
    saveSettingsToFlash();
    sendSuccessAck();
    Serial.println("[OWNERSHIP] Device unclaimed");
  } else {
    sendErrorResponse(ERROR_NOT_OWNER, "Not authorized");
    Serial.print("[OWNERSHIP] Unclaim rejected - not authorized: ");
    Serial.println(userId);
  }
}

// ========================================
// Config mode handlers (only LED calls changed)
// ========================================

void handleEnterConfigMode() {
  CHECK_OWNERSHIP_OR_RETURN();

  Serial.println("Entering config mode...");
  configModeActive = true;
  configDirty = false;

  memcpy(&ramBuffer, &currentSettings, sizeof(DeviceSettings));

  // Send 8-byte config response: [0x90, brightness, speed, r, g, b, effectType, powerState]
  // Note: App expects RGB color, not HSV
  uint8_t configResponse[8];
  configResponse[0] = RESPONSE_ACK_CONFIG_MODE;  // 0x90
  configResponse[1] = currentSettings.brightness;
  configResponse[2] = currentSettings.speed;
  configResponse[3] = currentSettings.color[0];  // R
  configResponse[4] = currentSettings.color[1];  // G
  configResponse[5] = currentSettings.color[2];  // B
  configResponse[6] = currentSettings.currentPattern;
  configResponse[7] = currentSettings.powerMode > 0 ? 1 : 0;
  
  bleuart.write(configResponse, 8);
  Serial.printf("Config mode active - sent config data: brightness=%d, speed=%d, color=(%d,%d,%d), pattern=%d\n",
                currentSettings.brightness, currentSettings.speed,
                currentSettings.color[0], currentSettings.color[1], currentSettings.color[2],
                currentSettings.currentPattern);
}

void handleExitConfigMode() {
  CHECK_OWNERSHIP_OR_RETURN();

  Serial.println("Exiting config mode...");

  if (configDirty) {
    Serial.println("Discarding unsaved changes");
    configDirty = false;
  }

  configModeActive = false;
  sendSuccessAck();
  Serial.println("Config mode exited");
}

void handleCommitConfig() {
  CHECK_OWNERSHIP_OR_RETURN();

  if (!configModeActive) {
    sendErrorResponse(ERROR_INVALID_COMMAND, "Not in config mode");
    return;
  }

  Serial.println("Committing config to flash...");

  if (!configDirty) {
    Serial.println("No changes to commit");
    sendCommitAck();
    return;
  }

  if (!validateConfig(&ramBuffer)) {
    sendErrorResponse(ERROR_INVALID_PARAMETER, "Invalid config values");
    return;
  }

  memcpy(&currentSettings, &ramBuffer, sizeof(DeviceSettings));

  if (saveSettingsToFlash()) {
    applySettings();
    configDirty = false;
    sendCommitAck();
    Serial.println("Config committed successfully");
  } else {
    sendErrorResponse(ERROR_FLASH_WRITE_FAILED, "Failed to save to flash");
  }
}

void handleConfigUpdate() {
  CHECK_OWNERSHIP_OR_RETURN();

  if (!configModeActive) {
    sendErrorResponse(ERROR_INVALID_COMMAND, "Not in config mode");
    return;
  }

  if (bleuart.available() < 1) {
    sendErrorResponse(ERROR_INVALID_PARAMETER, "Insufficient data");
    return;
  }

  int paramType = bleuart.read();
  Serial.printf("Config update: paramType=0x%02X, available bytes: %d\n", paramType, bleuart.available());

  bool updated = false;

  switch (paramType) {
    case 0x00: { // Brightness
      if (bleuart.available() >= 1) {
        int brightness = bleuart.read();
        if (validateBrightness(brightness)) {
          ramBuffer.brightness = brightness;
          // Also update currentSettings for immediate preview
          currentSettings.brightness = brightness;
          globalBrightness = brightness;
          updated = true;

          // preview immediately
          showLeds();
        } else {
          sendErrorResponse(ERROR_INVALID_PARAMETER, "Invalid brightness");
          return;
        }
      }
      break;
    }
    case 0x01: { // Pattern
      if (bleuart.available() >= 1) {
        int pattern = bleuart.read();
        Serial.printf("  Pattern update: %d (current: %d)\n", pattern, currentSettings.currentPattern);
        if (validatePattern(pattern)) {
          ramBuffer.currentPattern = pattern;
          // Also update currentSettings for immediate preview in loop
          currentSettings.currentPattern = pattern;
          updated = true;

          Serial.printf("  Setting pattern to: %d\n", pattern);
          setPattern((uint8_t)pattern);
          showLeds();
          Serial.printf("  Pattern set and LEDs shown\n");
        } else {
          sendErrorResponse(ERROR_INVALID_PARAMETER, "Invalid pattern");
          return;
        }
      }
      break;
    }
    case 0x02: { // Color (RGB)
      if (bleuart.available() >= 3) {
        int r = bleuart.read();
        int g = bleuart.read();
        int b = bleuart.read();
        Serial.printf("  Color update: RGB(%d, %d, %d), current pattern: %d\n", r, g, b, ramBuffer.currentPattern);
        if (validateColor(r, g, b)) {
          ramBuffer.color[0] = r;
          ramBuffer.color[1] = g;
          ramBuffer.color[2] = b;
          // Also update currentSettings for immediate preview
          currentSettings.color[0] = r;
          currentSettings.color[1] = g;
          currentSettings.color[2] = b;
          updated = true;
          
          // Apply color immediately for real-time preview
          // Re-apply current pattern with new color so all patterns see the change
          Serial.printf("  Re-applying pattern %d with new color\n", ramBuffer.currentPattern);
          setPattern(ramBuffer.currentPattern);
          showLeds();
          Serial.printf("  Color applied and LEDs shown\n");
        } else {
          sendErrorResponse(ERROR_INVALID_PARAMETER, "Invalid color");
          return;
        }
      }
      break;
    }
    case 0x03: { // Power Mode
      if (bleuart.available() >= 1) {
        int powerMode = bleuart.read();
        if (validatePowerMode(powerMode)) {
          ramBuffer.powerMode = powerMode;
          updated = true;
          applyPowerMode();
        } else {
          sendErrorResponse(ERROR_INVALID_PARAMETER, "Invalid power mode");
          return;
        }
      }
      break;
    }
    case 0x04: { // Speed
      if (bleuart.available() >= 1) {
        int speed = bleuart.read();
        if (speed >= 0 && speed <= 100) {
          ramBuffer.speed = speed;
          // Also update currentSettings for immediate preview in loop
          currentSettings.speed = speed;
          updated = true;
          Serial.printf("  Speed updated to: %d%% (pattern: %d)\n", speed, ramBuffer.currentPattern);
          // Re-apply pattern so speed change is visible immediately
          setPattern(ramBuffer.currentPattern);
          showLeds();
        } else {
          sendErrorResponse(ERROR_INVALID_PARAMETER, "Invalid speed (must be 0-100)");
          return;
        }
      }
      break;
    }
    default: {
      sendErrorResponse(ERROR_INVALID_PARAMETER, "Unknown parameter type");
      return;
    }
  }

  if (updated) {
    configDirty = true;
    sendSuccessAck();
    Serial.println("Config updated in RAM buffer");
  }
}

// ========================================
// Response functions (unchanged)
// ========================================

void sendErrorResponse(uint8_t errorCode, const char* message) {
  uint8_t errorEnvelope[64];
  errorEnvelope[0] = 0x90;
  errorEnvelope[1] = errorCode;

  int msgLen = strlen(message);
  int totalLen = 2 + msgLen;
  if (totalLen > 63) totalLen = 63;

  memcpy(&errorEnvelope[2], message, totalLen - 2);

  bleuart.write(errorEnvelope, totalLen);
  Serial.printf("Error %d: %s\n", errorCode, message);
}

void sendConfigModeAck() { uint8_t ack = RESPONSE_ACK_CONFIG_MODE; bleuart.write(&ack, 1); }
void sendCommitAck()     { uint8_t ack = RESPONSE_ACK_COMMIT;      bleuart.write(&ack, 1); }
void sendSuccessAck()    { uint8_t ack = RESPONSE_ACK_SUCCESS;     bleuart.write(&ack, 1); }

// ========================================
// Analytics Handlers
// ========================================

void handleRequestAnalytics() {
  CHECK_OWNERSHIP_OR_RETURN();
  
  Serial.println("Request analytics batch");
  
  // Send analytics batch response with empty data (0 sessions)
  // Format: [RESPONSE_TYPE(1)] [BATCH_ID(1)] [SESSION_COUNT(1)] [FLASH_READS(2)] 
  //          [FLASH_WRITES(2)] [ERROR_COUNT(2)] [LAST_ERROR_CODE(1)] 
  //          [LAST_ERROR_TIMESTAMP(4)] [AVG_POWER(2)] [PEAK_POWER(2)]
  //          [SESSIONS...]
  
  const uint8_t HEADER_SIZE = 1 + 1 + 1 + 2 + 2 + 2 + 1 + 4 + 2 + 2; // 18 bytes
  uint8_t payload[HEADER_SIZE];
  uint8_t idx = 0;
  
  payload[idx++] = RESPONSE_ANALYTICS_BATCH;
  payload[idx++] = 0; // batchId (placeholder)
  payload[idx++] = 0; // sessionCount (no sessions yet)
  
  // Flash reads (2 bytes, big-endian)
  payload[idx++] = 0;
  payload[idx++] = 0;
  
  // Flash writes (2 bytes)
  payload[idx++] = 0;
  payload[idx++] = 0;
  
  // Error count (2 bytes)
  payload[idx++] = 0;
  payload[idx++] = 0;
  
  // Last error code (1 byte, 0 = no error)
  payload[idx++] = 0;
  
  // Last error timestamp (4 bytes, big-endian, 0 = no error)
  payload[idx++] = 0;
  payload[idx++] = 0;
  payload[idx++] = 0;
  payload[idx++] = 0;
  
  // Average power (2 bytes, 0 = not available)
  payload[idx++] = 0;
  payload[idx++] = 0;
  
  // Peak power (2 bytes, 0 = not available)
  payload[idx++] = 0;
  payload[idx++] = 0;
  
  bleuart.write(payload, HEADER_SIZE);
  Serial.println("Analytics batch sent (empty)");
}

void handleConfirmAnalytics() {
  CHECK_OWNERSHIP_OR_RETURN();
  
  Serial.println("Confirm analytics batch received");
  // For now, just acknowledge - future implementation can clear sent analytics
  sendSuccessAck();
}

// ========================================
// Pattern functions (Bitbang SPI-backed)
// ========================================

void updatePattern() {
  if (currentSettings.currentPattern == PATTERN_OFF) {
    // For OFF pattern, clear buffer but don't update constantly
    if (ledBufferChanged || millis() - lastLedUpdate > 100) {
      clearBuf();
      showLeds();
    }
    return;
  }

  // Update pattern logic (this modifies ledBuf)
  switch (currentSettings.currentPattern) {
    case PATTERN_SOLID_WHITE:
      // Use current color from settings (RGB values from React app)
      fill_solid_buf(currentSettings.color[0], currentSettings.color[1], currentSettings.color[2]);
      break;

    case PATTERN_RAINBOW:
      rainbow();
      ledBufferChanged = true;
      break;

    case PATTERN_PULSE:
      pulse();
      break;

    case PATTERN_FADE:
      fill_solid_buf(currentSettings.color[0], currentSettings.color[1], currentSettings.color[2]);
      break;

    case PATTERN_CHASE:
      chase();
      ledBufferChanged = true;
      break;

    case PATTERN_TWINKLE:
      twinkle();
      ledBufferChanged = true;
      break;

    case PATTERN_WAVE:
      wave();
      ledBufferChanged = true;
      break;

    case PATTERN_BREATH:
      breath();
      ledBufferChanged = true;
      break;

    case PATTERN_STROBE:
      strobe();
      ledBufferChanged = true;
      break;

    default:
      break;
  }
  
  // Only show LEDs if frame rate allows (showLeds() handles the rate limiting)
  showLeds();
}

void setPattern(uint8_t pattern) {
  Serial.printf("[setPattern] Setting pattern %d, color RGB(%d, %d, %d), speed: %d\n", 
                pattern, currentSettings.color[0], currentSettings.color[1], currentSettings.color[2], currentSettings.speed);
  switch (pattern) {
    case PATTERN_OFF:
      clearBuf();
      break;

    case PATTERN_SOLID_WHITE:
      // Use current color from settings (not hardcoded white)
      fill_solid_buf(currentSettings.color[0], currentSettings.color[1], currentSettings.color[2]);
      break;

    case PATTERN_RAINBOW:
      rainbow();
      break;

    case PATTERN_PULSE:
      pulse();
      break;

    case PATTERN_FADE:
      fade();
      break;

    case PATTERN_CHASE:
      chase();
      break;

    case PATTERN_TWINKLE:
      twinkle();
      break;

    case PATTERN_WAVE:
      wave();
      break;

    case PATTERN_BREATH:
      breath();
      break;

    case PATTERN_STROBE:
      strobe();
      break;

    default:
      Serial.printf("[setPattern] Unknown pattern %d, clearing\n", pattern);
      clearBuf();
      break;
  }

  showLeds();
  Serial.printf("[setPattern] Pattern %d applied, buffer changed: %d\n", pattern, ledBufferChanged);
}

// === Effect: Rainbow (Red-White-Blue Blend Cycle) ===
void rainbow() {
  const RGB cycleColors[3] = { {255,0,0}, {255,255,255}, {0,0,255} };

  for (int i = 0; i < LED_COUNT; i++) {
    float position = (float)i / (float)LED_COUNT;
    int colorIndex = (int)(position * 3) % 3;
    float blendFactor = (position * 3) - (int)(position * 3);

    RGB startColor = cycleColors[colorIndex];
    RGB endColor = cycleColors[(colorIndex + 1) % 3];
    ledBuf[i] = blend_rgb(startColor, endColor, (uint8_t)(blendFactor * 255));
  }
}

void pulse() {
  // Pulse effect: fade brightness in and out using sine wave
  // Use current color from settings
  uint8_t r = currentSettings.color[0];
  uint8_t g = currentSettings.color[1];
  uint8_t b = currentSettings.color[2];
  
  // Calculate pulse brightness (0-255) using sine wave
  uint32_t now = millis();
  // Speed control: use currentSettings.speed (0-100) to control pulse rate
  // Map speed to pulse period: 0 = slow (4000ms), 100 = fast (500ms)
  uint16_t pulsePeriod = map(currentSettings.speed, 0, 100, 4000, 500);
  uint8_t pulsePhase = (uint8_t)((now % pulsePeriod) * 255 / pulsePeriod);
  uint8_t pulseBrightness = sin8_approx(pulsePhase);
  
  // Apply pulse brightness to color
  for (int i = 0; i < LED_COUNT; i++) {
    ledBuf[i].r = (uint8_t)((uint16_t)r * pulseBrightness / 255);
    ledBuf[i].g = (uint8_t)((uint16_t)g * pulseBrightness / 255);
    ledBuf[i].b = (uint8_t)((uint16_t)b * pulseBrightness / 255);
  }
  ledBufferChanged = true;
}

void fade() {
  fill_solid_buf(255, 255, 255);
}

#define CHASER_PULSE 12
void chase() {
  uint8_t pos1 = map(beat8_like(CHASER_PULSE, 0),   0, 255, 0, LED_COUNT - 1);
  uint8_t pos2 = map(beat8_like(CHASER_PULSE, 85),  0, 255, 0, LED_COUNT - 1);
  uint8_t pos3 = map(beat8_like(CHASER_PULSE, 170), 0, 255, 0, LED_COUNT - 1);

  fadeToBlackBy_buf(20);

  ledBuf[pos1] = {255, 0, 0};
  ledBuf[pos2] = {255, 255, 255};
  ledBuf[pos3] = {0, 0, 255};
}

void twinkle() {
  for (int i = 0; i < LED_COUNT; i++) {
    if (random(10) < 3) ledBuf[i] = {255, 255, 255};
    else ledBuf[i] = {0, 0, 0};
  }
  // Note: ledBufferChanged is set by caller
}

void wave() {
  // Wave effect: traveling wave of color across the strip
  // Use speed setting to control wave speed
  uint32_t now = millis();
  // Map speed to wave speed: 0 = slow (>> 4), 100 = fast (>> 1)
  uint8_t speedShift = map(currentSettings.speed, 0, 100, 4, 1);
  uint8_t timePhase = (uint8_t)(now >> speedShift);
  
  for (int i = 0; i < LED_COUNT; i++) {
    // Create a wave that travels along the strip
    // Each LED has a phase offset based on position
    uint8_t positionPhase = (uint8_t)((i * 255) / LED_COUNT);
    // Combine time and position for traveling wave
    uint8_t wavePhase = timePhase + positionPhase;
    uint8_t sineVal = sin8_approx(wavePhase);
    uint8_t g = gamma8[sineVal];

    // Use HSV color space for smooth color transitions
    RGB rgb = hsv2rgb(wavePhase, 255, g);
    ledBuf[i] = rgb;
  }
  ledBufferChanged = true;
}

void breath() {
  uint8_t b = (uint8_t)((sin8_approx((uint8_t)(millis() >> 3)) + 1) >> 1);
  // Original used HSV(0,0,brightness) => grayscale
  ledBuf[0] = {b, b, b};
  for (int i = 1; i < LED_COUNT; i++) ledBuf[i] = ledBuf[0];
  // Note: ledBufferChanged is set by caller
}

void strobe() {
  // Strobe effect: rapid on/off flashing
  // Use speed setting to control strobe rate: 0 = slow, 100 = fast
  uint32_t now = millis();
  // Map speed to strobe period: 0 = 1000ms (1Hz), 100 = 50ms (20Hz)
  uint16_t strobePeriod = map(currentSettings.speed, 0, 100, 1000, 50);
  bool strobeState = ((now / strobePeriod) % 2) == 0;
  
  if (strobeState) {
    // Use current color from settings at full brightness
    fill_solid_buf(currentSettings.color[0], currentSettings.color[1], currentSettings.color[2]);
  } else {
    clearBuf();
  }
  ledBufferChanged = true;
}
