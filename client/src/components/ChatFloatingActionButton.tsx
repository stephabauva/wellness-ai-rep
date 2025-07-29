import React, { useState } from 'react';
import { Plus, MessageSquare, History, Menu, X, Paperclip, Camera } from 'lucide-react';
import { useAppContext } from "@shared";

interface ChatFloatingActionButtonProps {
  onNewChat?: () => void;
  onOpenHistory?: () => void;
  isHistoryOpen?: boolean;
  onOpenFileUpload?: () => void;
  onOpenCamera?: () => void;
}

const ChatFloatingActionButton: React.FC<ChatFloatingActionButtonProps> = ({ 
  onNewChat, 
  onOpenHistory,
  isHistoryOpen = false,
  onOpenFileUpload,
  onOpenCamera
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { setActiveSection } = useAppContext();

  const quickActions = [
    {
      icon: MessageSquare,
      label: 'New Chat',
      action: 'new-chat',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => {
        onNewChat?.();
        setIsExpanded(false);
      }
    },
    {
      icon: History,
      label: 'History',
      action: 'history',
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => {
        onOpenHistory?.();
        setIsExpanded(false);
      }
    },
    {
      icon: Paperclip,
      label: 'File Upload',
      action: 'file-upload',
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => {
        onOpenFileUpload?.();
        setIsExpanded(false);
      }
    },
    {
      icon: Camera,
      label: 'Camera',
      action: 'camera',
      color: 'bg-teal-500 hover:bg-teal-600',
      onClick: () => {
        onOpenCamera?.();
        setIsExpanded(false);
      }
    },
    {
      icon: Menu,
      label: 'Navigation',
      action: 'navigation',
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => {
        // Trigger mobile nav menu to open
        window.dispatchEvent(new CustomEvent('toggleMobileNav'));
        setIsExpanded(false);
      }
    }
  ];

  const handleQuickAction = (action: any) => {
    action.onClick();
  };

  // Hide the floating action button when history modal is open
  if (isHistoryOpen) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-24 right-6 z-50">
      {/* Quick Action Buttons */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 space-y-3 mb-2">
          {quickActions.map((action, index) => (
            <div
              key={action.action}
              className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm text-gray-900 dark:text-white px-3 py-2 rounded-xl text-sm font-medium shadow-lg border border-gray-200/80 dark:border-gray-700/80 whitespace-nowrap">
                {action.label}
              </span>
              <button
                onClick={() => handleQuickAction(action)}
                className={`p-3 rounded-full ${action.color} text-white shadow-lg transition-all duration-300 ease-out
                           hover:scale-110 active:scale-95 transform-gpu will-change-transform min-h-[48px] min-w-[48px] flex items-center justify-center`}
              >
                <action.icon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-4 rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 text-white shadow-lg 
                   transition-all duration-300 ease-out transform-gpu will-change-transform
                   hover:scale-110 hover:shadow-xl active:scale-95 min-h-[56px] min-w-[56px] flex items-center justify-center
                   ${isExpanded ? 'rotate-45' : 'rotate-0'}`}
      >
        {isExpanded ? (
          <X className="h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </button>

      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 animate-in fade-in duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default ChatFloatingActionButton;