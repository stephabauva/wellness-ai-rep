import AppleHealthKit, { HealthValue, HealthKitPermissions, HealthInputOptions, PermissionStatus } from 'react-native-health';
import GoogleFit, { Scopes } from 'react-native-google-fit';
import { Platform } from 'react-native';
import { postToApi } from './apiClient'; // For backend sync

export interface HealthDataPoint {
  id?: string;
  dataType: string;
  value: number | string;
  unit?: string;
  timestamp: string;
  source?: string;
  metadata?: Record<string, any>;
}

const APPLE_PERMS = AppleHealthKit.Constants.Permissions;
const healthKitReadPermissions: HealthKitPermissions['permissions']['read'] = [
  APPLE_PERMS.Steps, APPLE_PERMS.HeartRate, APPLE_PERMS.ActiveEnergyBurned,
  APPLE_PERMS.DistanceWalkingRunning, APPLE_PERMS.Weight, APPLE_PERMS.SleepAnalysis,
  // APPLE_PERMS.BodyMassIndex, APPLE_PERMS.FlightsClimbed,
];
const healthKitOptions: HealthKitPermissions = {
  permissions: { read: healthKitReadPermissions, write: [] },
};

const googleFitScopes = [
  Scopes.FITNESS_ACTIVITY_READ, Scopes.FITNESS_BODY_READ,
  Scopes.FITNESS_HEART_RATE_READ, Scopes.FITNESS_SLEEP_READ,
];

export type HealthServiceStatus = 'NotInitialized' | 'Initializing' | 'Initialized' | 'Error' | 'PermissionDenied';
export type PermissionCheckResult = 'Granted' | 'Denied' | 'NotDetermined';


export function getProviderInfo(): { platform: string, provider: string } {
  if (Platform.OS === 'ios') {
    return { platform: 'iOS', provider: 'HealthKit' };
  } else if (Platform.OS === 'android') {
    return { platform: 'Android', provider: 'Google Fit' };
  }
  return { platform: Platform.OS, provider: 'Unknown' };
}

async function requestIOSPermissions(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(healthKitOptions, (err, results) => {
      if (err) {
        console.error("[rnHealthService] Error requesting HealthKit permissions:", err);
        reject(new Error(`HealthKit permission request failed: ${err.message}`));
        return;
      }
      console.log("[rnHealthService] HealthKit permissions results:", results); // results is boolean for init
      // To check specific permissions, we'd need to call getAuthStatusForType for each
      resolve(true); // Assuming init success means permissions were presented
    });
  });
}

async function requestAndroidPermissions(): Promise<boolean> {
  try {
    const authResult = await GoogleFit.authorize({ scopes: googleFitScopes });
    if (authResult.success) {
      console.log("[rnHealthService] Google Fit authorization successful during request.");
      GoogleFit.startRecordingMessage(); // Start recording if not already
      return true;
    } else {
      console.warn("[rnHealthService] Google Fit authorization denied during request:", authResult.message);
      return false; // Explicit denial
    }
  } catch (err: any) {
    console.error("[rnHealthService] Google Fit authorization error during request:", err);
    throw new Error(`Google Fit permission request error: ${err.message}`);
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return requestIOSPermissions();
  } else if (Platform.OS === 'android') {
    return requestAndroidPermissions();
  }
  console.warn("[rnHealthService] Permission request not supported on this platform:", Platform.OS);
  return false;
}

