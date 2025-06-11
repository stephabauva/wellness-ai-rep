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

    // Reset only if content got shorter (new message)
    if (content.length < displayedText.length) {
      currentIndexRef.current = 0;
      setDisplayedText('');
    }

    // Smart pacing function for ChatGPT-like rhythm
    const getPacingDelay = (char: string): number => {
      if (char === '.' || char === '!' || char === '?') return 300;
      if (char === ',' || char === ';') return 150;
      if (char === '\n') return 250;
      if (char === ' ') return 40;
      return 20; // Base typing speed
    };

    // Smooth character-by-character renderer
    const typeNextCharacter = () => {
      if (currentIndexRef.current < content.length) {
        const currentChar = content[currentIndexRef.current];
        
        // Immediate state update for responsiveness
        setDisplayedText(content.substring(0, currentIndexRef.current + 1));
        currentIndexRef.current++;
        
        // Natural typing rhythm with slight randomness
        const baseDelay = getPacingDelay(currentChar);
        const jitter = Math.random() * 20 - 10; // ±10ms variation
        const delay = Math.max(10, baseDelay + jitter);
        
        timeoutRef.current = setTimeout(typeNextCharacter, delay);
      } else if (isComplete && onComplete) {
        onComplete();
      }
    };

    // Only start if there's more content to display
    if (currentIndexRef.current < content.length) {
      // Small initial delay to prevent jarring start
      timeoutRef.current = setTimeout(typeNextCharacter, 50);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content.length, isComplete, onComplete]); // Optimized dependencies

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