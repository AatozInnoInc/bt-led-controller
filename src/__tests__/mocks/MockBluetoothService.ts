import { BluetoothDevice } from '../../types/bluetooth';

export interface MockResponse {
  data: Uint8Array | string;
  delay?: number;
}

export class MockBluetoothService {
  private connectedDevice: BluetoothDevice | null = null;
  private responses: Map<string, MockResponse[]> = new Map();
  private responseListeners: Array<(data: Uint8Array | string) => void> = [];

  setConnectedDevice(device: BluetoothDevice | null): void {
    this.connectedDevice = device;
  }

  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }

  async sendMessage(deviceId: string, message: string): Promise<void> {
    if (!this.connectedDevice || this.connectedDevice.id !== deviceId) {
      throw new Error('Device not connected');
    }

    // Simulate response based on message
    const response = this.getResponseForMessage(message);
    if (response) {
      setTimeout(() => {
        this.notifyResponse(response.data);
      }, response.delay || 100);
    }
  }

  private getResponseForMessage(message: string): MockResponse | null {
    // Check for specific command patterns
    if (message.includes(String.fromCharCode(0x10))) {
      // Enter config mode
      return {
        data: new Uint8Array([0x90]), // ACK_CONFIG_MODE
        delay: 200,
      };
    }

    if (message.includes(String.fromCharCode(0x11))) {
      // Commit config
      return {
        data: new Uint8Array([0x91]), // ACK_COMMIT
        delay: 300,
      };
    }

    if (message.includes(String.fromCharCode(0x02))) {
      // Config update
      return {
        data: new Uint8Array([0x92]), // ACK_SUCCESS
        delay: 100,
      };
    }

    // Default success response
    return {
      data: 'SUCCESS:Command executed',
      delay: 100,
    };
  }

  subscribeToResponses(listener: (data: Uint8Array | string) => void): () => void {
    this.responseListeners.push(listener);
    return () => {
      this.responseListeners = this.responseListeners.filter(l => l !== listener);
    };
  }

  private notifyResponse(data: Uint8Array | string): void {
    this.responseListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in mock response listener:', error);
      }
    });
  }

  // Test helpers
  setResponseForCommand(command: string, response: MockResponse): void {
    this.responses.set(command, [response]);
  }

  simulateError(errorCode: number, message: string): void {
    const errorData = new Uint8Array([
      0x90, // Error envelope marker
      errorCode,
      ...message.split('').map(c => c.charCodeAt(0)),
    ]);
    this.notifyResponse(errorData);
  }

  simulateAcknowledgment(type: 'config_mode' | 'commit' | 'success'): void {
    const codes = {
      config_mode: 0x90,
      commit: 0x91,
      success: 0x92,
    };
    this.notifyResponse(new Uint8Array([codes[type]]));
  }

  reset(): void {
    this.connectedDevice = null;
    this.responses.clear();
    this.responseListeners = [];
  }
}

export const mockBluetoothService = new MockBluetoothService();


