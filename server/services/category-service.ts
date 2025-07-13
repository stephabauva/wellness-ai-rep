import { db } from "@shared/database/db";
import { fileCategories, FileCategory, InsertFileCategory } from '@shared/schema';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
// `nanoid` is not strictly needed if relying on `defaultRandom()` for UUIDs in schema,
// but can be kept if explicit ID generation is ever needed client-side before insertion.

export const categoryService = {
  async getCategories(userId: number): Promise<FileCategory[]> {
    const categories = await db
      .select()
      .from(fileCategories)
      .where(
        or(
          isNull(fileCategories.userId), // Predefined categories
          eq(fileCategories.userId, userId) // User's custom categories
        )
      )
      .orderBy(fileCategories.isCustom, fileCategories.name); // Show predefined first, then sort by name
    return categories;
  },

  async getCategoryById(categoryId: string, userId?: number): Promise<FileCategory | null> {
    const conditions = [eq(fileCategories.id, categoryId)];
    if (userId !== undefined) {
      conditions.push(
        or(
          isNull(fileCategories.userId),
          eq(fileCategories.userId, userId)
        )!
      );
    }

    const result = await db
      .select()
      .from(fileCategories)
      .where(and(...conditions));

    return result.length > 0 ? result[0] : null;
  },

  async createCategory(
    userId: number,
    data: Omit<InsertFileCategory, 'id' | 'userId' | 'isCustom' | 'createdAt'>
  ): Promise<FileCategory> {
    // Check if a category with the same name already exists for this user
    const existingCategory = await db
      .select()
      .from(fileCategories)
      .where(and(eq(fileCategories.userId, userId), eq(sql`lower(${fileCategories.name})`, data.name.toLowerCase())));

    if (existingCategory.length > 0) {
      throw new Error(`A category named "${data.name}" already exists.`);
    }

    const newCategoryData: InsertFileCategory = {
      ...data,
      userId: userId,
      isCustom: true,
      // id and createdAt will be handled by Drizzle/DB defaults
    };

    const result = await db
      .insert(fileCategories)
      .values(newCategoryData)
      .returning();

    return result[0];
  },

  async updateCategory(
    userId: number,
    categoryId: string,
    data: Partial<Omit<InsertFileCategory, 'id' | 'userId' | 'isCustom' | 'createdAt'>>
  ): Promise<FileCategory | null> {
    // Check if a category with the same name already exists for this user (if name is being changed)
    if (data.name) {
      const existingCategory = await db
        .select()
        .from(fileCategories)
        .where(
          and(
            eq(fileCategories.userId, userId),
            eq(sql`lower(${fileCategories.name})`, data.name.toLowerCase()),
            eq(fileCategories.isCustom, true), // Make sure we are comparing against user's custom categories
            sql`${fileCategories.id} != ${categoryId}` // Exclude the current category being updated
          )
        );

      if (existingCategory.length > 0) {
        throw new Error(`Another category named "${data.name}" already exists.`);
      }
    }

    const result = await db
      .update(fileCategories)
      .set(data)
      .where(
        and(
          eq(fileCategories.id, categoryId),
          eq(fileCategories.userId, userId),
          eq(fileCategories.isCustom, true) // Can only update custom categories
        )
      )
      .returning();

    return result.length > 0 ? result[0] : null;
  },

  async deleteCategory(
    userId: number,
    categoryId: string
  ): Promise<{ success: boolean; message?: string }> {
    // TODO: Consider what happens to files associated with this category.
    // For now, we just delete the category.
    // Future: Check if files are using this category and either:
    // 1. Prevent deletion if in use.
    // 2. Re-categorize files to a default category.
    // 3. Nullify category_id for those files.

    const result = await db
      .delete(fileCategories)
      .where(
        and(
          eq(fileCategories.id, categoryId),
          eq(fileCategories.userId, userId),
          eq(fileCategories.isCustom, true) // Can only delete custom categories
        )
      )
      .returning({ id: fileCategories.id });

    if (result.length > 0) {
      return { success: true, message: "Category deleted successfully." };
    } else {
      return { success: false, message: "Category not found, not authorized to delete, or it is not a custom category." };
    }
  }
};

// Helper function to add default categories if they don't exist
// This would typically be run once at application startup or via a migration script
export async function seedDefaultCategories() {
  try {
    const defaultCategories: Omit<InsertFileCategory, 'id' | 'userId' | 'isCustom' | 'createdAt'>[] = [
      { name: '❤️ Medical', description: 'Medical records, prescriptions, lab results.', icon: 'Heart', color: '#ef4444' },
      { name: '💪 Fitness', description: 'Workout plans, progress photos, fitness logs.', icon: 'Activity', color: '#22c55e' },
      { name: '👤 Personal', description: 'Personal documents, notes, journals.', icon: 'User', color: '#a855f7' },
      { name: '📸 Photo', description: 'Photos and images from chat or uploads.', icon: 'Camera', color: '#ec4899' },
      { name: '🥗 Nutrition', description: 'Meal plans, nutrition logs, recipes.', icon: 'Apple', color: '#f59e0b' },
      { name: '📄 General', description: 'General purpose documents.', icon: 'FileText', color: '#6b7280' },
    ];

    for (const catData of defaultCategories) {
      if (!db) {
        console.warn('Database not initialized for category seeding, skipping...');
        return;
      }
      const existing = await db.select().from(fileCategories).where(
        and(
          isNull(fileCategories.userId), // System category
          eq(fileCategories.name, catData.name)
        )
      );

      if (existing.length === 0) {
        await db.insert(fileCategories).values({
          ...catData,
          isCustom: false, // System category
          userId: null,    // No user associated
        }).execute();
        console.log(`Seeded default category: ${catData.name}`);
      }
    }
  } catch (error) {
    console.warn('Failed to seed default categories:', error);
  }
}

// Example of how to call seeding (e.g., in your main server setup file)
// seedDefaultCategories().catch(console.error);