export async function checkHealthPermissions(): Promise<Record<string, PermissionCheckResult>> {
  const permissionResults: Record<string, PermissionCheckResult> = {};
  if (Platform.OS === 'ios') {
    for (const perm of healthKitReadPermissions) {
      try {
        const status = await new Promise<PermissionStatus>((resolve, reject) => {
          AppleHealthKit.getAuthStatusForType(perm, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        // Map AppleHealthKit.Constants.PermissionStatus to PermissionCheckResult
        // 0 = NotDetermined, 1 = Denied, 2 = Granted (example, check actual values)
        // Assuming 2 is granted, 1 denied, 0 not determined. Check lib docs for exact values.
        // HealthKit's actual values: 0 (not determined), 1 (sharing denied), 2 (sharing authorized).
        if (status === 2) permissionResults[perm] = 'Granted';
        else if (status === 1) permissionResults[perm] = 'Denied';
        else permissionResults[perm] = 'NotDetermined';
      } catch (error) {
        console.error(`[rnHealthService] Error checking iOS permission ${perm}:`, error);
        permissionResults[perm] = 'Error';
      }
    }
  } else if (Platform.OS === 'android') {
    // GoogleFit.isAuthorized is a general check, not per-scope.
    // If isAuthorized is true, we assume all requested scopes are granted.
    // If specific scope checks are needed, it's more complex with Google Fit API.
    await GoogleFit.checkIsAuthorized(); // Updates GoogleFit.isAuthorized
    const isAuthorized = GoogleFit.isAuthorized;
    for (const scope of googleFitScopes) {
      // This is a simplification; individual scope grant status is not directly available post-auth this way.
      permissionResults[scope] = isAuthorized ? 'Granted' : 'NotDetermined';
    }
  }
  return permissionResults;
}


export async function initHealthService(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return requestIOSPermissions();
  } else if (Platform.OS === 'android') {
    try {
      await GoogleFit.checkIsAuthorized();
      if (GoogleFit.isAuthorized) {
        console.log("[rnHealthService] Google Fit already authorized.");
        return true;
      }
      return requestAndroidPermissions();
    } catch (err: any) {
      console.error("[rnHealthService] Google Fit init/check error:", err);
      throw new Error(`Google Fit initialization error: ${err.message}`);
    }
  }
  console.warn("[rnHealthService] Health data service not supported on this platform:", Platform.OS);
  return false;
}

export async function fetchHealthData(startDate: Date, endDate: Date): Promise<HealthDataPoint[]> {
  const allData: HealthDataPoint[] = [];
  const options: HealthInputOptions = {
    startDate: startDate.toISOString(), endDate: endDate.toISOString(), ascending: false,
  };

  if (Platform.OS === 'ios') {
    // ... (iOS data fetching logic remains largely the same as before)
    // Example for Steps:
    try {
      const stepsData = await new Promise<HealthValue[]>((resolve, reject) => {
        AppleHealthKit.getStepCount(options, (err, results) => err ? reject(err) : resolve(results as HealthValue[]));
      });
      stepsData.forEach(sample => allData.push({
        dataType: 'Steps', value: sample.value, unit: 'count',
        timestamp: sample.startDate, source: 'AppleHealth',
      }));
    } catch (err) { console.error("[rnHealthService] Error fetching Steps (iOS):", err); }
    // ... (HeartRate, ActiveEnergy, Weight, Sleep as before) ...
    try {
      const hrData = await new Promise<HealthValue[]>((resolve, reject) => AppleHealthKit.getHeartRateSamples(options, (err, res) => err ? reject(err) : resolve(res as HealthValue[])));
      hrData.forEach(s => allData.push({dataType: 'HeartRate', value: s.value, unit: 'bpm', timestamp: s.startDate, source: 'AppleHealth'}));
    } catch(e){console.error("err HR", e)}
    try {
      const aeData = await new Promise<HealthValue[]>((resolve, reject) => AppleHealthKit.getActiveEnergyBurned(options, (err, res) => err ? reject(err) : resolve(res as HealthValue[])));
      aeData.forEach(s => allData.push({dataType: 'ActiveEnergyBurned', value: s.value, unit: 'kcal', timestamp: s.startDate, source: 'AppleHealth'}));
    } catch(e){console.error("err AE", e)}
    try {
      const wData = await new Promise<HealthValue[]>((resolve, reject) => AppleHealthKit.getWeightSamples(options, (err, res) => err ? reject(err) : resolve(res as HealthValue[])));
      wData.forEach(s => allData.push({dataType: 'Weight', value: s.value, unit: 'kg', timestamp: s.startDate, source: 'AppleHealth'}));
    } catch(e){console.error("err W", e)}
    try {
      const slData = await new Promise<HealthValue[]>((resolve, reject) => AppleHealthKit.getSleepSamples(options, (err, res) => err ? reject(err) : resolve(res as HealthValue[])));
      slData.forEach(s => allData.push({dataType: 'Sleep', value: s.value, unit: 'status', timestamp: s.startDate, source: 'AppleHealth', metadata: {startDate:s.startDate, endDate:s.endDate}}));
    } catch(e){console.error("err SL", e)}


  } else if (Platform.OS === 'android') {
    if (!GoogleFit.isAuthorized) {
      console.warn("[rnHealthService] Google Fit not authorized for fetch. Attempting re-auth.");
      try {
        const authorized = await requestAndroidPermissions();
        if (!authorized) throw new Error("Google Fit authorization failed during fetch.");
      } catch (authError) { return Promise.reject(authError); }
    }
    const googleFitOptions = { startDate: startDate.toISOString(), endDate: endDate.toISOString(), bucketUnit: "DAY", bucketInterval: 1 };
    // ... (Android data fetching logic remains largely the same as before)
    // Example for Steps:
    try {
      const stepsRes = await GoogleFit.getDailyStepCountSamples(googleFitOptions);
      stepsRes.forEach(dataSet => {
        if (dataSet.source === 'com.google.android.gms:estimated_steps' && dataSet.steps.length > 0) {
          dataSet.steps.forEach(stepSample => allData.push({
            dataType: 'Steps', value: stepSample.value, unit: 'count',
            timestamp: stepSample.date, source: 'GoogleFit',
          }));
        }
      });
    } catch (err) { console.error("[rnHealthService] Error fetching Steps (Android):", err); }
    // ... (HeartRate, ActiveEnergy, Weight, Sleep as before) ...
    try {
        const hrOptions = { startDate: startDate.toISOString(), endDate: endDate.toISOString(), ascending: false };
        const hrRes = await GoogleFit.getHeartRateSamples(hrOptions);
        hrRes.forEach(s => allData.push({dataType: 'HeartRate', value: s.value, unit: 'bpm', timestamp: s.startDate, source: 'GoogleFit'}));
    } catch(e){console.error("err HR Android", e)}
    try {
        const calRes = await GoogleFit.getDailyCalorieSamples(googleFitOptions);
        calRes.forEach(s => allData.push({dataType: 'ActiveEnergyBurned', value: s.calorie, unit: 'kcal', timestamp: s.startDate, source: 'GoogleFit'}));
    } catch(e){console.error("err AE Android", e)}
    try {
        const weightOptions = { unit: 'kg' as const, startDate: startDate.toISOString(), endDate: endDate.toISOString(), ascending: false, limit:1 };
        const weightRes = await GoogleFit.getWeightSamples(weightOptions);
        weightRes.forEach(s => allData.push({dataType: 'Weight', value: s.value, unit: 'kg', timestamp: s.startDate, source: 'GoogleFit'}));
    } catch(e){console.error("err W Android", e)}
    try {
        const sleepRes = await GoogleFit.getSleepSamples({startDate: startDate.toISOString(), endDate: endDate.toISOString()});
        sleepRes.forEach(s => allData.push({dataType: 'Sleep', value: s.value || (s.granularity?.[0]?.sleepStage || 'unknown'), unit: 'status', timestamp: s.startDate, source: 'GoogleFit', metadata: {startDate: s.startDate, endDate: s.endDate, granularity: s.granularity}}));
    } catch(e){console.error("err SL Android", e)}
  }
  console.log(`[rnHealthService] Fetched ${allData.length} data points.`);
  return allData;
}

export async function syncHealthDataToBackend(healthData: HealthDataPoint[]): Promise<any> {
  if (!healthData || healthData.length === 0) {
    console.log("[rnHealthService] No health data to sync.");
    return Promise.resolve({ message: "No data to sync." });
  }
  try {
    console.log(`[rnHealthService] Syncing ${healthData.length} data points to backend...`);
    const response = await postToApi('health-data/native-sync', { data: healthData });
    console.log("[rnHealthService] Health data synced successfully:", response);
    return response;
  } catch (error) {
    console.error("[rnHealthService] Error syncing health data to backend:", error);
    throw error;
  }
}

export async function performFullHealthSync(daysToSync: number = 7): Promise<HealthDataPoint[]> {
    try {
        const initialized = await initHealthService();
        if (!initialized) {
            console.warn("[rnHealthService performFullHealthSync] Health service not initialized or permissions denied.");
            throw new Error("Health service initialization failed or permissions denied.");
        }
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - daysToSync);
        console.log(`[rnHealthService performFullHealthSync] Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        const dataToSync = await fetchHealthData(startDate, endDate);
        if (dataToSync.length > 0) {
            await syncHealthDataToBackend(dataToSync);
            console.log("[rnHealthService performFullHealthSync] Full sync completed.");
        } else {
            console.log("[rnHealthService performFullHealthSync] No new data to sync.");
        }
        return dataToSync; // Return the fetched data
    } catch (error) {
        console.error("[rnHealthService performFullHealthSync] Error during full sync:", error);
        throw error; // Re-throw to be handled by caller
    }
}
