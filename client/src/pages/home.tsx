import React, { useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import ChatSection from "@/components/ChatSection";
import SimpleHealthDashboard from "@/components/SimpleHealthDashboard";
import ConnectedDevicesSection from "@/components/ConnectedDevicesSection";
import MemorySection from "@/components/MemorySection";
import FileManagerSection from "@/components/FileManagerSection";
import SettingsSection from "@/components/SettingsSection";
import SectionSkeleton from "@/components/SectionSkeleton";
import { useAppContext } from "@shared";

const Home: React.FC = () => {
  const { activeSection, loadedSections } = useAppContext(); // Add loadedSections
  console.log("[Home] Component body execution. activeSection:", activeSection); // Adjusted log
  
  // Memoize section components with conditional rendering based on loaded sections
  const chatSectionComponent = useMemo(() => <ChatSection />, []);
  const healthSectionComponent = useMemo(() => 
    loadedSections.includes('health') ? <SimpleHealthDashboard /> : <SectionSkeleton type="health" />, 
    [loadedSections]
  );
  const devicesSectionComponent = useMemo(() => 
    loadedSections.includes('devices') ? <ConnectedDevicesSection /> : <SectionSkeleton type="devices" />, 
    [loadedSections]
  );
  const memorySectionComponent = useMemo(() => 
    loadedSections.includes('memory') ? <MemorySection /> : <SectionSkeleton type="memory" />, 
    [loadedSections]
  );
  const filesSectionComponent = useMemo(() => 
    loadedSections.includes('files') ? <FileManagerSection /> : <SectionSkeleton type="files" />, 
    [loadedSections]
  );
  const settingsSectionComponent = useMemo(() => 
    loadedSections.includes('settings') ? <SettingsSection /> : <SectionSkeleton type="settings" />, 
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
        <div style={{ display: activeSection === 'health' ? 'block' : 'none', flexGrow: 1, height: '100%', overflowY: 'auto' }}>
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
