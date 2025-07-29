/**
 * Duplicate Memory Notification Component
 * 
 * Provides a reusable notification system for duplicate memory detection.
 * Integrates with the toast system to show memory comparison UI and action choices.
 * 
 * @used-by memory/MemorySection
 */

import React from "react";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { AlertTriangle, Eye, Calendar, Target } from "lucide-react";

export interface SimilarMemory {
  id: string;
  content: string;
  similarity: number;
  category: string;
  createdAt?: string;
  importance?: number;
}

export interface DuplicateDetectionResult {
  hasDuplicates: boolean;
  similarMemories: SimilarMemory[];
  processingTime: string;
}

interface DuplicateMemoryNotificationProps {
  /** The new memory content being created */
  newMemoryContent: string;
  /** The category of the new memory */
  newMemoryCategory: string;
  /** Similar memories found by duplicate detection */
  similarMemories: SimilarMemory[];
  /** Callback when user chooses to save the new memory anyway */
  onSaveAnyway: () => void;
  /** Callback when user chooses to cancel the memory creation */
  onCancel: () => void;
  /** Optional: Callback when user wants to view a similar memory in detail */
  onViewSimilar?: (memoryId: string) => void;
  /** Optional: Processing time for performance display */
  processingTime?: string;
}

/**
 * Creates the notification content for duplicate memory detection.
 * Returns the JSX content that can be used in toast notifications.
 */
export function createDuplicateNotificationContent({
  newMemoryContent,
  newMemoryCategory,
  similarMemories,
  onSaveAnyway,
  onCancel,
  onViewSimilar,
  processingTime
}: DuplicateMemoryNotificationProps): React.ReactNode {
  const similarCount = similarMemories.length;
  const topSimilarity = Math.max(...similarMemories.map(m => m.similarity));

  return (
    <div className="space-y-4 max-w-md">
      {/* Header with alert */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-700">
          Similar Memory Found
        </span>
        <Badge variant="secondary" className="text-xs">
          {Math.round(topSimilarity * 100)}% match
        </Badge>
      </div>

      {/* New memory preview */}
      <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
        <div className="text-xs text-blue-600 font-medium mb-1">New Memory:</div>
        <div className="text-sm text-blue-800 line-clamp-2">
          {newMemoryContent.substring(0, 120)}
          {newMemoryContent.length > 120 && "..."}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {newMemoryCategory.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Similar memories list */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-600">
          Similar {similarCount === 1 ? 'Memory' : 'Memories'} ({similarCount}):
        </div>
        {similarMemories.slice(0, 2).map((similar, index) => (
          <Card key={similar.id} className="p-2 bg-amber-50 border border-amber-200">
            <CardContent className="p-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-amber-800 line-clamp-2">
                    {similar.content.substring(0, 100)}
                    {similar.content.length > 100 && "..."}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(similar.similarity * 100)}% similar
                    </Badge>
                    {similar.createdAt && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(similar.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {onViewSimilar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewSimilar(similar.id)}
                    className="h-6 w-6 p-0 shrink-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {similarCount > 2 && (
          <div className="text-xs text-gray-500 text-center">
            +{similarCount - 2} more similar {similarCount - 2 === 1 ? 'memory' : 'memories'}
          </div>
        )}
      </div>

      {/* Performance info (debug) */}
      {processingTime && (
        <div className="text-xs text-gray-400 text-center">
          Detected in {processingTime}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={onSaveAnyway}
          className="flex-1 bg-purple-600 text-white hover:bg-purple-700 h-8"
          size="sm"
        >
          <Target className="h-3 w-3 mr-1" />
          Save Anyway
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 h-8"
          size="sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook for creating duplicate memory notifications with toast integration
 */
export function useDuplicateMemoryNotification() {
  /**
   * Shows a duplicate memory notification using the toast system
   */
  const showDuplicateNotification = (
    props: DuplicateMemoryNotificationProps,
    toast: (options: any) => void
  ) => {
    const notificationContent = createDuplicateNotificationContent(props);
    
    toast({
      title: "🔍 Similar Memory Found!",
      description: notificationContent,
      duration: 30000, // 30 seconds to give user time to review
      className: "max-w-2xl",
      style: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffeaa7',
        color: '#856404',
        border: '2px solid #ffeaa7',
        boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
        zIndex: 9999,
        fontSize: '14px',
        position: 'fixed',
        top: '20px',
        right: '20px',
      },
    });
    
    console.log('🔍 Duplicate memory notification shown');
  };

  return { showDuplicateNotification };
}

/**
 * Utility function to format similarity score for display
 */
export function formatSimilarityScore(similarity: number): string {
  return `${Math.round(similarity * 100)}%`;
}

/**
 * Utility function to determine similarity level for styling
 */
export function getSimilarityLevel(similarity: number): 'low' | 'medium' | 'high' {
  if (similarity >= 0.7) return 'high';
  if (similarity >= 0.4) return 'medium';
  return 'low';
}

/**
 * Utility function to get similarity color class
 */
export function getSimilarityColorClass(similarity: number): string {
  const level = getSimilarityLevel(similarity);
  switch (level) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}