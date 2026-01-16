/**
 * Analytics Flow Integration Tests
 * Tests analytics batch request, receive, and confirmation
 */

import { MockBluetoothService } from './mocks/MockBluetoothService';
import { createMockMicrocontroller, createConnectedMockService } from './utils/testHelpers';
import { MOCK_USER_IDS } from './utils/testFixtures';
import { BLECommandEncoder } from '../utils/bleCommandEncoder';
import { CommandType } from '../types/commands';

describe('Analytics Flow Integration', () => {
  let mockService: MockBluetoothService;
  const deviceId = 'mock-device-001';

  beforeEach(async () => {
    mockService = await createConnectedMockService(
      createMockMicrocontroller({ withAnalytics: true })
    );
  });

  afterEach(() => {
    mockService.reset();
  });

  describe('Analytics Request', () => {
    it('should request analytics batch from device', async () => {
      const command = BLECommandEncoder.encodeRequestAnalytics();
      const response = await mockService.sendCommand(deviceId, command);
      
      expect(response).toBeDefined();
    });

    it('should handle empty analytics (no data)', async () => {
      // Create microcontroller with no analytics
      const emptyMock = createMockMicrocontroller({ withAnalytics: false });
      const service = await createConnectedMockService(emptyMock);
      
      const command = BLECommandEncoder.encodeRequestAnalytics();
      const response = await service.sendCommand(deviceId, command);
      
      expect(response.isSuccess).toBe(true);
    });

    it('should receive analytics batch with session data', async () => {
      const command = BLECommandEncoder.encodeRequestAnalytics();
      const response = await mockService.sendCommand(deviceId, command);
      
      // Analytics batch should be returned
      expect(response).toBeDefined();
    });

    it('should increment flash reads counter after request', async () => {
      const stateBefore = mockService.getMicrocontroller().getState();
      const flashReadsBefore = stateBefore.analytics.flashReads;
      
      const command = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, command);
      
      const stateAfter = mockService.getMicrocontroller().getState();
      expect(stateAfter.analytics.flashReads).toBeGreaterThan(flashReadsBefore);
    });
  });

  describe('Analytics Confirmation', () => {
    it('should confirm analytics batch receipt', async () => {
      // Request analytics first
      const requestCommand = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, requestCommand);
      
      // Get batch ID from state
      const state = mockService.getMicrocontroller().getState();
      const batchId = state.analytics.batchId;
      
      // Confirm receipt
      const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(batchId);
      const response = await mockService.sendCommand(deviceId, confirmCommand);
      
      expect(response.isSuccess).toBe(true);
    });

    it('should clear analytics after confirmation', async () => {
      // Request analytics
      const requestCommand = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, requestCommand);
      
      const stateBefore = mockService.getMicrocontroller().getState();
      const batchId = stateBefore.analytics.batchId;
      
      // Confirm
      const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(batchId);
      await mockService.sendCommand(deviceId, confirmCommand);
      
      // Analytics should be cleared
      const stateAfter = mockService.getMicrocontroller().getState();
      expect(stateAfter.analytics.sessionCount).toBe(0);
      expect(stateAfter.analytics.sessions).toHaveLength(0);
      expect(stateAfter.analytics.hasData).toBe(false);
    });

    it('should increment batch ID after confirmation', async () => {
      const stateBefore = mockService.getMicrocontroller().getState();
      const batchIdBefore = stateBefore.analytics.batchId;
      
      // Request and confirm
      const requestCommand = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, requestCommand);
      
      const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(batchIdBefore);
      await mockService.sendCommand(deviceId, confirmCommand);
      
      const stateAfter = mockService.getMicrocontroller().getState();
      expect(stateAfter.analytics.batchId).toBe(batchIdBefore + 1);
    });

    it('should reject confirmation with wrong batch ID', async () => {
      const requestCommand = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, requestCommand);
      
      // Confirm with wrong batch ID
      const wrongBatchId = 99;
      const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(wrongBatchId);
      
      await expect(
        mockService.sendCommand(deviceId, confirmCommand)
      ).rejects.toThrow();
    });

    it('should increment flash writes after confirmation', async () => {
      const stateBefore = mockService.getMicrocontroller().getState();
      const flashWritesBefore = stateBefore.analytics.flashWrites;
      const batchId = stateBefore.analytics.batchId;
      
      // Request and confirm
      const requestCommand = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, requestCommand);
      
      const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(batchId);
      await mockService.sendCommand(deviceId, confirmCommand);
      
      const stateAfter = mockService.getMicrocontroller().getState();
      expect(stateAfter.analytics.flashWrites).toBeGreaterThan(flashWritesBefore);
    });
  });

  describe('Full Analytics Workflow', () => {
    it('should complete request → receive → confirm workflow', async () => {
      // Step 1: Request analytics
      const requestCommand = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, requestCommand);
      
      const stateAfterRequest = mockService.getMicrocontroller().getState();
      const batchId = stateAfterRequest.analytics.batchId;
      expect(stateAfterRequest.analytics.hasData).toBe(true);
      
      // Step 2: Confirm receipt
      const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(batchId);
      await mockService.sendCommand(deviceId, confirmCommand);
      
      // Step 3: Verify analytics cleared
      const stateAfterConfirm = mockService.getMicrocontroller().getState();
      expect(stateAfterConfirm.analytics.hasData).toBe(false);
      expect(stateAfterConfirm.analytics.batchId).toBe(batchId + 1);
    });

    it('should handle multiple analytics cycles', async () => {
      for (let i = 0; i < 3; i++) {
        // Setup analytics data
        mockService.getMicrocontroller().setState({
          analytics: {
            sessionCount: 1,
            sessions: [{
              startTime: Date.now() - 1000,
              endTime: Date.now(),
              duration: 1000,
              turnedOn: true,
              turnedOff: false,
            }],
            flashReads: 10,
            flashWrites: 5,
            errorCount: 0,
            lastErrorCode: 0,
            lastErrorTimestamp: 0,
            averagePowerConsumption: 200,
            peakPowerConsumption: 300,
            batchId: i + 1,
            hasData: true,
          },
        });
        
        // Request
        const requestCommand = BLECommandEncoder.encodeRequestAnalytics();
        await mockService.sendCommand(deviceId, requestCommand);
        
        // Confirm
        const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(i + 1);
        await mockService.sendCommand(deviceId, confirmCommand);
        
        const state = mockService.getMicrocontroller().getState();
        expect(state.analytics.hasData).toBe(false);
      }
    });
  });

  describe('Analytics with Ownership', () => {
    beforeEach(async () => {
      // Claim device
      const micro = mockService.getMicrocontroller();
      micro.setState({
        ownerUserId: MOCK_USER_IDS.user1,
        hasOwner: true,
        sessionOwnershipVerified: true,
      });
    });

    it('should allow analytics request with verified ownership', async () => {
      const command = BLECommandEncoder.encodeRequestAnalytics();
      const response = await mockService.sendCommand(deviceId, command);
      
      expect(response).toBeDefined();
    });

    it('should block analytics request without ownership verification', async () => {
      // Clear session ownership
      mockService.getMicrocontroller().clearSessionOwnership();
      
      const command = BLECommandEncoder.encodeRequestAnalytics();
      
      await expect(
        mockService.sendCommand(deviceId, command)
      ).rejects.toThrow();
    });

    it('should block analytics confirmation without ownership', async () => {
      // Request while verified
      const requestCommand = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, requestCommand);
      
      const state = mockService.getMicrocontroller().getState();
      const batchId = state.analytics.batchId;
      
      // Clear ownership
      mockService.getMicrocontroller().clearSessionOwnership();
      
      // Try to confirm
      const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(batchId);
      
      await expect(
        mockService.sendCommand(deviceId, confirmCommand)
      ).rejects.toThrow();
    });
  });

  describe('Analytics Data Integrity', () => {
    it('should preserve session data through request', async () => {
      const stateBefore = mockService.getMicrocontroller().getState();
      const sessionCountBefore = stateBefore.analytics.sessionCount;
      
      const command = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, command);
      
      const stateAfter = mockService.getMicrocontroller().getState();
      expect(stateAfter.analytics.sessionCount).toBe(sessionCountBefore);
    });

    it('should track flash operations correctly', async () => {
      const stateBefore = mockService.getMicrocontroller().getState();
      const flashReadsBefore = stateBefore.analytics.flashReads;
      const flashWritesBefore = stateBefore.analytics.flashWrites;
      const batchId = stateBefore.analytics.batchId;
      
      // Request (increments reads)
      const requestCommand = BLECommandEncoder.encodeRequestAnalytics();
      await mockService.sendCommand(deviceId, requestCommand);
      
      // Confirm (increments writes)
      const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(batchId);
      await mockService.sendCommand(deviceId, confirmCommand);
      
      const stateAfter = mockService.getMicrocontroller().getState();
      expect(stateAfter.analytics.flashReads).toBeGreaterThan(flashReadsBefore);
      expect(stateAfter.analytics.flashWrites).toBeGreaterThan(flashWritesBefore);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle analytics request failure', async () => {
      mockService.getMicrocontroller().simulateError(1);
      
      const command = BLECommandEncoder.encodeRequestAnalytics();
      
      await expect(
        mockService.sendCommand(deviceId, command)
      ).rejects.toThrow();
    });

    it('should not clear analytics on failed confirmation', async () => {
      const stateBefore = mockService.getMicrocontroller().getState();
      const sessionCountBefore = stateBefore.analytics.sessionCount;
      
      // Confirm with wrong batch ID
      const wrongBatchId = 99;
      const confirmCommand = BLECommandEncoder.encodeConfirmAnalytics(wrongBatchId);
      
      try {
        await mockService.sendCommand(deviceId, confirmCommand);
      } catch (error) {
        // Expected to fail
      }
      
      const stateAfter = mockService.getMicrocontroller().getState();
      expect(stateAfter.analytics.sessionCount).toBe(sessionCountBefore);
    });
  });
});



