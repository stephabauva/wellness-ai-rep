import React from "react";
import { Download, Share2, Smartphone, Database, RefreshCw } from "lucide-react";

interface ActionButtonsProps {
  onDownloadReport: () => void;
  onShareReport: () => void;
  onSyncData: () => void;
  onResetData: () => void;
  isLoading: {
    download: boolean;
    share: boolean;
    sync: boolean;
    reset: boolean;
  };
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  variant: "primary" | "secondary" | "success" | "destructive";
  isLoading?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  variant,
  isLoading = false
}) => {
  const getButtonStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      case "secondary":
        return "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200";
      case "success":
        return "bg-green-500 hover:bg-green-600 text-white";
      case "destructive":
        return "bg-red-500 hover:bg-red-600 text-white";
      default:
        return "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all duration-200 ${getButtonStyles()} ${
        isLoading ? "opacity-50 cursor-not-allowed" : "active:scale-95"
      }`}
      style={{ minHeight: "88px" }} // Ensure touch-friendly target size
    >
      {isLoading ? (
        <RefreshCw className="h-5 w-5 animate-spin" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
      <span className="text-sm font-medium text-center leading-tight">
        {label}
      </span>
    </button>
  );
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onDownloadReport,
  onShareReport,
  onSyncData,
  onResetData,
  isLoading
}) => {
  return (
    <div className="px-4 mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your health data</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <ActionButton
          icon={Download}
          label="Download Report"
          onClick={onDownloadReport}
          variant="primary"
          isLoading={isLoading.download}
        />
        
        <ActionButton
          icon={Share2}
          label="Share Report"
          onClick={onShareReport}
          variant="secondary"
          isLoading={isLoading.share}
        />
        
        <ActionButton
          icon={Smartphone}
          label="Sync Data"
          onClick={onSyncData}
          variant="success"
          isLoading={isLoading.sync}
        />
        
        <ActionButton
          icon={Database}
          label="Reset Data"
          onClick={onResetData}
          variant="destructive"
          isLoading={isLoading.reset}
        />
      </div>
    </div>
  );
};

export default ActionButtons;