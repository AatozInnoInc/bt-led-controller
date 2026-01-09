// Common BLE UUID constants for Nordic UART Service (NUS)
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_WRITE_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_NOTIFY_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// Helpful partials for permissive matches across platforms/vendors
export const UART_UUID_PARTIALS = ['6e400', '6e400001', '6e400002', '6e400003'];

export const ADAFRUIT_KEYWORDS = ['adafruit', 'bluefruit', 'feather'];

// Custom LED Guitar Device Identification Protocol
export const LED_GUITAR_DEVICE_PREFIX = 'LED_GUITAR_';
export const LED_GUITAR_MANUFACTURER_ID = 'LED_GUITAR_CONTROLLER';
export const LED_GUITAR_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'; // Nordic UART Service

// Device naming convention: LED_GUITAR_[UNIQUE_ID]
// Example: LED_GUITAR_001, LED_GUITAR_MY_GUITAR, etc.
export const isLedGuitarDevice = (device: any): boolean => {
  const name = device.name || device.localName || '';
  const manufacturerData = device.manufacturerData || '';
  const serviceUUIDs = device.serviceUUIDs || [];

  // Check for our specific device name prefix
  const hasLedGuitarName = name.toUpperCase().startsWith(LED_GUITAR_DEVICE_PREFIX.toUpperCase());
  
  // Check for our manufacturer identifier
  // Note: manufacturerData might be base64-encoded, so we need to decode it first
  let hasLedGuitarManufacturer = false;
  if (manufacturerData && manufacturerData !== 'Unknown') {
    try {
      // Try to decode base64 if it looks like base64
      if (manufacturerData.length > 0 && !manufacturerData.includes(' ')) {
        try {
          const decoded = atob(manufacturerData);
          hasLedGuitarManufacturer = decoded.includes(LED_GUITAR_MANUFACTURER_ID);
        } catch (e) {
          // Not valid base64, continue to string check
        }
      }
      // Also check the raw string in case it's not base64
      if (!hasLedGuitarManufacturer) {
        hasLedGuitarManufacturer = manufacturerData.includes(LED_GUITAR_MANUFACTURER_ID);
      }
    } catch (e) {
      // If decoding fails, just check the raw string
      hasLedGuitarManufacturer = manufacturerData.includes(LED_GUITAR_MANUFACTURER_ID);
    }
  }
  
  // Check for Nordic UART Service (required for communication)
  const hasNordicUART = serviceUUIDs && serviceUUIDs.length > 0 && serviceUUIDs.some((uuid: string) => 
    uuid.toLowerCase().includes('6e400001') || // Nordic UART Service
    uuid.toLowerCase().includes('6e400002') || // Write characteristic
    uuid.toLowerCase().includes('6e400003')    // Notify characteristic
  );

  const result = hasLedGuitarName || hasLedGuitarManufacturer || hasNordicUART;
  
  // Debug logging for iOS to help diagnose filtering issues
  if (__DEV__) {
    if (result) {
      console.log('✅ LED Guitar device detected:', {
        id: device.id,
        name: name || '(no name)',
        hasLedGuitarName,
        hasLedGuitarManufacturer,
        hasNordicUART,
        serviceUUIDs: serviceUUIDs?.length || 0
      });
    } else if (name || (serviceUUIDs && serviceUUIDs.length > 0)) {
      // Only log devices that have a name or service UUIDs to reduce noise
      console.log('❌ Device filtered out:', {
        id: device.id,
        name: name || '(no name)',
        hasLedGuitarName,
        hasLedGuitarManufacturer,
        hasNordicUART,
        serviceUUIDs: serviceUUIDs?.length || 0,
        manufacturerDataLength: manufacturerData?.length || 0
      });
    }
  }

  return result;
};

export const isUuidLikelyUart = (uuid: string): boolean => {
  const lower = uuid.toLowerCase();
  return (
    lower === NUS_SERVICE_UUID ||
    UART_UUID_PARTIALS.some(part => lower.includes(part))
  );
};

// Enhanced Communication Protocol Commands
export const BLE_COMMANDS = {
  VERSION: 'V',
  SET_LED: 'S',
  CLEAR: 'C',
  BRIGHTNESS: 'B',
  PATTERN: 'P',
  INFO: 'I',
  SETTINGS_GET: 'G',
  SETTINGS_SET: 'T',
  SETTINGS_SAVE: 'A',
  SETTINGS_LOAD: 'L',
  SETTINGS_RESET: 'R',
  POWER_GET: 'W',
  EFFECTS_GET: 'F',
  // TODO for Agent: Unify commands list by using hex or char, but not both.
  // Config Mode Commands (binary)
  CMD_STATUS: 0x00, // Status/ping command for connection verification
  CMD_ENTER_CONFIG: 0x10,
  CMD_EXIT_CONFIG: 0x11,   // Fixed: was 0x12, now matches Arduino firmware
  CMD_COMMIT_CONFIG: 0x12, // Fixed: was 0x11, now matches Arduino firmware
  CMD_CONFIG_UPDATE: 0x02,
  CMD_UPDATE_COLOR: 0x03
} as const;

