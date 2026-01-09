import { ErrorEnvelope, formatErrorForUser } from './errorEnvelope';

/**
 * Alert Envelope Pattern
 * Centralized alert message management
 */
export interface AlertEnvelope {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  error?: ErrorEnvelope;
}

/**
 * Create alert envelope from error envelope
 */
export function createAlertFromError(error: ErrorEnvelope): AlertEnvelope {
  return {
    title: 'Error',
    message: formatErrorForUser(error),
    type: 'error',
    error,
  };
}

/**
 * Create success alert
 */
export function createSuccessAlert(message: string, title: string = 'Success'): AlertEnvelope {
  return {
    title,
    message,
    type: 'success',
  };
}

/**
 * Create error alert
 */
export function createErrorAlert(message: string, title: string = 'Error'): AlertEnvelope {
  return {
    title,
    message,
    type: 'error',
  };
}

/**
 * Create warning alert
 */
export function createWarningAlert(message: string, title: string = 'Warning'): AlertEnvelope {
  return {
    title,
    message,
    type: 'warning',
  };
}

/**
 * Create info alert
 */
export function createInfoAlert(message: string, title: string = 'Info'): AlertEnvelope {
  return {
    title,
    message,
    type: 'info',
  };
}

/**
 * Common alert messages
 */
export const AlertMessages = {
  NO_DEVICE_CONNECTED: 'No device connected or configuration not loaded',
  CONFIG_SAVED: 'Configuration saved successfully!',
  CONFIG_LOADED: 'Configuration loaded successfully',
  CONFIG_FAILED: 'Failed to save configuration',
  DEVICE_DISCONNECTED: 'Device disconnected',
  CONNECTION_FAILED: 'Failed to connect to device',
} as const;

