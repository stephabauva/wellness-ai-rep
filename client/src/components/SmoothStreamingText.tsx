import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  const isTypingRef = useRef(false);

  // ChatGPT-style pacing with consistent timing
  const getPacingDelay = useCallback((char: string): number => {
    if (char === '.' || char === '!' || char === '?') return 150;
    if (char === ',' || char === ';') return 80;
    if (char === '\n') return 200;
    if (char === ' ') return 25;
    return 15; // Fast base typing speed like ChatGPT
  }, []);

  // Non-blocking character renderer with smart scheduler
  const typeNextToken = useCallback(() => {
    if (!isTypingRef.current) return;
    
    if (currentIndexRef.current >= content.length) {
      if (isComplete && onComplete && currentIndexRef.current >= content.length) {
        onComplete();
      }
      isTypingRef.current = false;
      return;
    }

    const char = content[currentIndexRef.current];
    
    // Immediate update for responsiveness
    setDisplayedText(content.substring(0, currentIndexRef.current + 1));
    currentIndexRef.current++;
    
    // Schedule next character with smart pacing
    const delay = getPacingDelay(char);
    timeoutRef.current = setTimeout(() => typeNextToken(), delay);
  }, [getPacingDelay, isComplete, onComplete]);

  useEffect(() => {
    if (!content) {
      setDisplayedText('');
      currentIndexRef.current = 0;
      return;
    }

    // CHATGPT-STYLE: Only reset if content got shorter (new message)
    if (content.length < currentIndexRef.current) {
      currentIndexRef.current = 0;
      setDisplayedText('');
      isTypingRef.current = false;
    }

    // CRITICAL: Continue typing from where we left off, don't restart
    if (currentIndexRef.current < content.length && !isTypingRef.current) {
      isTypingRef.current = true;
      typeNextToken();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content.length]); // Only depend on content length, not full content

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