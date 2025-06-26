import React, { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  change?: number;
  goalValue?: string | number;
  progress?: number;
  startValue?: string;
  status?: string;
  statusColor?: 'green' | 'yellow' | 'red';
  icon?: ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  change,
  goalValue,
  progress,
  startValue,
  status,
  statusColor = 'green',
  icon
}) => {
  return (
    <div className="bg-card rounded-lg shadow p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="mt-1 text-xl font-semibold text-foreground">
            {value}
            {unit && <span className="ml-1 text-lg">{unit}</span>}
          </h3>
        </div>
        {(change !== undefined || status) && (
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            status ? (
              statusColor === 'green' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
              statusColor === 'yellow' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            ) : (
              change !== undefined && change > 0 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
              change !== undefined && change < 0 ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
              "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            )
          )}>
            {change !== undefined ? (
              <>
                {change > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {Math.abs(change)}%
              </>
            ) : status}
          </span>
        )}
      </div>
      
      {progress !== undefined && goalValue && (
        <div className="mt-4">
          <div className="w-full bg-muted rounded-full h-2.5">
            <div 
              className="bg-primary h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex justify-between">
            <span>Goal: {goalValue}</span>
            <span>{progress}% complete</span>
          </div>
        </div>
      )}
      
      {!progress && startValue && goalValue && (
        <div className="mt-4">
          <div className="flex items-end space-x-1">
            {/* Weight trend */}
            <div className="w-1/7 bg-muted rounded-t h-8"></div>
            <div className="w-1/7 bg-muted rounded-t h-7"></div>
            <div className="w-1/7 bg-border rounded-t h-6"></div>
            <div className="w-1/7 bg-border rounded-t h-7"></div>
            <div className="w-1/7 bg-border/80 rounded-t h-5"></div>
            <div className="w-1/7 bg-border/80 rounded-t h-4"></div>
            <div className="w-1/7 bg-primary rounded-t h-3"></div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex justify-between">
            <span>Start: {startValue}</span>
            <span>Goal: {goalValue}</span>
          </div>
        </div>
      )}
      
      {!progress && !startValue && !goalValue && value !== "N/A" && (
        <div className="mt-4">
          <div className="flex items-end space-x-1">
            {/* Mini chart representation - only show when there's actual data */}
            <div className="w-1/12 bg-muted rounded-t h-4"></div>
            <div className="w-1/12 bg-muted rounded-t h-6"></div>
            <div className="w-1/12 bg-muted rounded-t h-8"></div>
            <div className="w-1/12 bg-muted rounded-t h-5"></div>
            <div className="w-1/12 bg-muted rounded-t h-7"></div>
            <div className="w-1/12 bg-secondary/60 rounded-t h-10"></div>
            <div className="w-1/12 bg-secondary/80 rounded-t h-12"></div>
            <div className="w-1/12 bg-secondary/80 rounded-t h-10"></div>
            <div className="w-1/12 bg-secondary rounded-t h-8"></div>
            <div className="w-1/12 bg-secondary/60 rounded-t h-6"></div>
            <div className="w-1/12 bg-muted rounded-t h-5"></div>
            <div className="w-1/12 bg-muted rounded-t h-3"></div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex justify-between">
            <span>6:00 AM</span>
            <span>6:00 PM</span>
          </div>
        </div>
      )}
    </div>
  );
};
