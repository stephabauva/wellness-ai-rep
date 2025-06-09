import { User, HealthData } from "@shared/schema";
import { format, subDays } from "date-fns";
import { aiService } from "./ai-service";

interface ReportTrend {
  date: string;
  steps: number;
  active: number;
}

interface SleepTrend {
  date: string;
  duration: number;
  quality: string;
}

interface HealthReportData {
  user: {
    name: string;
    email: string;
    goalType: string;
  };
  date: string;
  summary: {
    title: string;
    content: string;
  };
  stats: {
    steps: number;
    sleep: string;
    heartRate: number;
    weight: number;
  };
  trends: {
    activity: ReportTrend[];
    sleep: SleepTrend[];
  };
  recommendations: string[];
}

export async function generatePDFReport(user: User, healthData: HealthData[]): Promise<HealthReportData> {
  // Extract relevant data from the health data
  const today = new Date();
  const stepsData = healthData.filter(data => data.dataType === "steps");
  const sleepData = healthData.filter(data => data.dataType === "sleep");
  const heartRateData = healthData.filter(data => data.dataType === "heartRate");
  const weightData = healthData.filter(data => data.dataType === "weight");
  
  // Calculate averages and latest values
  const latestSteps = stepsData.length > 0 
    ? parseInt(stepsData[0].value) 
    : 0;
    
  const avgSteps = stepsData.length > 0 
    ? Math.round(stepsData.reduce((sum, data) => sum + parseInt(data.value), 0) / stepsData.length) 
    : 0;
    
  const latestSleep = sleepData.length > 0 
    ? `${sleepData[0].value}h` 
    : "No data";
    
  const avgHeartRate = heartRateData.length > 0 
    ? Math.round(heartRateData.reduce((sum, data) => sum + parseInt(data.value), 0) / heartRateData.length) 
    : 70;
    
  const latestWeight = weightData.length > 0 
    ? parseInt(weightData[0].value) 
    : 0;
  
  // Create activity trends data
  const activityTrends: ReportTrend[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const formattedDate = format(date, "MM/dd/yyyy");
    
    // Find step data for this date
    const stepData = stepsData.find(data => 
      format(new Date(data.timestamp), "MM/dd/yyyy") === formattedDate
    );
    
    activityTrends.push({
      date: formattedDate,
      steps: stepData ? parseInt(stepData.value) : 0,
      active: Math.round((stepData ? parseInt(stepData.value) : 0) / 1000 * 7) // Rough estimate of active minutes
    });
  }
  
  // Create sleep trends data
  const sleepTrends: SleepTrend[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const formattedDate = format(date, "MM/dd/yyyy");
    
    // Find sleep data for this date
    const sleepDataForDay = sleepData.find(data => 
      format(new Date(data.timestamp), "MM/dd/yyyy") === formattedDate
    );
    
    const duration = sleepDataForDay ? parseFloat(sleepDataForDay.value) : 0;
    
    let quality = "Poor";
    if (duration >= 7) quality = "Good";
    else if (duration >= 6) quality = "Fair";
    
    sleepTrends.push({
      date: formattedDate,
      duration,
      quality
    });
  }
  
  // Get AI-generated recommendations
  let recommendations: string[] = [];
  try {
    recommendations = await chatService.getHealthInsights(healthData);
  } catch (error) {
    console.error("Error getting recommendations:", error);
    recommendations = [
      "Try to increase your daily step count gradually to reach your goal of 10,000 steps.",
      "Aim for 7-8 hours of sleep consistently to improve your recovery and overall health.",
      "Continue monitoring your heart rate during workouts to ensure you're training in the optimal zone."
    ];
  }
  
  // Determine goal type from user preferences
  const goalType = user.preferences?.primaryGoal || "weight-loss";
  
  // Create goal-specific summary
  let summaryContent = "This health report provides an overview of your recent wellness metrics including activity, sleep, heart rate, and weight data. ";
  
  switch (goalType) {
    case "weight-loss":
      summaryContent += "Your focus on weight loss is showing progress with consistent activity levels and good sleep patterns. Continue to monitor your caloric intake and maintain your exercise routine for optimal results.";
      break;
    case "muscle-gain":
      summaryContent += "Your muscle gain journey is progressing well. Focus on ensuring adequate protein intake and recovery periods between strength training sessions to maximize your gains.";
      break;
    case "fitness":
      summaryContent += "Your overall fitness metrics are showing improvement. Continue with your balanced approach to cardio and strength training while monitoring your recovery metrics.";
      break;
    case "mental-wellness":
      summaryContent += "Your activity and sleep patterns support good mental wellness. Regular physical activity combined with adequate sleep are key foundations for emotional balance and stress management.";
      break;
    case "nutrition":
      summaryContent += "Your health metrics indicate good overall wellness. Continue focusing on balanced nutrition to support your activity levels and ensure optimal recovery.";
      break;
    default:
      summaryContent += "Your wellness journey shows good progress across multiple metrics. Continue with your balanced approach to health and wellness.";
  }
  
  // Format goal type for display
  const formattedGoalType = goalType.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  // Create the report data structure
  const reportData: HealthReportData = {
    user: {
      name: user.name || user.username,
      email: user.email || "Not provided",
      goalType: formattedGoalType
    },
    date: format(today, "yyyy-MM-dd"),
    summary: {
      title: "Health Report Summary",
      content: summaryContent
    },
    stats: {
      steps: latestSteps,
      sleep: latestSleep,
      heartRate: avgHeartRate,
      weight: latestWeight
    },
    trends: {
      activity: activityTrends,
      sleep: sleepTrends
    },
    recommendations
  };
  
  return reportData;
}
