import React, { useCallback } from "react";
import { 
  MessageSquare, 
  BarChart3, 
  Cpu, 
  Brain,
  Settings, 
  Zap,
  Plus
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

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

  const handleNavClick = useCallback((section: "chat" | "health" | "devices" | "memory" | "settings") => {
    setActiveSection(section);
  }, [setActiveSection]);

  return (
    <div className="hidden md:flex md:flex-shrink-0 z-50">
      <div className="flex flex-col w-20 border-r border-border bg-card">
        {/* App Logo */}
        <div className="flex-shrink-0 flex items-center justify-between px-2 h-16 border-b border-border">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <button 
            type="button"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
              setActiveSection("chat");
            }}
            className="h-6 w-6 rounded bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            title="New Chat"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        
        {/* Navigation Icons */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-2">
            <NavButton 
              active={activeSection === "chat"}
              onClick={() => handleNavClick("chat")}
              label="Chat"
              icon={<MessageSquare className="h-6 w-6" />}
            />
            
            <NavButton 
              active={activeSection === "health"}
              onClick={() => handleNavClick("health")}
              label="Health Data"
              icon={<BarChart3 className="h-6 w-6" />}
            />
            
            <NavButton 
              active={activeSection === "devices"}
              onClick={() => handleNavClick("devices")}
              label="Connected Devices"
              icon={<Cpu className="h-6 w-6" />}
            />

            <NavButton 
              active={activeSection === "memory"}
              onClick={() => handleNavClick("memory")}
              label="AI Memory"
              icon={<Brain className="h-6 w-6" />}
            />
            
            <NavButton 
              active={activeSection === "settings"}
              onClick={() => handleNavClick("settings")}
              label="Settings"
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
