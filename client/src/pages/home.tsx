import React from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import ChatSection from "@/components/ChatSection";
import HealthDataSection from "@/components/HealthDataSection";
import ConnectedDevicesSection from "@/components/ConnectedDevicesSection";
import SettingsSection from "@/components/SettingsSection";
import { useAppContext } from "@/context/AppContext";

const Home: React.FC = () => {
  const { activeSection } = useAppContext();
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden md:pt-0 pt-12">
        {/* Render active section */}
        {activeSection === "chat" && <ChatSection />}
        {activeSection === "health" && <HealthDataSection />}
        {activeSection === "devices" && <ConnectedDevicesSection />}
        {activeSection === "settings" && <SettingsSection />}
      </div>
    </div>
  );
};

export default Home;
