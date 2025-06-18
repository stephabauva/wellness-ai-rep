import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Button, ActivityIndicator, Platform } from 'react-native';
import ActivityTrendChart from '../../../src/components/charts/ActivityTrendChart';
import HeartRateChart from '../../../src/components/charts/HeartRateChart';
import SleepQualityChart from '../../../src/components/charts/SleepQualityChart';
import {
  initHealthService,
  performFullHealthSync,
  getProviderInfo,
  checkHealthPermissions,
  requestHealthPermissions,
  HealthDataPoint,
  PermissionCheckResult
} from '../../../src/services/rnHealthService';
import { COLORS, SPACING, FONT_SIZES, TEXT_STYLES, LAYOUT_SPACING } from '../../../src/theme';
import { useToast } from '../../../src/hooks/use-toast'; // Import useToast

const HealthScreen: React.FC = () => {
  const [healthInitStatus, setHealthInitStatus] = useState<string>('Initializing...');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const { show: showToast } = useToast(); // Initialize toast

  const [activityChartData, setActivityChartData] = useState<{ values: number[]; dayLabels: string[] }>({ values: [], dayLabels: [] });
  const [providerInfo, setProviderInfo] = useState<{ platform: string; provider: string } | null>(null);
  const [permissionsStatus, setPermissionsStatus] = useState<Record<string, PermissionCheckResult> | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);


  const fetchAndSetProviderInfo = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      setProviderInfo(getProviderInfo());
    }
  };

  const handleCheckPermissions = async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    setIsCheckingPermissions(true);
    try {
      const status = await checkHealthPermissions();
      setPermissionsStatus(status);
      console.log("Permissions status:", status);
    } catch (error: any) {
      console.error("Error checking permissions:", error);
      setPermissionsStatus({ error: error.message });
      showToast({ title: "Permission Check Failed", message: error.message, type: 'error' });
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  const handleRequestPermissions = async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    setIsRequestingPermissions(true);
    try {
      const success = await requestHealthPermissions();
      const message = success ? 'Permissions requested. Please check status.' : 'Permission request failed or was denied.';
      setHealthInitStatus(message);
      if (!success) showToast({ title: "Permission Request", message, type: 'warning' });
      if (success) {
        await handleCheckPermissions(); // Re-check permissions after request
      }
    } catch (error: any) {
      console.error("Error requesting permissions:", error);
      const errorMessage = `Permission request error: ${error.message}`;
      setHealthInitStatus(errorMessage);
      showToast({ title: "Permission Error", message: error.message, type: 'error' });
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  useEffect(() => {
    fetchAndSetProviderInfo();
    const initializeHealth = async () => {
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        setHealthInitStatus('Health data not available on this platform.');
        return;
      }
      try {
        const success = await initHealthService(); // This also requests permissions initially
        setHealthInitStatus(success ? 'Health service initialized.' : 'Health service init failed. Permissions may be denied.');
        if (success) {
          handleCheckPermissions(); // Check permissions after successful init
        } else {
          // Optional: Show toast if init itself wasn't "successful" in terms of permissions
           showToast({ title: "Health Service", message: "Initialization completed, but check permissions.", type: 'info' });
        }
      } catch (error: any) {
        console.error("Health init error:", error);
        const errorMessage = `Initialization error: ${error.message}`;
        setHealthInitStatus(errorMessage);
        showToast({ title: "Initialization Failed", message: error.message, type: 'error' });
      }
    };
    initializeHealth();
  }, []);

  const processDataForActivityChart = (healthData: HealthDataPoint[], days: number = 7) => {
    const stepsData = healthData.filter(p => p.dataType === 'Steps');
    // Assuming daily data for the last 'days' days. We need to aggregate if multiple entries per day.
    // For simplicity, let's assume one entry per day from rnHealthService for steps or it's pre-aggregated.
    // Create a map for the last 'days' days
    const endDate = new Date();
    const dailyStepsMap = new Map<string, number>();
    const dayLabels: string[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(endDate.getDate() - i);
      const dayKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
      dailyStepsMap.set(dayKey, 0); // Initialize with 0 steps
      // Simple label: e.g., "7/24"
      dayLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }

    stepsData.forEach(p => {
      const pointDate = new Date(p.timestamp);
      const dayKey = pointDate.toISOString().split('T')[0];
      if (dailyStepsMap.has(dayKey)) {
        dailyStepsMap.set(dayKey, (dailyStepsMap.get(dayKey) || 0) + (typeof p.value === 'number' ? p.value : parseFloat(p.value.toString()) || 0) );
      }
    });

    const values = Array.from(dailyStepsMap.values());
    return { values, dayLabels };
  };

  const handleSyncData = async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      setSyncStatus('Health data not available on this platform.');
      return;
    }
    if (healthInitStatus !== 'Health service initialized.' && healthInitStatus !== 'Google Fit already authorized.' && healthInitStatus !== 'Permissions requested. Please check status.') {
        setSyncStatus('Initialize health service and grant permissions first.');
        // Try to request permissions if not initialized properly
        await handleRequestPermissions();
        // Re-check init status, might be better to gate the button more strictly
        if (!(await initHealthService())) { // Check if initHealthService can be called to re-verify/re-init
             setSyncStatus('Failed to initialize/authorize for sync. Please try again.');
             return;
        }
    }

    setIsSyncing(true);
    setSyncStatus('Syncing health data...');
    try {
      const fetchedData = await performFullHealthSync(7); // Sync last 7 days
      setSyncStatus(`Health data sync completed. Fetched ${fetchedData.length} records.`);
      const chartFormattedData = processDataForActivityChart(fetchedData, 7);
      setActivityChartData(chartFormattedData);
      // Success toast for sync is good here if not too noisy, or rely on statusText
      // showToast({ title: "Sync Complete", message: `Fetched ${fetchedData.length} records.`, type: 'success' });
    } catch (error: any) {
      console.error("Health sync error:", error);
      const errorMessage = `Sync error: ${error.message}`;
      setSyncStatus(errorMessage);
      showToast({ title: "Sync Failed", message: error.message, type: 'error' });
      setActivityChartData({ values: [], dayLabels: [] }); // Clear chart on error
    } finally {
      setIsSyncing(false);
    }
  };

  const renderPermissionsStatus = () => {
    if (!permissionsStatus) return <Text>Press "Check Permissions" to see status.</Text>;
    if (permissionsStatus.error) return <Text style={{color: 'red'}}>Error: {permissionsStatus.error}</Text>

    return Object.entries(permissionsStatus).map(([key, value]) => (
      <Text key={key} style={styles.permissionText}>{`${key}: ${value}`}</Text>
    ));
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.header}>Health Dashboard</Text>

      {/* Charts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Trends (Last 7 Days)</Text>
        <ActivityTrendChart data={activityChartData.values} labels={activityChartData.dayLabels} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Heart Rate Chart</Text>
        <HeartRateChart />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sleep Quality Chart</Text>
        <SleepQualityChart />
      </View>

      {/* Native Health Integration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Native Health Integration</Text>
        {providerInfo && <Text style={styles.statusText}>Platform: {providerInfo.platform}, Provider: {providerInfo.provider}</Text>}
        <Text style={styles.statusText}>Service Status: {healthInitStatus}</Text>

        <View style={styles.buttonContainer}>
            <Button
                title="Request Permissions"
                onPress={handleRequestPermissions}
                disabled={isRequestingPermissions}
            />
            <Button
                title="Check Permissions"
                onPress={handleCheckPermissions}
                disabled={isCheckingPermissions}
            />
        </View>
        {isRequestingPermissions && <ActivityIndicator size="small" />}
        {isCheckingPermissions && <ActivityIndicator size="small" />}

        <View style={styles.permissionsDisplay}>
            <Text style={styles.subHeader}>Permissions Status:</Text>
            {renderPermissionsStatus()}
        </View>

        <Button
          title={isSyncing ? "Syncing..." : "Sync Health Data"}
          onPress={handleSyncData}
          disabled={isSyncing}
        />
        {isSyncing && <ActivityIndicator size="small" color="#0000ff" />}
        {syncStatus ? <Text style={styles.statusText}>{syncStatus}</Text> : null}
      </View>

      {/* Data Import Section (Placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Import Options</Text>
        <Text style={styles.placeholderText}>[Placeholder for manual data import options]</Text>
        <Button title="Import Health File (Placeholder)" onPress={() => alert('File import not implemented yet.')} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  container: {
    padding: LAYOUT_SPACING.screenPaddingHorizontal
  },
  header: {
    ...TEXT_STYLES.screenHeader, // Using a predefined text style
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center'
  },
  section: {
    marginBottom: LAYOUT_SPACING.sectionMarginVertical,
    padding: SPACING.md,
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.sm,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: '600', // FONT_WEIGHTS.semibold can be used if defined and preferred
    color: COLORS.text,
    marginBottom: SPACING.md
  },
  subHeader: {
    fontSize: FONT_SIZES.body, // Was FONT_SIZES.h4, making it smaller
    fontWeight: FONT_WEIGHTS.medium,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    color: COLORS.textSecondary
  },
  placeholderText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.sm
  },
  statusText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    textAlign: 'center'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: SPACING.md
  },
  permissionsDisplay: {
    marginVertical: SPACING.sm,
    padding:SPACING.sm,
    backgroundColor: COLORS.lightGray,
    borderRadius: SPACING.xs
  },
  permissionText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs
  },
});

export default HealthScreen;
