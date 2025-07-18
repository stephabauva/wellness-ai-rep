import type { User, ChatMessage, HealthData, ConnectedDevice } from "@shared/schema";

export function createDefaultUser(): User {
  return {
    id: 1,
    username: "janesmith",
    password: "password", // In a real app, this would be hashed
    name: "Jane Smith",
    email: "jane.smith@example.com",
    preferences: {
      primaryGoal: "weight-loss",
      coachStyle: "motivational",
      reminderFrequency: "daily",
      focusAreas: ["nutrition", "exercise", "sleep"],
      themePreference: "system",
      pushNotifications: true,
      emailSummaries: true,
      dataSharing: false
    },
    transcriptionProvider: "webspeech",
    preferredLanguage: "en",
    automaticModelSelection: true,
    aiProvider: "google",
    aiModel: "gemini-2.0-flash-exp",
    memoryDetectionProvider: "google",
    memoryDetectionModel: "gemini-2.0-flash-lite",
    createdAt: new Date()
  };
}

export function createWelcomeMessage(messageId: number): ChatMessage {
  return {
    id: messageId,
    userId: 1,
    content: "Welcome to your AI wellness coach! I'm here to support you on your wellness journey with personalized guidance tailored to your goals. Whether you're focused on weight loss, muscle gain, fitness, mental wellness, or nutrition, I'm ready to help. What would you like to work on today?",
    isUserMessage: false,
    timestamp: new Date()
  };
}

