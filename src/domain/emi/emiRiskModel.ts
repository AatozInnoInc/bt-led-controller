/**
 * EMI Risk Model
 *
 * Design contract:
 * - Advisory only. This module never blocks, clamps, or disables a control -
 *   it produces a score and an explanation. Noise depends on the guitar, the
 *   room, and ambient EMI, none of which this module can see, so it is not
 *   in a position to say a setting is unusable.
 * - Pure and RN-free. No AsyncStorage, no React, no device I/O. Everything
 *   here is a function of the LED settings you pass in, so it is trivially
 *   unit-testable and can be reused by a future firmware-side simulator.
 * - Four weighted factors, each tied to a named physical mechanism (see the
 *   comment above each one) rather than a single opaque heuristic. A factor
 *   with no attributable mechanism does not belong in this model.
 * - The "drive current" factor reuses calculateLEDCurrent from
 *   parameterValidation.ts instead of re-deriving current draw, so the
 *   power-budget warning and the EMI warning stay numerically consistent
 *   about what "worst case" means.
 * - The weights and per-factor curves below are physically-reasoned
 *   hypotheses, not measurements taken on Cow's guitar. They are meant to
 *   be disagreed with - see emiCalibration.ts for how field observations
 *   (from the "Quiet" / "I hear it" buttons in the app) pull the risk band
 *   thresholds toward what a specific instrument actually does.
 */

import { RGBColor, EffectType } from '../../types/config';
import { calculateLEDCurrent } from '../../utils/parameterValidation';

export interface EmiRiskInput {
  /** RGB color, each channel 0-255 */
  color: RGBColor;
  /** 0-100, as the app's slider sends it */
  brightness: number;
  /** 0-100, as the app's slider sends it */
  speed: number;
  effectType: EffectType;
}

export type EmiRiskBand = 'low' | 'medium' | 'high';

export interface EmiRiskFactor {
  key: 'brightnessDimming' | 'driveCurrent' | 'patternMovement' | 'dataLineActivity';
  label: string;
  weight: number;
  /** Normalized 0-1 contribution of this factor alone */
  score: number;
  mechanism: string;
}

export interface EmiRiskAssessment {
  /** Weighted sum of factor scores, 0-1 */
  score: number;
  band: EmiRiskBand;
  factors: EmiRiskFactor[];
  /** The single largest contributor, for the collapsed one-line verdict */
  topFactor: EmiRiskFactor;
  advice: string;
}

/** Default band edges, used until enough field observations exist to calibrate them. */
export const DEFAULT_BAND_THRESHOLDS = { lowMax: 0.33, mediumMax: 0.66 };

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Global-brightness dimming factor.
 * Mechanism: the APA102's 5-bit global brightness field is refreshed once
 * per frame; at typical frame rates its duty-cycle carrier lands around
 * 440-580 Hz, inside what a pickup reproduces. The field is used less
 * (spends less of its swing dimming) as brightness approaches 100, and is
 * not exercised at all at full brightness.
 */
function brightnessDimmingScore(input: EmiRiskInput): number {
  return clamp01(1 - input.brightness / 100);
}

/**
 * Drive current factor.
 * Mechanism: sets the amplitude of every current-borne artifact (both PWM
 * carriers ride on top of whatever current the LEDs are drawing). Reuses
 * the app's own power model so "worst case" means the same thing here as
 * it does in the power-budget warning.
 */
function driveCurrentScore(input: EmiRiskInput): number {
  const MAX_CURRENT_PER_LED_WHITE = 60; // mA, matches parameterValidation.ts
  const current = calculateLEDCurrent(input.color, input.brightness);
  return clamp01(current / MAX_CURRENT_PER_LED_WHITE);
}

/** Per-effect base multiplier for how much an animation re-modulates total current. */
const EFFECT_MOVEMENT_BASE: Record<EffectType, number> = {
  [EffectType.SOLID]: 0,
  [EffectType.PULSE]: 0.55,
  [EffectType.RAINBOW]: 0.4,
  [EffectType.WAVE]: 0.45,
  [EffectType.STROBE]: 1,
  [EffectType.CUSTOM]: 0.5,
};

