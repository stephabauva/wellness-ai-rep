import React, { useState } from "react";
import { 
  Menu, 
  MessageSquare, 
  BarChart3, 
  Cpu, 
  Settings, 
  Zap 
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const MobileNav: React.FC = () => {
  const { activeSection, setActiveSection } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const toggleNav = () => setIsOpen(!isOpen);

  const handleNavClick = (section: "chat" | "health" | "devices" | "settings") => {
    // Using a closure to properly handle click events
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveSection(section);
      setIsOpen(false);
    };
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-card border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center mr-2">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg">WellnessAI</span>
        </div>
        <button 
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none"
          onClick={toggleNav}
          aria-label="Toggle mobile menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>
      
      {/* Mobile Navigation (Hidden by default) */}
      <div className={cn(
        "bg-card absolute w-full left-0 p-4 border-b border-border shadow-lg",
        isOpen ? "block" : "hidden"
      )}>
        <nav className="grid grid-cols-4 gap-2">
          <button 
            onClick={handleNavClick("chat")}
            className={cn(
              "flex flex-col items-center p-2 text-xs rounded hover:bg-muted",
              activeSection === "chat" && "text-primary"
            )}
          >
            <MessageSquare className="h-6 w-6" />
            <span>Chat</span>
          </button>
          <button 
            onClick={handleNavClick("health")}
            className={cn(
              "flex flex-col items-center p-2 text-xs rounded hover:bg-muted",
              activeSection === "health" && "text-primary"
            )}
          >
            <BarChart3 className="h-6 w-6" />
            <span>Health</span>
          </button>
          <button 
            onClick={handleNavClick("devices")}
            className={cn(
              "flex flex-col items-center p-2 text-xs rounded hover:bg-muted",
              activeSection === "devices" && "text-primary"
            )}
          >
            <Cpu className="h-6 w-6" />
            <span>Devices</span>
          </button>
          <button 
            onClick={handleNavClick("settings")}
            className={cn(
              "flex flex-col items-center p-2 text-xs rounded hover:bg-muted",
              activeSection === "settings" && "text-primary"
            )}
          >
            <Settings className="h-6 w-6" />
            <span>Settings</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default MobileNav;
