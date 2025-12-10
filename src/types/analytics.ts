/**
 * Analytics Types
 * Defines the data structures for tracking app usage and controller events
 */

export enum AnalyticsEventType {
  // Connection events
  CONNECTION_STARTED = 'connection_started',
  CONNECTION_SUCCESS = 'connection_success',
  CONNECTION_FAILED = 'connection_failed',
  CONNECTION_DISCONNECTED = 'connection_disconnected',
  
  // Configuration events
  CONFIG_CHANGED = 'config_changed',
  PROFILE_CREATED = 'profile_created',
  PROFILE_SWITCHED = 'profile_switched',
  PROFILE_DELETED = 'profile_deleted',
  
  // Usage events
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  COMMAND_SENT = 'command_sent',
  
  // Controller telemetry (for future use)
  TELEMETRY_RECEIVED = 'telemetry_received',
}

export interface BaseAnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  deviceId?: string;
  deviceName?: string;
}

export interface ConnectionEvent extends BaseAnalyticsEvent {
  type: AnalyticsEventType.CONNECTION_STARTED | AnalyticsEventType.CONNECTION_SUCCESS | 
        AnalyticsEventType.CONNECTION_FAILED | AnalyticsEventType.CONNECTION_DISCONNECTED;
  error?: string;
  rssi?: number;
}

export interface ConfigChangeEvent extends BaseAnalyticsEvent {
  type: AnalyticsEventType.CONFIG_CHANGED;
  parameter?: string;
  oldValue?: any;
  newValue?: any;
  profileId?: string;
}

export interface ProfileEvent extends BaseAnalyticsEvent {
  type: AnalyticsEventType.PROFILE_CREATED | AnalyticsEventType.PROFILE_SWITCHED | 
        AnalyticsEventType.PROFILE_DELETED;
  profileId: string;
  profileName?: string;
}

export interface SessionEvent extends BaseAnalyticsEvent {
  type: AnalyticsEventType.SESSION_STARTED | AnalyticsEventType.SESSION_ENDED;
  duration?: number; // milliseconds, only for SESSION_ENDED
}

export interface CommandEvent extends BaseAnalyticsEvent {
  type: AnalyticsEventType.COMMAND_SENT;
  commandType?: string;
  success?: boolean;
}

export interface TelemetryEvent extends BaseAnalyticsEvent {
  type: AnalyticsEventType.TELEMETRY_RECEIVED;
  data: {
    // Session data
    turnedOn?: boolean;
    turnedOff?: boolean;
    sessionDuration?: number; // milliseconds
    
    // Flash operations
    flashReads?: number;
    flashWrites?: number;
    
    // Errors
    errorCount?: number;
    lastError?: string;
    
    // Power consumption
    powerConsumption?: number; // mA
    averagePower?: number; // mA
    peakPower?: number; // mA
    
    // Legacy fields
    batteryLevel?: number;
    temperature?: number;
    uptime?: number;
    ledUsageTime?: number;
    [key: string]: any;
  };
}

export type AnalyticsEvent = 
  | ConnectionEvent 
  | ConfigChangeEvent 
  | ProfileEvent 
  | SessionEvent 
  | CommandEvent 
  | TelemetryEvent;

export interface AnalyticsSession {
  id: string;
  deviceId?: string;
  deviceName?: string;
  startTime: number;
  endTime?: number;
  duration?: number; // milliseconds
  events: AnalyticsEvent[];
}

export interface AnalyticsSummary {
  totalSessions: number;
  totalConnectionTime: number; // milliseconds
  averageSessionDuration: number; // milliseconds
  mostUsedProfile?: {
    profileId: string;
    profileName?: string;
    usageCount: number;
  };
  mostChangedParameter?: {
    parameter: string;
    changeCount: number;
  };
  connectionSuccessRate: number; // 0-1
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  lastConnected?: number;
  lastSessionDuration?: number;
  
  // Parameter statistics
  totalParameterChanges: number;
  parameterChangeCounts?: Map<string, number>;
  
  // Microcontroller telemetry (when available)
  totalFlashReads?: number;
  totalFlashWrites?: number;
  totalErrors?: number;
  averagePowerConsumption?: number;
  peakPowerConsumption?: number;
}

export interface AnalyticsTimeRange {
  start: number;
  end: number;
}
