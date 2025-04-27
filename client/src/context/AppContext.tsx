import React, { createContext, useContext, useState, ReactNode } from "react";
import { CoachingMode } from "@shared/schema";

type ActiveSection = "chat" | "health" | "devices" | "settings";

interface AppContextType {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  coachingMode: string;
  setCoachingMode: (mode: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<ActiveSection>("chat");
  const [coachingMode, setCoachingMode] = useState<string>("weight-loss");
  
  return (
    <AppContext.Provider value={{
      activeSection,
      setActiveSection,
      coachingMode,
      setCoachingMode
    }}>
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
