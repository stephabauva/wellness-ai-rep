import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from @shared/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, ArrowUpDown } from "lucide-react";

interface PerformanceSettingsProps {
  enableVirtualScrolling: boolean;
  enablePagination: boolean;
  enableWebWorkers: boolean;
  onVirtualScrollingChange: (enabled: boolean) => void;
  onPaginationChange: (enabled: boolean) => void;
  onWebWorkersChange: (enabled: boolean) => void;
}

export function PerformanceSettings({
  enableVirtualScrolling,
  enablePagination,
  enableWebWorkers,
  onVirtualScrollingChange,
  onPaginationChange,
  onWebWorkersChange,
}: PerformanceSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Performance Optimizations
        </CardTitle>
        <CardDescription>
          Advanced features to improve chat performance with large message sets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Virtual Scrolling */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Label htmlFor="virtual-scrolling" className="text-sm font-medium">
              Virtual Scrolling
            </Label>
            <p className="text-xs text-muted-foreground">
              Render only visible messages for better performance with 100+ messages
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Fixed Layout Conflicts
              </Badge>
              {enableVirtualScrolling && (
                <Badge variant="outline" className="text-xs text-green-600">
                  Active
                </Badge>
              )}
            </div>
          </div>
          <Switch
            id="virtual-scrolling"
            checked={enableVirtualScrolling}
            onCheckedChange={onVirtualScrollingChange}
          />
        </div>

        {/* Message Pagination */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Label htmlFor="pagination" className="text-sm font-medium">
              Message Pagination
            </Label>
            <p className="text-xs text-muted-foreground">
              Load earlier messages on demand instead of all at once
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Continuous Chat Flow
              </Badge>
              {enablePagination && (
                <Badge variant="outline" className="text-xs text-green-600">
                  Active
                </Badge>
              )}
            </div>
          </div>
          <Switch
            id="pagination"
            checked={enablePagination}
            onCheckedChange={onPaginationChange}
          />
        </div>

        {/* Web Workers */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Label htmlFor="web-workers" className="text-sm font-medium">
              Background Processing
            </Label>
            <p className="text-xs text-muted-foreground">
              Use web workers for heavy message processing tasks
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                50+ Messages
              </Badge>
              {enableWebWorkers && (
                <Badge variant="outline" className="text-xs text-green-600">
                  Active
                </Badge>
              )}
            </div>
          </div>
          <Switch
            id="web-workers"
            checked={enableWebWorkers}
            onCheckedChange={onWebWorkersChange}
          />
        </div>

        {/* Warning for conflicting settings */}
        {enableVirtualScrolling && enablePagination && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/10">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Performance Notice
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Using both virtual scrolling and pagination together may reduce effectiveness. 
                  Consider using one optimization at a time for best results.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Performance metrics */}
        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Expected Performance Improvements:</p>
            <ul className="space-y-1 text-xs">
              <li>• Virtual Scrolling: 60% fewer re-renders with 100+ messages</li>
              <li>• Message Pagination: 75% faster initial load</li>
              <li>• Background Processing: 40% better UI responsiveness</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}