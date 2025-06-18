import React from 'react'; // Removed useState, useEffect as settings are from hook
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Button
} from 'react-native';
import { ChevronRight, Bell, UserCircle, Palette, Globe, ShieldCheck, BarChart3, AlertCircle } from 'lucide-react-native';
import { useUserSettings, UserSettingsData } from '../../../src/hooks/useUserSettings';
import { useToast } from '../../../src/hooks/use-toast';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, LAYOUT_SPACING, TEXT_STYLES } from '../../../src/theme';

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

// Using a new StyleSheet for SettingRow for better theme application
const settingRowStyles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT_SPACING.itemPaddingVertical,
    paddingHorizontal: LAYOUT_SPACING.itemPaddingHorizontal,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.separator,
    minHeight: 44, // Standard tap height
  },
  lastSettingRow: {
    borderBottomWidth: 0,
  },
  disabledRow: {
    opacity: 0.6,
  },
  iconContainer: {
    marginRight: SPACING.md,
    width: 28, // Keep fixed width for alignment or use SPACING.lg
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: FONT_SIZES.iosBody, // Using iOS standard for list items
    color: COLORS.text,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: FONT_SIZES.iosBody,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
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

  const placeholderAction = (action: string) => alert(`${action} pressed - TBD`);

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
  const iconColor = COLORS.primary; // Default icon color for settings

  return (
    <ScrollView style={styles.screenContainer} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.header}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <SettingRow icon={<UserCircle size={22} color={iconColor} />} label="Manage Account" onPress={() => placeholderAction('Manage Account')} />
        <SettingRow icon={<UserCircle size={22} color={iconColor} />} label="Change Password" onPress={() => placeholderAction('Change Password')} isLast />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <SettingRow icon={<Palette size={22} color={COLORS.secondary} />} label="Dark Mode" hasSwitch switchValue={currentSettings.darkMode || false} onSwitchChange={(v) => handleSettingUpdate('darkMode', v)} disabled={isUpdatingSettings} />
        <SettingRow icon={<Globe size={22} color="#34C759" />} label="Language" value={currentSettings.preferredLanguage || "English"} onPress={() => placeholderAction('Select Language')} isLast disabled={isUpdatingSettings} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <SettingRow icon={<Bell size={22} color={COLORS.warning} />} label="Email Notifications" hasSwitch switchValue={currentSettings.emailSummaries || false} onSwitchChange={(v) => handleSettingUpdate('emailSummaries', v)} disabled={isUpdatingSettings} />
        <SettingRow icon={<Bell size={22} color={COLORS.warning} />} label="Push Notifications" hasSwitch switchValue={currentSettings.pushNotifications || false} onSwitchChange={(v) => handleSettingUpdate('pushNotifications', v)} isLast disabled={isUpdatingSettings} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health & Data</Text>
        <SettingRow icon={<BarChart3 size={22} color={COLORS.error} />} label="Manage Health Data Sources" onPress={() => placeholderAction('Manage Health Data Sources')} />
        <SettingRow icon={<ShieldCheck size={22} color={COLORS.error} />} label="Manage Data Retention" onPress={() => placeholderAction('Manage Data Retention')} isLast />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About & Legal</Text>
        <SettingRow label="App Information" onPress={() => placeholderAction('App Info')} />
        <SettingRow label="Privacy Policy" onPress={() => placeholderAction('Privacy Policy')} />
        <SettingRow label="Terms of Service" onPress={() => placeholderAction('Terms of Service')} isLast />
      </View>

      <View style={styles.logoutButtonContainer}>
        <Button title="Logout" onPress={() => placeholderAction("Logout")} color={COLORS.error} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    fontSize: FONT_SIZES.h1, // Using h1 from theme
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'left',
    paddingVertical: SPACING.sm, // Adjusted padding
    paddingHorizontal: LAYOUT_SPACING.screenPaddingHorizontal,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.separator,
    color: COLORS.text,
  },
  section: {
    marginTop: SPACING.lg, // More space between sections
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.separator,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.iosFootnote, // iOS standard section header
    fontWeight: FONT_WEIGHTS.regular,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: LAYOUT_SPACING.screenPaddingHorizontal,
    paddingTop: SPACING.md, // More space
    paddingBottom: SPACING.xs, // Less space
  },
  logoutButtonContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
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
