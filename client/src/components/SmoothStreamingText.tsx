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

    // Reset if content changed
    if (currentIndexRef.current === 0 || content.length < displayedText.length) {
      currentIndexRef.current = 0;
      setDisplayedText('');
    }

    const streamText = () => {
      if (currentIndexRef.current < content.length) {
        const nextChar = content[currentIndexRef.current];
        
        // ChatGPT-style smart timing based on character type
        let delay = 15; // Base delay
        
        if (nextChar === ' ') {
          delay = 25; // Slightly longer for spaces
        } else if (nextChar === '.' || nextChar === '!' || nextChar === '?') {
          delay = 150; // Pause at sentence endings
        } else if (nextChar === ',' || nextChar === ';') {
          delay = 80; // Brief pause at commas
        } else if (nextChar === '\n') {
          delay = 200; // Longer pause for line breaks
        }

        // Add some natural variation (±5ms)
        delay += Math.random() * 10 - 5;

        setDisplayedText(prev => prev + nextChar);
        currentIndexRef.current++;

        timeoutRef.current = setTimeout(streamText, Math.max(delay, 10));
      } else if (isComplete && onComplete) {
        // Text is fully displayed and streaming is complete
        onComplete();
      }
    };

    // Start streaming if we haven't displayed all the content yet
    if (currentIndexRef.current < content.length) {
      timeoutRef.current = setTimeout(streamText, 100); // Initial delay
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, isComplete, onComplete]);

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