/**
 * Pattern movement factor.
 * Mechanism: an animated effect re-modulates total current at a rate tied
 * to its speed setting, which can itself land in the audible range. Solid
 * color never contributes; strobe contributes most.
 */
function patternMovementScore(input: EmiRiskInput): number {
  const base = EFFECT_MOVEMENT_BASE[input.effectType] ?? 0.5;
  return clamp01(base * (input.speed / 100));
}

/**
 * Data line activity factor.
 * Mechanism: colour-dependent edge density on the bitbang data line. Real,
 * but the data line's carrier sits at whatever BITBANG_FREQUENCY_MODE is
 * configured to (tens of kHz), above hearing - so this stays the smallest
 * weight and is here mainly so a viewer can see it was considered and
 * ruled minor, not ignored.
 */
function dataLineActivityScore(input: EmiRiskInput): number {
  const [r, g, b] = input.color;
  const spread = (Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b)) / (2 * 255);
  return clamp01(spread);
}

export interface EmiRiskWeights {
  brightnessDimming: number;
  driveCurrent: number;
  patternMovement: number;
  dataLineActivity: number;
}

export const DEFAULT_WEIGHTS: EmiRiskWeights = {
  brightnessDimming: 0.4,
  driveCurrent: 0.3,
  patternMovement: 0.18,
  dataLineActivity: 0.12,
};

function bandFor(
  score: number,
  thresholds: { lowMax: number; mediumMax: number } = DEFAULT_BAND_THRESHOLDS
): EmiRiskBand {
  if (score <= thresholds.lowMax) {
    return 'low';
  }
  if (score <= thresholds.mediumMax) {
    return 'medium';
  }
  return 'high';
}

function adviceFor(topFactor: EmiRiskFactor, band: EmiRiskBand): string {
  if (band === 'low') {
    return 'Unlikely to add noise at this setting.';
  }
  switch (topFactor.key) {
    case 'brightnessDimming':
      return 'Try running closer to full brightness, or test APA102_BRIGHTNESS_MODE 1 (Build Bench Phase 2).';
    case 'driveCurrent':
      return 'Lower brightness or pick a less saturated color to cut current draw.';
    case 'patternMovement':
      return 'Slow the animation down, or switch to a solid color to compare.';
    default:
      return 'Try a less saturated color to reduce data-line activity.';
  }
}

/**
 * Score an LED setting for EMI/noise risk. Advisory only - see the design
 * contract above.
 */
export function assessEmiRisk(
  input: EmiRiskInput,
  weights: EmiRiskWeights = DEFAULT_WEIGHTS,
  thresholds: { lowMax: number; mediumMax: number } = DEFAULT_BAND_THRESHOLDS
): EmiRiskAssessment {
  const factors: EmiRiskFactor[] = [
    {
      key: 'brightnessDimming',
      label: 'Brightness dimming',
      weight: weights.brightnessDimming,
      score: brightnessDimmingScore(input),
      mechanism: 'Global-brightness PWM (~440-580 Hz) is inside the audible range.',
    },
    {
      key: 'driveCurrent',
      label: 'Drive current',
      weight: weights.driveCurrent,
      score: driveCurrentScore(input),
      mechanism: 'Sets the amplitude of every current-borne artifact.',
    },
    {
      key: 'patternMovement',
      label: 'Pattern movement',
      weight: weights.patternMovement,
      score: patternMovementScore(input),
      mechanism: 'Animation re-modulates total current at audible rates.',
    },
    {
      key: 'dataLineActivity',
      label: 'Data line activity',
      weight: weights.dataLineActivity,
      score: dataLineActivityScore(input),
      mechanism: 'Colour-dependent edge density on the data line (above hearing).',
    },
  ];

  const score = clamp01(factors.reduce((sum, f) => sum + f.weight * f.score, 0));
  const band = bandFor(score, thresholds);
  const topFactor = factors.reduce((a, b) => (b.weight * b.score > a.weight * a.score ? b : a));

  return {
    score,
    band,
    factors,
    topFactor,
    advice: adviceFor(topFactor, band),
  };
}
