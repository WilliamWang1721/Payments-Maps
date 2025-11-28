import { GoogleGenAI } from "@google/genai";
import { DailyStats } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not set in the environment.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateHealthInsight = async (stats: DailyStats): Promise<string> => {
  const client = getAIClient();
  if (!client) return "API Key missing. Cannot generate insights.";

  const prompt = `
    You are an encouraging and expert personal trainer AI.
    Analyze the following daily health statistics for a user named Amanda:
    
    - Calories Intake: ${stats.caloriesIntake} kcal
    - Calories Burned: ${stats.caloriesBurned} kcal
    - Activity Time: ${stats.activityTimeHours} hours
    - Steps: ${stats.steps} / ${stats.stepsGoal}
    - Current Weight: ${stats.weight}kg (Goal: ${stats.weightGoal}kg)

    Provide a short, motivating, and actionable paragraph (max 80 words) giving feedback on her progress today.
    Focus on the positive balance between intake and burn, or the step count progress.
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Keep up the great work! Consistency is key.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Great job on your activity today! Keep moving to reach your goals.";
  }
};
