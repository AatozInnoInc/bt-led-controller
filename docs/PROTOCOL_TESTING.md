# BLE Protocol Testing Guide

## Overview

This document explains how protocol testing prevents communication bugs between the React app and Arduino firmware.

## The Problem We're Solving

The LED Guitar Controller uses Bluetooth Low Energy (BLE) to communicate between:
- **TypeScript App** (React Native) - sends commands
- **Arduino Firmware** (C++) - receives and executes commands

**Without tests**, it's easy for these to get out of sync:
```
TypeScript thinks:     CMD_COMMIT_CONFIG = 0x11
Arduino expects:       CMD_COMMIT_CONFIG = 0x12
Result:                💥 Command rejected!
```

## Real Bugs We Caught

### Bug #1: Swapped Constants (January 7, 2025)

**What happened:**
- User clicked "Save Configuration"
- App showed: "Not in config mode" error
- Arduino showed: `[ERROR] Code: 0x4 (NOT_IN_CONFIG_MODE)`

**Root cause:**
```typescript
// TypeScript (WRONG)
CMD_EXIT_CONFIG: 0x12,
CMD_COMMIT_CONFIG: 0x11,

// Arduino (CORRECT)
CMD_EXIT_CONFIG   = 0x11,
CMD_COMMIT_CONFIG = 0x12,
```

**Result:**
1. App sent `0x11` thinking it was "commit" → Arduino received "exit" ✅
2. App sent `0x12` thinking it was "exit" → Arduino received "commit" ❌ (already exited!)

**How our tests would have caught it:**
```typescript
it('CMD_EXIT_CONFIG and CMD_COMMIT_CONFIG should never be swapped', () => {
  expect(BLE_COMMANDS.CMD_EXIT_CONFIG).toBe(0x11);
  expect(BLE_COMMANDS.CMD_COMMIT_CONFIG).toBe(0x12);
});
```
✅ **Test would FAIL immediately**, pointing to the exact problem!

### Bug #2: UTF-8 Encoding Corruption (January 7, 2025)

**What happened:**
- User selected purple color
- Arduino received 3 "Invalid Command" errors
- Color didn't update

**Root cause:**
```typescript
// Sending: [0x03, 0xC8, 0xFF, 0xFF]  (4 bytes)
const str = String.fromCharCode(0x03, 0xC8, 0xFF, 0xFF);
const encoded = new TextEncoder().encode(str);
// Actually sent: [0x03, 0xC3, 0x88, 0xC3, 0xBF, 0xC3, 0xBF]  (7 bytes! UTF-8 encoded)
```

**Result:**
- Arduino read `0x03` correctly (color command)
- Then read `0xC3, 0x88, 0xC3, 0xBF, 0xC3, 0xBF` as 6 more commands
- Rejected them all as invalid

**How our tests would have caught it:**
```typescript
it('Color commands should be exactly 4 bytes', () => {
  const color = { h: 200, s: 255, v: 255 };
  const command = BLECommandEncoder.encodeColorUpdate(color);
  expect(command.length).toBe(4);  // Would FAIL with length=7
});
```

## Test Structure

### 1. Protocol Specification (`ProtocolSpecification.test.ts`)

**Purpose:** Single source of truth for the BLE protocol

```typescript
const PROTOCOL_SPEC = {
  CMD_ENTER_CONFIG: 0x10,
  CMD_EXIT_CONFIG: 0x11,
  CMD_COMMIT_CONFIG: 0x12,
  // ...
};

// Verify TypeScript matches spec
it('should match protocol spec', () => {
  expect(BLE_COMMANDS.CMD_EXIT_CONFIG).toBe(PROTOCOL_SPEC.CMD_EXIT_CONFIG);
});
```

**When this fails:** Either TypeScript or Arduino is wrong. Check both!

### 2. Command Encoding Tests (`BLECommandEncoder.test.ts`)

**Purpose:** Verify commands produce correct byte sequences

```typescript
it('should encode exit command', () => {
  const command = BLECommandEncoder.encodeExitConfigMode();
  expect(Array.from(command)).toEqual([0x11]);  // Exact bytes
});
```

**When this fails:** Encoding logic is broken

### 3. Integration Tests (`config-mode-lifecycle.test.ts`)

**Purpose:** Test complete workflows

```typescript
it('should complete config lifecycle', async () => {
  await controller.enterConfigMode();  // Enter
  await controller.updateColor(color); // Update
  await controller.commitConfig();     // Commit
  await controller.exitConfigMode();   // Exit
});
```

**When this fails:** Command sequencing or state management is broken

## Running Tests

