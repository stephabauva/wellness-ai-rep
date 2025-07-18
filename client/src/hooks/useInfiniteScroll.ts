import { useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export function useInfiniteScroll({
  threshold = 1.0,
  rootMargin = '0px',
  hasMore,
  isLoading,
  onLoadMore
}: UseInfiniteScrollOptions) {
  const [isFetching, setIsFetching] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!targetRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoading && !isFetching) {
          setIsFetching(true);
          onLoadMore();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observerRef.current = observer;
    observer.observe(targetRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, hasMore, isLoading, isFetching, onLoadMore]);

  useEffect(() => {
    if (!isLoading) {
      setIsFetching(false);
    }
  }, [isLoading]);

  return {
    targetRef,
    isFetching
  };
}