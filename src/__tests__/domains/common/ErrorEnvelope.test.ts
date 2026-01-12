import {
  ErrorEnvelope,
  parseErrorEnvelope,
  parseErrorEnvelopeFromString,
  createErrorEnvelope,
  isErrorEnvelope,
  formatErrorForUser,
  ErrorCode,
} from '../../../domains/common/ErrorEnvelope';

describe('ErrorEnvelope', () => {
  describe('parseErrorEnvelope', () => {
    it('should parse binary error envelope correctly', () => {
      const data = new Uint8Array([0x90, 0x01, 0x49, 0x6e, 0x76, 0x61, 0x6c, 0x69, 0x64]); // [0x90, 0x01, "Invalid"]
      const result = parseErrorEnvelope(data);

      expect(result).not.toBeNull();
      expect(result?.code).toBe(0x01);
      expect(result?.message).toContain('Invalid');
    });

    it('should return null for invalid envelope format', () => {
      const data = new Uint8Array([0x91, 0x01]); // Wrong marker
      const result = parseErrorEnvelope(data);

      expect(result).toBeNull();
    });

    it('should return null for insufficient data', () => {
      const data = new Uint8Array([0x90]); // Only marker
      const result = parseErrorEnvelope(data);

      expect(result).toBeNull();
    });
  });

  describe('parseErrorEnvelopeFromString', () => {
    it('should parse string error envelope correctly', () => {
      const response = 'ERROR:2:Invalid parameter';
      const result = parseErrorEnvelopeFromString(response);

      expect(result).not.toBeNull();
      expect(result?.code).toBe(0x02);
      expect(result?.message).toBe('Invalid parameter');
    });

    it('should return null for non-error string', () => {
      const response = 'SUCCESS:Operation completed';
      const result = parseErrorEnvelopeFromString(response);

      expect(result).toBeNull();
    });
  });

  describe('createErrorEnvelope', () => {
    it('should create error envelope with code and message', () => {
      const envelope = createErrorEnvelope(ErrorCode.INVALID_COMMAND, 'Test error');

      expect(envelope.code).toBe(ErrorCode.INVALID_COMMAND);
      expect(envelope.message).toBe('Test error');
      expect(envelope.timestamp).toBeDefined();
    });

    it('should use default message if not provided', () => {
      const envelope = createErrorEnvelope(ErrorCode.INVALID_COMMAND);
      
      expect(envelope.code).toBe(ErrorCode.INVALID_COMMAND);
      expect(envelope.message).toBe('Invalid command sent to device');
    });
  });

  describe('isErrorEnvelope', () => {
    it('should identify binary error envelope', () => {
      const data = new Uint8Array([0x90, 0x01]);
      expect(isErrorEnvelope(data)).toBe(true);
    });

    it('should identify string error envelope', () => {
      expect(isErrorEnvelope('ERROR:1:Test')).toBe(true);
    });

    it('should return false for non-error data', () => {
      expect(isErrorEnvelope('SUCCESS:OK')).toBe(false);
      expect(isErrorEnvelope(new Uint8Array([0x91, 0x01]))).toBe(false);
    });
  });

  describe('formatErrorForUser', () => {
    it('should format error message for user', () => {
      const envelope: ErrorEnvelope = {
        code: ErrorCode.INVALID_PARAMETER,
        message: 'Invalid parameter value',
        timestamp: Date.now(),
      };

      expect(formatErrorForUser(envelope)).toBe('Invalid parameter value');
    });
  });
});


