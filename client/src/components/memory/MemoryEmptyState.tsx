import { Card, CardContent } from "@shared/components/ui/card";
import { Brain } from "lucide-react";

export function MemoryEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <Brain className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No memories yet</h3>
        <p className="text-gray-500 text-center">
          Start chatting with your AI coach to build a personalized memory bank that helps provide better guidance.
        </p>
      </CardContent>
    </Card>
  );
}