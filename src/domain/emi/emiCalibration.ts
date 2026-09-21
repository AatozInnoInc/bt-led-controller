/**
 * EMI Risk Calibration
 *
 * Turns "Quiet" / "I hear it" taps into corrected risk-band thresholds for
 * a specific device. Pure and RN-free, like emiRiskModel.ts - persistence
 * lives in emiCalibrationRepository.ts.
 *
 * Approach: each observation pairs a risk score (from assessEmiRisk at the
 * time Cow tapped a button) with what Cow actually heard. Once at least
 * MIN_OBSERVATIONS exist and both verdicts are represented, the low/medium
 * band edge is moved to the midpoint between the average score of "quiet"
 * observations and the average score of "heard" observations - the
 * simplest split that respects both sets of evidence without overfitting
 * to six data points. The medium/high edge is nudged in the same direction
 * by the same delta, so the band widths this model started with are
 * preserved rather than collapsed.
 */

import { DEFAULT_BAND_THRESHOLDS } from './emiRiskModel';

export const MIN_OBSERVATIONS = 6;

export interface EmiObservation {
  score: number; // 0-1, the assessEmiRisk score at the time of the tap
  verdict: 'quiet' | 'heard';
  at: number; // epoch ms
}

export interface EmiBandThresholds {
  lowMax: number;
  mediumMax: number;
}

export interface EmiCalibrationResult {
  thresholds: EmiBandThresholds;
  isCalibrated: boolean;
  observationCount: number;
}

const average = (values: number[]): number =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * Derive band thresholds from a device's observation history. Falls back
 * to the model's defaults until there is enough evidence to move on.
 */
export function calibrateThresholds(observations: EmiObservation[]): EmiCalibrationResult {
  const quiet = observations.filter((o) => o.verdict === 'quiet').map((o) => o.score);
  const heard = observations.filter((o) => o.verdict === 'heard').map((o) => o.score);

  const isCalibrated =
    observations.length >= MIN_OBSERVATIONS && quiet.length > 0 && heard.length > 0;

  if (!isCalibrated) {
    return {
      thresholds: DEFAULT_BAND_THRESHOLDS,
      isCalibrated: false,
      observationCount: observations.length,
    };
  }

  const quietAvg = average(quiet);
  const heardAvg = average(heard);
  const lowMax = Math.max(0, Math.min(1, (quietAvg + heardAvg) / 2));
  const delta = lowMax - DEFAULT_BAND_THRESHOLDS.lowMax;
  const mediumMax = Math.max(lowMax, Math.min(1, DEFAULT_BAND_THRESHOLDS.mediumMax + delta));

  return {
    thresholds: { lowMax, mediumMax },
    isCalibrated: true,
    observationCount: observations.length,
  };
}
