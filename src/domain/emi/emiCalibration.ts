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

import { EffectType, RGBColor } from '../../types/config';
import {
  assessEmiRisk,
  DEFAULT_BAND_THRESHOLDS,
  DEFAULT_WEIGHTS,
  EmiRiskInput,
  EmiRiskWeights,
} from './emiRiskModel';

export const MIN_OBSERVATIONS = 6;

/**
 * Version stamped on every stored raw record. Bump it when the shape of
 * RawEmiObservation changes. Records written before versioning existed
 * (score only) carry no modelVersion and are treated as legacy.
 */
export const EMI_OBSERVATION_MODEL_VERSION = 2;

/** A scored observation, the only shape calibrateThresholds needs. */
export interface EmiObservation {
  score: number; // 0-1, the assessEmiRisk score for this observation
  verdict: 'quiet' | 'heard';
  at: number; // epoch ms
  /**
   * False for legacy records that only kept a score. Their score is frozen
   * under the weights of the day and cannot be recomputed. Absent means true.
   */
  rescorable?: boolean;
}

/**
 * What is persisted: the raw inputs behind a tap, so the score can be
 * recomputed under any later weight set.
 */
export interface RawEmiObservation {
  modelVersion: number;
  color: RGBColor;
  brightness: number;
  speed: number;
  effectType: EffectType;
  ledCount: number;
  verdict: 'quiet' | 'heard';
  at: number; // epoch ms
}

/** Pre-versioning record: computed score only. Kept, flagged unrescorable. */
export interface LegacyEmiObservation {
  score: number;
  verdict: 'quiet' | 'heard';
  at: number;
}

export type StoredEmiRecord = RawEmiObservation | LegacyEmiObservation;

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

const isVerdict = (value: unknown): value is 'quiet' | 'heard' =>
  value === 'quiet' || value === 'heard';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function isRawEmiObservation(value: any): value is RawEmiObservation {
  return (
    typeof value === 'object' &&
    value !== null &&
    isFiniteNumber(value.modelVersion) &&
    Array.isArray(value.color) &&
    value.color.length === 3 &&
    value.color.every(isFiniteNumber) &&
    isFiniteNumber(value.brightness) &&
    isFiniteNumber(value.speed) &&
    isFiniteNumber(value.effectType) &&
    isFiniteNumber(value.ledCount) &&
    isVerdict(value.verdict) &&
    isFiniteNumber(value.at)
  );
}

export function isLegacyEmiObservation(value: any): value is LegacyEmiObservation {
  return (
    typeof value === 'object' &&
    value !== null &&
    isFiniteNumber(value.score) &&
    isVerdict(value.verdict) &&
    isFiniteNumber(value.at)
  );
}

export function isStoredEmiRecord(value: unknown): value is StoredEmiRecord {
  return isRawEmiObservation(value) || isLegacyEmiObservation(value);
}

/** Build the record to persist for one tap. Pure: the caller supplies the clock. */
export function createRawObservation(
  input: EmiRiskInput,
  ledCount: number,
  verdict: 'quiet' | 'heard',
  at: number
): RawEmiObservation {
  return {
    modelVersion: EMI_OBSERVATION_MODEL_VERSION,
    color: [input.color[0], input.color[1], input.color[2]],
    brightness: input.brightness,
    speed: input.speed,
    effectType: input.effectType,
    ledCount,
    verdict,
    at,
  };
}

/**
 * Turn stored records into scored observations under the given weights.
 * Raw records are rescored from their inputs; legacy records keep their
 * frozen score and are flagged rescorable: false rather than dropped.
 */
export function rescoreObservations(
  records: StoredEmiRecord[],
  weights: EmiRiskWeights = DEFAULT_WEIGHTS
): EmiObservation[] {
  return records.map((record) => {
    if (isRawEmiObservation(record)) {
      const { score } = assessEmiRisk(
        {
          color: record.color,
          brightness: record.brightness,
          speed: record.speed,
          effectType: record.effectType,
        },
        weights
      );
      return { score, verdict: record.verdict, at: record.at, rescorable: true };
    }
    return { score: record.score, verdict: record.verdict, at: record.at, rescorable: false };
  });
}
