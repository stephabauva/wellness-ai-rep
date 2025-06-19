import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Button, ActivityIndicator, Platform } from 'react-native';
import ActivityTrendChart from '../../../src/components/charts/ActivityTrendChart';
import HeartRateChart from '../../../src/components/charts/HeartRateChart';
import SleepQualityChart, { SleepDataSegment } from '../../../src/components/charts/SleepQualityChart';
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
import { useToast } from '../../../src/hooks/use-toast';

// Define types for chart data locally for clarity
interface StepsChartData { values: number[]; dayLabels: string[]; }
interface HRChartData { value: number; timestamp: Date; }[]
// SleepChartData is effectively SleepDataSegment[]

const HealthScreen: React.FC = () => {
  const [healthInitStatus, setHealthInitStatus] = useState<string>('Initializing...');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const { show: showToast } = useToast();

  const [activityChartData, setActivityChartData] = useState<StepsChartData>({ values: [], dayLabels: [] });
  const [heartRateChartData, setHeartRateChartData] = useState<HRChartData>([]);
  const [sleepChartData, setSleepChartData] = useState<SleepDataSegment[]>([]);
  const [sleepChartDisplayDate, setSleepChartDisplayDate] = useState<Date | undefined>(new Date());


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
    } catch (error: any) {
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
      if (success) await handleCheckPermissions();
    } catch (error: any) {
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
        const success = await initHealthService();
        setHealthInitStatus(success ? 'Health service initialized.' : 'Health service init failed. Permissions may be denied.');
        if (success) {
          handleCheckPermissions();
        } else {
           showToast({ title: "Health Service", message: "Initialization completed, but check permissions.", type: 'info' });
        }
      } catch (error: any) {
        const errorMessage = `Initialization error: ${error.message}`;
        setHealthInitStatus(errorMessage);
        showToast({ title: "Initialization Failed", message: error.message, type: 'error' });
      }
    };
    initializeHealth();
  }, []);

  const processStepsDataForChart = (healthData: HealthDataPoint[], days: number = 7): StepsChartData => {
    const stepsEntries = healthData.filter(p => p.dataType === 'Steps');
    const dailyStepsMap = new Map<string, number>();
    const dayLabels: string[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayKey = d.toISOString().split('T')[0];
      dailyStepsMap.set(dayKey, 0);
      dayLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }

    stepsEntries.forEach(p => {
      const pointDate = new Date(p.timestamp);
      const dayKey = pointDate.toISOString().split('T')[0];
      if (dailyStepsMap.has(dayKey)) {
        dailyStepsMap.set(dayKey, (dailyStepsMap.get(dayKey) || 0) + Number(p.value));
      }
    });
    return { values: Array.from(dailyStepsMap.values()), dayLabels };
  };

  const processHeartRateDataForChart = (healthData: HealthDataPoint[]): HRChartData => {
    return healthData
      .filter(p => p.dataType === 'HeartRate' && typeof p.value === 'number')
      .map(p => ({ value: p.value as number, timestamp: new Date(p.timestamp) }))
      .sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()); // Ensure chronological order
  };

  const processSleepDataForChart = (healthData: HealthDataPoint[]): SleepDataSegment[] => {
    // Assuming 'Sleep' data points have metadata: { startDate, endDate, value: 'INBED'|'ASLEEP'|'AWAKE'|'REM' etc. }
    // Or value directly representing stage, and timestamp as startDate, metadata.endDate
    return healthData
      .filter(p => p.dataType === 'Sleep' && (p.metadata?.startDate || p.timestamp) && p.metadata?.endDate)
      .map(p => ({
        type: typeof p.value === 'string' ? p.value : 'UNKNOWN', // Ensure type is string
        startDate: new Date(p.metadata?.startDate || p.timestamp),
        endDate: new Date(p.metadata?.endDate),
        value: typeof p.value === 'string' ? p.value : undefined,
      }))
      .sort((a,b) => a.startDate.getTime() - b.startDate.getTime()); // Corrected sort key
  };


  const handleSyncData = async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      setSyncStatus('Health data not available on this platform.'); return;
    }
    if (healthInitStatus !== 'Health service initialized.' && healthInitStatus !== 'Google Fit already authorized.' && healthInitStatus !== 'Permissions requested. Please check status.') {
        setSyncStatus('Initialize health service and grant permissions first.');
        await handleRequestPermissions();
        if (!(await initHealthService())) {
             setSyncStatus('Failed to initialize/authorize for sync. Please try again.'); return;
        }
    }
    setIsSyncing(true);
    setSyncStatus('Syncing health data...');
    try {
      const fetchedData = await performFullHealthSync(7); // Sync last 7 days
      setSyncStatus(`Health data sync completed. Fetched ${fetchedData.length} records.`);

      setActivityChartData(processStepsDataForChart(fetchedData, 7));
      setHeartRateChartData(processHeartRateDataForChart(fetchedData));

      const processedSleepData = processSleepDataForChart(fetchedData);
      setSleepChartData(processedSleepData);
      if (processedSleepData.length > 0) { // Set display date for sleep chart if data exists
        setSleepChartDisplayDate(new Date(processedSleepData[0].startDate)); // Or a central date like 'today'
      } else {
        setSleepChartDisplayDate(new Date()); // Default to today if no sleep data
      }

    } catch (error: any) {
      const errorMessage = `Sync error: ${error.message}`;
      setSyncStatus(errorMessage);
      showToast({ title: "Sync Failed", message: error.message, type: 'error' });
      setActivityChartData({ values: [], dayLabels: [] });
      setHeartRateChartData([]);
      setSleepChartData([]);
    } finally {
      setIsSyncing(false);
    }
  };

  const renderPermissionsStatus = () => {
    if (!permissionsStatus) return <Text style={styles.statusText}>Press "Check Permissions" to see status.</Text>;
    if (permissionsStatus.error) return <Text style={[styles.statusText, {color: COLORS.error}]}>Error: {permissionsStatus.error}</Text>
    return Object.entries(permissionsStatus).map(([key, value]) => (
      <Text key={key} style={styles.permissionText}>{`${key}: ${value}`}</Text>
    ));
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.header}>Health Dashboard</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Trends (Last 7 Days)</Text>
        <ActivityTrendChart data={activityChartData.values} labels={activityChartData.dayLabels} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Heart Rate Samples (Recent)</Text>
        <HeartRateChart data={heartRateChartData} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sleep Analysis (Recent Night)</Text>
        <SleepQualityChart data={sleepChartData} displayDate={sleepChartDisplayDate} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Native Health Integration</Text>
        {providerInfo && <Text style={styles.statusText}>Platform: {providerInfo.platform}, Provider: {providerInfo.provider}</Text>}
        <Text style={styles.statusText}>Service Status: {healthInitStatus}</Text>
        <View style={styles.buttonContainer}>
            <Button title="Request Permissions" onPress={handleRequestPermissions} disabled={isRequestingPermissions} color={COLORS.primary} />
            <Button title="Check Permissions" onPress={handleCheckPermissions} disabled={isCheckingPermissions} color={COLORS.secondary}/>
        </View>
        {isRequestingPermissions && <ActivityIndicator size="small" color={COLORS.primary} />}
        {isCheckingPermissions && <ActivityIndicator size="small" color={COLORS.secondary}/>}
        <View style={styles.permissionsDisplay}><Text style={styles.subHeader}>Permissions Status:</Text>{renderPermissionsStatus()}</View>
        <Button title={isSyncing ? "Syncing..." : "Sync Health Data"} onPress={handleSyncData} disabled={isSyncing} color={COLORS.primary}/>
        {isSyncing && <ActivityIndicator size="small" color={COLORS.primary} style={{marginTop: SPACING.sm}} />}
        {syncStatus ? <Text style={styles.statusText}>{syncStatus}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Import Options</Text>
        <Text style={styles.placeholderText}>[Placeholder for manual data import options]</Text>
        <Button title="Import Health File (Placeholder)" onPress={() => alert('File import not implemented yet.')} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: LAYOUT_SPACING.screenPaddingHorizontal },
  header: { ...TEXT_STYLES.screenHeader, color: COLORS.text, marginBottom: SPACING.lg, textAlign: 'center' },
  section: {
    marginBottom: LAYOUT_SPACING.sectionMarginVertical, padding: SPACING.md, backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.sm, elevation: 2, shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  sectionTitle: { fontSize: FONT_SIZES.h3, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.text, marginBottom: SPACING.md },
  subHeader: { fontSize: FONT_SIZES.body, fontWeight: FONT_WEIGHTS.medium, marginTop: SPACING.sm, marginBottom: SPACING.xs, color: COLORS.textSecondary },
  placeholderText: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: SPACING.sm },
  statusText: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.sm, textAlign: 'center' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: SPACING.md },
  permissionsDisplay: { marginVertical: SPACING.sm, padding:SPACING.sm, backgroundColor: COLORS.lightGray, borderRadius: SPACING.xs},
  permissionText: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, marginBottom: SPACING.xs},
});

export default HealthScreen;
