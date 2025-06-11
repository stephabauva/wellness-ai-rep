import { useState, useCallback, useMemo } from 'react';

interface OptimisticUpdate<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: T;
  timestamp: number;
  error?: string;
  retryCount?: number;
}

interface UseOptimisticUpdatesOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export function useOptimisticUpdates<T extends { id: string }>(
  baseData: T[],
  options: UseOptimisticUpdatesOptions = {}
) {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map());
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());

  // Compute the final data with optimistic updates applied
  const optimisticData = useMemo(() => {
    let result = [...baseData];
    
    // Apply optimistic updates in chronological order
    const sortedUpdates = Array.from(optimisticUpdates.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    for (const update of sortedUpdates) {
      switch (update.type) {
        case 'create':
          // Add new item if it doesn't exist in base data
          if (!result.find(item => item.id === update.data.id)) {
            result.push(update.data);
          }
          break;
          
        case 'update':
          // Update existing item
          const updateIndex = result.findIndex(item => item.id === update.data.id);
          if (updateIndex !== -1) {
            result[updateIndex] = { ...result[updateIndex], ...update.data };
          }
          break;
          
        case 'delete':
          // Remove item
          result = result.filter(item => item.id !== update.data.id);
          break;
      }
    }
    
    return result;
  }, [baseData, optimisticUpdates]);

  // Add optimistic update
  const addOptimisticUpdate = useCallback((
    type: 'create' | 'update' | 'delete',
    data: T,
    operationId?: string
  ) => {
    const id = operationId || `${type}-${data.id}-${Date.now()}`;
    
    setOptimisticUpdates(prev => new Map(prev).set(id, {
      id,
      type,
      data,
      timestamp: Date.now(),
    }));
    
    setPendingOperations(prev => new Set(prev).add(id));
    
    return id;
  }, []);

  // Confirm optimistic update (remove from pending)
  const confirmOptimisticUpdate = useCallback((operationId: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(operationId);
      return newMap;
    });
    
    setPendingOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(operationId);
      return newSet;
    });
  }, []);

  // Reject optimistic update (mark as error and potentially retry)
  const rejectOptimisticUpdate = useCallback((operationId: string, error: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      const update = newMap.get(operationId);
      
      if (update) {
        const retryCount = (update.retryCount || 0) + 1;
        
        if (retryCount <= maxRetries) {
          // Mark for retry
          newMap.set(operationId, {
            ...update,
            error,
            retryCount,
          });
        } else {
          // Max retries reached, remove update
          newMap.delete(operationId);
        }
      }
      
      return newMap;
    });
    
    setPendingOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(operationId);
      return newSet;
    });
  }, [maxRetries]);

  // Retry failed updates
  const retryFailedUpdates = useCallback(() => {
    const failedUpdates = Array.from(optimisticUpdates.values())
      .filter(update => update.error && (update.retryCount || 0) < maxRetries);
    
    return failedUpdates.map(update => ({
      id: update.id,
      type: update.type,
      data: update.data,
    }));
  }, [optimisticUpdates, maxRetries]);

  // Clear all optimistic updates
  const clearOptimisticUpdates = useCallback(() => {
    setOptimisticUpdates(new Map());
    setPendingOperations(new Set());
  }, []);

  // Get pending operations count
  const pendingCount = pendingOperations.size;

  // Get failed operations
  const failedUpdates = useMemo(() => {
    return Array.from(optimisticUpdates.values())
      .filter(update => update.error);
  }, [optimisticUpdates]);

  return {
    data: optimisticData,
    addOptimisticUpdate,
    confirmOptimisticUpdate,
    rejectOptimisticUpdate,
    retryFailedUpdates,
    clearOptimisticUpdates,
    pendingCount,
    failedUpdates,
    hasPendingOperations: pendingCount > 0,
    hasFailedOperations: failedUpdates.length > 0,
  };
}