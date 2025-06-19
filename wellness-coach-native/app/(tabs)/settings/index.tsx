import React from 'react'; // useEffect removed
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Button
} from 'react-native';
import { ChevronRight, Bell, UserCircle, Palette, Globe, ShieldCheck, BarChart3, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUserSettings, UserSettingsData } from '../../../src/hooks/useUserSettings';
import { useToast } from '../../../src/hooks/use-toast';
// TEXT_STYLES removed as it's not used in this file's StyleSheet
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, LAYOUT_SPACING } from '../../../src/theme';

type SettingRowProps = {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  isLast?: boolean;
  disabled?: boolean;
};

const settingRowStyles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: LAYOUT_SPACING.itemPaddingVertical, paddingHorizontal: LAYOUT_SPACING.itemPaddingHorizontal,
    backgroundColor: COLORS.cardBackground, borderBottomWidth: 0.5, borderBottomColor: COLORS.separator,
    minHeight: 44,
  },
  lastSettingRow: { borderBottomWidth: 0 },
  disabledRow: { opacity: 0.6 },
  iconContainer: { marginRight: SPACING.md, width: 28, alignItems: 'center' },
  settingLabel: { flex: 1, fontSize: FONT_SIZES.iosBody, color: COLORS.text },
  valueContainer: { flexDirection: 'row', alignItems: 'center' },
  settingValue: { fontSize: FONT_SIZES.iosBody, color: COLORS.textSecondary, marginRight: SPACING.sm },
});

