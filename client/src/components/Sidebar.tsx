import React from "react";
import { 
  MessageSquare, 
  BarChart3, 
  Cpu, 
  Settings, 
  Zap
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const Sidebar: React.FC = () => {
  const { activeSection, setActiveSection } = useAppContext();

  return (
    <div className="hidden md:flex md:flex-shrink-0">
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
            {/* Chat Icon */}
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("chat");
              }}
              className={cn(
                "nav-icon flex items-center justify-center h-12 w-12 rounded-lg mx-auto",
                activeSection === "chat" && "active"
              )}
            >
              <MessageSquare className="h-6 w-6" />
              <span className="sr-only">Chat</span>
            </a>
            
            {/* Health Data Icon */}
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("health");
              }}
              className={cn(
                "nav-icon flex items-center justify-center h-12 w-12 rounded-lg mx-auto",
                activeSection === "health" && "active"
              )}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="sr-only">Health Data</span>
            </a>
            
            {/* Connected Devices Icon */}
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("devices");
              }}
              className={cn(
                "nav-icon flex items-center justify-center h-12 w-12 rounded-lg mx-auto",
                activeSection === "devices" && "active"
              )}
            >
              <Cpu className="h-6 w-6" />
              <span className="sr-only">Connected Devices</span>
            </a>
            
            {/* Settings Icon */}
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("settings");
              }}
              className={cn(
                "nav-icon flex items-center justify-center h-12 w-12 rounded-lg mx-auto",
                activeSection === "settings" && "active"
              )}
            >
              <Settings className="h-6 w-6" />
              <span className="sr-only">Settings</span>
            </a>
          </nav>
          
          {/* User Profile */}
          <div className="flex-shrink-0 px-2 py-4 space-y-1">
            <button className="flex items-center justify-center h-12 w-12 rounded-full mx-auto bg-muted hover:bg-muted/80 focus:outline-none">
              <span className="text-sm font-medium text-foreground">JS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
