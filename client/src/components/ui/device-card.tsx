import React from "react";
import { Settings as SettingsIcon, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@shared";
import { formatDistanceToNow } from "date-fns";

interface DeviceCardProps {
  name: string;
  type: string;
  connectedSince: Date;
  lastSync?: Date;
  features?: string[];
  onDisconnect: () => void;
  onSettings: () => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  name,
  type,
  connectedSince,
  lastSync,
  features = [],
  onDisconnect,
  onSettings
}) => {
  // Icon based on device type
  const renderIcon = () => {
    switch (type) {
      case 'smartwatch':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'scale':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-4 p-4 bg-muted rounded-full">
        {renderIcon()}
      </div>
      <div className="md:flex-1">
        <h4 className="text-lg font-medium text-foreground">{name}</h4>
        <p className="mt-1 text-sm text-muted-foreground">Connected since: {formatDistanceToNow(connectedSince, { addSuffix: true })}</p>
        <div className="mt-2 flex items-center">
          <div className={cn(
            "flex-shrink-0 h-2.5 w-2.5 rounded-full mr-2",
            lastSync ? "bg-green-500" : "bg-yellow-500"
          )}></div>
          <p className={cn(
            "text-sm",
            lastSync ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"
          )}>
            {lastSync 
              ? `Connected • Last sync: ${formatDistanceToNow(lastSync, { addSuffix: true })}` 
              : "Not synced yet"}
          </p>
        </div>
        {features.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <Badge key={index} variant="outline" className="bg-primary/10 hover:bg-primary/20">
                {feature}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 mt-4 md:mt-0 md:ml-4 space-x-2">
        <Button variant="outline" size="sm" onClick={onSettings}>
          <SettingsIcon className="h-4 w-4 mr-1" />
          Settings
        </Button>
        <Button variant="outline" size="sm" onClick={onDisconnect}>
          <Link2Off className="h-4 w-4 mr-1" />
          Disconnect
        </Button>
      </div>
    </div>
  );
};
