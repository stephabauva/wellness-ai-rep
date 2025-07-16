import React from "react";
import { CheckCircle, AlertCircle, Trophy, Target, Zap, Droplets } from "lucide-react";
import { useScrollAnimation } from "../../../hooks/useScrollAnimation";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  status: "success" | "warning" | "achievement";
  icon: React.ElementType;
  progress?: number;
}

interface ActivityScrollProps {
  activities?: ActivityItem[];
}

const ActivityScroll: React.FC<ActivityScrollProps> = ({ activities }) => {
  const { elementRef, scrollProgress, isVisible } = useScrollAnimation({
    threshold: 0.2
  });

  const defaultActivities: ActivityItem[] = [
    {
      id: "1",
      title: "Weight Progress",
      description: "Excellent progress, -1.3kg this month",
      status: "success",
      icon: CheckCircle,
      progress: 85
    },
    {
      id: "2",
      title: "Daily Activity",
      description: "Goal regularly achieved",
      status: "success",
      icon: Target,
      progress: 90
    },
    {
      id: "3",
      title: "Sleep Quality",
      description: "Consistently improving",
      status: "success",
      icon: CheckCircle,
      progress: 78
    },
    {
      id: "4",
      title: "Hydration",
      description: "Improve to reach 2.5L/day",
      status: "warning",
      icon: Droplets,
      progress: 60
    },
    {
      id: "5",
      title: "Achievement",
      description: "3 days consecutive deficit",
      status: "achievement",
      icon: Trophy,
      progress: 100
    },
    {
      id: "6",
      title: "Energy Level",
      description: "Morning energy increasing",
      status: "success",
      icon: Zap,
      progress: 82
    }
  ];

  const activityData = activities || defaultActivities;

  const getCardStyles = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800";
      case "warning":
        return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
      case "achievement":
        return "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800";
      default:
        return "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700";
    }
  };

  const getIconStyles = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-amber-600 dark:text-amber-400";
      case "achievement":
        return "text-purple-600 dark:text-purple-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500";
      case "warning":
        return "bg-amber-500";
      case "achievement":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div ref={elementRef} className="mb-6">
      <div 
        className="px-4 mb-4 transition-all duration-700 ease-out"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: `translateY(${isVisible ? 0 : 20}px)`
        }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity & Insights</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your health journey highlights</p>
      </div>
      
      <div 
        className="overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ 
          scrollBehavior: 'smooth',
          transform: `translateX(${(1 - scrollProgress) * 20}px)`,
          transition: 'transform 0.3s ease-out'
        }}
      >
        <div className="flex gap-3 px-4 pb-2" style={{ width: "max-content" }}>
          {activityData.map((activity) => (
            <div
              key={activity.id}
              className={`flex-shrink-0 w-64 p-4 rounded-xl border transition-all duration-300 ease-out
                         transform-gpu will-change-transform cursor-pointer
                         hover:scale-105 hover:shadow-lg hover:-translate-y-1
                         active:scale-95 active:translate-y-0
                         ${getCardStyles(activity.status)}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <activity.icon className={`h-5 w-5 mt-0.5 ${getIconStyles(activity.status)}`} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {activity.description}
                  </p>
                </div>
              </div>
              
              {activity.progress !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {activity.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-700 ease-out ${getProgressColor(activity.status)}`}
                      style={{ width: `${activity.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityScroll;