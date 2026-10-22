import AsyncStorage from '@react-native-async-storage/async-storage';
import { emiCalibrationRepository } from '../../../repositories/emiCalibrationRepository';
import { createRawObservation } from '../../../domain/emi/emiCalibration';
import { EffectType } from '../../../types/config';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

const store = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
};

const fresh = createRawObservation(
  { color: [1, 2, 3], brightness: 50, speed: 10, effectType: EffectType.SOLID },
  14,
  'quiet',
  99
);

describe('EmiCalibrationRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('appends a new record after legacy ones without dropping them', async () => {
    const legacy = { score: 0.3, verdict: 'heard', at: 1 };
    store.getItem.mockResolvedValue(JSON.stringify([legacy]));

    const result = await emiCalibrationRepository.addObservation('dev', fresh);

    expect(result).toEqual([legacy, fresh]);
    expect(JSON.parse(store.setItem.mock.calls[0][1])).toEqual([legacy, fresh]);
  });

  it('does not overwrite history when stored data is corrupt', async () => {
    store.getItem.mockResolvedValue('{not json');

    await expect(emiCalibrationRepository.addObservation('dev', fresh)).rejects.toThrow();
    expect(store.setItem).not.toHaveBeenCalled();
  });

  it('does not overwrite history when the read itself fails', async () => {
    store.getItem.mockRejectedValue(new Error('disk'));

    await expect(emiCalibrationRepository.addObservation('dev', fresh)).rejects.toThrow('disk');
    expect(store.setItem).not.toHaveBeenCalled();
  });

  it('keeps unrecognised entries when saving', async () => {
    const future = { modelVersion: 99, somethingNew: true };
    store.getItem.mockResolvedValue(JSON.stringify([future]));

    await emiCalibrationRepository.addObservation('dev', fresh);

    expect(JSON.parse(store.setItem.mock.calls[0][1])).toEqual([future, fresh]);
  });

  it('loads as empty on a read error, for display only', async () => {
    store.getItem.mockResolvedValue('{not json');
    expect(await emiCalibrationRepository.loadObservations('dev')).toEqual([]);
  });
});
