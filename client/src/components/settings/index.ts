/**
 * Settings domain public API
 * Only exports what should be accessible outside the settings domain
 */

// Main UI component that other domains might need
export { default as SettingsSection } from '../SettingsSection';

// Internal settings components should not be imported directly by other domains
// AccountSettings, AiConfigurationSettings, AppPreferencesSettings, etc. 
// are internal implementation details