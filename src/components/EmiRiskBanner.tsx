/**
 * EMI Risk Banner
 *
 * Shows the current setting's EMI/noise risk under the color picker.
 * Advisory only: no control is ever disabled and no confirmation dialog
 * appears, matching the domain model's contract (see
 * src/domain/emi/emiRiskModel.ts). Collapsed, it shows a one-line verdict;
 * expanded, it shows which factor is driving the score and lets the user
 * record what they actually heard, which is what calibrates the model to
 * their guitar over time (see src/domain/emi/emiCalibration.ts).
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RGBColor, EffectType } from '../types/config';
import { assessEmiRisk, EmiRiskBand, EmiRiskInput } from '../domain/emi/emiRiskModel';
import { calibrateThresholds, MIN_OBSERVATIONS } from '../domain/emi/emiCalibration';
import { emiCalibrationRepository } from '../repositories/emiCalibrationRepository';

export interface EmiRiskBannerProps {
  color: RGBColor;
  brightness: number;
  speed: number;
  effectType: EffectType;
  deviceId: string;
}

const BAND_LABEL: Record<EmiRiskBand, string> = {
  low: 'Unlikely to be noisy',
  medium: 'Might be noisy',
  high: 'Likely to be noisy',
};

export const EmiRiskBanner: React.FC<EmiRiskBannerProps> = ({
  color,
  brightness,
  speed,
  effectType,
  deviceId,
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [observations, setObservations] = useState<
    Awaited<ReturnType<typeof emiCalibrationRepository.loadObservations>>
  >([]);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    let active = true;
    emiCalibrationRepository.loadObservations(deviceId).then((loaded) => {
      if (active) {
        setObservations(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, [deviceId]);

  const calibration = useMemo(() => calibrateThresholds(observations), [observations]);

  const input: EmiRiskInput = useMemo(
    () => ({ color, brightness, speed, effectType }),
    [color, brightness, speed, effectType]
  );

  const assessment = useMemo(
    () => assessEmiRisk(input, undefined, calibration.thresholds),
    [input, calibration.thresholds]
  );

  const bandColor =
    assessment.band === 'low'
      ? themeColors.success
      : assessment.band === 'medium'
      ? themeColors.warning
      : themeColors.error;

  const recordVerdict = useCallback(
    async (verdict: 'quiet' | 'heard') => {
      setRecording(true);
      try {
        const updated = await emiCalibrationRepository.addObservation(deviceId, {
          score: assessment.score,
          verdict,
          at: Date.now(),
        });
        setObservations(updated);
      } finally {
        setRecording(false);
      }
    },
    [deviceId, assessment.score]
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.card, borderColor: themeColors.border },
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel="EMI noise risk, tap to expand"
      >
        <View style={[styles.dot, { backgroundColor: bandColor }]} />
        <View style={styles.headerText}>
          <Text style={[styles.verdict, { color: themeColors.text }]}>
            {BAND_LABEL[assessment.band]}
          </Text>
          <Text style={[styles.subverdict, { color: themeColors.textSecondary }]}>
            {calibration.isCalibrated
              ? `Tuned to your guitar (${calibration.observationCount} observations)`
              : `Not yet tuned to your guitar (${calibration.observationCount}/${MIN_OBSERVATIONS})`}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={themeColors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          <Text style={[styles.advice, { color: themeColors.text }]}>{assessment.advice}</Text>

          {assessment.factors.map((factor) => (
            <View key={factor.key} style={styles.factorRow}>
              <View style={styles.factorHeader}>
                <Text style={[styles.factorLabel, { color: themeColors.text }]}>
                  {factor.label}
                </Text>
                <Text style={[styles.factorScore, { color: themeColors.textSecondary }]}>
                  {Math.round(factor.score * 100)}%
                </Text>
              </View>
              <View
                style={[
                  styles.factorTrack,
                  { backgroundColor: isDark ? '#333' : '#e5e5e5' },
                ]}
              >
                <View
                  style={[
                    styles.factorFill,
                    {
                      width: `${Math.round(factor.score * 100)}%`,
                      backgroundColor: themeColors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.factorMechanism, { color: themeColors.textSecondary }]}>
                {factor.mechanism}
              </Text>
            </View>
          ))}

          <Text style={[styles.calibratePrompt, { color: themeColors.textSecondary }]}>
            What do you actually hear at this setting?
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              disabled={recording}
              style={[styles.calibrateButton, { borderColor: themeColors.success }]}
              onPress={() => recordVerdict('quiet')}
            >
              <Text style={[styles.calibrateButtonText, { color: themeColors.success }]}>
                Quiet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={recording}
              style={[styles.calibrateButton, { borderColor: themeColors.error }]}
              onPress={() => recordVerdict('heard')}
            >
              <Text style={[styles.calibrateButtonText, { color: themeColors.error }]}>
                I hear it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  verdict: {
    fontSize: 14,
    fontWeight: '600',
  },
  subverdict: {
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  advice: {
    fontSize: 13,
    marginBottom: 10,
  },
  factorRow: {
    marginBottom: 10,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  factorLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  factorScore: {
    fontSize: 12,
  },
  factorTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  factorFill: {
    height: 4,
    borderRadius: 2,
  },
  factorMechanism: {
    fontSize: 11,
    marginTop: 3,
  },
  calibratePrompt: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calibrateButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  calibrateButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default EmiRiskBanner;
