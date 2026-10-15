import {
  calibrateThresholds,
  createRawObservation,
  EMI_OBSERVATION_MODEL_VERSION,
  isStoredEmiRecord,
  LegacyEmiObservation,
  rescoreObservations,
  StoredEmiRecord,
} from '../../../domain/emi/emiCalibration';
import { assessEmiRisk, DEFAULT_WEIGHTS, EmiRiskInput } from '../../../domain/emi/emiRiskModel';
import { EffectType } from '../../../types/config';

const input: EmiRiskInput = {
  color: [200, 40, 10],
  brightness: 30,
  speed: 80,
  effectType: EffectType.PULSE,
};

const movementHeavyWeights = {
  brightnessDimming: 0.1,
  driveCurrent: 0.1,
  patternMovement: 0.7,
  dataLineActivity: 0.1,
};

describe('raw EMI observations', () => {
  it('stores the inputs, verdict, timestamp and a model version', () => {
    const record = createRawObservation(input, 14, 'heard', 1000);
    expect(record).toEqual({
      modelVersion: EMI_OBSERVATION_MODEL_VERSION,
      color: [200, 40, 10],
      brightness: 30,
      speed: 80,
      effectType: EffectType.PULSE,
      ledCount: 14,
      verdict: 'heard',
      at: 1000,
    });
  });

  it('survives a JSON round trip and still scores identically', () => {
    const record = createRawObservation(input, 14, 'quiet', 5);
    const restored = JSON.parse(JSON.stringify(record));
    expect(isStoredEmiRecord(restored)).toBe(true);
    const [scored] = rescoreObservations([restored]);
    expect(scored.score).toBeCloseTo(assessEmiRisk(input).score, 10);
  });

  it('rescoring under a changed weight set gives a different score from the same inputs', () => {
    const record = createRawObservation(input, 14, 'heard', 1);

    const [underDefault] = rescoreObservations([record], DEFAULT_WEIGHTS);
    const [underChanged] = rescoreObservations([record], movementHeavyWeights);

    expect(underDefault.rescorable).toBe(true);
    expect(underChanged.score).not.toBeCloseTo(underDefault.score, 3);
    expect(underChanged.score).toBeCloseTo(assessEmiRisk(input, movementHeavyWeights).score, 10);
  });

  it('shifts calibrated thresholds when the same stored history is rescored', () => {
    const quiet = { ...input, brightness: 95, speed: 0, effectType: EffectType.SOLID };
    const loud = { ...input, brightness: 10, speed: 100, effectType: EffectType.STROBE };
    const records: StoredEmiRecord[] = [
      ...[1, 2, 3].map((n) => createRawObservation(quiet, 14, 'quiet', n)),
      ...[4, 5, 6].map((n) => createRawObservation(loud, 14, 'heard', n)),
    ];
    const byDefault = calibrateThresholds(rescoreObservations(records));
    const byMovement = calibrateThresholds(rescoreObservations(records, movementHeavyWeights));

    expect(byDefault.isCalibrated).toBe(true);
    expect(byMovement.thresholds.lowMax).not.toBeCloseTo(byDefault.thresholds.lowMax, 3);
  });
});

describe('legacy records', () => {
  const legacy: LegacyEmiObservation = { score: 0.42, verdict: 'heard', at: 7 };

  it('are accepted as stored records', () => {
    expect(isStoredEmiRecord(legacy)).toBe(true);
  });

  it('load alongside new records, flagged unrescorable and keeping their frozen score', () => {
    const mixed: StoredEmiRecord[] = [legacy, createRawObservation(input, 14, 'quiet', 8)];
    const scored = rescoreObservations(mixed, movementHeavyWeights);

    expect(scored).toHaveLength(2);
    expect(scored[0]).toEqual({ score: 0.42, verdict: 'heard', at: 7, rescorable: false });
    expect(scored[1].rescorable).toBe(true);
  });

  it('do not crash calibration and still count toward the minimum', () => {
    const records: StoredEmiRecord[] = [
      ...[0.1, 0.12, 0.15].map((score, i) => ({ score, verdict: 'quiet' as const, at: i })),
      ...[0.5, 0.55, 0.6].map((score, i) => ({ score, verdict: 'heard' as const, at: 10 + i })),
    ];
    const result = calibrateThresholds(rescoreObservations(records));
    expect(result.isCalibrated).toBe(true);
  });

  it('rejects malformed entries', () => {
    const shortColor = { ...createRawObservation(input, 14, 'heard', 1), color: [1, 2] };
    expect(isStoredEmiRecord(null)).toBe(false);
    expect(isStoredEmiRecord({ verdict: 'heard', at: 1 })).toBe(false);
    expect(isStoredEmiRecord(shortColor)).toBe(false);
  });
});
