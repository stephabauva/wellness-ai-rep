import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface VirtualScrollingOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  dynamicHeight?: boolean;
}

interface VirtualScrollingResult<T> {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
  scrollToIndex: (index: number) => void;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

export function useVirtualScrolling<T>(
  items: T[],
  { itemHeight, containerHeight, overscan = 5, dynamicHeight = false }: VirtualScrollingOptions
): VirtualScrollingResult<T> {
  const [scrollTop, setScrollTop] = useState(0);
  const [actualHeights, setActualHeights] = useState<Map<number, number>>(new Map());
  const observerRef = useRef<ResizeObserver | null>(null);

  // Calculate total height considering dynamic heights
  const totalHeight = useMemo(() => {
    if (!dynamicHeight) return items.length * itemHeight;
    
    let height = 0;
    for (let i = 0; i < items.length; i++) {
      height += actualHeights.get(i) || itemHeight;
    }
    return height;
  }, [items.length, itemHeight, actualHeights, dynamicHeight]);

  // Calculate visible range with dynamic heights
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    if (!dynamicHeight) {
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);
      return {
        startIndex: start,
        endIndex: end,
        offsetY: start * itemHeight
      };
    }

    // Dynamic height calculation
    let currentHeight = 0;
    let start = 0;
    let end = items.length - 1;
    let offset = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = actualHeights.get(i) || itemHeight;
      if (currentHeight + height > scrollTop - overscan * itemHeight) {
        start = Math.max(0, i);
        offset = currentHeight;
        break;
      }
      currentHeight += height;
    }

    // Find end index
    currentHeight = offset;
    for (let i = start; i < items.length; i++) {
      const height = actualHeights.get(i) || itemHeight;
      currentHeight += height;
      if (currentHeight > scrollTop + containerHeight + overscan * itemHeight) {
        end = i;
        break;
      }
    }

    return { startIndex: start, endIndex: end, offsetY: offset };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length, actualHeights, dynamicHeight]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (!dynamicHeight) {
      const targetScrollTop = index * itemHeight;
      setScrollTop(targetScrollTop);
      return;
    }

    // Calculate position with dynamic heights
    let targetScrollTop = 0;
    for (let i = 0; i < index; i++) {
      targetScrollTop += actualHeights.get(i) || itemHeight;
    }
    setScrollTop(targetScrollTop);
  }, [itemHeight, actualHeights, dynamicHeight]);

  // Set up ResizeObserver for dynamic heights
  useEffect(() => {
    if (!dynamicHeight) return;

    observerRef.current = new ResizeObserver((entries) => {
      const newHeights = new Map(actualHeights);
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-index') || '0');
        newHeights.set(index, entry.contentRect.height);
      });
      setActualHeights(newHeights);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [dynamicHeight, actualHeights]);

  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollToIndex,
    handleScroll,
  };
}