// Response Types
export const RESPONSE_TYPES = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  STATUS: 'STATUS',
  SETTINGS: 'SETTINGS',
  POWER: 'POWER',
  EFFECTS: 'EFFECTS',
  DEVICE: 'DEVICE',
} as const;

// Error Codes
export const ERROR_CODES = {
  NONE: 0x00,
  INVALID_COMMAND: 0x01,
  INVALID_PARAMETER: 0x02,
  SETTINGS_CORRUPT: 0x03,
  EEPROM_FAILURE: 0x04,
  FLASH_FAILURE: 0x04, // Alias for EEPROM_FAILURE
  LED_FAILURE: 0x05,
  MEMORY_LOW: 0x06,
  POWER_LOW: 0x07,
} as const;

// Response Codes
export const RESPONSE_CODES = {
  ACK_CONFIG_MODE: 0x90,
  ACK_COMMIT: 0x91,
  ACK_SUCCESS: 0x92,
} as const;

// LED Patterns
export const LED_PATTERNS = {
  OFF: 0,
  SOLID_WHITE: 1,
  RAINBOW: 2,
  PULSE: 3,
  FADE: 4,
  CHASE: 5,
  TWINKLE: 6,
  WAVE: 7,
  BREATH: 8,
  STROBE: 9,
} as const;

// Power Modes
export const POWER_MODES = {
  NORMAL: 0,
  LOW_POWER: 1,
  ECO: 2,
} as const;

// HSV Color (for compatibility with LEDConfig)
export interface HSVColor {
  h: number; // 0-255 (Hue)
  s: number; // 0-255 (Saturation)
  v: number; // 0-255 (Value/Brightness)
}

// Device Settings Interface (unified with LEDConfig fields)
export interface DeviceSettings {
  brightness: number;
  currentPattern: number;
  powerMode: number;
  autoOff: number;
  maxEffects: number;
  defaultColor: [number, number, number]; // RGB
  // LEDConfig compatible fields
  speed: number; // 0-100
  color: HSVColor; // HSV color
  effectType: number; // 0-5 (EffectType enum)
  powerState: boolean; // on/off
}

// Response Parsing
export const parseResponse = (response: string): {
  type: string;
  data: any;
  error?: { code: number; message: string };
} => {
  if (response.startsWith('SUCCESS:')) {
    return {
      type: RESPONSE_TYPES.SUCCESS,
      data: response.substring(8),
    };
  }
  
  if (response.startsWith('ERROR:')) {
    const parts = response.substring(6).split(':');
    return {
      type: RESPONSE_TYPES.ERROR,
      data: null,
      error: {
        code: parseInt(parts[0]),
        message: parts[1] || 'Unknown error',
      },
    };
  }
  
  if (response.startsWith('STATUS:')) {
    return {
      type: RESPONSE_TYPES.STATUS,
      data: parseStatusResponse(response),
    };
  }
  
  if (response.startsWith('SETTINGS:')) {
    return {
      type: RESPONSE_TYPES.SETTINGS,
      data: parseSettingsResponse(response),
    };
  }
  
  if (response.startsWith('POWER:')) {
    return {
      type: RESPONSE_TYPES.POWER,
      data: parsePowerResponse(response),
    };
  }
  
  if (response.startsWith('EFFECTS:')) {
    return {
      type: RESPONSE_TYPES.EFFECTS,
      data: parseEffectsResponse(response),
    };
  }
  
  if (response.startsWith('DEVICE:')) {
    return {
      type: RESPONSE_TYPES.DEVICE,
      data: parseDeviceResponse(response),
    };
  }
  
  // Default: treat as raw data
  return {
    type: 'RAW',
    data: response,
  };
};

const parseStatusResponse = (response: string): any => {
  const data: any = {};
  const parts = response.substring(7).split(',');
  
  parts.forEach(part => {
    const [key, value] = part.split(':');
    if (key && value) {
      data[key.toLowerCase()] = isNaN(Number(value)) ? value : Number(value);
    }
  });
  
  return data;
};

const parseSettingsResponse = (response: string): DeviceSettings => {
  const data: any = {};
  const parts = response.substring(9).split(',');
  
  parts.forEach(part => {
    const [key, value] = part.split(':');
    if (key && value) {
      if (key === 'COLOR') {
        const colors = value.split(',').map(Number);
        data.defaultColor = colors as [number, number, number];
      } else {
        data[key.toLowerCase()] = Number(value);
      }
    }
  });
  
  return data as DeviceSettings;
};

const parsePowerResponse = (response: string): any => {
  const data: any = {};
  const parts = response.substring(6).split(',');
  
  parts.forEach(part => {
    const [key, value] = part.split(':');
    if (key && value) {
      data[key.toLowerCase()] = Number(value);
    }
  });
  
  return data;
};

const parseEffectsResponse = (response: string): string[] => {
  const effects = response.substring(8);
  return effects.split(',').map(effect => effect.trim());
};

const parseDeviceResponse = (response: string): any => {
  const data: any = {};
  const parts = response.substring(7).split(',');
  
  parts.forEach(part => {
    const [key, value] = part.split(':');
    if (key && value) {
      data[key.toLowerCase()] = isNaN(Number(value)) ? value : Number(value);
    }
  });
  
  return data;
};


