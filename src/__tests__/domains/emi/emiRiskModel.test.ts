import { assessEmiRisk, DEFAULT_WEIGHTS, DEFAULT_BAND_THRESHOLDS } from '../../../domain/emi/emiRiskModel';
import { EffectType, RGBColor } from '../../../types/config';

describe('assessEmiRisk', () => {
  it('scores full-brightness solid black as low risk', () => {
    const result = assessEmiRisk({
      color: [0, 0, 0] as RGBColor,
      brightness: 100,
      speed: 0,
      effectType: EffectType.SOLID,
    });

    expect(result.band).toBe('low');
    expect(result.score).toBeLessThanOrEqual(DEFAULT_BAND_THRESHOLDS.lowMax);
  });

  it('scores dim, fast strobing saturated red as high risk', () => {
    const result = assessEmiRisk({
      color: [255, 0, 0] as RGBColor,
      brightness: 5,
      speed: 100,
      effectType: EffectType.STROBE,
    });

    expect(result.band).toBe('high');
    expect(result.score).toBeGreaterThan(DEFAULT_BAND_THRESHOLDS.mediumMax);
  });

  it('zeroes the brightness-dimming factor at full brightness', () => {
    const result = assessEmiRisk({
      color: [255, 255, 255] as RGBColor,
      brightness: 100,
      speed: 0,
      effectType: EffectType.SOLID,
    });

    const brightnessFactor = result.factors.find((f) => f.key === 'brightnessDimming');
    expect(brightnessFactor?.score).toBe(0);
  });

  it('maximizes the brightness-dimming factor near zero brightness', () => {
    const result = assessEmiRisk({
      color: [0, 0, 0] as RGBColor,
      brightness: 0,
      speed: 0,
      effectType: EffectType.SOLID,
    });

    const brightnessFactor = result.factors.find((f) => f.key === 'brightnessDimming');
    expect(brightnessFactor?.score).toBe(1);
  });

  it('never contributes pattern-movement risk for a solid color regardless of speed', () => {
    const result = assessEmiRisk({
      color: [255, 0, 0] as RGBColor,
      brightness: 50,
      speed: 100,
      effectType: EffectType.SOLID,
    });

    const movementFactor = result.factors.find((f) => f.key === 'patternMovement');
    expect(movementFactor?.score).toBe(0);
  });

  it('scores strobe as riskier than solid at the same speed and color', () => {
    const base = { color: [255, 255, 255] as RGBColor, brightness: 50, speed: 80 };
    const solid = assessEmiRisk({ ...base, effectType: EffectType.SOLID });
    const strobe = assessEmiRisk({ ...base, effectType: EffectType.STROBE });

    expect(strobe.score).toBeGreaterThan(solid.score);
  });

  it('weights sum to 1 so a maximal setting cannot exceed a score of 1', () => {
    const totalWeight = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBeCloseTo(1, 5);

    const result = assessEmiRisk({
      color: [255, 255, 255] as RGBColor,
      brightness: 0,
      speed: 100,
      effectType: EffectType.STROBE,
    });
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('picks the highest-contribution factor as topFactor', () => {
    const result = assessEmiRisk({
      color: [0, 0, 0] as RGBColor,
      brightness: 0,
      speed: 0,
      effectType: EffectType.SOLID,
    });

    // Only brightnessDimming can be non-zero here (black => no current, no movement, no spread)
    expect(result.topFactor.key).toBe('brightnessDimming');
  });

  it('never returns a negative or out-of-range score', () => {
    const result = assessEmiRisk({
      color: [255, 255, 255] as RGBColor,
      brightness: 0,
      speed: 100,
      effectType: EffectType.STROBE,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('respects custom band thresholds', () => {
    const input = {
      color: [255, 255, 255] as RGBColor,
      brightness: 50,
      speed: 0,
      effectType: EffectType.SOLID,
    };
    const withDefaults = assessEmiRisk(input);
    const withTightThresholds = assessEmiRisk(input, undefined, { lowMax: 0.01, mediumMax: 0.02 });

    expect(withTightThresholds.score).toBe(withDefaults.score);
    expect(withTightThresholds.band).toBe('high');
  });
});
