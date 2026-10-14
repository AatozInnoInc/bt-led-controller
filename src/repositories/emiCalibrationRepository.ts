/**
 * EMI Calibration Repository
 * Persists per-device "Quiet" / "I hear it" observations using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isStoredEmiRecord,
  RawEmiObservation,
  StoredEmiRecord,
} from '../domain/emi/emiCalibration';

const STORAGE_KEY = (deviceId: string) => `emi_calibration_${deviceId}`;
const MAX_STORED_OBSERVATIONS = 200;

export class EmiCalibrationRepository {
  /**
   * Read the stored array exactly as written. Throws on a storage or parse
   * error, or if the stored value is not an array, so a caller that is about
   * to write can never mistake "unreadable" for "empty" and overwrite history.
   */
  private async readStoredArray(deviceId: string): Promise<unknown[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEY(deviceId));
    if (!data) {
      return [];
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    throw new Error('Stored EMI calibration data is not an array');
  }

  async loadObservations(deviceId: string): Promise<StoredEmiRecord[]> {
    try {
      const stored = await this.readStoredArray(deviceId);
      const valid = stored.filter(isStoredEmiRecord);
      console.log(
        `EMI calibration: loaded ${valid.length} of ${stored.length} stored records for ${deviceId}`
      );
      return valid;
    } catch (error) {
      console.error('Failed to load EMI calibration observations:', error);
      return [];
    }
  }

  async addObservation(deviceId: string, observation: RawEmiObservation): Promise<StoredEmiRecord[]> {
    let existing: unknown[];
    try {
      existing = await this.readStoredArray(deviceId);
    } catch (error) {
      // Refuse to write: saving over an unreadable history would destroy it.
      console.error('EMI calibration history unreadable, not saving new observation:', error);
      throw error;
    }
    // Unrecognised entries are kept as written so a newer record version is not lost.
    const updated = [...existing, observation].slice(-MAX_STORED_OBSERVATIONS);
    try {
      await AsyncStorage.setItem(STORAGE_KEY(deviceId), JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save EMI calibration observation:', error);
      throw error;
    }
    console.log(`EMI calibration: saved observation for ${deviceId}, ${updated.length} stored`);
    return updated.filter(isStoredEmiRecord);
  }

  async clearObservations(deviceId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY(deviceId));
    } catch (error) {
      console.error('Failed to clear EMI calibration observations:', error);
    }
  }
}

export const emiCalibrationRepository = new EmiCalibrationRepository();
