import { Brain, HelpCircle } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";
import { PrivacyBadge } from "../ui/PrivacyBadge";

interface MemoryOverviewHeaderProps {
  // No props needed - this is a static header component
}

export function MemoryOverviewHeader({}: MemoryOverviewHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-600 rounded-lg p-6 text-white mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white/20 rounded-lg">
          <Brain className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">AI Memory</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px] p-2 text-white/70 hover:text-white hover:bg-white/10"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">
              Your AI coach stores important information from your conversations to provide more personalized and effective guidance. All data is encrypted and secure.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-white/90 mb-3">Your AI coach's personalized knowledge about you</p>
      
      {/* Privacy Trust Indicators */}
      <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-white/20">
        <PrivacyBadge 
          variant="encrypted" 
          size="sm" 
          className="bg-white/10 text-white border-white/20 hover:bg-white/20" 
        />
        <PrivacyBadge 
          variant="server-stored" 
          size="sm" 
          className="bg-white/10 text-white border-white/20 hover:bg-white/20" 
        />
        <PrivacyBadge 
          variant="gdpr-compliant" 
          size="sm" 
          className="bg-white/10 text-white border-white/20 hover:bg-white/20" 
        />
        <span className="text-white/70 text-xs ml-2">
          Your health data is protected and secure
        </span>
      </div>
    </div>
  );
}