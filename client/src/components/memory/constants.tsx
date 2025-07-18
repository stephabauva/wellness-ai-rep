/**
 * Memory constants and configuration objects
 * @used-by memory/MemorySection
 */

import { User, Lightbulb, Settings, Apple, Target } from "lucide-react";
import { z } from "zod";

// Manual memory entry schema
export const manualMemorySchema = z.object({
  content: z.string().min(10, "Memory content must be at least 10 characters").max(500, "Memory content must be less than 500 characters"),
  category: z.enum(["preferences", "personal_context", "instructions", "food_diet", "goals"], {
    required_error: "Please select a memory category",
  }),
  importance: z.enum(["low", "medium", "high"], {
    required_error: "Please select importance level",
  }),
});

export type ManualMemoryFormData = z.infer<typeof manualMemorySchema>;

export interface MemoryEntry {
  id: string;
  content: string;
  category: string;
  labels: string[];
  importanceScore: number;
  keywords: string[];
  createdAt: string;
  accessCount: number;
  lastAccessed: string;
}

export const categoryIcons = {
  preferences: <User className="h-4 w-4" />,
  personal_context: <Lightbulb className="h-4 w-4" />,
  instructions: <Settings className="h-4 w-4" />,
  food_diet: <Apple className="h-4 w-4" />,
  goals: <Target className="h-4 w-4" />
};

export const categoryLabels = {
  preferences: "Preferences",
  personal_context: "Personal Context",
  instructions: "Instructions",
  food_diet: "Food & Diet",
  goals: "Goals"
};

export const categoryColors = {
  preferences: "bg-blue-100 text-blue-800",
  personal_context: "bg-green-100 text-green-800",
  instructions: "bg-purple-100 text-purple-800",
  food_diet: "bg-orange-100 text-orange-800",
  goals: "bg-teal-100 text-teal-800"
};

export const explanationCards = {
  all: {
    title: "All Memories",
    description: "Complete collection of information your AI coach remembers about you",
    details: [
      "Combines all memory types in one view",
      "Sorted by importance and recency",
      "Shows how memories are categorized",
      "Use this to get an overview of everything stored"
    ],
    privacyNote: "🔒 All memories are encrypted and stored securely. You control what the AI can access.",
    coachingBenefits: "Your AI coach uses this complete information to provide holistic, personalized wellness guidance that considers all aspects of your health journey together."
  },
  preferences: {
    title: "Preferences",
    description: "Your likes, dislikes, and personal choices for workouts and wellness",
    details: [
      "Exercise types you enjoy or avoid",
      "Workout timing and environment preferences", 
      "Equipment and activity preferences",
      "Communication style and feedback preferences"
    ],
    privacyNote: "🤖 This helps your AI coach personalize workout suggestions and communication style.",
    coachingBenefits: "By remembering your preferences, your AI coach can suggest workouts you'll actually enjoy, recommend exercises at your preferred times, and communicate in a way that motivates you best."
  },
  personal_context: {
    title: "Personal Context", 
    description: "Important background information and circumstances that affect your wellness journey",
    details: [
      "Health conditions, allergies, and medical information",
      "Physical limitations or injury considerations",
      "Current fitness level and training phase",
      "Life circumstances and lifestyle factors"
    ],
    privacyNote: "🏥 Medical information is encrypted and only used to ensure safe, personalized recommendations.",
    coachingBenefits: "Your AI coach uses this context to ensure all recommendations are safe for your health conditions, appropriate for your fitness level, and adapted to your life circumstances."
  },
  instructions: {
    title: "Instructions",
    description: "Specific coaching rules and guidance preferences",
    details: [
      "How you want to be coached and communicated with",
      "Protocols for reminders and check-ins",
      "Permission requirements for suggestions",
      "Goal-setting and progress tracking preferences"
    ],
    privacyNote: "🎯 These instructions help the AI coach communicate with you in your preferred style.",
    coachingBenefits: "Instructions ensure your AI coach respects your boundaries, follows your preferred coaching style, and provides guidance in the way that works best for your personality and schedule."
  },
  food_diet: {
    title: "Food & Diet",
    description: "All nutrition-related information including preferences, restrictions, and patterns",
    details: [
      "Food preferences and favorites",
      "Allergies, intolerances, and dietary restrictions",
      "Meal patterns and eating habits",
      "Nutritional needs and dietary choices"
    ],
    privacyNote: "🥗 Dietary information helps create safe, personalized nutrition recommendations.",
    coachingBenefits: "Your AI coach uses dietary information to suggest meals you'll enjoy, avoid foods that cause problems, and create nutrition plans that fit your lifestyle and health goals."
  },
  goals: {
    title: "Goals",
    description: "Your objectives and targets for fitness, nutrition, and overall wellness",
    details: [
      "Fitness and exercise goals",
      "Nutrition and dietary objectives",
      "Weight management targets",
      "Health and wellness milestones"
    ],
    privacyNote: "🎯 Goal information helps the AI coach track your progress and adjust recommendations.",
    coachingBenefits: "Goals give your AI coach direction to create focused plans, track your progress meaningfully, celebrate achievements, and adjust strategies when you're not meeting targets."
  }
};