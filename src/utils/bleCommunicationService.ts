import { BLE_COMMANDS, RESPONSE_TYPES, parseResponse, DeviceSettings, LED_PATTERNS, POWER_MODES, RESPONSE_CODES } from './bleConstants';
import { BluetoothDevice } from '../types/bluetooth';
import { BLECommandEncoder } from '../domain/bluetooth/bleCommandEncoder';
import { ErrorEnvelope, parseErrorEnvelope, createErrorEnvelope, ErrorCode } from '../domain/common/errorEnvelope';
import { bluetoothService } from './bluetoothService';
import { configurationModule } from '../domain/bluetooth/configurationModule';

export interface BLECommandResult {
  success: boolean;
  data?: any;
  error?: {
    code: number;
    message: string;
  };
}

export interface DeviceStatus {
  connected: boolean;
  brightness: number;
  pattern: number;
  power: number;
}

export class BLECommunicationService {
  private static instance: BLECommunicationService;
  private connectedDevice: BluetoothDevice | null = null;
  private messageQueue: Array<{ command: string | Uint8Array; resolve: (result: BLECommandResult) => void; reject: (error: any) => void }> = [];
  private isProcessing = false;

  static getInstance(): BLECommunicationService {
    if (!BLECommunicationService.instance) {
      BLECommunicationService.instance = new BLECommunicationService();
    }
    return BLECommunicationService.instance;
  }

