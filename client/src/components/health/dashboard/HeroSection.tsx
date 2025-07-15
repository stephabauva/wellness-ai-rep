import React from "react";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";

interface HeroSectionProps {
  wellnessScore?: string;
  timeRange: string;
  totalRecords: number;
}

const HeroSection: React.FC<HeroSectionProps> = ({ 
  wellnessScore = "8.1", 
  timeRange, 
  totalRecords 
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400";
    if (score >= 6) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 8) return TrendingUp;
    if (score >= 6) return TrendingUp;
    return TrendingDown;
  };

  const scoreValue = parseFloat(wellnessScore);
  const ScoreIcon = getScoreIcon(scoreValue);

  return (
    <div className="relative mx-4 mt-4 mb-6 rounded-2xl overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-blue-500 to-purple-600" />
      
      {/* Backdrop Blur Overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/10" />
      
      {/* Content */}
      <div className="relative p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Wellness Score</h2>
            <p className="text-white/80 text-sm">
              Last {timeRange === "7days" ? "7 days" : "30 days"} • {totalRecords} records
            </p>
          </div>
          <div className="p-3 bg-white/20 rounded-full">
            <Trophy className="h-6 w-6" />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold">{wellnessScore}</span>
            <span className="text-xl text-white/80">/10</span>
          </div>
          <ScoreIcon className={`h-6 w-6 ${getScoreColor(scoreValue)}`} />
        </div>
        
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(scoreValue / 10) * 100}%` }}
            />
          </div>
          <span className="text-sm text-white/80 font-medium">
            {scoreValue >= 8 ? "Excellent" : scoreValue >= 6 ? "Good" : "Needs Focus"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;