/**
 * EMI Calibration Repository
 * Persists per-device "Quiet" / "I hear it" observations using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmiObservation } from '../domain/emi/emiCalibration';

const STORAGE_KEY = (deviceId: string) => `emi_calibration_${deviceId}`;
const MAX_STORED_OBSERVATIONS = 200;

export class EmiCalibrationRepository {
  async loadObservations(deviceId: string): Promise<EmiObservation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY(deviceId));
      if (!data) {
        return [];
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.filter(isValidObservation) : [];
    } catch (error) {
      console.error('Failed to load EMI calibration observations:', error);
      return [];
    }
  }

  async addObservation(deviceId: string, observation: EmiObservation): Promise<EmiObservation[]> {
    const existing = await this.loadObservations(deviceId);
    const updated = [...existing, observation].slice(-MAX_STORED_OBSERVATIONS);
    try {
      await AsyncStorage.setItem(STORAGE_KEY(deviceId), JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save EMI calibration observation:', error);
      throw error;
    }
    return updated;
  }

  async clearObservations(deviceId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY(deviceId));
    } catch (error) {
      console.error('Failed to clear EMI calibration observations:', error);
    }
  }
}

function isValidObservation(value: any): value is EmiObservation {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.score === 'number' &&
    (value.verdict === 'quiet' || value.verdict === 'heard') &&
    typeof value.at === 'number'
  );
}

export const emiCalibrationRepository = new EmiCalibrationRepository();
