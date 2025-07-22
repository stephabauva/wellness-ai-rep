import React from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@shared';

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
  title?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  className,
  title = "Upload Files"
}) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "p-4 rounded-full min-h-[56px] min-w-[56px]",
        "bg-gradient-to-r from-blue-500 to-purple-600",
        "text-white shadow-lg",
        "transition-all duration-300 ease-out",
        "transform-gpu will-change-transform",
        "hover:scale-110 hover:shadow-xl hover:from-blue-600 hover:to-purple-700",
        "active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "group",
        className
      )}
      aria-label={title}
    >
      <Upload className="h-6 w-6 transition-transform duration-300 ease-out group-hover:scale-110" />
    </button>
  );
};