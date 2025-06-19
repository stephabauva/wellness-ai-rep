import { Platform } from 'react-native';
import { AppleHealthKit, GoogleFit } from 'react-native-health'; // These will be the mocks
import {
  initHealthService,
  getProviderInfo,
  fetchHealthData,
  HealthDataPoint, // Import for type checking
  requestHealthPermissions, // For testing permission request logic
  checkHealthPermissions,   // For testing permission check logic
  PermissionCheckResult    // For type checking
} from '../rnHealthService'; // The service to test

// Mock react-native-health (this will use the manual mock in __mocks__)
jest.mock('react-native-health');

// Mock Platform.OS
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios', // Default mock OS, can be changed per test
  select: jest.fn(selector => selector.ios), // Mock Platform.select if used
}));

describe('rnHealthService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    // Reset GoogleFit.isAuthorized state for Android tests
    (GoogleFit.isAuthorized as jest.Mocked<any>) = false;
  });

  describe('getProviderInfo', () => {
    it('should return iOS HealthKit info on iOS', () => {
      Platform.OS = 'ios';
      const info = getProviderInfo();
      expect(info.platform).toBe('iOS');
      expect(info.provider).toBe('HealthKit');
    });

    it('should return Android Google Fit info on Android', () => {
      Platform.OS = 'android';
      const info = getProviderInfo();
      expect(info.platform).toBe('Android');
      expect(info.provider).toBe('Google Fit');
    });

    it('should return Unknown on other platforms', () => {
      Platform.OS = 'web'; // Example of another platform
      const info = getProviderInfo();
      expect(info.provider).toBe('Unknown');
    });
  });

  describe('initHealthService & requestHealthPermissions', () => {
    it('should call AppleHealthKit.initHealthKit on iOS during init', async () => {
      Platform.OS = 'ios';
      await initHealthService();
      expect(AppleHealthKit.initHealthKit).toHaveBeenCalledTimes(1);
      // You can add more specific checks for options if needed:
      // expect(AppleHealthKit.initHealthKit).toHaveBeenCalledWith(
      //   expect.objectContaining({ permissions: expect.any(Object) }),
      //   expect.any(Function)
      // );
    });

    it('should call GoogleFit.authorize on Android during init if not already authorized', async () => {
      Platform.OS = 'android';
      (GoogleFit.isAuthorized as jest.Mocked<any>) = false; // Ensure it's not pre-authorized
      (GoogleFit.authorize as jest.Mock).mockResolvedValueOnce({ success: true }); // Mock successful auth

      await initHealthService();
      expect(GoogleFit.checkIsAuthorized).toHaveBeenCalledTimes(1);
      expect(GoogleFit.authorize).toHaveBeenCalledTimes(1);
    });

    it('should NOT call GoogleFit.authorize on Android during init if ALREADY authorized', async () => {
      Platform.OS = 'android';
      (GoogleFit.isAuthorized as jest.Mocked<any>) = true; // Simulate pre-authorized

      await initHealthService();
      expect(GoogleFit.checkIsAuthorized).toHaveBeenCalledTimes(1);
      expect(GoogleFit.authorize).not.toHaveBeenCalled();
    });

     it('should call AppleHealthKit.initHealthKit on iOS when requestHealthPermissions is called', async () => {
      Platform.OS = 'ios';
      await requestHealthPermissions();
      expect(AppleHealthKit.initHealthKit).toHaveBeenCalledTimes(1);
    });

    it('should call GoogleFit.authorize on Android when requestHealthPermissions is called', async () => {
      Platform.OS = 'android';
       (GoogleFit.authorize as jest.Mock).mockResolvedValueOnce({ success: true });
      await requestHealthPermissions();
      expect(GoogleFit.authorize).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkHealthPermissions', () => {
    it('should call AppleHealthKit.getAuthStatusForType for each permission on iOS', async () => {
      Platform.OS = 'ios';
      const permissions = (AppleHealthKit.Constants.Permissions as any);
      const readPermissionsCount = Object.keys(permissions).length; // Count of all defined permissions in mock

      // Mock implementation for getAuthStatusForType
      (AppleHealthKit.getAuthStatusForType as jest.Mock).mockImplementation((perm, cb) => cb(null, 2)); // Simulate granted

      const result = await checkHealthPermissions();
      expect(AppleHealthKit.getAuthStatusForType).toHaveBeenCalledTimes(readPermissionsCount);
      for (const permKey in permissions) {
        expect(result[permissions[permKey]]).toBe('Granted');
      }
    });

    it('should check GoogleFit.isAuthorized on Android', async () => {
      Platform.OS = 'android';
      (GoogleFit.isAuthorized as jest.Mocked<any>) = true;
      const result = await checkHealthPermissions();
      expect(GoogleFit.checkIsAuthorized).toHaveBeenCalled();
      // Check if all scopes are marked as 'Granted' based on the global isAuthorized flag
      Object.values(result).forEach(status => expect(status).toBe('Granted'));
    });
  });

  describe('fetchHealthData', () => {
    it('should call AppleHealthKit.getStepCount on iOS and transform data', async () => {
      Platform.OS = 'ios';
      const mockDate = new Date(2023, 0, 15, 10, 30, 0).toISOString();
      const mockSteps = [{ value: 500, startDate: mockDate, endDate: mockDate }];
      (AppleHealthKit.getStepCount as jest.Mock).mockImplementation((options, callback) => callback(null, mockSteps));
      // Mock other data types to return empty arrays to isolate steps test
      (AppleHealthKit.getHeartRateSamples as jest.Mock).mockImplementation((o, cb) => cb(null, []));
      (AppleHealthKit.getActiveEnergyBurned as jest.Mock).mockImplementation((o, cb) => cb(null, []));
      (AppleHealthKit.getWeightSamples as jest.Mock).mockImplementation((o, cb) => cb(null, []));
      (AppleHealthKit.getSleepSamples as jest.Mock).mockImplementation((o, cb) => cb(null, []));
      (AppleHealthKit.getDistanceWalkingRunning as jest.Mock).mockImplementation((o, cb) => cb(null, []));


      const startDate = new Date(2023, 0, 15);
      const endDate = new Date(2023, 0, 16);
      const healthData = await fetchHealthData(startDate, endDate);

      expect(AppleHealthKit.getStepCount).toHaveBeenCalledTimes(1);
      const stepsDataPoint = healthData.find(p => p.dataType === 'Steps');
      expect(stepsDataPoint).toBeDefined();
      expect(stepsDataPoint?.value).toBe(500);
      expect(stepsDataPoint?.source).toBe('AppleHealth');
      expect(stepsDataPoint?.timestamp).toBe(mockDate);
    });

    it('should call GoogleFit.getDailyStepCountSamples on Android and transform data', async () => {
      Platform.OS = 'android';
      (GoogleFit.isAuthorized as jest.Mocked<any>) = true; // Assume authorized for fetch
      const mockDateStr = new Date(2023, 0, 15).toISOString().split('T')[0];
      const mockGFitSteps = [{ source: 'com.google.android.gms:estimated_steps', steps: [{ value: 600, date: mockDateStr }] }];
      (GoogleFit.getDailyStepCountSamples as jest.Mock).mockResolvedValue(mockGFitSteps);
      // Mock other data types for Android
      (GoogleFit.getHeartRateSamples as jest.Mock).mockResolvedValue([]);
      (GoogleFit.getDailyCalorieSamples as jest.Mock).mockResolvedValue([]);
      (GoogleFit.getWeightSamples as jest.Mock).mockResolvedValue([]);
      (GoogleFit.getSleepSamples as jest.Mock).mockResolvedValue([]);

      const startDate = new Date(2023, 0, 15);
      const endDate = new Date(2023, 0, 16);
      const healthData = await fetchHealthData(startDate, endDate);

      expect(GoogleFit.getDailyStepCountSamples).toHaveBeenCalledTimes(1);
      const stepsDataPoint = healthData.find(p => p.dataType === 'Steps');
      expect(stepsDataPoint).toBeDefined();
      expect(stepsDataPoint?.value).toBe(600);
      expect(stepsDataPoint?.source).toBe('GoogleFit');
      expect(stepsDataPoint?.timestamp).toBe(mockDateStr);
    });

    // TODO: Add more tests for other data types (HeartRate, Sleep etc.) and edge cases
  });

  // TODO: Test syncHealthDataToBackend (would require mocking apiClient.postToApi)
});
