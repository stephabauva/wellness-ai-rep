import { useState, useCallback, useMemo } from 'react';

interface OptimisticUpdate<T> {
  id: string; // Unique ID for the optimistic update itself, not necessarily item ID
  type: 'create' | 'update' | 'delete';
  data: T; // The data for the operation
  timestamp: number; // Timestamp of when the optimistic update was applied
  error?: string; // Error message if the operation failed
  retryCount?: number; // Number of times this operation has been retried
}

interface UseOptimisticUpdatesOptions {
  maxRetries?: number; // Max number of retries for a failed operation
  retryDelay?: number; // Delay between retries (not implemented in this basic version)
}

// T should be a type with an 'id' property for identification
export function useOptimisticUpdates<T extends { id: string }>(
  baseData: T[], // The source of truth (e.g., from server state)
  options: UseOptimisticUpdatesOptions = {}
) {
  const { maxRetries = 3 /*, retryDelay = 1000 */ } = options; // retryDelay not used here
  // Stores optimistic updates that are currently in flight or have failed and are pending retry
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map());
  // Stores IDs of operations that are currently being processed (e.g., waiting for server confirmation)
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());

  // Compute the final data by applying optimistic updates to the base data
  const optimisticData = useMemo(() => {
    let result = [...baseData];

    // Apply optimistic updates in chronological order to reflect the intended state
    const sortedUpdates = Array.from(optimisticUpdates.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const update of sortedUpdates) {
      switch (update.type) {
        case 'create':
          // Add new item if it's not already present in the base data (idempotency check)
          if (!result.find(item => item.id === update.data.id)) {
            result.push(update.data);
          }
          break;

        case 'update':
          const updateIndex = result.findIndex(item => item.id === update.data.id);
          if (updateIndex !== -1) {
            // Merge existing item with new data
            result[updateIndex] = { ...result[updateIndex], ...update.data };
          } else {
            // If item to update is not in base data (e.g., created optimistically then updated)
            // This scenario might need more complex handling depending on requirements
            // For now, we'll add it if it's an update to a non-existent item.
            // result.push(update.data); // Or handle as an error/warning
          }
          break;

        case 'delete':
          result = result.filter(item => item.id !== update.data.id);
          break;
      }
    }

    return result;
  }, [baseData, optimisticUpdates]);

  const addOptimisticUpdate = useCallback((
    type: 'create' | 'update' | 'delete',
    data: T,
    operationId?: string // Optional: provide a specific ID for the operation
  ): string => {
    const id = operationId || `${type}-${data.id}-${Date.now()}`;

    setOptimisticUpdates(prev => new Map(prev).set(id, {
      id,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0, // Initialize retryCount
    }));

    setPendingOperations(prev => new Set(prev).add(id));

    return id; // Return the operation ID for tracking
  }, []);

  const confirmOptimisticUpdate = useCallback((operationId: string) => {
    // Remove from optimisticUpdates as it's now part of baseData (presumably)
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

  const rejectOptimisticUpdate = useCallback((operationId: string, error: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      const update = newMap.get(operationId);

      if (update) {
        const retryCount = (update.retryCount || 0) + 1;

        if (retryCount <= maxRetries) {
          // Mark for retry, keeping it in optimisticUpdates but with error info
          newMap.set(operationId, {
            ...update,
            error,
            retryCount,
          });
        } else {
          // Max retries reached, remove the optimistic update (revert)
          newMap.delete(operationId);
        }
      }
      return newMap;
    });

    // Remove from pending operations as this attempt is resolved (failed or maxed out)
    setPendingOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(operationId);
      return newSet;
    });
  }, [maxRetries]);

  // Function to get operations that can be retried
  const getRetryableFailedUpdates = useCallback(() => {
    return Array.from(optimisticUpdates.values())
      .filter(update => update.error && (update.retryCount || 0) < maxRetries);
  }, [optimisticUpdates, maxRetries]);

  const clearOptimisticUpdates = useCallback(() => {
    setOptimisticUpdates(new Map());
    setPendingOperations(new Set());
  }, []);

  const pendingCount = pendingOperations.size;

  const failedUpdates = useMemo(() => {
    return Array.from(optimisticUpdates.values())
      .filter(update => update.error);
  }, [optimisticUpdates]);

  return {
    data: optimisticData, // The data including optimistic changes
    addOptimisticUpdate,
    confirmOptimisticUpdate,
    rejectOptimisticUpdate,
    retryFailedUpdates: getRetryableFailedUpdates, // Renamed for clarity
    clearOptimisticUpdates,
    pendingCount,
    failedUpdates, // List of updates currently in an error state
    hasPendingOperations: pendingCount > 0,
    hasFailedOperations: failedUpdates.length > 0,
  };
}
