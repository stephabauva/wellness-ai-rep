/**
 * Simple Duplicate Memory Modal
 * 
 * Replaces complex toast-based notification with simple modal that's guaranteed to appear on top.
 * No z-index conflicts, no toast competition - just a simple modal dialog.
 * 
 * @used-by memory/MemorySection
 */

import React from "react";
import { Button } from "@shared/components/ui/button";
import { AlertTriangle, X } from "lucide-react";

export interface SimilarMemory {
  id: string;
  content: string;
  similarity: number;
  category: string;
  createdAt?: string;
}

interface SimpleDuplicateModalProps {
  isOpen: boolean;
  newMemoryContent: string;
  newMemoryCategory: string;
  similarMemories: SimilarMemory[];
  onSaveAnyway: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

export function SimpleDuplicateModal({
  isOpen,
  newMemoryContent,
  newMemoryCategory,
  similarMemories,
  onSaveAnyway,
  onReplace,
  onCancel
}: SimpleDuplicateModalProps) {
  if (!isOpen) return null;

  const topSimilarity = Math.max(...similarMemories.map(m => m.similarity));

  return (
    // Fixed overlay - guaranteed to be on top
    <div className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-auto">
        
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold">Similar Memory Found</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          
          {/* Similarity Badge */}
          <div className="text-center">
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
              {Math.round(topSimilarity * 100)}% similar
            </span>
          </div>

          {/* New Memory */}
          <div className="bg-blue-50 p-3 rounded">
            <h3 className="text-sm font-medium text-blue-700 mb-1">New Memory:</h3>
            <p className="text-sm text-blue-800">{newMemoryContent}</p>
            <span className="inline-block mt-2 bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs">
              {newMemoryCategory.replace('_', ' ')}
            </span>
          </div>

          {/* Similar Memory */}
          <div className="bg-amber-50 p-3 rounded">
            <h3 className="text-sm font-medium text-amber-700 mb-1">Similar Memory:</h3>
            <p className="text-sm text-amber-800">{similarMemories[0]?.content}</p>
          </div>

          {/* Question */}
          <div className="text-center py-2">
            <p className="text-sm text-gray-600">
              What would you like to do?
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t space-y-2">
          {/* Primary actions row */}
          <div className="flex gap-2">
            <Button 
              onClick={onSaveAnyway}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Save Anyway
            </Button>
            <Button 
              onClick={onReplace}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Replace
            </Button>
          </div>
          {/* Cancel button */}
          <Button 
            onClick={onCancel}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}