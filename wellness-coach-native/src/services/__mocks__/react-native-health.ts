// __mocks__/react-native-health.ts

// Simplified mock, expand as more specific functionalities are tested
const AppleHealthKit = {
  Constants: {
    Permissions: {
      Steps: 'Steps',
      HeartRate: 'HeartRate',
      ActiveEnergyBurned: 'ActiveEnergyBurned',
      DistanceWalkingRunning: 'DistanceWalkingRunning',
      Weight: 'Weight',
      SleepAnalysis: 'SleepAnalysis',
      BodyMassIndex: 'BodyMassIndex',
      FlightsClimbed: 'FlightsClimbed',
      // Add any other permissions used in rnHealthService.ts
    },
    Units: { // Mock units if your service or tests depend on them
      count: 'count',
      percent: 'percent',
      seconds: 'seconds',
      minutes: 'minutes',
      hours: 'hours',
      bpm: 'bpm', // beats per minute
      calorie: 'calorie',
      kilocalorie: 'kilocalorie', // Often used for ActiveEnergyBurned
      meter: 'meter',
      kilometer: 'kilometer',
      kg: 'kg', // kilogram
      // ... other units
    },
    SleepAnalysis: { // If your code uses specific sleep stage strings
        AWAKE: "AWAKE",
        ASLEEP_CORE: "ASLEEP_CORE", // Or just ASLEEP if that's what the lib returns/expects
        ASLEEP_DEEP: "ASLEEP_DEEP",
        ASLEEP_REM: "ASLEEP_REM",
        INBED: "INBED",
    }
  },
  initHealthKit: jest.fn((options, callback) => {
    // console.log('[Mock HealthKit] initHealthKit called with options:', options);
    if (typeof callback === 'function') {
      callback(null, true); // Simulate successful initialization
    }
    return Promise.resolve(true); // Some versions might return a promise
  }),
  getAuthStatusForType: jest.fn((permission, callback) => {
    // console.log('[Mock HealthKit] getAuthStatusForType called for:', permission);
    // Simulate all requested permissions are granted for simplicity in mock
    // HealthKit's actual values: 0 (not determined), 1 (sharing denied), 2 (sharing authorized).
    if (typeof callback === 'function') {
      callback(null, 2); // Simulate 'Granted'
    }
    return Promise.resolve(2);
  }),
  getStepCount: jest.fn((options, callback) => {
    // console.log('[Mock HealthKit] getStepCount called with options:', options);
    const results = [{ value: 1234, startDate: new Date().toISOString(), endDate: new Date().toISOString() }];
    if (typeof callback === 'function') {
      callback(null, results);
    }
    return Promise.resolve(results);
  }),
  getHeartRateSamples: jest.fn((options, callback) => {
    // console.log('[Mock HealthKit] getHeartRateSamples called with options:', options);
    const results = [{ value: 75, startDate: new Date().toISOString(), endDate: new Date().toISOString() }];
     if (typeof callback === 'function') {
      callback(null, results);
    }
    return Promise.resolve(results);
  }),
  getActiveEnergyBurned: jest.fn((options, callback) => {
    const results = [{ value: 300, startDate: new Date().toISOString(), endDate: new Date().toISOString() }];
     if (typeof callback === 'function') {
      callback(null, results);
    }
    return Promise.resolve(results);
  }),
  getWeightSamples: jest.fn((options, callback) => {
    const results = [{ value: 70, startDate: new Date().toISOString(), endDate: new Date().toISOString() }];
     if (typeof callback === 'function') {
      callback(null, results);
    }
    return Promise.resolve(results);
  }),
  getSleepSamples: jest.fn((options, callback) => {
    const results = [
      { value: 'ASLEEP_CORE', startDate: new Date().toISOString(), endDate: new Date().toISOString() },
    ];
     if (typeof callback === 'function') {
      callback(null, results);
    }
    return Promise.resolve(results);
  }),
  // Add mocks for other functions used in rnHealthService.ts as needed
  // e.g., getDistanceWalkingRunning, etc.
  getDistanceWalkingRunning: jest.fn((options, callback) => {
    const results = [{ value: 1500, startDate: new Date().toISOString(), endDate: new Date().toISOString() }];
     if (typeof callback === 'function') {
      callback(null, results);
    }
    return Promise.resolve(results);
  }),
};

const GoogleFit = {
  isAuthorized: false, // Mock initial state
  checkIsAuthorized: jest.fn(async () => {
    // console.log('[Mock GoogleFit] checkIsAuthorized called, current mock state:', GoogleFit.isAuthorized);
    // This function itself doesn't return a value in the library, it updates GoogleFit.isAuthorized
  }),
  authorize: jest.fn(async (options) => {
    // console.log('[Mock GoogleFit] authorize called with options:', options);
    GoogleFit.isAuthorized = true; // Simulate successful authorization
    return { success: true, message: 'Mock authorization successful' };
  }),
  startRecordingMessage: jest.fn(() => {
    // console.log('[Mock GoogleFit] startRecordingMessage called');
  }),
  getDailyStepCountSamples: jest.fn(async (options) => {
    // console.log('[Mock GoogleFit] getDailyStepCountSamples called with options:', options);
    return [{
      source: 'com.google.android.gms:estimated_steps',
      steps: [{ value: 1234, date: new Date().toISOString().split('T')[0] }]
    }];
  }),
  getHeartRateSamples: jest.fn(async (options) => {
    // console.log('[Mock GoogleFit] getHeartRateSamples called with options:', options);
    return [{ value: 75, startDate: new Date().toISOString(), endDate: new Date().toISOString() }];
  }),
  getDailyCalorieSamples: jest.fn(async (options) => {
    return [{ calorie: 300, startDate: new Date().toISOString(), endDate: new Date().toISOString() }];
  }),
  getWeightSamples: jest.fn(async (options) => {
    return [{ value: 70, startDate: new Date().toISOString(), endDate: new Date().toISOString() }];
  }),
  getSleepSamples: jest.fn(async (options) => {
    return [{
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        value: 'ASLEEP', // or use granularity if your code expects it
        granularity: [{sleepStage: 'ASLEEP_LIGHT', startDate: new Date().toISOString(), endDate: new Date().toISOString()}]
    }];
  }),
  // Add mocks for other functions used in rnHealthService.ts as needed
};

// The library might be imported as a default or named exports
// Covering both cases, though usually it's named exports.
export default { AppleHealthKit, GoogleFit };
export { AppleHealthKit, GoogleFit };
