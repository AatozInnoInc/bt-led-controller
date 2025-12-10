import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from '../utils/linearGradientWrapper';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { analyticsRepository } from '../repositories/analyticsRepository';
import { AnalyticsSummary } from '../types/analytics';

interface AnalyticsScreenProps {
  navigation: any;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    loadSummary();
  }, [timeRange]);

  const loadSummary = async () => {
    try {
      const data = await analyticsRepository.getSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load analytics summary:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Analytics Data',
      'Are you sure you want to clear all analytics data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await analyticsRepository.clearAll();
            await loadSummary();
          },
        },
      ]
    );
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
    return `${(ms / 3600000).toFixed(1)}hr`;
  };

  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const StatCard: React.FC<{
    icon: string;
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
  }> = ({ icon, title, value, subtitle, color }) => (
    <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={{ borderRadius: 16, width: '48%', marginBottom: 12 }}>
      <View style={[styles.statCard, { backgroundColor: colors.card + 'B3', borderColor: colors.border }]}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
        <Text style={[styles.statSubtitle, { color: colors.textSecondary }]}>
          {subtitle || '\u00A0'}
        </Text>
      </View>
    </BlurView>
  );

  if (!summary) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject as any}
        />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearData}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* ScrollView */}
      <View style={styles.scrollContainer}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            {(['all', 'week', 'month'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  {
                    backgroundColor: timeRange === range ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    { color: timeRange === range ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Overview Stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="time-outline"
                title="Total Sessions"
                value={summary.totalSessions}
                color={colors.primary}
              />
              <StatCard
                icon="timer-outline"
                title="Total Time"
                value={formatDuration(summary.totalConnectionTime)}
                color={colors.secondary}
              />
              <StatCard
                icon="hourglass-outline"
                title="Avg Session"
                value={formatDuration(summary.averageSessionDuration)}
                color={colors.success}
              />
              <StatCard
                icon="checkmark-circle-outline"
                title="Success Rate"
                value={`${(summary.connectionSuccessRate * 100).toFixed(0)}%`}
                subtitle={`${summary.successfulConnections}/${summary.totalConnections}`}
                color={colors.success}
              />
            </View>
          </View>

          {/* Parameter Changes */}
          {summary.totalParameterChanges > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Parameter Changes</Text>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={{ borderRadius: 16 }}>
                <View style={[styles.infoCard, { backgroundColor: colors.card + 'B3', borderColor: colors.border }]}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoLeft}>
                      <Ionicons name="settings" size={20} color={colors.primary} />
                      <Text style={[styles.infoLabel, { color: colors.text }]}>Total Changes</Text>
                    </View>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{summary.totalParameterChanges}</Text>
                  </View>
                  {summary.mostChangedParameter && (
                    <View style={[styles.infoRow, { marginTop: 12 }]}>
                      <View style={styles.infoLeft}>
                        <Ionicons name="trending-up" size={20} color={colors.warning} />
                        <Text style={[styles.infoLabel, { color: colors.text }]}>Most Changed</Text>
                      </View>
                      <View style={styles.infoRight}>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {summary.mostChangedParameter.parameter}
                        </Text>
                        <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
                          {summary.mostChangedParameter.changeCount} times
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </BlurView>
            </View>
          )}

          {/* Connection Stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Connections</Text>
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={{ borderRadius: 16 }}>
              <View style={[styles.infoCard, { backgroundColor: colors.card + 'B3', borderColor: colors.border }]}>
                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Successful</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{summary.successfulConnections}</Text>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Failed</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{summary.failedConnections}</Text>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <Ionicons name="time" size={20} color={colors.textSecondary} />
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Last Connected</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12 }]}>
                    {formatDate(summary.lastConnected)}
                  </Text>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Usage Insights */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Usage Insights</Text>
            {summary.mostUsedProfile && (
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={{ borderRadius: 16, marginBottom: 12 }}>
                <View style={[styles.infoCard, { backgroundColor: colors.card + 'B3', borderColor: colors.border }]}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoLeft}>
                      <Ionicons name="star" size={20} color={colors.warning} />
                      <Text style={[styles.infoLabel, { color: colors.text }]}>Most Used Profile</Text>
                    </View>
                    <View style={styles.infoRight}>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {summary.mostUsedProfile.profileName || 'Unnamed'}
                      </Text>
                      <Text style={[styles.infoSubtext, { color: colors.textSecondary }]}>
                        {summary.mostUsedProfile.usageCount} times
                      </Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            )}
            {!summary.mostUsedProfile && summary.totalParameterChanges === 0 && (
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={{ borderRadius: 16 }}>
                <View style={[styles.infoCard, { backgroundColor: colors.card + 'B3', borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No usage data yet. Start using the app to see insights here!
                  </Text>
                </View>
              </BlurView>
            )}
          </View>

          {/* Microcontroller Telemetry (when available) */}
          {(summary.totalFlashReads !== undefined || summary.totalFlashWrites !== undefined || 
            summary.totalErrors !== undefined || summary.averagePowerConsumption !== undefined) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Controller Telemetry</Text>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={{ borderRadius: 16 }}>
                <View style={[styles.infoCard, { backgroundColor: colors.card + 'B3', borderColor: colors.border }]}>
                  {summary.totalFlashReads !== undefined && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoLeft}>
                        <Ionicons name="document-text" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.text }]}>Flash Reads</Text>
                      </View>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{summary.totalFlashReads}</Text>
                    </View>
                  )}
                  {summary.totalFlashWrites !== undefined && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoLeft}>
                        <Ionicons name="create" size={20} color={colors.secondary} />
                        <Text style={[styles.infoLabel, { color: colors.text }]}>Flash Writes</Text>
                      </View>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{summary.totalFlashWrites}</Text>
                    </View>
                  )}
                  {summary.totalErrors !== undefined && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoLeft}>
                        <Ionicons name="warning" size={20} color={colors.error} />
                        <Text style={[styles.infoLabel, { color: colors.text }]}>Errors</Text>
                      </View>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{summary.totalErrors}</Text>
                    </View>
                  )}
                  {summary.averagePowerConsumption !== undefined && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoLeft}>
                        <Ionicons name="battery-charging" size={20} color={colors.warning} />
                        <Text style={[styles.infoLabel, { color: colors.text }]}>Avg Power</Text>
                      </View>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {summary.averagePowerConsumption.toFixed(0)}mA
                      </Text>
                    </View>
                  )}
                  {summary.peakPowerConsumption !== undefined && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoLeft}>
                        <Ionicons name="flash" size={20} color={colors.error} />
                        <Text style={[styles.infoLabel, { color: colors.text }]}>Peak Power</Text>
                      </View>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {summary.peakPowerConsumption.toFixed(0)}mA
                      </Text>
                    </View>
                  )}
                </View>
              </BlurView>
            </View>
          )}

          {/* Last Session */}
          {summary.lastSessionDuration && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Last Session</Text>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={{ borderRadius: 16 }}>
                <View style={[styles.infoCard, { backgroundColor: colors.card + 'B3', borderColor: colors.border }]}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoLeft}>
                      <Ionicons name="play-circle" size={20} color={colors.secondary} />
                      <Text style={[styles.infoLabel, { color: colors.text }]}>Duration</Text>
                    </View>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatDuration(summary.lastSessionDuration)}
                    </Text>
                  </View>
                </View>
              </BlurView>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  clearButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    height: 160,
    justifyContent: 'flex-start',
    paddingTop: 16,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    flexShrink: 0,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    height: 34,
    lineHeight: 34,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    height: 36,
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    height: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  infoRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default AnalyticsScreen;
