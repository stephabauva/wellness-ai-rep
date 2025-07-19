import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Textarea } from "@shared/components/ui/textarea";
import { TouchSwipeHandler, createDeleteAction, createEditAction } from "../ui/TouchSwipeHandler";
import { CheckCircle, X, Calendar, Eye, Loader2 } from "lucide-react";
import { MemoryEntry, categoryIcons, categoryLabels, categoryColors } from "./constants";
import { MemoryRelationships } from "./MemoryRelationships";

interface MemoryListProps {
  memories: MemoryEntry[];
  isSelectionMode: boolean;
  selectedMemoryIds: Set<string>;
  editingMemoryId: string | null;
  editingMemoryContent: string;
  isEditing: boolean;
  deleteMemoryMutation: { isPending: boolean };
  editMemoryMutation: { isPending: boolean };
  infiniteMemoriesQuery: {
    hasMore: boolean;
    isFetchingNextPage: boolean;
    totalCount: number;
  };
  targetRef: React.RefObject<HTMLDivElement>;
  onToggleMemorySelection: (memoryId: string) => void;
  onDeleteMemory: (memoryId: string) => void;
  onStartEdit: (memoryId: string, content: string) => void;
  onSaveEdit: (memoryId: string) => void;
  onCancelEdit: () => void;
  onEditingContentChange: (content: string) => void;
}

const getImportanceLabel = (score: number) => {
  if (score >= 0.8) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
};

const getImportanceColor = (score: number) => {
  if (score >= 0.8) return "bg-red-100 text-red-800";
  if (score >= 0.5) return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-800";
};

export const MemoryList: React.FC<MemoryListProps> = ({
  memories,
  isSelectionMode,
  selectedMemoryIds,
  editingMemoryId,
  editingMemoryContent,
  isEditing,
  deleteMemoryMutation,
  editMemoryMutation,
  infiniteMemoriesQuery,
  targetRef,
  onToggleMemorySelection,
  onDeleteMemory,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditingContentChange,
}) => {
  const [expandedRelationships, setExpandedRelationships] = useState<Set<string>>(new Set());

  const toggleRelationships = (memoryId: string) => {
    const newExpanded = new Set(expandedRelationships);
    if (newExpanded.has(memoryId)) {
      newExpanded.delete(memoryId);
    } else {
      newExpanded.add(memoryId);
    }
    setExpandedRelationships(newExpanded);
  };
  return (
    <>
      <div className="grid gap-4">
        {memories.map((memory: MemoryEntry) => {
          const isEditingThis = editingMemoryId === memory.id;
          const isSelected = selectedMemoryIds.has(memory.id);
          
          return (
            <TouchSwipeHandler
              key={memory.id}
              leftAction={!isSelectionMode ? createDeleteAction(() => onDeleteMemory(memory.id)) : undefined}
              rightAction={!isSelectionMode ? createEditAction(() => onStartEdit(memory.id, memory.content)) : undefined}
              disabled={isSelectionMode || isEditing || deleteMemoryMutation.isPending || editMemoryMutation.isPending}
              className="mb-2"
            >
              <Card className={`relative bg-gradient-to-r from-purple-50/30 via-pink-50/20 to-indigo-50/30 border-purple-100 hover:shadow-md transition-all touch-manipulation ${
                isSelectionMode && isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''
              }`}>
                <CardHeader className="pb-3 min-h-[44px] py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {isSelectionMode && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleMemorySelection(memory.id)}
                          className="mt-1"
                          aria-label={`Select memory: ${memory.content.substring(0, 50)}...`}
                        />
                      )}
                      {categoryIcons[memory.category as keyof typeof categoryIcons]}
                      <Badge variant="secondary" className={categoryColors[memory.category as keyof typeof categoryColors]}>
                        {categoryLabels[memory.category as keyof typeof categoryLabels]}
                      </Badge>
                      {memory.importanceScore > 0.7 && (
                        <Badge variant="outline" className={getImportanceColor(memory.importanceScore)}>
                          {getImportanceLabel(memory.importanceScore)}
                        </Badge>
                      )}
                    </div>
                    {isEditingThis && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSaveEdit(memory.id)}
                          disabled={editMemoryMutation.isPending}
                          className="hover:bg-green-50 hover:text-green-600 min-h-[44px] min-w-[44px] p-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onCancelEdit}
                          disabled={editMemoryMutation.isPending}
                          className="hover:bg-gray-50 hover:text-gray-600 min-h-[44px] min-w-[44px] p-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  {isEditingThis ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editingMemoryContent}
                        onChange={(e) => onEditingContentChange(e.target.value)}
                        className="min-h-[100px] text-gray-800"
                        placeholder="Edit memory content..."
                        disabled={editMemoryMutation.isPending}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onCancelEdit}
                          disabled={editMemoryMutation.isPending}
                          className="min-h-[44px] px-4"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => onSaveEdit(memory.id)}
                          disabled={editMemoryMutation.isPending || editingMemoryContent.trim() === ""}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 min-h-[44px] px-4"
                        >
                          {editMemoryMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-800 mb-3 leading-relaxed">{memory.content}</p>
                  )}
                  
                  {!isEditingThis && memory.labels && memory.labels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {memory.labels.map((label: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700 font-normal border-purple-200 min-h-[32px] px-2 py-1">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {!isEditingThis && (
                    <MemoryRelationships
                      memoryId={memory.id}
                      memoryContent={memory.content}
                      isOpen={expandedRelationships.has(memory.id)}
                      onToggle={() => toggleRelationships(memory.id)}
                    />
                  )}
                  
                  {!isEditingThis && (
                    <div className="flex justify-between text-xs text-gray-500 pt-3 mt-3 border-t border-purple-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created: {new Date(memory.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Used {memory.accessCount} times
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TouchSwipeHandler>
          );
        })}
      </div>
      
      {/* Infinite scroll trigger */}
      {infiniteMemoriesQuery.hasMore && (
        <div ref={targetRef} className="flex justify-center py-4">
          {infiniteMemoriesQuery.isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more memories...
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Scroll down to load more memories
            </div>
          )}
        </div>
      )}
      
      {/* Performance stats for development */}
      {memories.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
          <div className="text-xs text-gray-600 space-y-1">
            <div>Performance: {memories.length} memories loaded</div>
            <div>Mode: Infinite Scroll</div>
            <div>Total Available: {infiniteMemoriesQuery.totalCount}</div>
            {infiniteMemoriesQuery.hasMore && (
              <div>More available: {infiniteMemoriesQuery.totalCount - memories.length} remaining</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};