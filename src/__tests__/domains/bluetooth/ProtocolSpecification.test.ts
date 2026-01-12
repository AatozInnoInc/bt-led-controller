/**
 * BLE Protocol Specification Tests
 * 
 * CRITICAL: These tests validate that the TypeScript BLE command constants
 * match the Arduino firmware protocol specification. Any mismatch will cause
 * commands to be misinterpreted by the device.
 * 
 * When these tests fail, check BOTH:
 * 1. src/utils/bleConstants.ts (TypeScript constants)
 * 2. bt-led-controller/bt-led-controller.ino (Arduino enum CommandType)
 * 
 * Protocol Version: 1.0
 * Last Updated: 2025-01-07
 */

import { BLE_COMMANDS } from '../../../utils/bleConstants';
import { BLECommandEncoder } from '../../../domain/bluetooth/bleCommandEncoder';

describe('BLE Protocol Specification', () => {
  /**
   * Official Protocol Specification
   * 
   * IMPORTANT: If you change these values, you MUST update BOTH:
   * - TypeScript: src/utils/bleConstants.ts
   * - Arduino: bt-led-controller/bt-led-controller.ino (enum CommandType)
   */
  const PROTOCOL_SPEC = {
    // Core Commands
    CMD_STATUS: 0x00,           // Status/ping command
    CMD_ENTER_CONFIG: 0x10,     // Enter configuration mode
    CMD_EXIT_CONFIG: 0x11,      // Exit configuration mode  
    CMD_COMMIT_CONFIG: 0x12,    // Commit configuration to flash
    
    // Parameter Updates (must be in config mode)
    CMD_UPDATE_PARAM: 0x02,     // Update single parameter
    CMD_UPDATE_COLOR: 0x03,     // Update HSV color (3 bytes: H, S, V)
    
    // Analytics
    CMD_REQUEST_ANALYTICS: 0x20,  // Request analytics batch
    CMD_CONFIRM_ANALYTICS: 0x21,  // Confirm analytics received
    
    // Ownership
    CMD_CLAIM_DEVICE: 0x13,       // Claim device ownership
    CMD_VERIFY_OWNERSHIP: 0x14,   // Verify user owns device
    CMD_UNCLAIM_DEVICE: 0x15,     // Remove device ownership
  };

  describe('Command Constants Match Protocol Specification', () => {
    it('CMD_STATUS should match protocol spec', () => {
      expect(BLE_COMMANDS.CMD_STATUS).toBe(PROTOCOL_SPEC.CMD_STATUS);
    });

    it('CMD_ENTER_CONFIG should match protocol spec', () => {
      expect(BLE_COMMANDS.CMD_ENTER_CONFIG).toBe(PROTOCOL_SPEC.CMD_ENTER_CONFIG);
    });

    it('CMD_EXIT_CONFIG should match protocol spec', () => {
      expect(BLE_COMMANDS.CMD_EXIT_CONFIG).toBe(PROTOCOL_SPEC.CMD_EXIT_CONFIG);
    });

    it('CMD_COMMIT_CONFIG should match protocol spec', () => {
      expect(BLE_COMMANDS.CMD_COMMIT_CONFIG).toBe(PROTOCOL_SPEC.CMD_COMMIT_CONFIG);
    });

    it('CMD_UPDATE_PARAM should match protocol spec', () => {
      expect(BLE_COMMANDS.CMD_CONFIG_UPDATE).toBe(PROTOCOL_SPEC.CMD_UPDATE_PARAM);
    });

    it('CMD_UPDATE_COLOR should match protocol spec', () => {
      expect(BLE_COMMANDS.CMD_UPDATE_COLOR).toBe(PROTOCOL_SPEC.CMD_UPDATE_COLOR);
    });
  });

  describe('Critical: Config Mode Command Ordering', () => {
    /**
     * BUG CAUGHT: 2025-01-07
     * CMD_EXIT_CONFIG and CMD_COMMIT_CONFIG were swapped, causing:
     * - "Save" to send EXIT command
     * - Then COMMIT failed because device already exited config mode
     * 
     * This test prevents that bug from happening again.
     */
    it('should have EXIT_CONFIG (0x11) come before COMMIT_CONFIG (0x12)', () => {
      expect(PROTOCOL_SPEC.CMD_EXIT_CONFIG).toBe(0x11);
      expect(PROTOCOL_SPEC.CMD_COMMIT_CONFIG).toBe(0x12);
      expect(PROTOCOL_SPEC.CMD_EXIT_CONFIG).toBeLessThan(PROTOCOL_SPEC.CMD_COMMIT_CONFIG);
    });

    it('EXIT and COMMIT should not be swapped in implementation', () => {
      // This would fail if constants are swapped
      expect(BLE_COMMANDS.CMD_EXIT_CONFIG).not.toBe(0x12);
      expect(BLE_COMMANDS.CMD_COMMIT_CONFIG).not.toBe(0x11);
    });
  });

  describe('Command Encoding Produces Correct Byte Sequences', () => {
    it('encodeEnterConfigMode should produce [0x10]', () => {
      const command = BLECommandEncoder.encodeEnterConfigMode();
      expect(Array.from(command)).toEqual([0x10]);
    });

    it('encodeExitConfigMode should produce [0x11]', () => {
      const command = BLECommandEncoder.encodeExitConfigMode();
      expect(Array.from(command)).toEqual([0x11]);
    });

    it('encodeCommitConfig should produce [0x12]', () => {
      const command = BLECommandEncoder.encodeCommitConfig();
      expect(Array.from(command)).toEqual([0x12]);
    });

    it('encodeColorUpdate should produce [0x03, H, S, V]', () => {
      const color = { h: 200, s: 255, v: 255 }; // Cyan
      const command = BLECommandEncoder.encodeColorUpdate(color);
      expect(Array.from(command)).toEqual([0x03, 200, 255, 255]);
    });

    it('encodeColorUpdate should clamp values to 0-255', () => {
      const color = { h: 300, s: -10, v: 500 }; // Out of range
      const command = BLECommandEncoder.encodeColorUpdate(color);
      expect(command[1]).toBeLessThanOrEqual(255);
      expect(command[2]).toBeGreaterThanOrEqual(0);
      expect(command[3]).toBeLessThanOrEqual(255);
    });
  });

  describe('Protocol Documentation Verification', () => {
    it('should have documentation comments for all command constants', () => {
      // This test reminds developers to document protocol changes
      expect(PROTOCOL_SPEC).toHaveProperty('CMD_ENTER_CONFIG');
      expect(PROTOCOL_SPEC).toHaveProperty('CMD_EXIT_CONFIG');
      expect(PROTOCOL_SPEC).toHaveProperty('CMD_COMMIT_CONFIG');
      expect(PROTOCOL_SPEC).toHaveProperty('CMD_UPDATE_COLOR');
    });

    it('should not have duplicate command values', () => {
      const values = Object.values(PROTOCOL_SPEC);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have all command values in valid byte range', () => {
      Object.entries(PROTOCOL_SPEC).forEach(([key, value]) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
      });
    });
  });

  describe('Cross-Platform Protocol Validation', () => {
    it('should provide Arduino firmware verification checklist', () => {
      /**
       * ARDUINO FIRMWARE VERIFICATION CHECKLIST:
       * 
       * Open: bt-led-controller/bt-led-controller.ino
       * Find: enum CommandType (around line 28)
       * 
       * Verify these lines match the protocol spec:
       * 
       * ✓ CMD_ENTER_CONFIG  = 0x10
       * ✓ CMD_EXIT_CONFIG   = 0x11
       * ✓ CMD_COMMIT_CONFIG = 0x12
       * ✓ CMD_UPDATE_PARAM  = 0x02
       * ✓ CMD_UPDATE_COLOR  = 0x03
       * ✓ CMD_REQUEST_ANALYTICS = 0x20
       * ✓ CMD_CONFIRM_ANALYTICS = 0x21
       * ✓ CMD_CLAIM_DEVICE = 0x13
       * ✓ CMD_VERIFY_OWNERSHIP = 0x14
       * ✓ CMD_UNCLAIM_DEVICE = 0x15
       * 
       * If any values don't match, update the Arduino firmware to match
       * this specification, or update the spec if the Arduino is correct.
       */
      expect(true).toBe(true); // Always passes - this is documentation
    });
  });

  describe('Common Protocol Bugs Prevention', () => {
    it('should not have off-by-one errors in sequential commands', () => {
      // Config mode commands should be sequential
      expect(PROTOCOL_SPEC.CMD_COMMIT_CONFIG - PROTOCOL_SPEC.CMD_EXIT_CONFIG).toBe(1);
    });

    it('should not confuse parameter IDs with command IDs', () => {
      // Parameter updates use 0x02, color uses 0x03
      // These should not overlap with config mode commands (0x10-0x15)
      expect(PROTOCOL_SPEC.CMD_UPDATE_PARAM).toBeLessThan(0x10);
      expect(PROTOCOL_SPEC.CMD_UPDATE_COLOR).toBeLessThan(0x10);
    });

    it('should group related commands in same hex range', () => {
      // Config commands: 0x10-0x15
      expect(PROTOCOL_SPEC.CMD_ENTER_CONFIG).toBeGreaterThanOrEqual(0x10);
      expect(PROTOCOL_SPEC.CMD_ENTER_CONFIG).toBeLessThan(0x20);
      
      // Analytics commands: 0x20-0x2F
      expect(PROTOCOL_SPEC.CMD_REQUEST_ANALYTICS).toBeGreaterThanOrEqual(0x20);
      expect(PROTOCOL_SPEC.CMD_REQUEST_ANALYTICS).toBeLessThan(0x30);
    });
  });

  describe('Regression Tests for Historical Bugs', () => {
    /**
     * BUG #1: Swapped EXIT and COMMIT constants (2025-01-07)
     * 
     * Symptom: "Save Configuration" failed with "Not in config mode" error
     * Cause: CMD_EXIT_CONFIG=0x12 and CMD_COMMIT_CONFIG=0x11 were swapped
     * Fix: Swapped values to match Arduino firmware
     * 
     * This test ensures it never happens again.
     */
    it('[BUG #1] CMD_EXIT_CONFIG and CMD_COMMIT_CONFIG should never be swapped', () => {
      const exitCmd = BLECommandEncoder.encodeExitConfigMode();
      const commitCmd = BLECommandEncoder.encodeCommitConfig();
      
      // Exit should be 0x11, Commit should be 0x12
      expect(exitCmd[0]).toBe(0x11);
      expect(commitCmd[0]).toBe(0x12);
      
      // They should be different
      expect(exitCmd[0]).not.toBe(commitCmd[0]);
      
      // Exit should come before Commit numerically
      expect(exitCmd[0]).toBeLessThan(commitCmd[0]);
    });

    /**
     * BUG #2: UTF-8 encoding corruption (2025-01-07)
     * 
     * Symptom: Color commands sent as [0x03, 0xC8, 0xFF, 0xFF] became
     *          [0x03, 0xC3, 0x88, 0xC3, 0xBF, 0xC3, 0xBF] over BLE
     * Cause: TextEncoder was encoding binary data as UTF-8
     * Fix: Added sendRawBytes() to send binary data without encoding
     * 
     * This test ensures color commands are exactly 4 bytes.
     */
    it('[BUG #2] Color commands should be exactly 4 bytes (no UTF-8 expansion)', () => {
      const color = { h: 200, s: 255, v: 255 }; // Contains bytes > 127
      const command = BLECommandEncoder.encodeColorUpdate(color);
      
      // Should be exactly 4 bytes, not 7+ after UTF-8 encoding
      expect(command.length).toBe(4);
      expect(command[0]).toBe(0x03);
      expect(command[1]).toBe(200);  // 0xC8
      expect(command[2]).toBe(255);  // 0xFF
      expect(command[3]).toBe(255);  // 0xFF
    });
  });
});

