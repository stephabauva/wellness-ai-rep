import type { User, EnhancedSettingsUpdate, UserPreferences } from "@shared/schema";
import { userPreferenceSchema } from "@shared/schema";

/**
 * Utility functions for user settings validation and processing
 * Used by both MemStorage and DatabaseStorage to avoid code duplication
 */

export interface UserFieldsUpdate {
  name?: string | null;
  email?: string | null;
  aiProvider?: string | null;
  aiModel?: string | null;
  automaticModelSelection?: boolean | null;
  transcriptionProvider?: string | null;
  preferredLanguage?: string | null;
  memoryDetectionProvider?: string | null;
  memoryDetectionModel?: string | null;
}

export interface ProcessedUserSettings {
  userFields: UserFieldsUpdate;
  preferences: Partial<UserPreferences>;
}

/**
 * Simple approach: Use Zod validation to extract and validate preference fields
 * Suitable for memory storage where we want simple validation
 */
export function processUserSettingsSimple(settings: EnhancedSettingsUpdate): ProcessedUserSettings {
  // Use Zod to validate and extract preference fields
  const validatedPreferenceUpdates = userPreferenceSchema.partial().parse(settings);
  
  // Extract user-level fields
  const userFields: UserFieldsUpdate = {};
  if (settings.name !== undefined) userFields.name = settings.name;
  if (settings.email !== undefined) userFields.email = settings.email;
  if (settings.aiProvider !== undefined) userFields.aiProvider = settings.aiProvider;
  if (settings.aiModel !== undefined) userFields.aiModel = settings.aiModel;
  if (settings.automaticModelSelection !== undefined) userFields.automaticModelSelection = settings.automaticModelSelection;
  if (settings.transcriptionProvider !== undefined) userFields.transcriptionProvider = settings.transcriptionProvider;
  if (settings.preferredLanguage !== undefined) userFields.preferredLanguage = settings.preferredLanguage;
  if (settings.memoryDetectionProvider !== undefined) userFields.memoryDetectionProvider = settings.memoryDetectionProvider;
  if (settings.memoryDetectionModel !== undefined) userFields.memoryDetectionModel = settings.memoryDetectionModel;

  return {
    userFields,
    preferences: validatedPreferenceUpdates
  };
}

/**
 * Detailed approach: Manually separate and validate each field
 * Suitable for database storage where we need more control
 */
export function processUserSettingsDetailed(settings: EnhancedSettingsUpdate): ProcessedUserSettings {
  // Separate preferences from top-level user fields using destructuring
  const {
    name, email, aiProvider, aiModel, automaticModelSelection,
    transcriptionProvider, preferredLanguage, memoryDetectionProvider, memoryDetectionModel,
    // Preference fields
    primaryGoal, coachStyle, reminderFrequency, focusAreas, themePreference,
    pushNotifications, emailSummaries, dataSharing, healthVisibilitySettings,
    highValueRetentionDays, mediumValueRetentionDays, lowValueRetentionDays,
    ...otherPossibleSettings // Should be empty if schema is matched
  } = settings;

  // Build preferences object with conditional assignments
  const preferencesToUpdate: Partial<UserPreferences> = {};
  if (primaryGoal !== undefined) preferencesToUpdate.primaryGoal = primaryGoal;
  if (coachStyle !== undefined) preferencesToUpdate.coachStyle = coachStyle;
  if (reminderFrequency !== undefined) preferencesToUpdate.reminderFrequency = reminderFrequency;
  if (focusAreas !== undefined) preferencesToUpdate.focusAreas = focusAreas;
  if (themePreference !== undefined) preferencesToUpdate.themePreference = themePreference;
  if (pushNotifications !== undefined) preferencesToUpdate.pushNotifications = pushNotifications;
  if (emailSummaries !== undefined) preferencesToUpdate.emailSummaries = emailSummaries;
  if (dataSharing !== undefined) preferencesToUpdate.dataSharing = dataSharing;
  if (healthVisibilitySettings !== undefined) preferencesToUpdate.healthVisibilitySettings = healthVisibilitySettings;
  if (highValueRetentionDays !== undefined) preferencesToUpdate.highValueRetentionDays = highValueRetentionDays;
  if (mediumValueRetentionDays !== undefined) preferencesToUpdate.mediumValueRetentionDays = mediumValueRetentionDays;
  if (lowValueRetentionDays !== undefined) preferencesToUpdate.lowValueRetentionDays = lowValueRetentionDays;

  // Build user fields object with conditional assignments
  const userFieldsToUpdate: UserFieldsUpdate = {};
  if (name !== undefined) userFieldsToUpdate.name = name;
  if (email !== undefined) userFieldsToUpdate.email = email;
  if (aiProvider !== undefined) userFieldsToUpdate.aiProvider = aiProvider;
  if (aiModel !== undefined) userFieldsToUpdate.aiModel = aiModel;
  if (automaticModelSelection !== undefined) userFieldsToUpdate.automaticModelSelection = automaticModelSelection;
  if (transcriptionProvider !== undefined) userFieldsToUpdate.transcriptionProvider = transcriptionProvider;
  if (preferredLanguage !== undefined) userFieldsToUpdate.preferredLanguage = preferredLanguage;
  if (memoryDetectionProvider !== undefined) userFieldsToUpdate.memoryDetectionProvider = memoryDetectionProvider;
  if (memoryDetectionModel !== undefined) userFieldsToUpdate.memoryDetectionModel = memoryDetectionModel;

  return {
    userFields: userFieldsToUpdate,
    preferences: preferencesToUpdate
  };
}

/**
 * Apply processed settings to a user object (for memory storage)
 */
export function applyUserSettingsToUser(
  user: User,
  processed: ProcessedUserSettings
): User {
  return {
    ...user,
    ...processed.userFields,
    preferences: {
      ...user.preferences,
      ...processed.preferences,
    },
  };
}