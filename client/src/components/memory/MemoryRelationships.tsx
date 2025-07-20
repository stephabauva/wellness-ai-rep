import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { ChevronDown, ChevronUp, Link, Brain, Zap, ArrowRight } from "lucide-react";
import { apiRequest } from "@shared";

interface MemoryRelationship {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationshipType: 'contradicts' | 'supports' | 'elaborates' | 'supersedes' | 'related';
  strength: number;
  confidence: number;
  metadata?: any;
}

interface AtomicFact {
  id: string;
  factContent: string;
  factType: string;
  confidence: number;
}

interface MemoryRelationshipsProps {
  memoryId: string;
  memoryContent: string;
  isOpen: boolean;
  onToggle: () => void;
}

const relationshipIcons = {
  contradicts: '❌',
  supports: '✅',
  elaborates: '📝',
  supersedes: '🔄',
  related: '🔗'
};

const relationshipColors = {
  contradicts: 'bg-red-100 text-red-800 border-red-200',
  supports: 'bg-green-100 text-green-800 border-green-200',
  elaborates: 'bg-blue-100 text-blue-800 border-blue-200',
  supersedes: 'bg-orange-100 text-orange-800 border-orange-200',
  related: 'bg-gray-100 text-gray-800 border-gray-200'
};

export function MemoryRelationships({ memoryId, memoryContent, isOpen, onToggle }: MemoryRelationshipsProps) {
  const { data: relationshipData, isLoading } = useQuery({
    queryKey: ['memory-relationships', memoryId],
    queryFn: async () => {
      const response = await apiRequest(`/api/memory/relationships/${memoryId}`, 'GET');
      return response as { relationships: MemoryRelationship[], atomicFacts: AtomicFact[] };
    },
    enabled: isOpen && !!memoryId
  });

  const relationships = relationshipData?.relationships || [];
  const atomicFacts = relationshipData?.atomicFacts || [];

  if (relationships.length === 0 && atomicFacts.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 px-2 text-xs"
            onClick={onToggle}
          >
            <div className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              <span>Memory Connections ({relationships.length + atomicFacts.length})</span>
            </div>
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="border-dashed border-gray-300">
            <CardContent className="p-3 space-y-3">
              {isLoading && (
                <div className="text-xs text-gray-500 text-center py-2">
                  Loading relationships...
                </div>
              )}

              {/* Atomic Facts Section */}
              {atomicFacts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-purple-600" />
                    <span className="text-xs font-medium text-gray-700">Key Facts</span>
                  </div>
                  <div className="space-y-1">
                    {atomicFacts.slice(0, 3).map(fact => (
                      <div key={fact.id} className="flex items-start gap-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs px-1 py-0 bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {fact.factType}
                        </Badge>
                        <span className="text-xs text-gray-600 leading-tight">
                          {fact.factContent}
                        </span>
                        <span className="text-xs text-gray-400">
                          {Math.round(fact.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                    {atomicFacts.length > 3 && (
                      <div className="text-xs text-gray-400 pl-2">
                        +{atomicFacts.length - 3} more facts
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Relationships Section */}
              {relationships.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Link className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium text-gray-700">Related Memories</span>
                  </div>
                  <div className="space-y-1">
                    {relationships.slice(0, 3).map(rel => (
                      <div key={rel.id} className="flex items-center gap-2">
                        <Badge 
                          className={`text-xs px-2 py-0 ${relationshipColors[rel.relationshipType]}`}
                        >
                          {relationshipIcons[rel.relationshipType]} {rel.relationshipType}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <ArrowRight className="h-3 w-3" />
                          <span>Memory {rel.targetMemoryId.slice(-4)}</span>
                          <span className="text-gray-400">
                            ({Math.round(rel.confidence * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                    {relationships.length > 3 && (
                      <div className="text-xs text-gray-400 pl-2">
                        +{relationships.length - 3} more connections
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                  Memory graph analysis active - {relationships.length} connections, {atomicFacts.length} facts
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}