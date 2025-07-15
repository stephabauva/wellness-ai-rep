import React from "react";
import { TrendingUp } from "lucide-react";

interface MobileHeaderProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ timeRange, onTimeRangeChange }) => {
  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-700">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Health</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your wellness overview</p>
            </div>
          </div>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => onTimeRangeChange("7days")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              timeRange === "7days"
                ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => onTimeRangeChange("30days")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              timeRange === "30days"
                ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            30 days
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;