import { useCallback, useEffect, useRef, useState } from 'react';

interface UseWebWorkerOptions {
  workerPath: string;
  onMessage?: (data: any) => void;
  onError?: (error: ErrorEvent) => void;
}

interface UseWebWorkerResult {
  postMessage: (message: any) => void;
  terminate: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useWebWorker({
  workerPath,
  onMessage,
  onError,
}: UseWebWorkerOptions): UseWebWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(workerPath, { type: 'module' });
      
      workerRef.current.onmessage = (e) => {
        setIsLoading(false);
        setError(null);
        onMessage?.(e.data);
      };
      
      workerRef.current.onerror = (error) => {
        setIsLoading(false);
        setError(error.message);
        onError?.(error);
      };
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create worker');
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [workerPath, onMessage, onError]);

  const postMessage = useCallback((message: any) => {
    if (workerRef.current) {
      setIsLoading(true);
      setError(null);
      workerRef.current.postMessage(message);
    } else {
      setError('Worker not initialized');
    }
  }, []);

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return {
    postMessage,
    terminate,
    isLoading,
    error,
  };
}