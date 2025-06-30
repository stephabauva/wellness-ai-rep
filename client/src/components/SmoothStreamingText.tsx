import React, { useState, useEffect, useRef, useCallback } from 'react';

// ChatGPT-style cursor animation styles (Phase 2) + Character Reveal Effect
const cursorStyles = `
  @keyframes chatgpt-cursor-blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
  }
  
  .streaming-cursor-enhanced {
    animation: chatgpt-cursor-blink 1.2s ease-in-out infinite;
    transition: all 0.3s ease;
    display: inline-block;
    width: 2px;
    height: 1.2em;
    background-color: currentColor;
    margin-left: 1px;
    border-radius: 1px;
    vertical-align: text-top;
  }
  
  /* Character reveal effect - ChatGPT style */
  .character-reveal {
    display: inline;
    white-space: pre-wrap;
  }
  
  .character-reveal .char {
    display: inline-block;
    opacity: 0;
    transform: translateX(-2px);
    animation: charReveal 0.15s ease-out forwards;
  }
  
  @keyframes charReveal {
    0% {
      opacity: 0;
      transform: translateX(-3px) scale(0.95);
    }
    50% {
      opacity: 0.7;
      transform: translateX(-1px) scale(0.98);
    }
    100% {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  
  /* Preserve whitespace for proper spacing */
  .char-space {
    white-space: pre;
  }
  
  .cursor-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  
  .cursor-fade-out {
    animation: fadeOut 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: scaleY(0.8); }
    to { opacity: 1; transform: scaleY(1); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: scaleY(1); }
    to { opacity: 0; transform: scaleY(0.8); }
  }
  
  /* Phase 5: Streaming indicators */
  .streaming-container {
    transition: all 0.3s ease;
  }
  
  .streaming-active {
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1), 0 0 8px rgba(59, 130, 246, 0.08);
    background: linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.02) 100%);
  }
  
  @keyframes streaming-pulse {
    0%, 100% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1), 0 0 8px rgba(59, 130, 246, 0.08); }
    50% { box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2), 0 0 12px rgba(59, 130, 246, 0.12); }
  }
  
  .streaming-active.streaming-pulse {
    animation: streaming-pulse 2s ease-in-out infinite;
  }
  
  /* Phase 6: Paused streaming indicator */
  .streaming-paused {
    box-shadow: 0 0 0 1px rgba(255, 165, 0, 0.3), 0 0 8px rgba(255, 165, 0, 0.15);
    background: linear-gradient(135deg, transparent 0%, rgba(255, 165, 0, 0.05) 100%);
  }
`;

