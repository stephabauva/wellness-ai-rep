/**
 * Native Health Integration Component - Phase 2 Implementation
 * Provides real native health data access with full synchronization capabilities
 * Part of the Capacitor Mobile Health Data Integration Plan
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Smartphone, 
  Upload, 
  Shield, 
  Activity, 
  Heart, 
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  RefreshCw,
  Clock
} from "lucide-react";
import { PlatformDetectionService, Platform, PlatformCapabilities } from "@/services/platform-detection";
import { nativeHealthService, HealthPermissions, HealthSyncResult, HealthDataQuery } from "@/services/native-health-service";

interface NativeHealthIntegrationProps {
  onDataImported?: (result: HealthSyncResult) => void;
  onError?: (error: string) => void;
}

export function NativeHealthIntegration({ onDataImported, onError }: NativeHealthIntegrationProps) {
  const [platform, setPlatform] = useState<Platform>('web');
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [permissions, setPermissions] = useState<HealthPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [supportedDataTypes, setSupportedDataTypes] = useState<string[]>([]);
  const [providerInfo, setProviderInfo] = useState<any>(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);
  const [lastSyncResult, setLastSyncResult] = useState<HealthSyncResult | null>(null);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  useEffect(() => {
    initializePlatformInfo();
  }, []);

  const initializePlatformInfo = async () => {
    try {
      // Get platform information
      const currentPlatform = PlatformDetectionService.getPlatform();
      const currentCapabilities = PlatformDetectionService.getCapabilities();
      
      setPlatform(currentPlatform);
      setCapabilities(currentCapabilities);

      // Log platform info for debugging
      PlatformDetectionService.logPlatformInfo();

      // Get provider information
      const info = nativeHealthService.getProviderInfo();
      setProviderInfo(info);

      // Check if native health is available
      const isAvailable = await nativeHealthService.isAvailable();
      if (isAvailable) {
        // Check current permissions
        const currentPermissions = await nativeHealthService.checkPermissions();
        setPermissions(currentPermissions);

        // Get supported data types
        const dataTypes = await nativeHealthService.getSupportedDataTypes();
        setSupportedDataTypes(dataTypes);
      }
    } catch (error) {
      console.error('[NativeHealthIntegration] Initialization error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to initialize native health service');
    }
  };

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      const dataTypes = supportedDataTypes.slice(0, 5); // Request core data types
      const result = await nativeHealthService.requestPermissions(dataTypes);
      setPermissions(result);
      
      if (result.granted) {
        // Permissions granted, could trigger initial sync
        console.log('[NativeHealthIntegration] Permissions granted:', result);
      }
    } catch (error) {
      console.error('[NativeHealthIntegration] Permission request error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to request permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const performTestSync = async () => {
    setIsLoading(true);
    setSyncProgress(0);
    
    try {
      // Simulate progress during test sync
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 20, 90));
      }, 500);

      const result = await nativeHealthService.testSync();
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      
      onDataImported?.(result);
      
      if (!result.success) {
        onError?.(result.errors.join(', '));
      }
    } catch (error) {
      setSyncProgress(0);
      console.error('[NativeHealthIntegration] Test sync error:', error);
      onError?.(error instanceof Error ? error.message : 'Test sync failed');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncProgress(0), 2000);
    }
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case 'ios':
        return <Smartphone className="h-5 w-5 text-blue-500" />;
      case 'android':
        return <Smartphone className="h-5 w-5 text-green-500" />;
      default:
        return <Upload className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (hasAccess: boolean) => {
    if (hasAccess) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getHealthProviders = () => {
    return PlatformDetectionService.getHealthProviders();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getPlatformIcon()}
          Native Health Data Integration
          <Badge variant={capabilities?.healthDataAccess ? "default" : "secondary"}>
            Phase 1
          </Badge>
        </CardTitle>
        <CardDescription>
          Direct access to device health data with file upload fallback
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Platform Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Platform Information
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Platform:</span>
              <span className="ml-2 font-medium capitalize">{platform}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Native Access:</span>
              {getStatusIcon(capabilities?.healthDataAccess || false)}
            </div>
            <div>
              <span className="text-muted-foreground">Providers:</span>
              <span className="ml-2">{getHealthProviders().join(', ')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Background Sync:</span>
              {getStatusIcon(capabilities?.backgroundSync || false)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Capabilities Status */}
        {capabilities && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Device Capabilities
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(capabilities).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </span>
                  <Badge variant={value ? "default" : "secondary"} className="text-xs">
                    {value ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Native Health Access */}
        {capabilities?.healthDataAccess ? (
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Native Health Access
            </h4>
            
            {permissions ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Permissions Status:</span>
                  <Badge variant={permissions.granted ? "default" : "destructive"}>
                    {permissions.granted ? 'Granted' : 'Not Granted'}
                  </Badge>
                </div>
                
                {supportedDataTypes.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Supported Data Types:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {supportedDataTypes.map(type => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {!permissions.granted && (
                    <Button 
                      onClick={requestPermissions}
                      disabled={isLoading}
                      size="sm"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Request Permissions
                    </Button>
                  )}
                  
                  <Button 
                    onClick={performTestSync}
                    disabled={isLoading || !permissions.granted}
                    variant="outline"
                    size="sm"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Test Sync
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={requestPermissions} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                Initialize Native Access
              </Button>
            )}
            
            {syncProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sync Progress</span>
                  <span>{syncProgress}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Native health data access is not available on this platform. 
              File upload remains available as the primary data import method.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* File Upload Fallback */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            File Upload (Always Available)
          </h4>
          <p className="text-sm text-muted-foreground">
            Upload health data files from Apple Health, Google Fit, or other sources. 
            This method works on all platforms and serves as the primary import method.
          </p>
          <Badge variant="default" className="text-xs">
            Supports: Apple Health XML, Google Fit JSON, CDA XML, CSV
          </Badge>
        </div>

        {/* Debug Information */}
        {providerInfo && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Debug Information
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
              {JSON.stringify(providerInfo, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}