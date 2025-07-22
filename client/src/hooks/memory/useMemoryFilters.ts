import { useState, useMemo } from "react";
import { MemoryEntry } from "../../components/memory/constants";

interface MemoryFiltersState {
  selectedCategory: string;
  selectedLabels: Set<string>;
  isSelectionMode: boolean;
  selectedMemoryIds: Set<string>;
  showAllCategories: boolean;
}

interface MemoryFiltersResult extends MemoryFiltersState {
  // Category management
  handleCategoryChange: (category: string) => void;
  setRefetchCallback: (callback: () => void) => void;
  
  // Label management  
  availableLabels: Array<{ label: string; count: number }>;
  handleLabelToggle: (label: string) => void;
  handleSelectAllLabels: () => void;
  
  // Selection mode management
  handleToggleSelectionMode: () => void;
  handleToggleMemorySelection: (memoryId: string) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  
  // Category display
  toggleShowAllCategories: () => void;
  
  // Reset filters
  resetFilters: () => void;
  
  // Memory updates
  updateMemories: (memories: MemoryEntry[]) => void;
  memories: MemoryEntry[];
}

export function useMemoryFilters(initialMemories: MemoryEntry[] = []): MemoryFiltersResult {
  const [memories, setMemories] = useState<MemoryEntry[]>(initialMemories);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set());
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [refetchCallback, setRefetchCallback] = useState<(() => void) | null>(null);

  // Calculate available labels for current category
  const availableLabels = useMemo(() => {
    const filteredMemories = selectedCategory === "all" 
      ? memories 
      : memories.filter((memory) => memory.category === selectedCategory);
    
    const labelCounts: Record<string, number> = {};
    
    filteredMemories.forEach((memory) => {
      if (memory.labels) {
        memory.labels.forEach((label: string) => {
          labelCounts[label] = (labelCounts[label] || 0) + 1;
        });
      }
    });
    
    return Object.entries(labelCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [memories, selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedLabels(new Set()); // Clear label filters when category changes
    setIsSelectionMode(false); // Exit selection mode when changing category
    setSelectedMemoryIds(new Set()); // Clear selected memories
    
    // Refetch with new category if callback is set
    if (refetchCallback) {
      refetchCallback();
    }
  };

  const handleLabelToggle = (label: string) => {
    const newSelectedLabels = new Set(selectedLabels);
    if (newSelectedLabels.has(label)) {
      newSelectedLabels.delete(label);
    } else {
      newSelectedLabels.add(label);
    }
    setSelectedLabels(newSelectedLabels);
  };

  const handleSelectAllLabels = () => {
    if (selectedLabels.size === availableLabels.length) {
      setSelectedLabels(new Set()); // Deselect all
    } else {
      setSelectedLabels(new Set(availableLabels.map(({ label }) => label))); // Select all
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedMemoryIds(new Set()); // Clear selections when exiting selection mode
    }
  };

  const handleToggleMemorySelection = (memoryId: string) => {
    const newSelection = new Set(selectedMemoryIds);
    if (newSelection.has(memoryId)) {
      newSelection.delete(memoryId);
    } else {
      newSelection.add(memoryId);
    }
    setSelectedMemoryIds(newSelection);
  };

  // We'll define this after filteredMemories

  const handleDeselectAll = () => {
    setSelectedMemoryIds(new Set());
  };

  const toggleShowAllCategories = () => {
    setShowAllCategories(!showAllCategories);
  };

  const updateMemories = (newMemories: MemoryEntry[]) => {
    setMemories(newMemories);
  };

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedLabels(new Set());
    setIsSelectionMode(false);
    setSelectedMemoryIds(new Set());
    setShowAllCategories(false);
  };

  // Apply filters to memories
  const filteredMemories = useMemo(() => {
    let filtered = memories;
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((memory) => memory.category === selectedCategory);
    }
    
    // Filter by selected labels
    if (selectedLabels.size > 0) {
      filtered = filtered.filter((memory) => {
        if (!memory.labels || memory.labels.length === 0) {
          return false;
        }
        // Check if memory has any of the selected labels
        return memory.labels.some((label: string) => selectedLabels.has(label));
      });
    }
    
    return filtered;
  }, [memories, selectedCategory, selectedLabels]);

  const handleSelectAll = () => {
    setSelectedMemoryIds(new Set(filteredMemories.map((memory) => memory.id)));
  };

  return {
    // State
    selectedCategory,
    selectedLabels,
    isSelectionMode,
    selectedMemoryIds,
    showAllCategories,
    
    // Category management
    handleCategoryChange,
    
    // Label management
    availableLabels,
    handleLabelToggle,
    handleSelectAllLabels,
    
    // Selection mode management
    handleToggleSelectionMode,
    handleToggleMemorySelection,
    handleSelectAll,
    handleDeselectAll,
    
    // Category display
    toggleShowAllCategories,
    
    // Reset filters
    resetFilters,
    
    // Memory updates
    updateMemories,
    memories: filteredMemories,
    
    // Refetch callback
    setRefetchCallback,
  };
}