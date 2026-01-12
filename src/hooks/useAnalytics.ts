/**
 * Analytics Hook
 * Provides functions to track analytics events
 */

import { useCallback, useEffect, useRef } from 'react';
import { AnalyticsEvent, AnalyticsEventType, AnalyticsSession, TelemetryEvent } from '../types/analytics';
import { analyticsRepository } from '../repositories/analyticsRepository';
import { AnalyticsBatch } from '../types/commands';
import { getErrorMessage } from '../domain/common/errorEnvelope';

export const useAnalytics = () => {
  const activeSessionRef = useRef<AnalyticsSession | null>(null);

  /**
   * Track an analytics event
   */
  const trackEvent = useCallback(async (event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => {
    try {
      const fullEvent: AnalyticsEvent = {
        ...event,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      } as AnalyticsEvent;

      await analyticsRepository.saveEvent(fullEvent);

      // Add event to active session if it exists
      if (activeSessionRef.current) {
        activeSessionRef.current.events.push(fullEvent);
        await analyticsRepository.updateActiveSession({
          events: activeSessionRef.current.events,
        });
      }
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }, []);

  /**
   * End the current session
   */
  const endSession = useCallback(async () => {
    try {
      if (!activeSessionRef.current) {
        return;
      }

      const session = activeSessionRef.current;
      const endTime = Date.now();
      const duration = endTime - session.startTime;

      session.endTime = endTime;
      session.duration = duration;

      await analyticsRepository.updateActiveSession({
        endTime,
        duration,
      });

      await trackEvent({
        type: AnalyticsEventType.SESSION_ENDED,
        deviceId: session.deviceId,
        deviceName: session.deviceName,
        data: { duration },
      } as any);

      activeSessionRef.current = null;
    } catch (error) {
      console.error('Failed to end analytics session:', error);
    }
  }, [trackEvent]);

  /**
   * Start a new session
   */
  const startSession = useCallback(async (deviceId?: string, deviceName?: string) => {
    try {
      // End any existing session first
      if (activeSessionRef.current) {
        await endSession();
      }

      const session: AnalyticsSession = {
        id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        deviceId,
        deviceName,
        startTime: Date.now(),
        events: [],
      };

      activeSessionRef.current = session;
      await analyticsRepository.saveSession(session);
      await trackEvent({
        type: AnalyticsEventType.SESSION_STARTED,
        deviceId,
        deviceName,
      });
    } catch (error) {
      console.error('Failed to start analytics session:', error);
    }
  }, [trackEvent, endSession]);

  /**
   * Track connection events
   */
  const trackConnection = useCallback(async (
    type: AnalyticsEventType.CONNECTION_STARTED | 
          AnalyticsEventType.CONNECTION_SUCCESS | 
          AnalyticsEventType.CONNECTION_FAILED | 
          AnalyticsEventType.CONNECTION_DISCONNECTED,
    deviceId?: string,
    deviceName?: string,
    error?: string,
    rssi?: number
  ) => {
    await trackEvent({
      type,
      deviceId,
      deviceName,
      error,
      rssi,
    } as any);

    // Auto-start session on successful connection
    if (type === AnalyticsEventType.CONNECTION_SUCCESS) {
      await startSession(deviceId, deviceName);
    }

    // Auto-end session on disconnect
    if (type === AnalyticsEventType.CONNECTION_DISCONNECTED) {
      await endSession();
    }
  }, [trackEvent, startSession, endSession]);

  /**
   * Track configuration changes
   */
  const trackConfigChange = useCallback(async (
    parameter: string,
    oldValue: any,
    newValue: any,
    deviceId?: string,
    profileId?: string
  ) => {
    await trackEvent({
      type: AnalyticsEventType.CONFIG_CHANGED,
      deviceId,
      data: { parameter, oldValue, newValue, profileId },
    } as any);
  }, [trackEvent]);

  /**
   * Track profile events
   */
  const trackProfileEvent = useCallback(async (
    type: AnalyticsEventType.PROFILE_CREATED | 
          AnalyticsEventType.PROFILE_SWITCHED | 
          AnalyticsEventType.PROFILE_DELETED,
    profileId: string,
    profileName?: string,
    deviceId?: string
  ) => {
    await trackEvent({
      type,
      deviceId,
      data: { profileId, profileName },
    } as any);
  }, [trackEvent]);

  /**
   * Track command sent
   */
  const trackCommand = useCallback(async (
    commandType: string,
    success: boolean,
    deviceId?: string
  ) => {
    await trackEvent({
      type: AnalyticsEventType.COMMAND_SENT,
      deviceId,
      commandType,
      success,
    } as any);
  }, [trackEvent]);


  /**
   * Process analytics batch from microcontroller
   */
  const processAnalyticsBatch = useCallback(async (batch: AnalyticsBatch, deviceId?: string, deviceName?: string) => {
    try {
      // Convert microcontroller sessions to telemetry events
      for (const session of batch.sessions) {
        const telemetryEvent: TelemetryEvent = {
          id: `telemetry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: session.startTime * 1000, // Convert Unix seconds to milliseconds
          type: AnalyticsEventType.TELEMETRY_RECEIVED,
          deviceId,
          deviceName,
          data: {
            turnedOn: session.turnedOn,
            turnedOff: session.turnedOff,
            sessionDuration: session.duration,
            flashReads: batch.flashReads,
            flashWrites: batch.flashWrites,
            errorCount: batch.errorCount,
            lastError: batch.lastErrorCode ? getErrorMessage(batch.lastErrorCode) : undefined,
            averagePowerConsumption: batch.averagePowerConsumption,
            peakPowerConsumption: batch.peakPowerConsumption,
          },
        };
        
        await analyticsRepository.saveEvent(telemetryEvent);
      }
      
      // Also create a summary event for the batch
      const batchEvent: TelemetryEvent = {
        id: `telemetry-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: AnalyticsEventType.TELEMETRY_RECEIVED,
        deviceId,
        deviceName,
        data: {
          batchId: batch.batchId,
          sessionCount: batch.sessionCount,
          flashReads: batch.flashReads,
          flashWrites: batch.flashWrites,
          errorCount: batch.errorCount,
          lastError: batch.lastErrorCode ? getErrorMessage(batch.lastErrorCode) : undefined,
          averagePowerConsumption: batch.averagePowerConsumption,
          peakPowerConsumption: batch.peakPowerConsumption,
        },
      };
      await analyticsRepository.saveEvent(batchEvent);
    } catch (error) {
      console.error('Failed to process analytics batch:', error);
    }
  }, []);

  /**
   * Load active session on mount
   */
  useEffect(() => {
    const loadActiveSession = async () => {
      try {
        const active = await analyticsRepository.getActiveSession();
        if (active) {
          activeSessionRef.current = active;
        }
      } catch (error) {
        console.error('Failed to load active session:', error);
      }
    };
    loadActiveSession();
  }, []);

  return {
    trackEvent,
    startSession,
    endSession,
    trackConnection,
    trackConfigChange,
    trackProfileEvent,
    trackCommand,
    processAnalyticsBatch,
  };
};
