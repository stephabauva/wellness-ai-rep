import { db } from '../db.js';
import { userHealthConsent, healthDataAccessLog, users, healthData } from '../../shared/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import type { HealthConsentSettings, UserHealthConsent, InsertUserHealthConsent, InsertHealthDataAccessLog } from '../../shared/schema.js';

export class HealthConsentService {
  /**
   * Check if user has given consent for specific data access
   * Non-breaking: returns true for all existing users initially
   */
  async checkDataAccess(userId: number, category: string, accessType: string): Promise<boolean> {
    try {
      const consent = await db
        .select()
        .from(userHealthConsent)
        .where(
          and(
            eq(userHealthConsent.userId, userId),
            eq(userHealthConsent.category, category),
            eq(userHealthConsent.consentType, accessType)
          )
        )
        .limit(1);

      // Default to true for existing users (non-breaking behavior)
      // New users will have explicit consent records created
      if (consent.length === 0) {
        return true;
      }

      return consent[0].isEnabled ?? true;
    } catch (error) {
      console.error('Error checking data access:', error);
      // Fail-safe: allow access on error to maintain existing functionality
      return true;
    }
  }

  /**
   * Get all consent settings for a user
   */
  async getUserConsentSettings(userId: number): Promise<UserHealthConsent[]> {
    try {
      return await db
        .select()
        .from(userHealthConsent)
        .where(eq(userHealthConsent.userId, userId));
    } catch (error) {
      console.error('Error fetching consent settings:', error);
      return [];
    }
  }

  /**
   * Update consent settings for a user
   */
  async updateConsentSettings(userId: number, settings: HealthConsentSettings): Promise<void> {
    try {
      // Update AI access consent
      for (const [category, enabled] of Object.entries(settings.ai_access_consent)) {
        await this.upsertConsent(userId, category, 'ai_access', enabled);
      }

      // Update retention policies
      for (const [key, days] of Object.entries(settings.retention_policies)) {
        const category = key.replace('_days', '');
        await this.upsertConsent(userId, category, 'retention', true, days);
      }

      // Update sharing consent (for future use)
      for (const category of Object.keys(settings.ai_access_consent)) {
        await this.upsertConsent(userId, category, 'sharing', false);
      }
    } catch (error) {
      console.error('Error updating consent settings:', error);
      throw error;
    }
  }

  /**
   * Check if AI has access to specific health category
   */
  async hasAiAccess(userId: number, category: string): Promise<boolean> {
    return this.checkDataAccess(userId, category, 'ai_access');
  }

  /**
   * Log health data access for GDPR compliance
   */
  async logDataAccess(userId: number, dataType: string, accessType: string, consentVerified: boolean = true): Promise<void> {
    try {
      const logEntry: InsertHealthDataAccessLog = {
        userId,
        dataType,
        accessType,
        consentVerified,
      };

      await db.insert(healthDataAccessLog).values(logEntry);
    } catch (error) {
      console.error('Error logging data access:', error);
      // Don't throw - logging failures shouldn't break the main functionality
    }
  }

  /**
   * Get allowed categories for AI access (filtered list)
   */
  async getAllowedCategories(userId: number, accessType: string = 'ai_access'): Promise<string[]> {
    try {
      const consents = await db
        .select()
        .from(userHealthConsent)
        .where(
          and(
            eq(userHealthConsent.userId, userId),
            eq(userHealthConsent.consentType, accessType),
            eq(userHealthConsent.isEnabled, true)
          )
        );

      const allowedCategories = consents.map((c: any) => c.category);
      
      // If no explicit consent records exist, allow all categories (existing user behavior)
      if (allowedCategories.length === 0) {
        return ['lifestyle', 'cardiovascular', 'body_composition', 'medical', 'advanced'];
      }

      return allowedCategories;
    } catch (error) {
      console.error('Error getting allowed categories:', error);
      // Fail-safe: return all categories on error
      return ['lifestyle', 'cardiovascular', 'body_composition', 'medical', 'advanced'];
    }
  }

