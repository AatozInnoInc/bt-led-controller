// Common BLE UUID constants for Nordic UART Service (NUS)
export const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_WRITE_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_NOTIFY_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// Helpful partials for permissive matches across platforms/vendors
export const UART_UUID_PARTIALS = ['6e400', '6e400001', '6e400002', '6e400003'];

export const ADAFRUIT_KEYWORDS = ['adafruit', 'bluefruit', 'feather'];

export const isUuidLikelyUart = (uuid: string): boolean => {
  const lower = uuid.toLowerCase();
  return (
    lower === NUS_SERVICE_UUID ||
    UART_UUID_PARTIALS.some(part => lower.includes(part))
  );
};


