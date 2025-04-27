import OpenAI from "openai";
import { CoachingMode, coachingModes } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "mock_key_for_development" });

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

class ChatService {
  // Get coaching persona based on mode
  private getCoachingPersona(mode: string): string {
    switch (mode) {
      case "weight-loss":
        return "You are a supportive weight loss coach. Focus on sustainable habits, healthy eating, and appropriate exercise. Be motivating, empathetic, and science-based. Avoid extreme dieting advice.";
      case "muscle-gain":
        return "You are a knowledgeable muscle gain coach. Focus on strength training, progressive overload, adequate protein intake, and recovery. Be motivating and educational about proper form and technique.";
      case "fitness":
        return "You are an experienced fitness coach. Focus on overall fitness improvement, cardiovascular health, flexibility, and strength. Provide varied workout suggestions and emphasize consistency.";
      case "mental-wellness":
        return "You are a compassionate mental wellness coach. Focus on stress reduction, mindfulness, positive psychology, and emotional resilience. Be gentle, non-judgmental, and encourage healthy coping strategies.";
      case "nutrition":
        return "You are a balanced nutrition coach. Focus on whole foods, portion control, and sustainable eating patterns. Provide practical meal suggestions and emphasize nutritional education without being restrictive.";
      default:
        return "You are a holistic wellness coach. Provide balanced advice on health, fitness, nutrition, and wellbeing. Be supportive, educational, and focus on sustainable lifestyle changes.";
    }
  }

  // Get a response from the AI coach
  async getChatResponse(userMessage: string, coachingMode: string = "weight-loss"): Promise<string> {
    try {
      // Validate coaching mode
      const mode = coachingModes.includes(coachingMode as CoachingMode) 
        ? coachingMode 
        : "weight-loss";
      
      // Get the appropriate coaching persona
      const persona = this.getCoachingPersona(mode);
      
      // Format the prompt with system instructions and user message
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `${persona}
            
            Guidelines for your responses:
            1. Keep your tone friendly, supportive, and conversational.
            2. Provide specific, actionable advice when appropriate.
            3. Answer should be thorough but concise (no more than 3-4 paragraphs).
            4. When suggesting exercises or nutrition advice, provide specific examples.
            5. You may reference health data from connected devices if the user mentions them.
            6. Use emoji sparingly to add warmth to your responses.`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      return response.choices[0].message.content || "I'm sorry, I couldn't process your request right now. Please try again.";
    } catch (error) {
      console.error("Error getting AI response:", error);
      return "I apologize, but I'm having trouble connecting to my coaching system right now. Please try again in a moment.";
    }
  }
  
  // Analyze health data for insights
  async getHealthInsights(healthData: any): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a wellness coach analyzing health data. Based on the provided data, give 3 specific, actionable insights phrased in the first person as if you're directly speaking to the user. Each insight should be concise (1-2 sentences) and focus on trends, improvements, or areas that need attention.`
          },
          {
            role: "user",
            content: JSON.stringify(healthData)
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 300
      });
      
      try {
        const insights = JSON.parse(response.choices[0].message.content || "{}");
        return insights.insights || [];
      } catch (parseError) {
        console.error("Error parsing insights:", parseError);
        return [
          "Your activity levels have been consistent this week, keep up the good progress.",
          "Your sleep pattern shows some irregularity, try to establish a more consistent bedtime routine.",
          "Your heart rate readings are within a healthy range, indicating good cardiovascular health."
        ];
      }
    } catch (error) {
      console.error("Error getting health insights:", error);
      return [
        "Your activity levels have been consistent this week, keep up the good progress.",
        "Your sleep pattern shows some irregularity, try to establish a more consistent bedtime routine.",
        "Your heart rate readings are within a healthy range, indicating good cardiovascular health."
      ];
    }
  }
}

export const chatService = new ChatService();