// Inject styles into document head
if (typeof document !== 'undefined' && !document.getElementById('chatgpt-streaming-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'chatgpt-streaming-styles';
  styleElement.textContent = cursorStyles;
  document.head.appendChild(styleElement);
}

interface SmoothStreamingTextProps {
  content: string;
  isComplete: boolean;
  onComplete?: () => void;
  isPaused?: boolean; // Phase 6
  readingSpeedMultiplier?: number; // Phase 6
}

// Content type analysis for adaptive pacing (Phase 3)
type ContentType = 'code' | 'prose' | 'list' | 'url_email' | 'mixed';

interface ContentAnalysis {
  type: ContentType;
  confidence: number;
  speedMultiplier: number;
}

// Hybrid streaming configuration (Phase 4)
interface StreamingMode {
  mode: 'character' | 'word';
  threshold: number;
  currentWordBuffer: string;
  wordIndex: number;
  words: string[];
}

export const SmoothStreamingText: React.FC<SmoothStreamingTextProps> = ({
  content,
  isComplete,
  onComplete,
  isPaused = false, // Phase 6
  readingSpeedMultiplier = 1.0 // Phase 6
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [cursorFading, setCursorFading] = useState(false);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  const [streamingMode, setStreamingMode] = useState<StreamingMode>({
    mode: 'character',
    threshold: 2000,
    currentWordBuffer: '',
    wordIndex: 0,
    words: []
  });
  const [isActivelyStreaming, setIsActivelyStreaming] = useState(false);
  const [revealedChars, setRevealedChars] = useState<number>(0);
  const currentIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const charRevealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ChatGPT-style pacing with natural randomization (Phase 1)
  const getPacingDelay = useCallback((char: string, prevChar?: string, nextChar?: string): number => {
    let baseDelay: number;
    let variance: number;
    
    if (char === '.' || char === '!' || char === '?') {
      baseDelay = 150;
      variance = 7; // ±7ms for sentence endings
    } else if (char === ',' || char === ';') {
      baseDelay = 80;
      variance = 5; // ±5ms for pauses
    } else if (char === '\n') {
      baseDelay = 200;
      variance = 10; // ±10ms for line breaks
    } else if (char === ' ') {
      baseDelay = 25;
      variance = 3; // ±3ms for spaces
    } else {
      baseDelay = 25; // Fast base typing speed like ChatGPT
      variance = 3; // ±3ms for regular characters
    }
    
    // Add micro-variations based on character context
    let contextMultiplier = 1;
    if (prevChar && /[aeiou]/i.test(prevChar) && /[bcdfghjklmnpqrstvwxyz]/i.test(char)) {
      contextMultiplier = 0.95; // Slightly faster after vowels
    } else if (prevChar && /[bcdfghjklmnpqrstvwxyz]/i.test(prevChar) && /[aeiou]/i.test(char)) {
      contextMultiplier = 1.05; // Slightly slower after consonants
    }
    
    // Natural randomization for human-like typing rhythm
    const randomVariation = (Math.random() - 0.5) * variance * 2;
    const finalDelay = Math.max(1, Math.round((baseDelay + randomVariation) * contextMultiplier));
    
    return finalDelay;
  }, []);

  // Content analysis function (Phase 3)
  const analyzeContent = useCallback((text: string): ContentAnalysis => {
    const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
    const listRegex = /^\s*[-*•]\s|^\s*\d+\.\s/gm;
    const urlEmailRegex = /(https?:\/\/[^\s]+|[\w.-]+@[\w.-]+\.[a-z]+)/gi;
    
    const codeMatches = text.match(codeBlockRegex) || [];
    const listMatches = text.match(listRegex) || [];
    const urlEmailMatches = text.match(urlEmailRegex) || [];
    
    const totalLength = text.length;
    const codeLength = codeMatches.join('').length;
    const listLines = listMatches.length;
    const urlEmailLength = urlEmailMatches.join('').length;
    
    // Determine dominant content type
    if (codeLength > totalLength * 0.3) {
      return {
        type: 'code',
        confidence: Math.min(0.9, codeLength / totalLength),
        speedMultiplier: 0.8 // 20% faster for code
      };
    } else if (listLines > 3 || (listLines > 0 && totalLength < 500)) {
      return {
        type: 'list',
        confidence: Math.min(0.8, listLines / 10),
        speedMultiplier: 0.9 // 10% faster for lists
      };
    } else if (urlEmailLength > totalLength * 0.2) {
      return {
        type: 'url_email',
        confidence: Math.min(0.85, urlEmailLength / totalLength),
        speedMultiplier: 0.7 // 30% faster for URLs/emails
      };
    } else if (codeLength > 0 || listLines > 0 || urlEmailLength > 0) {
      return {
        type: 'mixed',
        confidence: 0.6,
        speedMultiplier: 0.95 // 5% faster for mixed content
      };
    } else {
      return {
        type: 'prose',
        confidence: 0.8,
        speedMultiplier: 1.0 // Standard speed for prose
      };
    }
  }, []);

  // Adaptive pacing function (Phase 3)
  const getAdaptivePacing = useCallback((baseDelay: number, char: string, position: number): number => {
    if (!contentAnalysis) return baseDelay;
    
    let adaptedDelay = baseDelay * contentAnalysis.speedMultiplier;
    
    // Content-specific adaptations
    switch (contentAnalysis.type) {
      case 'code':
        // Faster overall, but pause at code boundaries
        if (char === '`' || char === '{' || char === '}' || char === ';') {
          adaptedDelay *= 1.3;
        }
        break;
      case 'list':
        // Brief pauses at bullet points and list items
        if (char === '-' || char === '*' || char === '•') {
          adaptedDelay *= 1.5;
        }
        break;
      case 'url_email':
        // Very fast with minimal punctuation delays
        if (char === '.' && position < content.length - 1) {
          const nextChar = content[position + 1];
          if (nextChar && /[a-zA-Z]/.test(nextChar)) {
            adaptedDelay *= 0.5; // Faster through domain extensions
          }
        }
        break;
      case 'prose':
        // Standard timing with emphasis on sentence boundaries
        if (char === '.' || char === '!' || char === '?') {
          adaptedDelay *= 1.2; // Slightly longer pauses
        }
        break;
    }
    
    return Math.max(1, Math.round(adaptedDelay));
  }, [contentAnalysis, content]);

  // Word-boundary streaming functions (Phase 4)
  const shouldStreamByWords = useCallback((text: string): boolean => {
    return text.length > streamingMode.threshold;
  }, [streamingMode.threshold]);

  const prepareWordStreaming = useCallback((text: string): string[] => {
    // Split by spaces but keep punctuation attached to words
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return words;
  }, []);

  const getWordStreamingDelay = useCallback((word: string, wordIndex: number): number => {
    // Base delay for word streaming - maintain character-level feel
    const avgCharDelay = 15; // Base character delay
    const wordLength = word.length;
    
    // Calculate delay to maintain roughly the same overall speed
    let baseWordDelay = avgCharDelay * wordLength;
    
    // Add natural pauses for word boundaries
    if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
      baseWordDelay += 150; // Sentence endings
    } else if (word.endsWith(',') || word.endsWith(';')) {
      baseWordDelay += 80; // Clause endings
    } else {
      baseWordDelay += 25; // Regular word spacing
    }
    
    // Add some randomization
    const variance = Math.min(10, wordLength * 2);
    const randomVariation = (Math.random() - 0.5) * variance;
    
    return Math.max(10, Math.round(baseWordDelay + randomVariation));
  }, []);

  const hybridStreaming = useCallback((text: string): 'character' | 'word' => {
    if (shouldStreamByWords(text)) {
      return 'word';
    }
    return 'character';
  }, [shouldStreamByWords]);

  // Hybrid streaming renderer (Phase 4 enhanced)
  const typeNextToken = useCallback(() => {
    if (!isTypingRef.current) return;
    
    if (streamingMode.mode === 'word') {
      // Word-level streaming for long content
      if (streamingMode.wordIndex >= streamingMode.words.length) {
        if (isComplete && onComplete) {
          onComplete();
        }
        isTypingRef.current = false;
        setIsActivelyStreaming(false);
        return;
      }

      const currentWord = streamingMode.words[streamingMode.wordIndex];
      const newText = streamingMode.words.slice(0, streamingMode.wordIndex + 1).join(' ');
      
      setDisplayedText(newText);
      
      // Update streaming mode state
      setStreamingMode(prev => ({
        ...prev,
        wordIndex: prev.wordIndex + 1
      }));
      
      let wordDelay = getWordStreamingDelay(currentWord, streamingMode.wordIndex);
      
      // Phase 6: Apply reading speed multiplier for word streaming
      wordDelay = Math.max(10, Math.round(wordDelay / readingSpeedMultiplier));
      
      timeoutRef.current = setTimeout(() => typeNextToken(), wordDelay);
    } else {
      // Character-level streaming for normal content
      if (currentIndexRef.current >= content.length) {
        if (isComplete && onComplete && currentIndexRef.current >= content.length) {
          onComplete();
        }
        isTypingRef.current = false;
        setIsActivelyStreaming(false);
        return;
      }

      const char = content[currentIndexRef.current];
      const prevChar = currentIndexRef.current > 0 ? content[currentIndexRef.current - 1] : undefined;
      const nextChar = currentIndexRef.current < content.length - 1 ? content[currentIndexRef.current + 1] : undefined;
      
      // Immediate update for responsiveness
      setDisplayedText(content.substring(0, currentIndexRef.current + 1));
      currentIndexRef.current++;
      
      // Trigger character reveal animation
      setRevealedChars(currentIndexRef.current);
      
      // Schedule next character with enhanced context-aware pacing (Phase 3 & 6)
      const baseDelay = getPacingDelay(char, prevChar, nextChar);
      let adaptiveDelay = getAdaptivePacing(baseDelay, char, currentIndexRef.current - 1);
      
      // Phase 6: Apply reading speed multiplier for adaptive speed
      adaptiveDelay = Math.max(1, Math.round(adaptiveDelay / readingSpeedMultiplier));
      
      timeoutRef.current = setTimeout(() => typeNextToken(), adaptiveDelay);
    }
  }, [getPacingDelay, getAdaptivePacing, getWordStreamingDelay, isComplete, onComplete, content, streamingMode]);

  // Analyze content and setup streaming mode when it changes (Phase 3 & 4)
  useEffect(() => {
    if (content && content.length > 50) { // Analyze only substantial content
      const analysis = analyzeContent(content);
      setContentAnalysis(analysis);
      
      // Setup hybrid streaming mode (Phase 4)
      const mode = hybridStreaming(content);
      if (mode === 'word') {
        const words = prepareWordStreaming(content);
        setStreamingMode(prev => ({
          ...prev,
          mode: 'word',
          words,
          wordIndex: 0
        }));
      } else {
        setStreamingMode(prev => ({
          ...prev,
          mode: 'character',
          words: [],
          wordIndex: 0
        }));
      }
    } else {
      setContentAnalysis(null);
      setStreamingMode(prev => ({
        ...prev,
        mode: 'character',
        words: [],
        wordIndex: 0
      }));
    }
  }, [content, analyzeContent, hybridStreaming, prepareWordStreaming]);

  useEffect(() => {
    if (!content) {
      setDisplayedText('');
      currentIndexRef.current = 0;
      return;
    }

    // CHATGPT-STYLE: Only reset if content got shorter (new message) or streaming mode changed
    if (content.length < currentIndexRef.current || 
        (streamingMode.mode === 'word' && streamingMode.wordIndex > 0 && content.length !== displayedText.length)) {
      currentIndexRef.current = 0;
      setDisplayedText('');
      setRevealedChars(0);
      isTypingRef.current = false;
      // Reset word streaming if needed
      if (streamingMode.mode === 'word') {
        setStreamingMode(prev => ({ ...prev, wordIndex: 0 }));
      }
    }

    // CRITICAL: Continue typing from where we left off, don't restart
    const shouldContinue = streamingMode.mode === 'character' 
      ? currentIndexRef.current < content.length
      : streamingMode.wordIndex < streamingMode.words.length;
      
    // Phase 6: Check if streaming is paused before continuing
    if (shouldContinue && !isTypingRef.current && !isPaused) {
      isTypingRef.current = true;
      setIsActivelyStreaming(true);
      typeNextToken();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content.length, streamingMode.mode, streamingMode.words.length, displayedText.length, typeNextToken, isPaused]); // Enhanced dependencies for hybrid streaming

  // Phase 6: Handle pause/resume functionality
  useEffect(() => {
    if (isPaused && isTypingRef.current) {
      // Pause streaming by stopping the timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isTypingRef.current = false;
      setIsActivelyStreaming(false);
    } else if (!isPaused && !isTypingRef.current && !isComplete) {
      // Resume streaming if not paused and not already typing
      const shouldContinue = streamingMode.mode === 'character' 
        ? currentIndexRef.current < content.length
        : streamingMode.wordIndex < streamingMode.words.length;
        
      if (shouldContinue) {
        isTypingRef.current = true;
        setIsActivelyStreaming(true);
        typeNextToken();
      }
    }
  }, [isPaused, isComplete, content.length, streamingMode.mode, streamingMode.words.length, typeNextToken]);

  // Enhanced cursor control with smooth animations (Phase 2)
  useEffect(() => {
    if (isComplete && currentIndexRef.current >= content.length) {
      // Smooth fade out when complete
      setCursorFading(true);
      const fadeTimeout = setTimeout(() => {
        setShowCursor(false);
        setCursorFading(false);
      }, 300);
      return () => clearTimeout(fadeTimeout);
    } else {
      // Ensure cursor is visible and not fading when typing
      setShowCursor(true);
      setCursorFading(false);
    }
  }, [isComplete, content.length]);

  // Render characters with reveal animation
  const renderTextWithReveal = () => {
    if (!displayedText) return null;
    
    return displayedText.split('').map((char, index) => {
      const isRevealed = index < revealedChars;
      const animationDelay = isRevealed ? '0ms' : `${index * 15}ms`;
      
      return (
        <span
          key={`char-${index}`}
          className={`char ${char === ' ' ? 'char-space' : ''}`}
          style={{
            animationDelay: animationDelay,
            opacity: isRevealed ? 1 : 0,
            transform: isRevealed ? 'translateX(0) scale(1)' : 'translateX(-3px) scale(0.95)'
          }}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <span 
      className={`relative streaming-container ${
        isActivelyStreaming && !isPaused ? 'streaming-active streaming-pulse' : ''
      } ${
        isPaused ? 'streaming-paused' : ''
      }`}
      style={{
        borderRadius: '4px',
        padding: isActivelyStreaming ? '2px 4px' : '0',
        margin: isActivelyStreaming ? '-2px -4px' : '0',
        transition: 'all 0.3s ease'
      }}
    >
      <span className="character-reveal whitespace-pre-wrap">
        {renderTextWithReveal()}
      </span>
      {showCursor && (
        <span 
          className={`streaming-cursor-enhanced ${cursorFading ? 'cursor-fade-out' : 'cursor-fade-in'}`}
          style={{ 
            color: 'currentColor',
            fontSize: '1em',
            lineHeight: '1.2'
          }}
        />
      )}
    </span>
  );
};