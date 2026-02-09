'use strict';

// --- API Response Types ---

export interface PetlibroApiResponse<T = unknown> {
  code: number;
  data: T;
  msg: string;
}

export interface LoginResponse {
  token: string;
}

export interface DeviceListItem {
  deviceSn: string;
  name: string;
  mac: string;
  productIdentifier: string;
  productName: string;
  softwareVersion: string;
  hardwareVersion: string;
}

export interface DeviceRealInfo {
  deviceSn: string;
  online: boolean;
  electricQuantity?: number;
  batteryState?: string;
  wifiSsid?: string;
  wifiRssi?: number;
  surplusGrain?: boolean;
  grainOutletState?: boolean;
  enableFeedingPlan?: boolean;
  lightSwitch?: boolean;
  soundSwitch?: boolean;
  childLockSwitch?: boolean;
  remainingDesiccantDays?: number;
  changeDesiccantFrequency?: number;
  unitType?: number;
  runningState?: string;
  // Fountain-specific
  todayTotalMl?: number;
  useWaterType?: number;
  useWaterInterval?: number;
  useWaterDuration?: number;
  remainingReplacementDays?: number;
  remainingCleaningDays?: number;
  filterReplacementFrequency?: number;
  machineCleaningFrequency?: number;
  weight?: number;
  weightPercent?: number;
}

export interface GrainStatus {
  todayFeedingQuantity: number;
  todayFeedingTimes: number;
}

// --- Device Model Maps ---

export const FEEDER_MODELS: Record<string, string> = {
  PLAF103: 'Granary Smart Feeder',
  PLAF107: 'Space Smart Feeder',
  PLAF108: 'Air Smart Feeder',
  PLAF109: 'Polar Wet Food Feeder',
  PLAF203: 'Granary Camera Feeder',
  PLAF301: 'One RFID Smart Feeder',
};

export const FOUNTAIN_MODELS: Record<string, string> = {
  PLWF105: 'Dockstream Smart Fountain',
  PLWF305: 'Dockstream RFID Fountain',
  PLWF106: 'Dockstream 2 Smart Fountain',
  PLWF116: 'Dockstream 2 Cordless',
};

export type DeviceType = 'feeder' | 'fountain';

export function getDeviceType(productIdentifier: string): DeviceType | null {
  if (productIdentifier in FEEDER_MODELS) return 'feeder';
  if (productIdentifier in FOUNTAIN_MODELS) return 'fountain';
  return null;
}

// --- Session Config ---

export interface PetlibroSessionConfig {
  baseUrl: string;
  email: string;
  password: string;
  region: string;
  timezone: string;
  token?: string;
}

// --- API Constants ---

export const API_BASE_URL = 'https://api.us.petlibro.com';
export const APP_ID = 1;
export const APP_SN = 'c35772530d1041699c87fe62348507a8';
export const APP_VERSION = '1.3.45';
export const ERROR_NOT_LOGGED_IN = 1009;