const SettingRow: React.FC<SettingRowProps> = ({
  icon, label, value, onPress, hasSwitch, switchValue, onSwitchChange, isLast, disabled
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress || hasSwitch || disabled}
    style={[settingRowStyles.settingRow, isLast && settingRowStyles.lastSettingRow, disabled && settingRowStyles.disabledRow]}
  >
    {icon && <View style={settingRowStyles.iconContainer}>{icon}</View>}
    <Text style={settingRowStyles.settingLabel}>{label}</Text>
    <View style={settingRowStyles.valueContainer}>
      {value && <Text style={settingRowStyles.settingValue}>{value}</Text>}
      {hasSwitch && <Switch value={switchValue} onValueChange={onSwitchChange} trackColor={{ false: COLORS.mediumGray, true: COLORS.primary }} thumbColor={COLORS.white} disabled={disabled} />}
      {onPress && !hasSwitch && <ChevronRight size={20} color={COLORS.mediumGray} />}
    </View>
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const {
    userSettings,
    isLoadingSettings,
    settingsError,
    updateUserSettings,
    isUpdatingSettings
  } = useUserSettings();
  const { show: showToast } = useToast();
  const router = useRouter();

  // useEffect for settingsError toast was removed in a previous step, which is fine as errors are handled on display.
  // Re-confirming if it should be here or if error display is sufficient.
  // For now, assuming error display is sufficient. If toasts are desired for initial load error, it can be added back.

  const handleSettingUpdate = async (key: keyof UserSettingsData, value: any) => {
    try {
      await updateUserSettings({ [key]: value } as Partial<UserSettingsData>, {
        onSuccess: () => {
          showToast({ title: "Setting Saved", message: `${String(key).replace(/([A-Z])/g, ' $1').trim()} updated.`, type: 'success'});
        },
        onError: (error: any) => {
          showToast({ title: "Save Error", message: error.message || `Could not update ${String(key)}.`, type: 'error'});
        }
      });
    } catch (error: any) {
      showToast({ title: "Error", message: error.message || "An unexpected error occurred.", type: 'error'});
    }
  };

  // Specific handlers for navigation or placeholder alerts
  const handleChangePassword = () => alert('Change Password screen - TBD');
  const handleManageAccount = () => alert('Manage Account screen - TBD');
  const handleSelectLanguage = () => {
    router.push('/settings/language');
  };
  const handleManageDataSources = () => alert('Manage Health Data Sources screen - TBD');
  const handlePrivacyPolicy = () => alert('Privacy Policy screen - TBD');
  const handleTermsOfService = () => alert('Terms of Service screen - TBD');
  const handleAppInfo = () => alert('App Info screen - TBD');
  const handleManageDataRetention = () => alert('Manage Data Retention screen - TBD');
  const handleLogout = () => alert("Logout action - TBD");

  if (isLoadingSettings && !userSettings) {
    return (
      <View style={styles.centeredMessageContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{marginTop: SPACING.sm, color: COLORS.textSecondary}}>Loading settings...</Text>
      </View>
    );
  }

  if (settingsError) {
    return (
      <View style={styles.centeredMessageContainer}>
        <AlertCircle size={40} color={COLORS.error} />
        <Text style={styles.errorText}>Error loading settings: {settingsError.message}</Text>
        {/* TODO: Add retry button calling refetchUserSettings if available from hook */}
      </View>
    );
  }

  const currentSettings = userSettings || {} as Partial<UserSettingsData>;
  const iconColor = COLORS.primary;

  return (
    <ScrollView style={styles.screenContainer} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.header}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <SettingRow icon={<UserCircle size={22} color={iconColor} />} label="Manage Account" onPress={handleManageAccount} />
        <SettingRow icon={<UserCircle size={22} color={iconColor} />} label="Change Password" onPress={handleChangePassword} isLast />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <SettingRow icon={<Palette size={22} color={COLORS.secondary} />} label="Dark Mode" hasSwitch switchValue={currentSettings.darkMode || false} onSwitchChange={(v) => handleSettingUpdate('darkMode', v)} disabled={isUpdatingSettings} />
        <SettingRow icon={<Globe size={22} color={COLORS.success} />} label="Language" value={currentSettings.preferredLanguage || "English"} onPress={handleSelectLanguage} isLast disabled={isUpdatingSettings} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <SettingRow icon={<Bell size={22} color={COLORS.warning} />} label="Email Notifications" hasSwitch switchValue={currentSettings.emailSummaries || false} onSwitchChange={(v) => handleSettingUpdate('emailSummaries', v)} disabled={isUpdatingSettings} />
        <SettingRow icon={<Bell size={22} color={COLORS.warning} />} label="Push Notifications" hasSwitch switchValue={currentSettings.pushNotifications || false} onSwitchChange={(v) => handleSettingUpdate('pushNotifications', v)} isLast disabled={isUpdatingSettings} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health & Data</Text>
        <SettingRow icon={<BarChart3 size={22} color={COLORS.error} />} label="Manage Health Data Sources" onPress={handleManageDataSources} />
        <SettingRow icon={<ShieldCheck size={22} color={COLORS.error} />} label="Manage Data Retention" onPress={handleManageDataRetention} isLast />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About & Legal</Text>
        <SettingRow label="App Information" onPress={handleAppInfo} />
        <SettingRow label="Privacy Policy" onPress={handlePrivacyPolicy} />
        <SettingRow label="Terms of Service" onPress={handleTermsOfService} isLast />
      </View>

      <View style={styles.logoutButtonContainer}>
        <Button title="Logout" onPress={handleLogout} color={COLORS.error} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    fontSize: FONT_SIZES.h1, fontWeight: FONT_WEIGHTS.bold, textAlign: 'left',
    paddingVertical: SPACING.sm, paddingHorizontal: LAYOUT_SPACING.screenPaddingHorizontal,
    backgroundColor: COLORS.cardBackground, borderBottomWidth: 0.5, borderBottomColor: COLORS.separator,
    color: COLORS.text,
  },
  section: {
    marginTop: SPACING.lg, backgroundColor: COLORS.cardBackground,
    borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: COLORS.separator,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.iosFootnote, fontWeight: FONT_WEIGHTS.regular, color: COLORS.textSecondary,
    textTransform: 'uppercase', paddingHorizontal: LAYOUT_SPACING.screenPaddingHorizontal,
    paddingTop: SPACING.md, paddingBottom: SPACING.xs,
  },
  logoutButtonContainer: {
    marginTop: SPACING.xl, marginBottom: SPACING.xl,
    paddingHorizontal: LAYOUT_SPACING.screenPaddingHorizontal
  },
  centeredMessageContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  errorText: {
    textAlign: 'center', fontSize: FONT_SIZES.body, color: COLORS.error,
    marginBottom: SPACING.md
  },
});

export default SettingsScreen;
