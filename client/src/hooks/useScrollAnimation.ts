import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  offset?: number;
}

export const useScrollAnimation = (options: UseScrollAnimationOptions = {}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  const { threshold = 0.1, offset = 0 } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate visibility
      const elementTop = rect.top + offset;
      const elementBottom = rect.bottom - offset;
      const isCurrentlyVisible = elementTop < windowHeight && elementBottom > 0;
      setIsVisible(isCurrentlyVisible);

      // Calculate scroll progress (0 to 1)
      if (isCurrentlyVisible) {
        const visibleHeight = Math.min(windowHeight - elementTop, rect.height);
        const progress = Math.max(0, Math.min(1, visibleHeight / rect.height));
        setScrollProgress(progress);
      }
    };

    // Initial check
    handleScroll();

    // Add scroll listener with throttling
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', scrollListener, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', scrollListener);
      window.removeEventListener('resize', handleScroll);
    };
  }, [threshold, offset]);

  return { elementRef, scrollProgress, isVisible };
};