import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import { CoachingMode } from "@shared/schema";

export type ActiveSection = "chat" | "health" | "devices" | "memory" | "files" | "settings";

interface AppContextType {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  coachingMode: string;
  setCoachingMode: (mode: string) => void;
  settings?: {
    aiProvider?: string;
    aiModel?: string;
    automaticModelSelection?: boolean;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [activeSection, setActiveSectionState] = useState<ActiveSection>("chat");
  const [coachingMode, setCoachingModeState] = useState<string>("weight-loss");

  // Default settings for AI provider
  const settings = {
    aiProvider: "openai",
    aiModel: "gpt-4o",
    automaticModelSelection: true // Enable by default for better image handling
  };

  // Memoized callback functions to prevent unnecessary re-renders
  const setActiveSection = useCallback((section: ActiveSection) => {
    setActiveSectionState(section);
  }, []);

  const setCoachingMode = useCallback((mode: string) => {
    setCoachingModeState(mode);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    activeSection,
    setActiveSection,
    coachingMode,
    setCoachingMode,
    settings
  }), [activeSection, setActiveSection, coachingMode, setCoachingMode]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};