# Testing Suite

This directory contains the comprehensive test suite for the LED Guitar Controller app, including unit tests, integration tests, and mock implementations.

## Test Structure

```
__tests__/
├── mocks/
│   ├── MockMicrocontroller.ts    # Simulates nRF52 firmware behavior
│   └── MockBluetoothService.ts   # Mocks Bluetooth communication
├── utils/
│   ├── testFixtures.ts           # Sample data for tests
│   ├── testHelpers.ts            # Helper functions
│   └── commandHelpers.ts         # Command utilities (if needed)
├── bleCommandEncoder.test.ts     # Unit: Command encoding/decoding
├── parameterValidation.test.ts   # Unit: Power validation
├── devicePairing.test.ts         # Unit: Device pairing logic
├── configDomainController.test.ts # Integration: Full config workflow
├── ownership.test.ts             # Integration: Device ownership
├── analytics.test.ts             # Integration: Analytics flow
├── errorHandling.test.ts         # Integration: Error scenarios
└── setup.ts                      # Jest configuration
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run in Watch Mode
```bash
npm run test:watch
```

### Run with Coverage
```bash
npm run test:coverage
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Specific test file
npm test bleCommandEncoder
```

## Test Categories

### Unit Tests
Test individual components in isolation:
- **bleCommandEncoder.test.ts**: Tests command encoding/decoding, validation, edge cases
- **parameterValidation.test.ts**: Tests power consumption calculations, safety limits
- **devicePairing.test.ts**: Tests AsyncStorage operations, pairing logic

### Integration Tests
Test full workflows using MockMicrocontroller:
- **configDomainController.test.ts**: Tests complete configuration workflows
- **ownership.test.ts**: Tests device claiming, verification, and unclaiming
- **analytics.test.ts**: Tests analytics batch request/confirm flow
- **errorHandling.test.ts**: Tests error scenarios, recovery, and error envelopes

## Mock Microcontroller

The `MockMicrocontroller` simulates the nRF52 firmware and provides:
- Full BLE command protocol implementation
- State management (config, ownership, analytics)
- Error injection for testing error scenarios
- Configurable delays for realistic timing
- Developer/test user override support

### Using the Mock

```typescript
import { MockMicrocontroller } from './mocks/MockMicrocontroller';

// Create mock with options
const mock = new MockMicrocontroller({
  simulateDelays: false,  // For faster tests
  developerUserIds: ['dev-001'],
  testUserIds: ['test-001'],
});

// Process commands
const response = await mock.processCommand(command);

// Check state
const state = mock.getState();
expect(state.currentConfig.brightness).toBe(200);

// Inject errors
mock.simulateError(ErrorCode.VALIDATION_FAILED);

// Reset
mock.reset();
```

## MockBluetoothService

Wraps `MockMicrocontroller` to simulate the `BluetoothService` interface:
- Connection management
- Command/response flow
- Notification callbacks
- Disconnection simulation

### Using the Mock Service

```typescript
import { MockBluetoothService } from './mocks/MockBluetoothService';

const mockService = new MockBluetoothService();
await mockService.initialize();
await mockService.connectToDevice('mock-device-001');

// Send commands
const response = await mockService.sendCommand(deviceId, command);

// Access underlying microcontroller
const micro = mockService.getMicrocontroller();
micro.setState({ ... });

// Simulate disconnection
mockService.simulateDisconnect();
```

## Test Fixtures

`testFixtures.ts` provides sample data:
- Mock user IDs (including developer/test users)
- LED configurations (default, high power, safe, rainbow)
- Colors (red, green, blue, white, black)
- BLE commands (pre-encoded)
- BLE responses (success, error codes)
- Analytics batches
- Device information

## Test Helpers

`testHelpers.ts` provides utilities:
- `wait(ms)`: Delay execution
- `clearAsyncStorage()`: Reset AsyncStorage
- `createMockMicrocontroller(options)`: Create configured mock
- `createConnectedMockService()`: Create and connect mock service
- `assertUint8ArrayEqual()`: Compare byte arrays
- `setupPairedDevice()`: Setup paired device in storage
- `mockConsole()`: Suppress console output in tests

## Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Cover all major workflows
- **Critical Paths**: 100% coverage for:
  - Power validation (safety-critical)
  - Ownership verification
  - Command encoding/decoding
  - Error handling

## Writing New Tests

### Unit Test Template

```typescript
import { YourModule } from '../path/to/module';
import { MOCK_FIXTURES } from './utils/testFixtures';

describe('YourModule', () => {
  describe('specificFunction', () => {
    it('should do something', () => {
      const result = YourModule.specificFunction(input);
      expect(result).toBe(expected);
    });
    
    it('should handle edge case', () => {
      // Test edge case
    });
  });
});
```

### Integration Test Template

```typescript
import { MockBluetoothService } from './mocks/MockBluetoothService';
import { createConnectedMockService } from './utils/testHelpers';

describe('Feature Integration', () => {
  let mockService: MockBluetoothService;
  
  beforeEach(async () => {
    mockService = await createConnectedMockService();
  });
  
  afterEach(() => {
    mockService.reset();
  });
  
  it('should complete full workflow', async () => {
    // Test full workflow using mockService
  });
});
```

## Testing Without Physical Hardware

All tests use `MockMicrocontroller` to simulate firmware behavior, allowing:
- Rapid test execution (no BLE delays)
- Deterministic behavior (no random BLE issues)
- Error injection (test failure scenarios)
- CI/CD integration (no hardware required)

## Debugging Tests

### Enable Verbose Logging
```typescript
// Temporarily restore console in test
const mockConsole = require('./utils/testHelpers').mockConsole;
const restore = mockConsole();
// ... test code ...
restore.restore();
```

### Inspect Mock State
```typescript
const state = mockService.getMicrocontroller().getState();
console.log('Current state:', JSON.stringify(state, null, 2));
```

### Run Single Test
```bash
npm test -- -t "should do specific thing"
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment checks

### CI Configuration
- Uses Jest with preset 'jest-expo'
- Runs in Node environment
- Coverage reports generated
- Fails on coverage below 70%

## Future Enhancements

1. **Component Tests**: Add React Testing Library tests for ConfigScreen, DeviceDiscoveryScreen
2. **E2E Tests**: Add physical hardware tests (optional, manual)
3. **Performance Tests**: Add tests for UI responsiveness
4. **Snapshot Tests**: Add component snapshot tests
5. **Visual Regression**: Add visual regression testing

## Troubleshooting

### Tests Timing Out
- Increase timeout: `jest.setTimeout(10000)` in setup.ts
- Check for missing `await` keywords
- Verify mock is not in infinite loop

### Mock Not Working
- Ensure jest.mock() is before imports
- Check mock is properly initialized
- Verify bluetoothService is replaced in tests

### AsyncStorage Issues
- Call `clearAsyncStorage()` in beforeEach
- Check AsyncStorage mock is loaded in setup.ts

### Coverage Issues
- Run `npm run test:coverage` to see report
- Check `coverage/lcov-report/index.html` for details
- Add tests for uncovered branches

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)



