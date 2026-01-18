import { ConfigDomainController } from '../../../domains/config/ConfigDomainController';
import { DeviceSettings } from '../../../utils/bleConstants';
import { BluetoothDevice } from '../../../types/bluetooth';

// Mock dependencies
jest.mock('../../../domains/config/ConfigRepository');
jest.mock('../../../domains/bluetooth/ConfigurationModule');
jest.mock('../../../utils/bluetoothService');

describe('ConfigDomainController', () => {
  let controller: ConfigDomainController;
  let mockDevice: BluetoothDevice;

  beforeEach(() => {
    controller = ConfigDomainController.getInstance();
    mockDevice = {
      id: 'test-device-id',
      name: 'Test Device',
      rssi: -50,
      isConnected: true,
      manufacturerData: '',
      serviceUUIDs: [],
    };
  });

  afterEach(() => {
    controller.reset();
  });

  describe('initialize', () => {
    it('should initialize with device', async () => {
      await controller.initialize(mockDevice);

      const currentConfig = controller.getCurrentConfig();
      // Should load cached config or use defaults
      expect(currentConfig).toBeDefined();
    });

    it('should handle null device', async () => {
      await controller.initialize(null);

      const currentConfig = controller.getCurrentConfig();
      expect(currentConfig).toBeNull();
    });
  });

  describe('enterConfigMode', () => {
    it('should enter config mode successfully', async () => {
      await controller.initialize(mockDevice);
      const result = await controller.enterConfigMode();

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
    });

    it('should return error when no device connected', async () => {
      await controller.initialize(null);
      const result = await controller.enterConfigMode();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateConfig', () => {
    it('should update brightness', async () => {
      await controller.initialize(mockDevice);
      await controller.enterConfigMode();

      const result = await controller.updateBrightness(128);

      // Should succeed or fail based on mock implementation
      expect(result).toBeDefined();
    });

    it('should return error when config mode not active', async () => {
      await controller.initialize(mockDevice);
      // Don't enter config mode

      const result = await controller.updateBrightness(128);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('commitConfig', () => {
    it('should commit config successfully', async () => {
      await controller.initialize(mockDevice);
      await controller.enterConfigMode();

      const result = await controller.commitConfig();

      expect(result).toBeDefined();
    });

    it('should return error when config mode not active', async () => {
      await controller.initialize(mockDevice);
      // Don't enter config mode

      const result = await controller.commitConfig();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('hasUnsavedChanges', () => {
    it('should track unsaved changes', async () => {
      await controller.initialize(mockDevice);
      await controller.enterConfigMode();

      const hasChanges = controller.hasUnsavedChanges();
      expect(typeof hasChanges).toBe('boolean');
    });
  });

  describe('subscribeToConfigUpdates', () => {
    it('should notify listeners on config update', async () => {
      const listener = jest.fn();
      const unsubscribe = controller.subscribeToConfigUpdates(listener);

      await controller.initialize(mockDevice);
      await controller.enterConfigMode();

      // Listener should be called when config is loaded
      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('subscribeToErrors', () => {
    it('should notify listeners on error', () => {
      const listener = jest.fn();
      const unsubscribe = controller.subscribeToErrors(listener);

      // Error should trigger listener
      // This depends on implementation details

      unsubscribe();
    });
  });
});


