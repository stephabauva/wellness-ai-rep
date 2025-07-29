import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
        "flex flex-col items-center p-3 text-xs rounded-xl min-h-[48px] min-w-[48px] transition-all duration-300 ease-out hover:scale-105 hover:shadow-md active:scale-95 touch-ripple",
        active 
          ? "text-blue-500 bg-blue-50 dark:bg-blue-500/10" 
          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/80"
      )}
      aria-label={label}
    >
      {icon}
      <span className="mt-1 font-medium">{label}</span>
    </button>
  );
};

const MobileNav: React.FC = () => {
  const { activeSection, setActiveSection } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const toggleNav = useCallback(() => setIsOpen(prev => !prev), []);

  // Listen for custom events to toggle nav from other components
  React.useEffect(() => {
    const handleToggleNav = () => {
      setIsOpen(prev => !prev);
    };

    window.addEventListener('toggleMobileNav', handleToggleNav);
    return () => window.removeEventListener('toggleMobileNav', handleToggleNav);
  }, []);

  const handleNavClick = useCallback((section: "chat" | "health" | "devices" | "memory" | "files" | "settings") => {
    setActiveSection(section);
    setIsOpen(false);
  }, [setActiveSection]);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-700/80 px-4 py-3 shadow-sm safe-area-inset">
      <div className="flex items-center justify-between min-h-[48px]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">WellnessAI</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-all duration-300 ease-out">
            <ThemeToggle />
          </div>
          <button 
            type="button"
            className="p-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 ease-out hover:scale-105 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={toggleNav}
            aria-label="Toggle mobile menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {/* Backdrop - Click to close navigation - rendered to document body */}
      {isOpen && createPortal(
        <div 
          className="fixed inset-0 bg-transparent z-[45]"
          onClick={() => setIsOpen(false)}
        />,
        document.body
      )}

      {/* Mobile Navigation (Hidden by default) */}
      <div className={cn(
        "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl absolute w-full left-0 p-4 border-b border-gray-200/80 dark:border-gray-700/80 shadow-lg transition-all duration-300 ease-out z-50",
        isOpen ? "block" : "hidden"
      )}>
        <nav className="grid grid-cols-6 gap-3">
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
