import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Logging Layer
 * Provides structured logging with local storage and future Firebase integration
 * 
 * TODO: Add Firebase blob storage upload for cloud logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  error?: {
    code?: number;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

const LOG_STORAGE_KEY = '@led_guitar:logs';
const MAX_LOCAL_LOGS = 1000; // Keep last 1000 log entries locally
const LOG_UPLOAD_BATCH_SIZE = 100; // Upload in batches

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private isInitialized = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Initialize logger and load existing logs
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
        // Trim to max size
        if (this.logs.length > MAX_LOCAL_LOGS) {
          this.logs = this.logs.slice(-MAX_LOCAL_LOGS);
        }
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.logs = [];
    }

    this.isInitialized = true;
  }

  /**
   * Log a message
   */
  private log(level: LogLevel, category: string, message: string, error?: Error | any, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      metadata,
    };

    // Add error information if provided
    if (error) {
      entry.error = {
        message: error?.message || String(error),
        code: error?.code,
        stack: error?.stack,
      };
    }

    // Add to in-memory logs
    this.logs.push(entry);

    // Trim logs if over limit
    if (this.logs.length > MAX_LOCAL_LOGS) {
      this.logs = this.logs.slice(-MAX_LOCAL_LOGS);
    }

    // Persist to local storage (async, don't block)
    this.persistLogs().catch(err => {
      console.error('Failed to persist logs:', err);
    });

    // Also log to console for development
    const levelName = LogLevel[level];
    const logMessage = `[${levelName}] [${category}] ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, metadata || '');
        break;
      case LogLevel.INFO:
        console.info(logMessage, metadata || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, metadata || '');
        break;
      case LogLevel.ERROR:
        console.error(logMessage, error, metadata || '');
        break;
    }
  }

  /**
   * Persist logs to local storage
   */
  private async persistLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  /**
   * Debug log
   */
  debug(category: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, category, message, undefined, metadata);
  }

  /**
   * Info log
   */
  info(category: string, message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, category, message, undefined, metadata);
  }

  /**
   * Warning log
   */
  warn(category: string, message: string, error?: Error | any, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, category, message, error, metadata);
  }

  /**
   * Error log
   */
  error(category: string, message: string, error?: Error | any, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, category, message, error, metadata);
  }

  /**
   * Get logs (optionally filtered by level and category)
   */
  getLogs(level?: LogLevel, category?: string, limit?: number): LogEntry[] {
    let filtered = this.logs;

    if (level !== undefined) {
      filtered = filtered.filter(log => log.level >= level);
    }

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    try {
      await AsyncStorage.removeItem(LOG_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Get logs ready for upload (batches)
   * TODO: Implement Firebase blob storage upload
   */
  getLogsForUpload(batchSize: number = LOG_UPLOAD_BATCH_SIZE): LogEntry[][] {
    const batches: LogEntry[][] = [];
    for (let i = 0; i < this.logs.length; i += batchSize) {
      batches.push(this.logs.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Upload logs to Firebase
   * TODO: Implement Firebase blob storage upload
   * This should:
   * 1. Get logs in batches
   * 2. Upload to Firebase Storage or Firestore
   * 3. Mark uploaded logs (or remove after successful upload)
   * 4. Handle retries and failures
   */
  async uploadLogsToFirebase(): Promise<void> {
    // TODO: Implement Firebase upload
    // const batches = this.getLogsForUpload();
    // for (const batch of batches) {
    //   await firebaseStorage.uploadLogs(batch);
    // }
    console.warn('Firebase log upload not yet implemented');
  }
}

export const logger = Logger.getInstance();

// Initialize logger on import
logger.initialize().catch(err => {
  console.error('Failed to initialize logger:', err);
});

