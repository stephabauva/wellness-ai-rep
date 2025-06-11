import { useState, useEffect, useRef } from 'react';

interface StreamingTextProps {
  content: string;
  isComplete: boolean;
}

export const StreamingText: React.FC<StreamingTextProps> = ({ content, isComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If content is shorter, reset (new message)
    if (content.length < indexRef.current) {
      indexRef.current = 0;
      setDisplayedText('');
    }

    // Type remaining characters
    const typeNext = () => {
      if (indexRef.current < content.length) {
        const nextChar = content[indexRef.current];
        setDisplayedText(content.substring(0, indexRef.current + 1));
        indexRef.current++;
        
        // ChatGPT-style timing
        let delay = 25; // Base speed
        if (nextChar === '.' || nextChar === '!' || nextChar === '?') delay = 150;
        else if (nextChar === ',' || nextChar === ';') delay = 80;
        else if (nextChar === '\n') delay = 100;
        else if (nextChar === ' ') delay = 30;
        
        timeoutRef.current = setTimeout(typeNext, delay);
      }
    };

    // Start typing if needed
    if (indexRef.current < content.length) {
      typeNext();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content]);

  // Cursor blinking
  useEffect(() => {
    if (isComplete && indexRef.current >= content.length) {
      setShowCursor(false);
      return;
    }

    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isComplete, content.length]);

  return (
    <span>
      {displayedText}
      {showCursor && <span className="animate-pulse">|</span>}
    </span>
  );
};