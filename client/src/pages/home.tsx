import React, { useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import ChatSection from "@/components/ChatSection";
import HealthDataSection from "@/components/HealthDataSection";
import ConnectedDevicesSection from "@/components/ConnectedDevicesSection";
import MemorySection from "@/components/MemorySection";
import SettingsSection from "@/components/SettingsSection";
import { useAppContext } from "@/context/AppContext";

const Home: React.FC = () => {
  const { activeSection } = useAppContext();
  
  // Function to render the active section component
  const renderActiveSection = useCallback(() => {
    switch (activeSection) {
      case "chat":
        return <ChatSection />;
      case "health":
        return <HealthDataSection />;
      case "devices":
        return <ConnectedDevicesSection />;
      case "memory":
        return <MemorySection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <ChatSection />; // Default to chat section
    }
  }, [activeSection]);
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 w-0 min-h-0 md:pt-0 pt-12">
        {/* Render active section using the function */}
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default Home;