  setConnectedDevice(device: BluetoothDevice | null) {
    this.connectedDevice = device;
  }

  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }

  // Send a command and wait for response
  async sendCommand(command: string | Uint8Array, timeout: number = 5000): Promise<BLECommandResult> {
    return new Promise((resolve, reject) => {
      if (!this.connectedDevice) {
        reject(new Error('No device connected'));
        return;
      }

      // Add command to queue
      this.messageQueue.push({ command: command as any, resolve, reject });

      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }

      // Set timeout
      setTimeout(() => {
        const index = this.messageQueue.findIndex(item => {
          if (command instanceof Uint8Array) {
            if (item.command instanceof Uint8Array) {
              return item.command.length === command.length &&
                item.command.every((val, idx) => val === command[idx]);
            }
            return false;
          }
          return item.command === command;
        });
        if (index !== -1) {
          this.messageQueue.splice(index, 1);
          reject(new Error('Command timeout'));
        }
      }, timeout);
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const { command, resolve, reject } = this.messageQueue.shift()!;

      try {
        const result = await this.executeCommand(command);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessing = false;
  }

  private async executeCommand(command: string | Uint8Array): Promise<BLECommandResult> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    // Convert command to string if it's a Uint8Array
    const commandString = command instanceof Uint8Array
      ? BLECommandEncoder.toBase64(command)
      : command;

    console.log(`Sending command: ${commandString}`);
    
    try {
      // Send message using real BluetoothService
      await bluetoothService.sendMessage(this.connectedDevice.id, commandString);
      
      // For binary commands, wait for notification response
      if (command instanceof Uint8Array) {
        // Wait a bit for response (in real implementation, this would wait for notification)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // TODO: Check if we got an error from the configuration module
        const state = configurationModule.getState();
        if (state === 'error') {
          return {
            success: false,
            error: {
              code: ErrorCode.INVALID_COMMAND,
              message: 'Command failed',
            },
          };
        }
        
        return {
          success: true,
          data: { acknowledged: true },
        };
      }
      
      // For text commands, parse response
      const response = await this.sendMessageToDevice(commandString);
      const parsed = parseResponse(response);
      
      if (parsed.type === RESPONSE_TYPES.ERROR) {
        return {
          success: false,
          error: parsed.error,
        };
      }
      
      return {
        success: true,
        data: parsed.data,
      };
    } catch (error: any) {
      const errorEnvelope = parseErrorEnvelope(
        error?.data || new Uint8Array([ErrorCode.INVALID_COMMAND])
      ) || createErrorEnvelope(ErrorCode.INVALID_COMMAND, error?.message || 'Command failed');
      
      return {
        success: false,
        error: {
          code: errorEnvelope.code,
          message: errorEnvelope.message,
        },
      };
    }
  }

  private async sendMessageToDevice(message: string): Promise<string> {
    // This would use your existing BLE service to send the message
    // For now, we'll simulate responses
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate different responses based on command
        if (message === BLE_COMMANDS.VERSION) {
          resolve('LED_GUITAR_CONTROLLER_v1.0');
        } else if (message === BLE_COMMANDS.INFO) {
          resolve('DEVICE:LED_GUITAR_001,LEDS:16,BRIGHTNESS:128,PATTERN:0,POWER:0');
        } else if (message === BLE_COMMANDS.SETTINGS_GET) {
          resolve('SETTINGS:BRIGHTNESS:128,PATTERN:0,POWER:0,AUTOOFF:0,MAXEFFECTS:10,COLOR:255,255,255');
        } else if (message.startsWith(BLE_COMMANDS.SET_LED)) {
          resolve('SUCCESS:LED set');
        } else if (message === BLE_COMMANDS.CLEAR) {
          resolve('SUCCESS:All LEDs cleared');
        } else if (message.startsWith(BLE_COMMANDS.BRIGHTNESS)) {
          resolve('SUCCESS:Brightness set');
        } else if (message.startsWith(BLE_COMMANDS.PATTERN)) {
          resolve('SUCCESS:Pattern set');
        } else {
          resolve('SUCCESS:Command executed');
        }
      }, 100);
    });
  }

  // High-level command methods
  async getVersion(): Promise<BLECommandResult> {
    return this.sendCommand(BLE_COMMANDS.VERSION);
  }

  async getDeviceInfo(): Promise<BLECommandResult> {
    return this.sendCommand(BLE_COMMANDS.INFO);
  }

  async getSettings(): Promise<BLECommandResult> {
    return this.sendCommand(BLE_COMMANDS.SETTINGS_GET);
  }

  async setSettings(settings: Partial<DeviceSettings>): Promise<BLECommandResult> {
    const command = `${BLE_COMMANDS.SETTINGS_SET}${settings.brightness || 0}${settings.currentPattern || 0}${settings.powerMode || 0}${settings.autoOff || 0}${settings.maxEffects || 10}${settings.defaultColor?.[0] || 255}${settings.defaultColor?.[1] || 255}${settings.defaultColor?.[2] || 255}`;
    return this.sendCommand(command);
  }

  async saveSettings(): Promise<BLECommandResult> {
    return this.sendCommand(BLE_COMMANDS.SETTINGS_SAVE);
  }

  async loadSettings(): Promise<BLECommandResult> {
    return this.sendCommand(BLE_COMMANDS.SETTINGS_LOAD);
  }

  async resetSettings(): Promise<BLECommandResult> {
    return this.sendCommand(BLE_COMMANDS.SETTINGS_RESET);
  }

  async setLED(index: number, r: number, g: number, b: number): Promise<BLECommandResult> {
    const command = `${BLE_COMMANDS.SET_LED}${index}${r}${g}${b}`;
    return this.sendCommand(command);
  }

  async clearLEDs(): Promise<BLECommandResult> {
    return this.sendCommand(BLE_COMMANDS.CLEAR);
  }

  async setBrightness(brightness: number): Promise<BLECommandResult> {
    const command = `${BLE_COMMANDS.BRIGHTNESS}${brightness}`;
    return this.sendCommand(command);
  }

  async setPattern(pattern: number): Promise<BLECommandResult> {
    const command = `${BLE_COMMANDS.PATTERN}${pattern}`;
    return this.sendCommand(command);
  }

  async getPowerInfo(): Promise<BLECommandResult> {
    return this.sendCommand(BLE_COMMANDS.POWER_GET);
  }

  async getAvailableEffects(): Promise<BLECommandResult> {
    return this.sendCommand(BLE_COMMANDS.EFFECTS_GET);
  }

  // Config Mode Commands
  async enterConfigMode(): Promise<BLECommandResult> {
    const command = BLECommandEncoder.encodeEnterConfigMode();
    return this.sendCommand(command);
  }

  async commitConfig(): Promise<BLECommandResult> {
    const command = BLECommandEncoder.encodeCommitConfig();
    return this.sendCommand(command);
  }

  async exitConfigMode(): Promise<BLECommandResult> {
    const command = BLECommandEncoder.encodeExitConfigMode();
    return this.sendCommand(command);
  }

  async updateConfigParameter(paramType: number, value: number | number[]): Promise<BLECommandResult> {
    const command = BLECommandEncoder.encodeConfigUpdate(paramType, value);
    return this.sendCommand(command);
  }

  async updateBrightness(brightness: number): Promise<BLECommandResult> {
    const command = BLECommandEncoder.encodeBrightnessUpdate(brightness);
    return this.sendCommand(command);
  }

  async updatePattern(pattern: number): Promise<BLECommandResult> {
    const command = BLECommandEncoder.encodePatternUpdate(pattern);
    return this.sendCommand(command);
  }

  async updateColor(r: number, g: number, b: number): Promise<BLECommandResult> {
    const command = BLECommandEncoder.encodeColorUpdate(r, g, b);
    return this.sendCommand(command);
  }

  // Convenience methods for common operations
  async turnOff(): Promise<BLECommandResult> {
    return this.setPattern(LED_PATTERNS.OFF);
  }

  async setRainbow(): Promise<BLECommandResult> {
    return this.setPattern(LED_PATTERNS.RAINBOW);
  }

  async setPulse(): Promise<BLECommandResult> {
    return this.setPattern(LED_PATTERNS.PULSE);
  }

  async setPowerMode(mode: number): Promise<BLECommandResult> {
    const settings: Partial<DeviceSettings> = { powerMode: mode };
    return this.setSettings(settings);
  }

  async setAutoOff(minutes: number): Promise<BLECommandResult> {
    const settings: Partial<DeviceSettings> = { autoOff: minutes };
    return this.setSettings(settings);
  }

  // Error handling
  handleError(error: any): string {
    if (error?.code) {
      switch (error.code) {
        case 0x01:
          return 'Invalid command sent to device';
        case 0x02:
          return 'Invalid parameter value';
        case 0x03:
          return 'Device settings are corrupted';
        case 0x04:
          return 'Failed to save settings to Flash memory';
        case 0x05:
          return 'LED hardware failure detected';
        case 0x06:
          return 'Device memory is low';
        case 0x07:
          return 'Device power is low';
        default:
          return error.message || 'Unknown device error';
      }
    }
    return error?.message || 'Communication error';
  }

  // Connection management
  async connect(device: BluetoothDevice): Promise<BLECommandResult> {
    this.setConnectedDevice(device);
    
    // Get initial device info
    const info = await this.getDeviceInfo();
    if (!info.success) {
      this.setConnectedDevice(null);
      return info;
    }

    // Load current settings
    const settings = await this.getSettings();
    if (!settings.success) {
      console.warn('Failed to load device settings:', settings.error);
    }

    return { success: true, data: { info: info.data, settings: settings.data } };
  }

  disconnect() {
    this.setConnectedDevice(null);
    this.messageQueue = [];
    this.isProcessing = false;
  }

  isConnected(): boolean {
    return this.connectedDevice !== null;
  }
}

export const bleCommunication = BLECommunicationService.getInstance();
