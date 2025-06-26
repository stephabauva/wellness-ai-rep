import React, { useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import ChatSection from "@/components/ChatSection";
import HealthDataSection from "@/components/HealthDataSection";
import ConnectedDevicesSection from "@/components/ConnectedDevicesSection";
import MemorySection from "@/components/MemorySection";
import FileManagerSection from "@/components/FileManagerSection";
import SettingsSection from "@/components/SettingsSection";
import { useAppContext } from "@/context/AppContext";

const Home: React.FC = () => {
  const { activeSection, loadedSections } = useAppContext(); // Add loadedSections
  console.log("[Home] Component body execution. activeSection:", activeSection); // Adjusted log
  
  // Memoize section components with conditional rendering based on loaded sections
  const chatSectionComponent = useMemo(() => <ChatSection />, []);
  const healthSectionComponent = useMemo(() => 
    loadedSections.includes('health') ? <HealthDataSection /> : <div className="flex items-center justify-center h-full text-gray-500">Loading health data...</div>, 
    [loadedSections]
  );
  const devicesSectionComponent = useMemo(() => 
    loadedSections.includes('devices') ? <ConnectedDevicesSection /> : <div className="flex items-center justify-center h-full text-gray-500">Loading devices...</div>, 
    [loadedSections]
  );
  const memorySectionComponent = useMemo(() => 
    loadedSections.includes('memory') ? <MemorySection /> : <div className="flex items-center justify-center h-full text-gray-500">Loading memories...</div>, 
    [loadedSections]
  );
  const filesSectionComponent = useMemo(() => 
    loadedSections.includes('files') ? <FileManagerSection /> : <div className="flex items-center justify-center h-full text-gray-500">Loading files...</div>, 
    [loadedSections]
  );
  const settingsSectionComponent = useMemo(() => 
    loadedSections.includes('settings') ? <SettingsSection /> : <div className="flex items-center justify-center h-full text-gray-500">Loading settings...</div>, 
    [loadedSections]
  );

  // renderActiveSection function is removed
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 w-0 min-h-0 md:pt-0 pt-12">
        {/* Render all sections, control visibility with display style */}
        <div style={{ display: activeSection === 'chat' ? 'flex' : 'none', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
          {chatSectionComponent}
        </div>
        <div style={{ display: activeSection === 'health' ? 'flex' : 'none', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
          {healthSectionComponent}
        </div>
        <div style={{ display: activeSection === 'devices' ? 'flex' : 'none', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
          {devicesSectionComponent}
        </div>
        <div style={{ display: activeSection === 'memory' ? 'flex' : 'none', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
          {memorySectionComponent}
        </div>
        <div style={{ display: activeSection === 'files' ? 'flex' : 'none', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
          {filesSectionComponent}
        </div>
        <div style={{ display: activeSection === 'settings' ? 'flex' : 'none', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
          {settingsSectionComponent}
        </div>
        {/*
          If AppContext guarantees activeSection is always one of the known valid sections (and defaults to 'chat'),
          no explicit default rendering for "unrecognized activeSection" is needed here.
          The original switch defaulted to ChatSection. If AppContext.activeSection can be something else
          unexpectedly, and ChatSection should appear, the display logic for ChatSection would need:
          display: (activeSection === 'chat' || !['health', 'devices', 'memory', 'files', 'settings'].includes(activeSection)) ? 'flex' : 'none'
          For now, assuming AppContext handles default correctly.
        */}
      </div>
    </div>
  );
};

export default Home;
