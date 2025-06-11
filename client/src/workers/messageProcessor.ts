// Web Worker for heavy message processing computations
// This worker handles text parsing, search indexing, and other CPU-intensive tasks

interface MessageProcessingTask {
  type: 'PARSE_MESSAGES' | 'SEARCH_MESSAGES' | 'ANALYZE_SENTIMENT' | 'EXTRACT_KEYWORDS';
  payload: any;
  id: string;
}

interface MessageProcessingResult {
  type: string;
  result: any;
  id: string;
  error?: string;
}

// Message parsing for better display formatting
function parseMessages(messages: any[]) {
  return messages.map(message => ({
    ...message,
    wordCount: message.content.split(' ').length,
    sentiment: analyzeSentiment(message.content),
    keywords: extractKeywords(message.content),
    readingTime: Math.ceil(message.content.split(' ').length / 200), // words per minute
  }));
}

// Search through messages with fuzzy matching
function searchMessages(messages: any[], query: string) {
  const lowercaseQuery = query.toLowerCase();
  
  return messages.filter(message => {
    const content = message.content.toLowerCase();
    const directMatch = content.includes(lowercaseQuery);
    
    // Simple fuzzy matching
    if (directMatch) return true;
    
    const words = lowercaseQuery.split(' ');
    return words.some(word => content.includes(word));
  }).map(message => ({
    ...message,
    relevanceScore: calculateRelevance(message.content, query),
  })).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Basic sentiment analysis
function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'disappointed'];
  
  const words = text.toLowerCase().split(/\W+/);
  const positiveCount = words.filter(word => positiveWords.includes(word)).length;
  const negativeCount = words.filter(word => negativeWords.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'this', 'that', 'these', 'those']);
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Count word frequency
  const wordCount = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Return top keywords
  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

// Calculate relevance score for search
function calculateRelevance(content: string, query: string): number {
  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ');
  
  let score = 0;
  
  // Exact phrase match
  if (contentLower.includes(queryLower)) {
    score += 100;
  }
  
  // Individual word matches
  queryWords.forEach(word => {
    const wordMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
    score += wordMatches * 10;
  });
  
  // Position bonus (earlier matches score higher)
  const firstMatch = contentLower.indexOf(queryLower);
  if (firstMatch !== -1) {
    score += Math.max(0, 50 - firstMatch);
  }
  
  return score;
}

// Main worker message handler
self.onmessage = function(e: MessageEvent<MessageProcessingTask>) {
  const { type, payload, id } = e.data;
  
  try {
    let result: any;
    
    switch (type) {
      case 'PARSE_MESSAGES':
        result = parseMessages(payload.messages);
        break;
        
      case 'SEARCH_MESSAGES':
        result = searchMessages(payload.messages, payload.query);
        break;
        
      case 'ANALYZE_SENTIMENT':
        result = analyzeSentiment(payload.text);
        break;
        
      case 'EXTRACT_KEYWORDS':
        result = extractKeywords(payload.text);
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    const response: MessageProcessingResult = {
      type,
      result,
      id,
    };
    
    self.postMessage(response);
    
  } catch (error) {
    const errorResponse: MessageProcessingResult = {
      type,
      result: null,
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    self.postMessage(errorResponse);
  }
};

export {}; // Make this a module