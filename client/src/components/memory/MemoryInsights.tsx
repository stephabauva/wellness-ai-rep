import { useState, useEffect } from "react";
import { Button } from "@shared/components/ui/button";
import { Card } from "@shared/components/ui/card";
import { Collapsible, CollapsibleContent } from "@shared/components/ui/collapsible";
import { Brain, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Lightbulb, Activity, Zap } from "lucide-react";

interface MemoryOverview {
  total: number;
  categories: {
    preferences: number;
    personal_context: number;
    goals: number;
    [key: string]: number;
  };
}

interface ConsolidationMetrics {
  totalConsolidations: number;
  duplicateRate: number;
  qualityScore: number;
  relationshipsDetected: number;
  consolidationEffectiveness: number;
}

interface MemoryInsightsProps {
  memoryOverview: MemoryOverview;
  showInsights: boolean;
  setShowInsights: (show: boolean) => void;
}

export function MemoryInsights({ 
  memoryOverview, 
  showInsights, 
  setShowInsights
}: MemoryInsightsProps) {
  const [consolidationMetrics, setConsolidationMetrics] = useState<ConsolidationMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showInsights && memoryOverview.total > 0) {
      fetchConsolidationMetrics();
    }
  }, [showInsights, memoryOverview.total]);

  const fetchConsolidationMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/memory/consolidation-log/1');
      const data = await response.json();
      if (data.metrics) {
        setConsolidationMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching consolidation metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (memoryOverview.total === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowInsights(!showInsights)}
        className="w-full sm:w-auto h-12 px-4 min-h-[44px]"
      >
        <Brain className="h-4 w-4 mr-2" />
        {showInsights ? 'Hide' : 'Show'} Memory Insights
        {showInsights ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </Button>
      
      <Collapsible open={showInsights} onOpenChange={setShowInsights}>
        <CollapsibleContent>
          <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-purple-800">Memory Insights</h3>
            </div>
            <div className="space-y-3">
              {memoryOverview.total >= 10 && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                  <span className="text-sm text-gray-700">Strong memory foundation established with {memoryOverview.total} stored memories</span>
                </div>
              )}
              
              {memoryOverview.categories.preferences > 0 && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                  <span className="text-sm text-gray-700">Preferences captured: AI understands your workout and lifestyle choices</span>
                </div>
              )}
              
              {memoryOverview.categories.personal_context > 0 && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                  <span className="text-sm text-gray-700">Personal context recorded: Health conditions and limitations noted</span>
                </div>
              )}
              
              {memoryOverview.categories.goals > 0 && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                  <span className="text-sm text-gray-700">Goals defined: Clear targets set for your wellness journey</span>
                </div>
              )}
              
              {memoryOverview.total < 5 && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5 text-amber-600" />
                  <span className="text-sm text-gray-700">Consider adding more memories to improve AI coaching quality</span>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 mt-0.5 text-purple-600" />
                <span className="text-sm text-gray-700">Memory system active: Your AI coach learns and remembers from every conversation</span>
              </div>

              {consolidationMetrics && (
                <>
                  <div className="border-t pt-3 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-800">Memory Performance</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>Quality Score: {Math.round(consolidationMetrics.qualityScore * 100)}%</div>
                      <div>Duplicate Rate: {Math.round(consolidationMetrics.duplicateRate * 100)}%</div>
                    </div>
                  </div>

                  {consolidationMetrics.relationshipsDetected > 0 && (
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 mt-0.5 text-amber-600" />
                      <span className="text-sm text-gray-700">
                        {consolidationMetrics.relationshipsDetected} memory connections found - AI better understands your preferences
                      </span>
                    </div>
                  )}
                </>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Activity className="h-4 w-4 animate-spin" />
                  Loading memory performance...
                </div>
              )}
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}