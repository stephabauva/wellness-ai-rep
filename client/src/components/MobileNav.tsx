import React, { useState, useCallback } from "react";
import { 
  Menu, 
  MessageSquare, 
  BarChart3, 
  Cpu, 
  Brain,
  Settings, 
  Zap,
  FolderOpen
} from "lucide-react";
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAppContext } from "@shared";
import { cn } from "@shared";

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
        "flex flex-col items-center p-2 text-xs rounded hover:bg-muted",
        active && "text-primary"
      )}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

const MobileNav: React.FC = () => {
  const { activeSection, setActiveSection } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const toggleNav = useCallback(() => setIsOpen(prev => !prev), []);

  const handleNavClick = useCallback((section: "chat" | "health" | "devices" | "memory" | "files" | "settings") => {
    setActiveSection(section);
    setIsOpen(false);
  }, [setActiveSection]);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center mr-2">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-lg">WellnessAI</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button 
            type="button"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none"
            onClick={toggleNav}
            aria-label="Toggle mobile menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation (Hidden by default) */}
      <div className={cn(
        "bg-card absolute w-full left-0 p-4 border-b border-border shadow-lg",
        isOpen ? "block" : "hidden"
      )}>
        <nav className="grid grid-cols-6 gap-2">
          <NavButton 
            active={activeSection === "chat"}
            onClick={() => handleNavClick("chat")}
            label="Chat"
            icon={<MessageSquare className="h-6 w-6" />}
          />
          
          <NavButton 
            active={activeSection === "health"}
            onClick={() => handleNavClick("health")}
            label="Health"
            icon={<BarChart3 className="h-6 w-6" />}
          />
          
          <NavButton 
            active={activeSection === "devices"}
            onClick={() => handleNavClick("devices")}
            label="Devices"
            icon={<Cpu className="h-6 w-6" />}
          />

          <NavButton 
            active={activeSection === "memory"}
            onClick={() => handleNavClick("memory")}
            label="Memory"
            icon={<Brain className="h-6 w-6" />}
          />

          <NavButton 
            active={activeSection === "files"}
            onClick={() => handleNavClick("files")}
            label="Files"
            icon={<FolderOpen className="h-6 w-6" />}
          />
          
          <NavButton 
            active={activeSection === "settings"}
            onClick={() => handleNavClick("settings")}
            label="Settings"
            icon={<Settings className="h-6 w-6" />}
          />
        </nav>
      </div>
    </div>
  );
};

export default MobileNav;
