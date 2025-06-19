import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
// TEXT_STYLES and LAYOUT_SPACING (from previous version) were not used in active styles.
import { COLORS, SPACING, FONT_SIZES } from '../../../src/theme';
import { Check } from 'lucide-react-native'; // For indicating selected language

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' }, // German
];

// This would ideally come from context or props
const currentLanguageCode = 'en';

const LanguageSelectionScreen: React.FC = () => {
  const handleSelectLanguage = (language: { code: string, name: string }) => {
    // In a real app, this would call a function from useUserSettings to update the language
    // and then potentially router.back() or show a confirmation.
    Alert.alert(
      "Language Selected",
      `${language.name} selected. Setting persistence to be implemented.`,
      [{ text: "OK" }]
    );
    // Example: updateSetting('preferredLanguage', language.code);
    // router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header is usually provided by Stack Navigator, but we can add a title if needed */}
      {/* <Text style={styles.headerTitle}>Select Language</Text> */}

      {LANGUAGES.map((lang, index) => (
        <TouchableOpacity
          key={lang.code}
          style={[
            styles.languageRow,
            index === LANGUAGES.length - 1 && styles.lastLanguageRow,
          ]}
          onPress={() => handleSelectLanguage(lang)}
        >
          <Text style={styles.languageText}>{lang.name}</Text>
          {currentLanguageCode === lang.code && (
            <Check size={24} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    // paddingTop: SPACING.md, // No top padding if using stack navigator header
  },
  headerTitle: {
    // ...TEXT_STYLES.screenHeader, // TEXT_STYLES import removed
    fontSize: FONT_SIZES.h2, // Example if TEXT_STYLES.screenHeader was FONT_SIZES.h2
    fontWeight: 'bold',      // Example
    color: COLORS.text,
    // paddingHorizontal: LAYOUT_SPACING.screenPaddingHorizontal, // LAYOUT_SPACING import removed
    paddingHorizontal: SPACING.md, // Using SPACING directly
    paddingBottom: SPACING.md,
    textAlign: 'center',
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    // paddingHorizontal: LAYOUT_SPACING.screenPaddingHorizontal, // LAYOUT_SPACING import removed
    paddingHorizontal: SPACING.md, // Using SPACING directly
    // paddingVertical: LAYOUT_SPACING.itemPaddingVertical, // LAYOUT_SPACING import removed
    paddingVertical: SPACING.md, // Using SPACING directly (adjust as needed, e.g. SPACING.sm + SPACING.xs for 12)
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.separator,
  },
  lastLanguageRow: {
    borderBottomWidth: 0,
  },
  languageText: {
    fontSize: FONT_SIZES.iosBody,
    color: COLORS.text,
  },
});

export default LanguageSelectionScreen;