  /**
   * Transform database consent records to UI settings format
   */
  transformConsentToSettings(consents: UserHealthConsent[]): HealthConsentSettings {
    const defaultSettings: HealthConsentSettings = {
      data_visibility: {
        visible_categories: ['lifestyle', 'cardiovascular', 'body_composition'],
        hidden_categories: ['medical', 'advanced'],
        dashboard_preferences: {}
      },
      ai_access_consent: {
        lifestyle: true,
        cardiovascular: true,
        body_composition: true,
        medical: false,
        advanced: false
      },
      retention_policies: {
        lifestyle_days: 365,
        cardiovascular_days: 365,
        body_composition_days: 365,
        medical_days: 90,
        advanced_days: 180
      },
      export_controls: {
        auto_export_enabled: false,
        export_format: 'pdf' as const,
        include_ai_interactions: false
      }
    };

    if (consents.length === 0) {
      return defaultSettings;
    }

    // Process consent records to build settings
    const aiAccessConsents = consents.filter(c => c.consentType === 'ai_access');
    const retentionConsents = consents.filter(c => c.consentType === 'retention');

    // Update AI access settings
    for (const consent of aiAccessConsents) {
      if (consent.category in defaultSettings.ai_access_consent) {
        (defaultSettings.ai_access_consent as any)[consent.category] = consent.isEnabled;
      }
    }

    // Update retention settings
    for (const consent of retentionConsents) {
      const retentionKey = `${consent.category}_days` as keyof typeof defaultSettings.retention_policies;
      if (retentionKey in defaultSettings.retention_policies) {
        (defaultSettings.retention_policies as any)[retentionKey] = consent.retentionDays || 90;
      }
    }

    // Update visibility based on AI access consent
    const visibleCategories: string[] = [];
    const hiddenCategories: string[] = [];

    for (const [category, enabled] of Object.entries(defaultSettings.ai_access_consent)) {
      if (enabled) {
        visibleCategories.push(category);
      } else {
        hiddenCategories.push(category);
      }
    }

    defaultSettings.data_visibility.visible_categories = visibleCategories;
    defaultSettings.data_visibility.hidden_categories = hiddenCategories;

    return defaultSettings;
  }

  /**
   * Private helper to upsert consent records
   */
  private async upsertConsent(
    userId: number, 
    category: string, 
    consentType: string, 
    isEnabled: boolean, 
    retentionDays?: number
  ): Promise<void> {
    try {
      // Check if record exists
      const existing = await db
        .select()
        .from(userHealthConsent)
        .where(
          and(
            eq(userHealthConsent.userId, userId),
            eq(userHealthConsent.category, category),
            eq(userHealthConsent.consentType, consentType)
          )
        )
        .limit(1);

      const consentData: InsertUserHealthConsent = {
        userId,
        category,
        consentType,
        isEnabled,
        retentionDays
      };

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(userHealthConsent)
          .set({
            isEnabled,
            retentionDays,
            updatedAt: new Date()
          })
          .where(eq(userHealthConsent.id, existing[0].id));
      } else {
        // Insert new record
        await db.insert(userHealthConsent).values(consentData);
      }
    } catch (error) {
      console.error('Error upserting consent:', error);
      throw error;
    }
  }

  /**
   * Initialize default consent settings for new users
   */
  async initializeDefaultConsent(userId: number): Promise<void> {
    try {
      const defaultSettings: HealthConsentSettings = {
        data_visibility: {
          visible_categories: ['lifestyle', 'cardiovascular', 'body_composition'],
          hidden_categories: ['medical', 'advanced'],
          dashboard_preferences: {}
        },
        ai_access_consent: {
          lifestyle: true,
          cardiovascular: true,
          body_composition: true,
          medical: false,
          advanced: false
        },
        retention_policies: {
          lifestyle_days: 365,
          cardiovascular_days: 365,
          body_composition_days: 365,
          medical_days: 90,
          advanced_days: 180
        },
        export_controls: {
          auto_export_enabled: false,
          export_format: 'pdf' as const,
          include_ai_interactions: false
        }
      };

      await this.updateConsentSettings(userId, defaultSettings);
    } catch (error) {
      console.error('Error initializing default consent:', error);
      // Don't throw - this is a best-effort initialization
    }
  }
}

export const healthConsentService = new HealthConsentService();