export function createComprehensiveHealthData(healthDataId: { current: number }): HealthData[] {
  const today = new Date();
  const healthDataEntries: HealthData[] = [];

  // Body Composition Data (from smart scale)
  const bodyCompositionData = [
    { dataType: "weight", value: "165", unit: "lbs", category: "body_composition" },
    { dataType: "bmi", value: "22.8", unit: "kg/m²", category: "body_composition" },
    { dataType: "body_fat_percentage", value: "18.5", unit: "%", category: "body_composition" },
    { dataType: "subcutaneous_fat", value: "12.3", unit: "%", category: "body_composition" },
    { dataType: "visceral_fat", value: "6", unit: "level", category: "body_composition" },
    { dataType: "body_water_percentage", value: "58.2", unit: "%", category: "body_composition" },
    { dataType: "muscle_mass", value: "134.2", unit: "lbs", category: "body_composition" },
    { dataType: "bone_mass", value: "6.8", unit: "lbs", category: "body_composition" },
    { dataType: "bmr", value: "1580", unit: "kcal", category: "body_composition" },
    { dataType: "metabolic_age", value: "28", unit: "years", category: "body_composition" }
  ];

  // Cardiovascular Data (from various devices)
  const cardiovascularData = [
    { dataType: "blood_pressure_systolic", value: "118", unit: "mmHg", category: "cardiovascular" },
    { dataType: "blood_pressure_diastolic", value: "75", unit: "mmHg", category: "cardiovascular" },
    { dataType: "heart_rate", value: "72", unit: "bpm", category: "cardiovascular" },
    { dataType: "resting_heart_rate", value: "58", unit: "bpm", category: "cardiovascular" },
    { dataType: "hrv", value: "42", unit: "ms", category: "cardiovascular" },
    { dataType: "cholesterol_total", value: "185", unit: "mg/dL", category: "cardiovascular" },
    { dataType: "cholesterol_ldl", value: "110", unit: "mg/dL", category: "cardiovascular" },
    { dataType: "cholesterol_hdl", value: "55", unit: "mg/dL", category: "cardiovascular" },
    { dataType: "cholesterol_triglycerides", value: "100", unit: "mg/dL", category: "cardiovascular" },
    { dataType: "oxygen_saturation", value: "98", unit: "%", category: "cardiovascular" }
  ];

  // Medical Data (from lab tests and glucose monitors)
  const medicalData = [
    { dataType: "blood_glucose_fasting", value: "92", unit: "mg/dL", category: "medical" },
    { dataType: "blood_glucose_postprandial", value: "135", unit: "mg/dL", category: "medical" },
    { dataType: "hba1c", value: "5.2", unit: "%", category: "medical" },
    { dataType: "body_temperature", value: "98.6", unit: "°F", category: "medical" },
    { dataType: "ketone_levels", value: "0.3", unit: "mmol/L", category: "medical" }
  ];

  // Advanced Metrics (from fitness trackers and lab analysis)
  const advancedData = [
    { dataType: "vo2_max", value: "48", unit: "mL/kg/min", category: "advanced" },
    { dataType: "lactate_threshold", value: "152", unit: "bpm", category: "advanced" },
    { dataType: "skin_temperature", value: "89.2", unit: "°F", category: "advanced" }
  ];

  // Add static data (most recent values)
  [...bodyCompositionData, ...cardiovascularData, ...medicalData, ...advancedData].forEach(data => {
    healthDataEntries.push({
      id: healthDataId.current++,
      userId: 1,
      dataType: data.dataType,
      value: data.value,
      unit: data.unit,
      timestamp: new Date(today.getTime() - Math.random() * 24 * 60 * 60 * 1000), // Within last 24 hours
      source: data.category === "body_composition" ? "smart_scale" : 
              data.category === "cardiovascular" ? "smartwatch" :
              data.category === "medical" ? "lab_test" : "fitness_tracker",
      category: data.category,
      metadata: null
    });
  });

  // Time series data for trending (last 7 days)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Lifestyle metrics with daily variation
    const lifestyleMetrics = [
      { 
        dataType: "steps", 
        value: (6000 + Math.floor(Math.random() * 5000)).toString(), 
        unit: "steps",
        source: "smartwatch" 
      },
      { 
        dataType: "sleep_duration", 
        value: (6 + Math.random() * 2).toFixed(1), 
        unit: "hours",
        source: "smartwatch" 
      },
      { 
        dataType: "sleep_deep", 
        value: (1.5 + Math.random() * 0.8).toFixed(1), 
        unit: "hours",
        source: "smartwatch" 
      },
      { 
        dataType: "sleep_light", 
        value: (3.5 + Math.random() * 1.2).toFixed(1), 
        unit: "hours",
        source: "smartwatch" 
      },
      { 
        dataType: "sleep_rem", 
        value: (1.0 + Math.random() * 0.8).toFixed(1), 
        unit: "hours",
        source: "smartwatch" 
      },
      { 
        dataType: "calories_burned", 
        value: (1800 + Math.floor(Math.random() * 600)).toString(), 
        unit: "kcal",
        source: "smartwatch" 
      },
      { 
        dataType: "calories_intake", 
        value: (1600 + Math.floor(Math.random() * 800)).toString(), 
        unit: "kcal",
        source: "nutrition_app" 
      },
      { 
        dataType: "hydration", 
        value: (1.2 + Math.random() * 1.0).toFixed(1), 
        unit: "L",
        source: "manual" 
      },
      { 
        dataType: "stress_level", 
        value: Math.floor(1 + Math.random() * 9).toString(), 
        unit: "1-10",
        source: "manual" 
      },
      { 
        dataType: "mood", 
        value: Math.floor(3 + Math.random() * 3).toString(), 
        unit: "1-5",
        source: "manual" 
      }
    ];

    lifestyleMetrics.forEach(metric => {
      healthDataEntries.push({
        id: healthDataId.current++,
        userId: 1,
        dataType: metric.dataType,
        value: metric.value,
        unit: metric.unit,
        timestamp: date,
        source: metric.source,
        category: "lifestyle",
        metadata: null
      });
    });
    
    // Some cardiovascular data that varies daily
    healthDataEntries.push({
      id: healthDataId.current++,
      userId: 1,
      dataType: "heart_rate",
      value: (65 + Math.floor(Math.random() * 15)).toString(),
      unit: "bpm",
      timestamp: date,
      source: "smartwatch",
      category: "cardiovascular",
      metadata: null
    });
  }

  return healthDataEntries;
}

export function createConnectedDevices(deviceId: { current: number }): ConnectedDevice[] {
  const smartwatch: ConnectedDevice = {
    id: deviceId.current++,
    userId: 1,
    deviceName: "FitTrack Smartwatch",
    deviceType: "smartwatch",
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    isActive: true,
    metadata: {
      features: ["Step tracking", "Heart rate", "Sleep tracking", "Exercise detection"]
    },
    createdAt: new Date()
  };
  
  const scale: ConnectedDevice = {
    id: deviceId.current++,
    userId: 1,
    deviceName: "HealthScale Pro",
    deviceType: "scale",
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isActive: true,
    metadata: {
      features: ["Weight", "Body fat", "Muscle mass", "BMI"]
    },
    createdAt: new Date()
  };

  return [smartwatch, scale];
}