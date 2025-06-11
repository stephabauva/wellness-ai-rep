import React, { useState, useEffect, useRef } from 'react';

interface SmoothStreamingTextProps {
  content: string;
  isComplete: boolean;
  onComplete?: () => void;
}

export const SmoothStreamingText: React.FC<SmoothStreamingTextProps> = ({
  content,
  isComplete,
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const currentIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!content) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only reset if content is completely new (smaller than current display)
    if (content.length < displayedText.length) {
      currentIndexRef.current = 0;
      setDisplayedText('');
    }

    // If content hasn't changed or we've already displayed it all, don't restart
    if (currentIndexRef.current >= content.length && displayedText === content) {
      return;
    }

    // Smart pacing function for natural typing rhythm
    const getPacingDelay = (char: string): number => {
      if (char === '.' || char === '!' || char === '?') return 150;
      if (char === ',' || char === ';') return 80;
      if (char === '\n') return 200;
      if (char === ' ') return 25;
      return 15;
    };

    // Non-blocking async scheduler for smooth rendering
    const typeNextToken = async () => {
      if (currentIndexRef.current < content.length) {
        const nextChar = content[currentIndexRef.current];
        
        // Update display to show one more character
        setDisplayedText(content.substring(0, currentIndexRef.current + 1));
        currentIndexRef.current++;
        
        // Schedule next character with natural pacing
        const delay = getPacingDelay(nextChar);
        timeoutRef.current = setTimeout(typeNextToken, delay + (Math.random() * 10 - 5));
      } else if (isComplete && onComplete) {
        // Text is fully displayed and streaming is complete
        onComplete();
      }
    };

    // Start streaming if we haven't displayed all the content yet
    if (currentIndexRef.current < content.length) {
      timeoutRef.current = setTimeout(typeNextToken, 30); // Faster initial delay
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, isComplete, onComplete, displayedText]);

  // Cursor blinking effect
  useEffect(() => {
    if (isComplete && currentIndexRef.current >= content.length) {
      setShowCursor(false);
      return;
    }

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, [isComplete, content.length]);

  return (
    <span className="relative">
      <span className="whitespace-pre-wrap">{displayedText}</span>
      {showCursor && (
        <span className="inline-block w-0.5 h-4 bg-foreground ml-0.5 animate-pulse">
          |
        </span>
      )}
    </span>
  );
};