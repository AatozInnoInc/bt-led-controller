# LED Guitar Controller - Test Suite

This directory contains tests for the LED Guitar Controller application.

## Test Structure

```
__tests__/
├── domains/
│   ├── bluetooth/
│   │   ├── BLECommandEncoder.test.ts        # Command encoding tests
│   │   └── ProtocolSpecification.test.ts    # ⭐ Protocol validation
│   ├── common/
│   │   └── ErrorEnvelope.test.ts            # Error handling tests
│   └── config/
│       └── ConfigDomainController.test.ts   # Config management tests
├── integration/
│   └── config-mode-lifecycle.test.ts        # End-to-end workflow tests
└── mocks/
    └── MockBluetoothService.ts               # BLE service mock
```

## Critical: Protocol Specification Tests ⚠️

**File:** `domains/bluetooth/ProtocolSpecification.test.ts`

These tests are **CRITICAL** for preventing protocol mismatches between the TypeScript app and Arduino firmware. They have already caught **2 production bugs**:

### Bug #1: Swapped Exit/Commit Commands (2025-01-07)
- **Symptom:** "Save Configuration" failed with "Not in config mode"
- **Cause:** `CMD_EXIT_CONFIG` and `CMD_COMMIT_CONFIG` constants were swapped
- **Impact:** Users couldn't save their LED configurations
- **Prevention:** Tests now verify exact byte values and command ordering

### Bug #2: UTF-8 Encoding Corruption (2025-01-07)
- **Symptom:** Color commands sent wrong bytes over BLE
- **Cause:** `TextEncoder` was converting binary data to UTF-8
- **Impact:** Color updates sent garbage data, triggering multiple "Invalid Command" errors
- **Prevention:** Tests now verify command byte lengths and exact values

## Setup Testing Framework

This project uses Jest with TypeScript. To set up testing:

### 1. Install Dependencies

```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react-native @testing-library/jest-native
```

### 2. Create `jest.config.js`

```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@unimodules|unimodules)/)',
  ],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__mocks__/**',
  ],
};
```

### 3. Add Test Script to `package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:protocol": "jest ProtocolSpecification.test.ts"
  }
}
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run protocol tests only (MUST pass before deploying!)
npm run test:protocol

# Watch mode for development
npm test:watch

# Generate coverage report
npm test:coverage
```

## Pre-Deployment Checklist ✅

**Before deploying or updating Arduino firmware:**

1. ✅ Run protocol specification tests: `npm run test:protocol`
2. ✅ Verify all tests pass
3. ✅ If tests fail, check BOTH:
   - TypeScript constants in `src/utils/bleConstants.ts`
   - Arduino firmware in `bt-led-controller/bt-led-controller.ino` (enum CommandType)
4. ✅ Update the side that's incorrect
5. ✅ Run tests again to confirm fix

## Writing New Tests

### Testing BLE Commands

```typescript
import { BLECommandEncoder } from '../../../domain/bluetooth/bleCommandEncoder';

it('should encode my new command', () => {
  const command = BLECommandEncoder.encodeMyNewCommand(params);
  
  // Verify byte sequence
  expect(Array.from(command)).toEqual([0xXX, param1, param2]);
  
  // Verify length
  expect(command.length).toBe(3);
});
```

### Testing Protocol Constants

```typescript
import { BLE_COMMANDS } from '../../../utils/bleConstants';

it('should match protocol specification', () => {
  expect(BLE_COMMANDS.CMD_MY_NEW_COMMAND).toBe(0xXX);
});
```

### Adding Regression Tests

When you fix a bug, add a regression test to prevent it from happening again:

```typescript
describe('Regression Tests', () => {
  /**
   * BUG #X: [Brief description] (YYYY-MM-DD)
   * 
   * Symptom: [What the user saw]
   * Cause: [Root cause]
   * Fix: [How it was fixed]
   */
  it('[BUG #X] should prevent [bug name]', () => {
    // Test that verifies the bug is fixed and won't regress
  });
});
```

## Mock Bluetooth Service

The `MockBluetoothService` simulates BLE communication for testing without a real device:

```typescript
import { mockBluetoothService } from '../mocks/MockBluetoothService';

beforeEach(() => {
  mockBluetoothService.reset();
  mockBluetoothService.setConnectedDevice(mockDevice);
});

it('should handle BLE communication', async () => {
  // Mock service will automatically respond to commands
  await controller.enterConfigMode();
  // Assertions...
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:protocol  # MUST pass!
      - run: npm test               # All tests
```

## Test Coverage Goals

- **Protocol Tests:** 100% (CRITICAL)
- **Command Encoding:** 100%
- **Domain Controllers:** >80%
- **UI Components:** >60%

## Questions?

If tests fail and you're not sure why:

1. Read the test description - it explains what's being tested
2. Check the "Bug History" section for similar issues
3. Verify constants in both TypeScript and Arduino code
4. Check the protocol specification in `ProtocolSpecification.test.ts`

## Contributing

When adding new BLE commands:

1. ✅ Update Arduino firmware enum
2. ✅ Update TypeScript constants
3. ✅ Add protocol spec test
4. ✅ Add encoding test
5. ✅ Add integration test
6. ✅ Run all tests before committing

---

**Remember:** These tests are your safety net. A failing protocol test means a broken device! 🎸

