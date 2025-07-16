import React, { useState } from 'react';
import { Plus, Heart, Activity, Scale, Moon, X } from 'lucide-react';

interface FloatingActionButtonProps {
  onQuickAction?: (action: string) => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onQuickAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions = [
    {
      icon: Heart,
      label: 'Log Weight',
      action: 'weight',
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      icon: Activity,
      label: 'Log Activity',
      action: 'activity',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: Moon,
      label: 'Log Sleep',
      action: 'sleep',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      icon: Scale,
      label: 'Quick Weigh',
      action: 'quick-weight',
      color: 'bg-blue-500 hover:bg-blue-600'
    }
  ];

  const handleQuickAction = (action: string) => {
    onQuickAction?.(action);
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Quick Action Buttons */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 space-y-3 mb-2">
          {quickActions.map((action, index) => (
            <div
              key={action.action}
              className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                {action.label}
              </span>
              <button
                onClick={() => handleQuickAction(action.action)}
                className={`p-3 rounded-full ${action.color} text-white shadow-lg transition-all duration-300 ease-out
                           hover:scale-110 active:scale-95 transform-gpu will-change-transform`}
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
        className={`p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg 
                   transition-all duration-300 ease-out transform-gpu will-change-transform
                   hover:scale-110 hover:shadow-xl active:scale-95
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

export default FloatingActionButton;