import React, { useCallback } from "react";
import { 
  MessageSquare, 
  BarChart3, 
  Cpu, 
  Settings, 
  Zap
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const NavButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}> = ({ active, onClick, label, icon }) => {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={cn(
        "nav-icon flex items-center justify-center h-12 w-12 rounded-lg mx-auto",
        active && "active"
      )}
      aria-label={label}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
};

const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection } = useAppContext();
  const { t } = useTranslation();

  const handleNavClick = useCallback((section: "chat" | "health" | "devices" | "settings") => {
    setActiveSection(section);
  }, [setActiveSection]);

  return (
    <div className="hidden md:flex md:flex-shrink-0 z-50">
      <div className="flex flex-col w-20 border-r border-border bg-card">
        {/* App Logo */}
        <div className="flex-shrink-0 flex items-center justify-center h-16 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
        </div>
        
        {/* Navigation Icons */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-2">
            <NavButton 
              active={activeSection === "chat"}
              onClick={() => handleNavClick("chat")}
              label={t("navigation.chat")}
              icon={<MessageSquare className="h-6 w-6" />}
            />
            
            <NavButton 
              active={activeSection === "health"}
              onClick={() => handleNavClick("health")}
              label={t("navigation.health")}
              icon={<BarChart3 className="h-6 w-6" />}
            />
            
            <NavButton 
              active={activeSection === "devices"}
              onClick={() => handleNavClick("devices")}
              label={t("navigation.devices")}
              icon={<Cpu className="h-6 w-6" />}
            />
            
            <NavButton 
              active={activeSection === "settings"}
              onClick={() => handleNavClick("settings")}
              label={t("navigation.settings")}
              icon={<Settings className="h-6 w-6" />}
            />
          </nav>
          
          {/* User Profile */}
          <div className="flex-shrink-0 px-2 py-4 space-y-1">
            <button 
              type="button"
              className="flex items-center justify-center h-12 w-12 rounded-full mx-auto bg-muted hover:bg-muted/80 focus:outline-none"
            >
              <span className="text-sm font-medium text-foreground">JS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