### Quick Start
```bash
# Install dependencies (one-time)
npm install --save-dev jest @types/jest ts-jest

# Add to package.json scripts:
"test": "jest"
"test:protocol": "jest ProtocolSpecification.test.ts"

# Run protocol tests (CRITICAL before deploy!)
npm run test:protocol
```

### Pre-Deployment Checklist

Before uploading new Arduino firmware OR deploying app update:

```bash
✅ npm run test:protocol  # Must pass 100%
✅ Review any changed constants in both codebases
✅ Test on real hardware (if available)
```

## Adding New Commands

When adding a new BLE command:

**1. Update Arduino Firmware**
```cpp
// bt-led-controller/bt-led-controller.ino
enum CommandType : uint8_t {
  CMD_MY_NEW_COMMAND = 0x16,  // Choose unused byte value
  // ...
};
```

**2. Update TypeScript Constants**
```typescript
// src/utils/bleConstants.ts
export const BLE_COMMANDS = {
  CMD_MY_NEW_COMMAND: 0x16,  // MUST match Arduino!
  // ...
};
```

**3. Add Protocol Test**
```typescript
// src/__tests__/domains/bluetooth/ProtocolSpecification.test.ts
const PROTOCOL_SPEC = {
  CMD_MY_NEW_COMMAND: 0x16,
  // ...
};

it('CMD_MY_NEW_COMMAND should match protocol spec', () => {
  expect(BLE_COMMANDS.CMD_MY_NEW_COMMAND).toBe(PROTOCOL_SPEC.CMD_MY_NEW_COMMAND);
});
```

**4. Add Encoding Test**
```typescript
// src/__tests__/domains/bluetooth/BLECommandEncoder.test.ts
it('should encode my new command', () => {
  const command = BLECommandEncoder.encodeMyNewCommand(params);
  expect(Array.from(command)).toEqual([0x16, ...params]);
});
```

**5. Run Tests**
```bash
npm run test:protocol  # Verify protocol matches
npm test              # Run all tests
```

## Protocol Versioning

**Current Version:** 1.0

When making breaking protocol changes:
1. Increment version in both codebases
2. Update `PROTOCOL_SPEC` version comment
3. Add version negotiation command (future)
4. Document migration path

## Common Mistakes to Avoid

### ❌ Don't hardcode hex values
```typescript
// BAD
await send([0x11, 0xFF, 0xFF]);

// GOOD
const command = BLECommandEncoder.encodeExitConfigMode();
await send(command);
```

### ❌ Don't skip protocol tests
```bash
# BAD
git commit -m "Quick fix"  # No tests!

# GOOD
npm run test:protocol  # Verify first
git commit -m "Fix: corrected CMD_EXIT_CONFIG constant"
```

### ❌ Don't assume byte values
```typescript
// BAD
if (response[0] === 0x11) { ... }  // Magic number!

// GOOD
if (response[0] === BLE_COMMANDS.CMD_EXIT_CONFIG) { ... }
```

## Debugging Protocol Issues

**Symptom:** "Invalid Command" errors from Arduino

**Debugging steps:**
1. Check browser console for sent bytes: `Raw bytes sent: 0xXX 0xYY`
2. Check Arduino serial monitor for received bytes: `[BLE] Received command: 0xXX`
3. Compare with protocol spec: Does `0xXX` match expected command?
4. Run tests: `npm run test:protocol`

**Symptom:** Commands work but wrong behavior

**Debugging steps:**
1. Verify constants: `BLE_COMMANDS` vs Arduino `enum CommandType`
2. Check command order: Enter → Update → Commit → Exit
3. Verify byte lengths: Color=4 bytes, Enter=1 byte, etc.

## Testing on Real Hardware

Protocol tests are great, but real hardware testing is essential:

**Test Plan:**
1. ✅ Connect to device
2. ✅ Enter config mode (should see ACK)
3. ✅ Change color (should see color change on LEDs)
4. ✅ Save config (should persist after power cycle)
5. ✅ Disconnect and reconnect (should restore saved config)

## Future Improvements

- [ ] Add fuzzing tests for invalid inputs
- [ ] Add performance benchmarks
- [ ] Add protocol version negotiation
- [ ] Add automated hardware-in-the-loop testing
- [ ] Generate protocol documentation from tests

## Questions?

**Q: Do I really need to run tests every time?**
A: Yes! These tests caught 2 production bugs in one day. They take seconds to run.

**Q: What if tests pass but hardware still fails?**
A: Check the Arduino serial monitor. The firmware might have different behavior than documented.

**Q: Can I skip tests for "quick fixes"?**
A: No! Quick fixes are where bugs hide. Run tests, commit with confidence.

---

**Remember:** A few seconds running tests saves hours of debugging! 🎸✨

