export const translations = {
  en: {
    // Navigation
    chat: "Chat",
    health: "Health",
    devices: "Devices", 
    settings: "Settings",
    
    // Welcome message
    welcomeMessage: "Welcome to your AI wellness coach! I'm here to support you on your wellness journey with personalized guidance tailored to your goals. Whether you're focused on weight loss, muscle gain, fitness, mental wellness, or nutrition, I'm ready to help. What would you like to work on today?",
    
    // Chat interface
    typeMessage: "Type your message...",
    send: "Send",
    downloadReport: "Download Health Report",
    
    // Coaching modes
    "weight-loss": "Weight Loss",
    "muscle-gain": "Muscle Gain", 
    "fitness": "Fitness",
    "mental-wellness": "Mental Wellness",
    "nutrition": "Nutrition",
    
    // Settings section
    personalInformation: "Personal Information",
    name: "Name",
    email: "Email",
    coachingPreferences: "Coaching Preferences",
    primaryGoal: "Primary Goal",
    coachStyle: "Coach Style",
    reminderFrequency: "Reminder Frequency",
    focusAreas: "Focus Areas",
    preferences: "Preferences",
    darkMode: "Dark Mode",
    pushNotifications: "Push Notifications",
    emailSummaries: "Email Summaries",
    dataSharing: "Data Sharing",
    language: "Language",
    english: "English",
    french: "Français",
    aiConfiguration: "AI Assistant Configuration",
    aiProvider: "AI Provider",
    aiModel: "AI Model",
    chooseAIProvider: "Choose your preferred AI provider for coaching responses",
    selectAIModel: "Select the specific model for enhanced coaching capabilities",
    saveChanges: "Save Changes",
    settingsUpdated: "Settings updated",
    settingsUpdatedDesc: "Your settings have been saved successfully.",
    
    // Coach styles
    motivational: "Motivational",
    gentle: "Gentle",
    analytical: "Analytical",
    
    // Reminder frequencies
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    
    // Focus areas
    exercise: "Exercise",
    sleepFocus: "Sleep",
    stress: "Stress Management",
    
    // Health section
    healthData: "Health Data",
    steps: "Steps",
    heartRate: "Heart Rate",
    weight: "Weight",
    sleepData: "Sleep",
    
    // Devices section
    connectedDevices: "Connected Devices",
    connectDevice: "Connect Device",
    deviceName: "Device Name",
    deviceType: "Device Type",
    smartwatch: "Smartwatch",
    scale: "Scale",
    fitnessTracker: "Fitness Tracker",
    heartRateMonitor: "Heart Rate Monitor",
    bloodPressureMonitor: "Blood Pressure Monitor",
    connect: "Connect",
    disconnect: "Disconnect",
    deviceSettings: "Device Settings",
    
    // Common
    loading: "Loading...",
    error: "Error",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close"
  },
  
  fr: {
    // Navigation
    chat: "Chat",
    health: "Santé",
    devices: "Appareils",
    settings: "Paramètres",
    
    // Welcome message
    welcomeMessage: "Bienvenue chez votre coach de bien-être IA ! Je suis là pour vous accompagner dans votre parcours de bien-être avec des conseils personnalisés adaptés à vos objectifs. Que vous vous concentriez sur la perte de poids, la prise de muscle, la forme physique, le bien-être mental ou la nutrition, je suis prêt à vous aider. Sur quoi aimeriez-vous travailler aujourd'hui ?",
    
    // Chat interface
    typeMessage: "Tapez votre message...",
    send: "Envoyer",
    downloadReport: "Télécharger le rapport de santé",
    
    // Coaching modes
    "weight-loss": "Perte de poids",
    "muscle-gain": "Prise de muscle",
    "fitness": "Forme physique",
    "mental-wellness": "Bien-être mental",
    "nutrition": "Nutrition",
    
    // Settings section
    personalInformation: "Informations personnelles",
    name: "Nom",
    email: "Email",
    coachingPreferences: "Préférences de coaching",
    primaryGoal: "Objectif principal",
    coachStyle: "Style de coach",
    reminderFrequency: "Fréquence des rappels",
    focusAreas: "Domaines d'attention",
    preferences: "Préférences",
    darkMode: "Mode sombre",
    pushNotifications: "Notifications push",
    emailSummaries: "Résumés par email",
    dataSharing: "Partage de données",
    language: "Langue",
    english: "English",
    french: "Français",
    aiConfiguration: "Configuration de l'assistant IA",
    aiProvider: "Fournisseur IA",
    aiModel: "Modèle IA",
    chooseAIProvider: "Choisissez votre fournisseur IA préféré pour les réponses de coaching",
    selectAIModel: "Sélectionnez le modèle spécifique pour des capacités de coaching améliorées",
    saveChanges: "Enregistrer les modifications",
    settingsUpdated: "Paramètres mis à jour",
    settingsUpdatedDesc: "Vos paramètres ont été enregistrés avec succès.",
    
    // Coach styles
    motivational: "Motivant",
    gentle: "Doux",
    analytical: "Analytique",
    
    // Reminder frequencies
    daily: "Quotidien",
    weekly: "Hebdomadaire", 
    biweekly: "Bi-hebdomadaire",
    
    // Focus areas
    exercise: "Exercice",
    sleepFocus: "Sommeil",
    stress: "Gestion du stress",
    
    // Health section
    healthData: "Données de santé",
    steps: "Pas",
    heartRate: "Rythme cardiaque",
    weight: "Poids",
    sleepData: "Sommeil",
    
    // Devices section
    connectedDevices: "Appareils connectés",
    connectDevice: "Connecter un appareil",
    deviceName: "Nom de l'appareil",
    deviceType: "Type d'appareil",
    smartwatch: "Montre connectée",
    scale: "Balance",
    fitnessTracker: "Traqueur de fitness",
    heartRateMonitor: "Moniteur de fréquence cardiaque",
    bloodPressureMonitor: "Tensiomètre",
    connect: "Connecter",
    disconnect: "Déconnecter",
    deviceSettings: "Paramètres de l'appareil",
    
    // Common
    loading: "Chargement...",
    error: "Erreur",
    cancel: "Annuler",
    save: "Enregistrer",
    delete: "Supprimer",
    edit: "Modifier",
    close: "Fermer"
  }
} as const;

export type TranslationKey = keyof typeof translations.en;
export type Language = keyof typeof translations;