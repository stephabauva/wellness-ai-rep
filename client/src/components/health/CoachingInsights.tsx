import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Zap } from 'lucide-react'; // Example icons

interface Insight {
  id: string;
  title: string;
  text: string;
  icon?: React.ReactNode; // Optional icon for each insight
}

// Placeholder for static insights, can be replaced by props or fetched data later
const staticInsights: Insight[] = [
  {
    id: 'activity',
    title: 'Activity Assessment',
    text: "You're making good progress with your daily activity. Your step count has increased by 12% this week. Continue aiming for 10,000 steps and try to include at least 30 minutes of moderate exercise.",
    icon: <TrendingUp className="h-6 w-6 text-white" />
  },
  {
    id: 'sleep',
    title: 'Sleep Quality Analysis',
    text: "Your sleep quality has slightly decreased. You're getting enough total sleep but could improve your deep sleep phase. Try to establish a consistent bedtime routine and limit screen time before bed.",
    icon: <Lightbulb className="h-6 w-6 text-white" />
  },
  {
    id: 'heart',
    title: 'Heart Health Update',
    text: "Your resting heart rate remains in a healthy range. Your recovery rate after workouts has improved by 8%, indicating better cardiovascular fitness.",
    icon: <Zap className="h-6 w-6 text-white" /> // Using Zap as a placeholder, Heart icon might be better
  },
];

interface CoachingInsightsProps {
  insights?: Insight[]; // Allow dynamic insights to be passed
}

export const CoachingInsights: React.FC<CoachingInsightsProps> = ({ insights }) => {
  const displayInsights = insights || staticInsights;

  if (!displayInsights || displayInsights.length === 0) {
    return null; // Don't render if no insights
  }

  // Example icon background colors - can be customized or passed with Insight data
  const iconBgColors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-yellow-500',
  ];

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Coaching Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayInsights.map((insight, index) => (
            <div key={insight.id} className="flex items-start sm:items-center">
              <div className={`flex-shrink-0 h-10 w-10 rounded-full ${iconBgColors[index % iconBgColors.length]} flex items-center justify-center mr-4`}>
                {insight.icon || <Lightbulb className="h-6 w-6 text-white" />}
              </div>
              <div className="flex-1">
                <h4 className="text-md sm:text-lg font-medium">{insight.title}</h4>
                <p className="mt-1 text-sm sm:text-base text-muted-foreground">
                  {insight.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
