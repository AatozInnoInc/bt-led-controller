/**
 * Config Domain Controller Integration Tests
 * Tests full configuration workflows using mock microcontroller
 */

import { ConfigDomainController } from '../domain/configDomainController';
import { MockBluetoothService } from './mocks/MockBluetoothService';
import { createMockMicrocontroller, createConnectedMockService, clearAsyncStorage } from './utils/testHelpers';
import { MOCK_CONFIGS, MOCK_COLORS, MOCK_USER_IDS } from './utils/testFixtures';
import { BLEError, ErrorCode } from '../types/errors';
import { ParameterId } from '../types/commands';

// We need to mock the bluetoothService import
jest.mock('../utils/bluetoothService', () => ({
  bluetoothService: null, // Will be replaced in tests
}));

describe('ConfigDomainController Integration', () => {
  let controller: ConfigDomainController;
  let mockService: MockBluetoothService;
  let bluetoothServiceModule: any;

  beforeEach(async () => {
    await clearAsyncStorage();
    
    // Create mock service
    mockService = await createConnectedMockService();
    
    // Replace the bluetoothService export
    bluetoothServiceModule = require('../utils/bluetoothService');
    bluetoothServiceModule.bluetoothService = mockService;
    
    // Create new controller instance
    controller = new ConfigDomainController();
  });

  afterEach(() => {
    controller.reset();
    mockService.reset();
  });

  describe('Configuration Initialization', () => {
    it('should initialize config for device', async () => {
      const config = await controller.initializeConfig('mock-device-001');
      
      expect(config).toBeDefined();
      expect(config.brightness).toBeDefined();
      expect(config.color).toBeDefined();
    });

    it('should load cached config if available', async () => {
      // Initialize once
      await controller.initializeConfig('mock-device-001');
      
      // Create new controller and initialize again
      const newController = new ConfigDomainController();
      const config = await newController.initializeConfig('mock-device-001');
      
      expect(config).toBeDefined();
    });
  });

  describe('Config Mode Management', () => {
    beforeEach(async () => {
      await controller.initializeConfig('mock-device-001');
    });

    it('should enter config mode successfully', async () => {
      const result = await controller.enterConfigMode();
      
      expect(result).toBe(true);
      expect(controller.isInConfigMode()).toBe(true);
    });

    it('should return true if already in config mode', async () => {
      await controller.enterConfigMode();
      const result = await controller.enterConfigMode();
      
      expect(result).toBe(true);
    });

    it('should exit config mode successfully', async () => {
      await controller.enterConfigMode();
      const result = await controller.exitConfigMode();
      
      expect(result).toBe(true);
      expect(controller.isInConfigMode()).toBe(false);
    });

    it('should throw error when exiting without entering', async () => {
      await expect(controller.exitConfigMode()).rejects.toThrow(BLEError);
    });

    it('should reject enter config mode when not connected', async () => {
      await mockService.disconnectDevice('mock-device-001');
      
      await expect(controller.enterConfigMode()).rejects.toThrow(BLEError);
    });
  });

  describe('Parameter Updates', () => {
    beforeEach(async () => {
      await controller.initializeConfig('mock-device-001');
      await controller.enterConfigMode();
    });

    it('should update brightness parameter', async () => {
      await controller.updateParameter(ParameterId.BRIGHTNESS, 200);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.pendingConfig.brightness).toBe(200);
    });

    it('should update speed parameter', async () => {
      await controller.updateParameter(ParameterId.SPEED, 75);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.pendingConfig.speed).toBe(75);
    });

    it('should update effect type parameter', async () => {
      await controller.updateParameter(ParameterId.EFFECT_TYPE, 2);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.pendingConfig.effectType).toBe(2);
    });

    it('should update power state parameter', async () => {
      await controller.updateParameter(ParameterId.POWER_STATE, 1);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.pendingConfig.powerState).toBe(true);
    });

    it('should throw error when updating without config mode', async () => {
      await controller.exitConfigMode();
      
      await expect(
        controller.updateParameter(ParameterId.BRIGHTNESS, 200)
      ).rejects.toThrow(BLEError);
    });

    it('should handle invalid parameter ID', async () => {
      await expect(
        controller.updateParameter(255 as ParameterId, 100)
      ).rejects.toThrow(BLEError);
    });
  });

  describe('Color Updates', () => {
    beforeEach(async () => {
      await controller.initializeConfig('mock-device-001');
      await controller.enterConfigMode();
    });

    it('should update color', async () => {
      await controller.updateColor(MOCK_COLORS.red);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.pendingConfig.color.h).toBe(MOCK_COLORS.red.h);
      expect(state.pendingConfig.color.s).toBe(MOCK_COLORS.red.s);
      expect(state.pendingConfig.color.v).toBe(MOCK_COLORS.red.v);
    });

    it('should update to different colors', async () => {
      await controller.updateColor(MOCK_COLORS.blue);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.pendingConfig.color.h).toBe(MOCK_COLORS.blue.h);
    });

    it('should throw error when updating color without config mode', async () => {
      await controller.exitConfigMode();
      
      await expect(
        controller.updateColor(MOCK_COLORS.red)
      ).rejects.toThrow(BLEError);
    });
  });

  describe('Configuration Commit', () => {
    beforeEach(async () => {
      await controller.initializeConfig('mock-device-001');
      await controller.enterConfigMode();
    });

    it('should commit configuration successfully', async () => {
      await controller.updateParameter(ParameterId.BRIGHTNESS, 150);
      await controller.updateColor(MOCK_COLORS.green);
      
      const result = await controller.saveConfiguration();
      expect(result).toBe(true);
      
      const state = mockService.getMicrocontroller().getState();
      expect(state.currentConfig.brightness).toBe(150);
      expect(state.currentConfig.color.h).toBe(MOCK_COLORS.green.h);
      expect(state.inConfigMode).toBe(false);
    });

    it('should reject commit when not in config mode', async () => {
      await controller.exitConfigMode();
      
      await expect(controller.saveConfiguration()).rejects.toThrow(BLEError);
    });

    it('should reject unsafe power configuration', async () => {
      // Set to maximum power (should exceed limit)
      await controller.updateParameter(ParameterId.BRIGHTNESS, 255);
      await controller.updateColor(MOCK_COLORS.white);
      await controller.updateParameter(ParameterId.POWER_STATE, 1);
      
      await expect(controller.saveConfiguration()).rejects.toThrow();
    });

    it('should exit config mode after successful commit', async () => {
      await controller.updateParameter(ParameterId.BRIGHTNESS, 100);
      await controller.saveConfiguration();
      
      expect(controller.isInConfigMode()).toBe(false);
    });
  });

  describe('Full Configuration Workflow', () => {
    it('should complete full config workflow', async () => {
      // Initialize
      await controller.initializeConfig('mock-device-001');
      
      // Enter config mode
      await controller.enterConfigMode();
      expect(controller.isInConfigMode()).toBe(true);
      
      // Update multiple parameters
      await controller.updateParameter(ParameterId.BRIGHTNESS, 180);
      await controller.updateParameter(ParameterId.SPEED, 50);
      await controller.updateColor(MOCK_COLORS.blue);
      await controller.updateParameter(ParameterId.EFFECT_TYPE, 1);
      
      // Commit changes
      const result = await controller.saveConfiguration();
      expect(result).toBe(true);
      
      // Verify changes persisted
      const state = mockService.getMicrocontroller().getState();
      expect(state.currentConfig.brightness).toBe(180);
      expect(state.currentConfig.speed).toBe(50);
      expect(state.currentConfig.color.h).toBe(MOCK_COLORS.blue.h);
      expect(state.currentConfig.effectType).toBe(1);
      expect(state.inConfigMode).toBe(false);
    });

    it('should discard changes when exiting without commit', async () => {
      await controller.initializeConfig('mock-device-001');
      await controller.enterConfigMode();
      
      // Get initial brightness
      const initialState = mockService.getMicrocontroller().getState();
      const initialBrightness = initialState.currentConfig.brightness;
      
      // Update parameter
      await controller.updateParameter(ParameterId.BRIGHTNESS, 200);
      
      // Exit without commit
      await controller.exitConfigMode();
      
      // Verify changes were not applied
      const finalState = mockService.getMicrocontroller().getState();
      expect(finalState.currentConfig.brightness).toBe(initialBrightness);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await controller.initializeConfig('mock-device-001');
    });

    it('should handle connection loss during config mode', async () => {
      await controller.enterConfigMode();
      
      // Simulate disconnection
      await mockService.disconnectDevice('mock-device-001');
      
      await expect(
        controller.updateParameter(ParameterId.BRIGHTNESS, 100)
      ).rejects.toThrow(BLEError);
    });

    it('should handle microcontroller errors gracefully', async () => {
      await controller.enterConfigMode();
      
      // Inject error
      mockService.getMicrocontroller().simulateError(ErrorCode.FLASH_WRITE_FAILED);
      
      await expect(
        controller.updateParameter(ParameterId.BRIGHTNESS, 100)
      ).rejects.toThrow(BLEError);
    });

    it('should handle timeout errors', async () => {
      // This is hard to test without actual timeout logic, but we can verify error structure
      await controller.enterConfigMode();
      
      mockService.getMicrocontroller().simulateError(ErrorCode.UNKNOWN_ERROR);
      
      try {
        await controller.updateParameter(ParameterId.BRIGHTNESS, 100);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BLEError);
      }
    });
  });

  describe('State Management', () => {
    it('should reset controller state', async () => {
      await controller.initializeConfig('mock-device-001');
      await controller.enterConfigMode();
      
      controller.reset();
      
      expect(controller.isInConfigMode()).toBe(false);
      expect(controller.hasPendingChanges()).toBe(false);
    });

    it('should track pending changes', async () => {
      await controller.initializeConfig('mock-device-001');
      await controller.enterConfigMode();
      
      expect(controller.hasPendingChanges()).toBe(false);
      
      await controller.updateParameter(ParameterId.BRIGHTNESS, 200);
      
      expect(controller.hasPendingChanges()).toBe(true);
    });

    it('should clear pending changes after commit', async () => {
      await controller.initializeConfig('mock-device-001');
      await controller.enterConfigMode();
      await controller.updateParameter(ParameterId.BRIGHTNESS, 200);
      
      await controller.saveConfiguration();
      
      expect(controller.hasPendingChanges()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid parameter updates', async () => {
      await controller.initializeConfig('mock-device-001');
      await controller.enterConfigMode();
      
      // Rapid updates
      for (let i = 0; i < 10; i++) {
        await controller.updateParameter(ParameterId.BRIGHTNESS, i * 25);
      }
      
      // Should have latest value
      const state = mockService.getMicrocontroller().getState();
      expect(state.pendingConfig.brightness).toBe(225);
    });

    it('should handle multiple enter/exit cycles', async () => {
      await controller.initializeConfig('mock-device-001');
      
      for (let i = 0; i < 3; i++) {
        await controller.enterConfigMode();
        await controller.updateParameter(ParameterId.BRIGHTNESS, 100 + i * 10);
        await controller.exitConfigMode();
      }
      
      // All cycles should complete without error
      expect(controller.isInConfigMode()).toBe(false);
    });
  });
});



