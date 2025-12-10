/**
 * Analytics Repository
 * Manages analytics data storage using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsEvent, AnalyticsSession, AnalyticsSummary } from '../types/analytics';

const ANALYTICS_EVENTS_KEY = 'analytics_events';
const ANALYTICS_SESSIONS_KEY = 'analytics_sessions';
const MAX_EVENTS = 10000; // Keep last 10k events
const MAX_SESSIONS = 1000; // Keep last 1k sessions

export class AnalyticsRepository {
  /**
   * Save an analytics event
   */
  async saveEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const events = await this.getEvents();
      events.push(event);
      
      // Keep only the most recent events
      if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
      }
      
      await AsyncStorage.setItem(ANALYTICS_EVENTS_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('Failed to save analytics event:', error);
    }
  }

  /**
   * Get all analytics events
   */
  async getEvents(): Promise<AnalyticsEvent[]> {
    try {
      const data = await AsyncStorage.getItem(ANALYTICS_EVENTS_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load analytics events:', error);
      return [];
    }
  }

  /**
   * Get events within a time range
   */
  async getEventsInRange(startTime: number, endTime: number): Promise<AnalyticsEvent[]> {
    const events = await this.getEvents();
    return events.filter(
      event => event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * Get events by type
   */
  async getEventsByType(type: string): Promise<AnalyticsEvent[]> {
    const events = await this.getEvents();
    return events.filter(event => event.type === type);
  }

  /**
   * Save a session
   */
  async saveSession(session: AnalyticsSession): Promise<void> {
    try {
      const sessions = await this.getSessions();
      sessions.push(session);
      
      // Keep only the most recent sessions
      if (sessions.length > MAX_SESSIONS) {
        sessions.splice(0, sessions.length - MAX_SESSIONS);
      }
      
      await AsyncStorage.setItem(ANALYTICS_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save analytics session:', error);
    }
  }

  /**
   * Get all sessions
   */
  async getSessions(): Promise<AnalyticsSession[]> {
    try {
      const data = await AsyncStorage.getItem(ANALYTICS_SESSIONS_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load analytics sessions:', error);
      return [];
    }
  }

  /**
   * Get active session (if any)
   */
  async getActiveSession(): Promise<AnalyticsSession | null> {
    const sessions = await this.getSessions();
    return sessions.find(s => !s.endTime) || null;
  }

  /**
   * Update active session
   */
  async updateActiveSession(updates: Partial<AnalyticsSession>): Promise<void> {
    const sessions = await this.getSessions();
    const activeIndex = sessions.findIndex(s => !s.endTime);
    
    if (activeIndex >= 0) {
      sessions[activeIndex] = { ...sessions[activeIndex], ...updates };
      await AsyncStorage.setItem(ANALYTICS_SESSIONS_KEY, JSON.stringify(sessions));
    }
  }

  /**
   * Calculate analytics summary
   */
  async getSummary(): Promise<AnalyticsSummary> {
    const events = await this.getEvents();
    const sessions = await this.getSessions();
    
    const completedSessions = sessions.filter(s => s.endTime && s.duration);
    const totalSessions = completedSessions.length;
    const totalConnectionTime = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const averageSessionDuration = totalSessions > 0 ? totalConnectionTime / totalSessions : 0;

    // Count profile usage
    const profileUsage = new Map<string, { name?: string; count: number }>();
    events.forEach(event => {
      if (event.type === 'profile_switched' && 'profileId' in event) {
        const profileId = event.profileId;
        const current = profileUsage.get(profileId) || { count: 0, name: event.profileName };
        profileUsage.set(profileId, { ...current, count: current.count + 1 });
      }
    });
    
    let mostUsedProfile: AnalyticsSummary['mostUsedProfile'] | undefined;
    if (profileUsage.size > 0) {
      const entries = Array.from(profileUsage.entries());
      const [profileId, data] = entries.reduce((max, [id, d]) => 
        d.count > max[1].count ? [id, d] : max
      );
      mostUsedProfile = { profileId, profileName: data.name, usageCount: data.count };
    }

    // Count parameter changes
    const parameterChanges = new Map<string, number>();
    events.forEach(event => {
      if (event.type === 'config_changed' && 'parameter' in event && event.parameter) {
        const count = parameterChanges.get(event.parameter) || 0;
        parameterChanges.set(event.parameter, count + 1);
      }
    });
    
    let mostChangedParameter: AnalyticsSummary['mostChangedParameter'] | undefined;
    if (parameterChanges.size > 0) {
      const entries = Array.from(parameterChanges.entries());
      const [parameter, count] = entries.reduce((max, [p, c]) => 
        c > max[1] ? [p, c] : max
      );
      mostChangedParameter = { parameter, changeCount: count };
    }

    // Connection statistics
    const connectionEvents = events.filter(e => 
      e.type === 'connection_success' || e.type === 'connection_failed'
    );
    const successfulConnections = connectionEvents.filter(e => e.type === 'connection_success').length;
    const failedConnections = connectionEvents.filter(e => e.type === 'connection_failed').length;
    const totalConnections = successfulConnections + failedConnections;
    const connectionSuccessRate = totalConnections > 0 ? successfulConnections / totalConnections : 0;

    // Last connection and session
    const lastConnectionEvent = events
      .filter(e => e.type === 'connection_success')
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastSession = completedSessions
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0];

    // Total parameter changes
    const totalParameterChanges = events.filter(e => e.type === 'config_changed').length;
    
    // Parameter change counts map
    const parameterChangeCounts = new Map<string, number>();
    events.forEach(event => {
      if (event.type === 'config_changed' && 'parameter' in event && event.parameter) {
        const count = parameterChangeCounts.get(event.parameter) || 0;
        parameterChangeCounts.set(event.parameter, count + 1);
      }
    });

    // Microcontroller telemetry (from telemetry events)
    const telemetryEvents = events.filter(e => e.type === 'telemetry_received') as any[];
    let totalFlashReads = 0;
    let totalFlashWrites = 0;
    let totalErrors = 0;
    const powerReadings: number[] = [];
    
    telemetryEvents.forEach(event => {
      if (event.data) {
        if (event.data.flashReads) totalFlashReads += event.data.flashReads;
        if (event.data.flashWrites) totalFlashWrites += event.data.flashWrites;
        if (event.data.errorCount) totalErrors += event.data.errorCount;
        if (event.data.powerConsumption) powerReadings.push(event.data.powerConsumption);
        if (event.data.averagePower) powerReadings.push(event.data.averagePower);
      }
    });
    
    const averagePowerConsumption = powerReadings.length > 0
      ? powerReadings.reduce((sum, p) => sum + p, 0) / powerReadings.length
      : undefined;
    const peakPowerConsumption = powerReadings.length > 0
      ? Math.max(...powerReadings)
      : undefined;

    return {
      totalSessions,
      totalConnectionTime,
      averageSessionDuration,
      mostUsedProfile,
      mostChangedParameter,
      connectionSuccessRate,
      totalConnections,
      successfulConnections,
      failedConnections,
      lastConnected: lastConnectionEvent?.timestamp,
      lastSessionDuration: lastSession?.duration,
      totalParameterChanges,
      parameterChangeCounts: parameterChangeCounts.size > 0 ? parameterChangeCounts : undefined,
      totalFlashReads: totalFlashReads > 0 ? totalFlashReads : undefined,
      totalFlashWrites: totalFlashWrites > 0 ? totalFlashWrites : undefined,
      totalErrors: totalErrors > 0 ? totalErrors : undefined,
      averagePowerConsumption,
      peakPowerConsumption,
    };
  }

  /**
   * Clear all analytics data
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ANALYTICS_EVENTS_KEY);
      await AsyncStorage.removeItem(ANALYTICS_SESSIONS_KEY);
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
    }
  }
}

export const analyticsRepository = new AnalyticsRepository();
