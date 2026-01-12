import { ConfigDomainController } from '../../domains/config/ConfigDomainController';
import { mockBluetoothService } from '../mocks/MockBluetoothService';
import { BluetoothDevice } from '../../types/bluetooth';

describe('Config Mode Lifecycle Integration', () => {
  let controller: ConfigDomainController;
  let mockDevice: BluetoothDevice;

  beforeEach(() => {
    controller = ConfigDomainController.getInstance();
    mockBluetoothService.reset();

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
    mockBluetoothService.reset();
  });

  describe('Full Config Mode Lifecycle', () => {
    it('should complete full config mode lifecycle', async () => {
      // Initialize
      await controller.initialize(mockDevice);
      expect(controller.getCurrentConfig()).toBeDefined();

      // Enter config mode
      const enterResult = await controller.enterConfigMode();
      expect(enterResult.success).toBe(true);
      expect(enterResult.config).toBeDefined();

      // Update config
      const updateResult = await controller.updateBrightness(128);
      expect(updateResult.success).toBe(true);

      // Commit config
      const commitResult = await controller.commitConfig();
      expect(commitResult.success).toBe(true);

      // Exit config mode
      const exitResult = await controller.exitConfigMode();
      expect(exitResult.success).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle connection failure', async () => {
      await controller.initialize(null);

      const result = await controller.enterConfigMode();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle config update when not in config mode', async () => {
      await controller.initialize(mockDevice);
      // Don't enter config mode

      const result = await controller.updateBrightness(128);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle commit when not in config mode', async () => {
      await controller.initialize(mockDevice);
      // Don't enter config mode

      const result = await controller.commitConfig();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Real-time Updates', () => {
    it('should notify listeners on config update', async () => {
      const configListener = jest.fn();
      const unsubscribe = controller.subscribeToConfigUpdates(configListener);

      await controller.initialize(mockDevice);
      await controller.enterConfigMode();

      // Wait for initial config load
      await new Promise(resolve => setTimeout(resolve, 100));

      await controller.updateBrightness(128);

      // Listener should be called
      expect(configListener).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Unsaved Changes Tracking', () => {
    it('should track unsaved changes', async () => {
      await controller.initialize(mockDevice);
      await controller.enterConfigMode();

      expect(controller.hasUnsavedChanges()).toBe(false);

      await controller.updateBrightness(128);

      // Should have unsaved changes after update
      expect(controller.hasUnsavedChanges()).toBe(true);

      await controller.commitConfig();

      // Should be saved after commit
      expect(controller.hasUnsavedChanges()).toBe(false);
    });
  });
});


