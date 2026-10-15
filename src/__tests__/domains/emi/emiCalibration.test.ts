import { calibrateThresholds, MIN_OBSERVATIONS, EmiObservation } from '../../../domain/emi/emiCalibration';
import { DEFAULT_BAND_THRESHOLDS } from '../../../domain/emi/emiRiskModel';

const obs = (score: number, verdict: 'quiet' | 'heard'): EmiObservation => ({
  score,
  verdict,
  at: Date.now(),
});

describe('calibrateThresholds', () => {
  it('falls back to default thresholds with no observations', () => {
    const result = calibrateThresholds([]);
    expect(result.isCalibrated).toBe(false);
    expect(result.thresholds).toEqual(DEFAULT_BAND_THRESHOLDS);
    expect(result.observationCount).toBe(0);
  });

  it('stays uncalibrated below the minimum observation count even with both verdicts', () => {
    const observations = [obs(0.1, 'quiet'), obs(0.5, 'heard'), obs(0.2, 'quiet')];
    expect(observations.length).toBeLessThan(MIN_OBSERVATIONS);

    const result = calibrateThresholds(observations);
    expect(result.isCalibrated).toBe(false);
    expect(result.thresholds).toEqual(DEFAULT_BAND_THRESHOLDS);
  });

  it('stays uncalibrated at the minimum count if only one verdict has been recorded', () => {
    const observations = Array.from({ length: MIN_OBSERVATIONS }, () => obs(0.2, 'quiet'));

    const result = calibrateThresholds(observations);
    expect(result.isCalibrated).toBe(false);
  });

  it('calibrates once enough observations of both verdicts exist', () => {
    const observations: EmiObservation[] = [
      obs(0.1, 'quiet'),
      obs(0.15, 'quiet'),
      obs(0.2, 'quiet'),
      obs(0.5, 'heard'),
      obs(0.55, 'heard'),
      obs(0.6, 'heard'),
    ];

    const result = calibrateThresholds(observations);
    expect(result.isCalibrated).toBe(true);
    expect(result.observationCount).toBe(6);

    // Midpoint between avg(quiet)=0.15 and avg(heard)=0.55 is 0.35
    expect(result.thresholds.lowMax).toBeCloseTo(0.35, 5);
    // mediumMax shifts by the same delta as lowMax moved from the default
    const delta = result.thresholds.lowMax - DEFAULT_BAND_THRESHOLDS.lowMax;
    expect(result.thresholds.mediumMax).toBeCloseTo(DEFAULT_BAND_THRESHOLDS.mediumMax + delta, 5);
  });

  it('keeps mediumMax at or above lowMax even for an extreme split', () => {
    const observations: EmiObservation[] = [
      obs(0.05, 'quiet'),
      obs(0.05, 'quiet'),
      obs(0.05, 'quiet'),
      obs(0.98, 'heard'),
      obs(0.99, 'heard'),
      obs(0.97, 'heard'),
    ];

    const result = calibrateThresholds(observations);
    expect(result.thresholds.mediumMax).toBeGreaterThanOrEqual(result.thresholds.lowMax);
    expect(result.thresholds.mediumMax).toBeLessThanOrEqual(1);
  });
});
