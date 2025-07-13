import React, { useState } from "react";
import { Plus, Settings, Link2Off } from "lucide-react";
import { DeviceCard } from "@/components/ui/device-card";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Switch } from "@shared/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@shared";
import { useToast } from "@shared/components/ui/use-toast";
import { Skeleton } from "@shared/components/ui/skeleton";

const ConnectedDevicesSection: React.FC = () => {
  const { toast } = useToast();
  
  // Fetch connected devices
  const { data: devices, isLoading: loadingDevices } = useQuery({
    queryKey: ['/api/devices'],
    queryFn: async () => {
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      return await response.json();
    }
  });
  
  // Device connection mutation
  const connectDeviceMutation = useMutation({
    mutationFn: async (deviceData: {deviceName: string, deviceType: string}) => {
      return apiRequest('POST', '/api/devices', deviceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({
        title: "Device connected",
        description: "The device has been successfully connected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to connect the device. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Device disconnection mutation
  const disconnectDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      return apiRequest('DELETE', `/api/devices/${deviceId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({
        title: "Device disconnected",
        description: "The device has been successfully disconnected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect the device. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Update device settings mutation
  const updateDeviceSettingsMutation = useMutation({
    mutationFn: async ({deviceId, settings}: {deviceId: number, settings: any}) => {
      return apiRequest('PATCH', `/api/devices/${deviceId}`, { settings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      toast({
        title: "Settings updated",
        description: "Device settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update device settings. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const handleConnectDevice = (deviceType: string, deviceName: string) => {
    connectDeviceMutation.mutate({ deviceType, deviceName });
  };
  
  const handleDisconnectDevice = (deviceId: number) => {
    disconnectDeviceMutation.mutate(deviceId);
  };
  
  const handleUpdatePermission = (permissionKey: string, value: boolean) => {
    // In a real app, this would update the user's permission settings
    toast({
      title: "Permission updated",
      description: `${permissionKey} permission has been ${value ? 'enabled' : 'disabled'}.`,
    });
  };

  // Available devices data
  const availableDevices = [
    {
      id: 'heart-rate',
      name: 'Heart Rate Monitor',
      type: 'heart-rate',
      description: 'Track heart rate zones with enhanced accuracy',
      icon: 'heart'
    },
    {
      id: 'fitness',
      name: 'FitPro Tracker',
      type: 'fitness-tracker',
      description: 'All-day activity tracking with app integration',
      icon: 'activity'
    },
    {
      id: 'bp',
      name: 'BP Monitor Pro',
      type: 'bp-monitor',
      description: 'Track blood pressure and heart health data',
      icon: 'shield'
    }
  ];
  
  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Connected Devices</h1>
            <Button className="mt-4 md:mt-0" onClick={() => toast({ title: "Add Device", description: "Device connection modal would open here." })}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Device
            </Button>
          </div>

          {/* Connected Devices */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Active Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {loadingDevices ? (
                  // Loading state
                  <>
                    <Skeleton className="h-[100px] w-full" />
                    <Skeleton className="h-[100px] w-full" />
                  </>
                ) : devices && devices.length > 0 ? (
                  // Connected devices list
                  devices.map((device: any) => (
                    <DeviceCard
                      key={device.id}
                      name={device.deviceName}
                      type={device.deviceType}
                      connectedSince={device.createdAt ? new Date(device.createdAt) : new Date()}
                      lastSync={device.lastSync ? new Date(device.lastSync) : undefined}
                      features={device.metadata?.features || []}
                      onDisconnect={() => handleDisconnectDevice(device.id)}
                      onSettings={() => toast({ title: "Settings", description: `Settings for ${device.deviceName} would open here.` })}
                    />
                  ))
                ) : (
                  // No devices state
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No devices connected yet. Connect a device to start tracking your health data.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Available Devices */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Available Devices</CardTitle>
              <CardDescription>Discover compatible devices to enhance your wellness journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableDevices.map((device) => (
                  <div key={device.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted mx-auto mb-4">
                      {device.icon === 'heart' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                      {device.icon === 'activity' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )}
                      {device.icon === 'shield' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      )}
                    </div>
                    <h4 className="text-lg font-medium text-center">{device.name}</h4>
                    <p className="mt-2 text-sm text-muted-foreground text-center">{device.description}</p>
                    <Button 
                      className="mt-4 w-full" 
                      onClick={() => handleConnectDevice(device.type, device.name)}
                      disabled={connectDeviceMutation.isPending}
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Data Permissions */}
          <Card>
            <CardHeader>
              <CardTitle>Data Permissions</CardTitle>
              <CardDescription>Manage how your device data is used</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                <li className="py-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-md font-medium">Share activity data with coach</h4>
                    <p className="text-sm text-muted-foreground">Allow your AI coach to access activity metrics</p>
                  </div>
                  <div className="flex items-center">
                    <Switch 
                      defaultChecked={true} 
                      onCheckedChange={(checked) => handleUpdatePermission('activity', checked)}
                    />
                  </div>
                </li>
                <li className="py-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-md font-medium">Share sleep data with coach</h4>
                    <p className="text-sm text-muted-foreground">Allow your AI coach to access sleep metrics</p>
                  </div>
                  <div className="flex items-center">
                    <Switch 
                      defaultChecked={true} 
                      onCheckedChange={(checked) => handleUpdatePermission('sleep', checked)}
                    />
                  </div>
                </li>
                <li className="py-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-md font-medium">Share weight data with coach</h4>
                    <p className="text-sm text-muted-foreground">Allow your AI coach to access weight metrics</p>
                  </div>
                  <div className="flex items-center">
                    <Switch 
                      defaultChecked={true} 
                      onCheckedChange={(checked) => handleUpdatePermission('weight', checked)}
                    />
                  </div>
                </li>
                <li className="py-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-md font-medium">Include data in progress reports</h4>
                    <p className="text-sm text-muted-foreground">Allow device data to be included in PDF reports</p>
                  </div>
                  <div className="flex items-center">
                    <Switch 
                      defaultChecked={true} 
                      onCheckedChange={(checked) => handleUpdatePermission('reports', checked)}
                    />
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConnectedDevicesSection;
