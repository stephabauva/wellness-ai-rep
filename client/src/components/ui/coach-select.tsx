import React from "react";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { CoachingMode, coachingModes } from "@shared/schema";

interface CoachSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

const coachLabels: Record<CoachingMode, string> = {
  'weight-loss': 'Weight Loss Coach',
  'muscle-gain': 'Muscle Gain Coach',
  'fitness': 'Fitness Coach',
  'mental-wellness': 'Mental Wellness Coach',
  'nutrition': 'Nutrition Coach'
};

export const CoachSelect: React.FC<CoachSelectProps> = ({ value, onValueChange }) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px] bg-muted border-0 text-foreground">
        <SelectValue placeholder="Select coaching mode" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Coaching Mode</SelectLabel>
          {coachingModes.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {coachLabels[mode]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
