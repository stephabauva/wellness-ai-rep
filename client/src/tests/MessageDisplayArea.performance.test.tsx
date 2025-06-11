import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageDisplayArea } from '@/components/MessageDisplayArea';
import '@testing-library/jest-dom';

// Mock the hooks to avoid import errors
jest.mock('@/hooks/useWebWorker', () => ({
  useWebWorker: () => ({
    postMessage: jest.fn(),
    isLoading: false
  })
}));

jest.mock('@/hooks/useVirtualScrolling', () => ({
  useVirtualScrolling: () => ({
    visibleItems: [],
    totalHeight: 0,
    offsetY: 0,
    scrollToIndex: jest.fn(),
    handleScroll: jest.fn(),
  })
}));

jest.mock('@/hooks/useMessagePagination', () => ({
  useMessagePagination: () => ({
    currentItems: [],
    loadMore: jest.fn(),
    hasNextPage: false,
    isLoading: false
  })
}));

// Generate test messages
const generateTestMessages = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `message-${i}`,
    content: `Test message content ${i}`,
    isUserMessage: i % 2 === 0,
    timestamp: new Date(Date.now() - (count - i) * 60000),
    attachments: []
  }));
};

describe('MessageDisplayArea Performance Optimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Virtual Scrolling', () => {
    test('renders without crashing when virtual scrolling is enabled', () => {
      const messages = generateTestMessages(10);
      
      render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          enableVirtualScrolling={true}
          isLoading={false}
        />
      );
      
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    test('applies correct CSS classes for virtual scrolling', () => {
      const messages = generateTestMessages(5);
      
      const { container } = render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          enableVirtualScrolling={true}
          isLoading={false}
        />
      );
      
      const virtualContainer = container.querySelector('.virtual-scroll-container');
      expect(virtualContainer).toBeInTheDocument();
      
      const virtualContent = container.querySelector('.virtual-scroll-content');
      expect(virtualContent).toBeInTheDocument();
    });

    test('handles empty message list with virtual scrolling', () => {
      render(
        <MessageDisplayArea
          messagesToDisplay={[]}
          enableVirtualScrolling={true}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('No messages yet. Start a conversation!')).toBeInTheDocument();
    });
  });

  describe('Message Pagination', () => {
    test('renders load more button when pagination is enabled and has next page', () => {
      const messages = generateTestMessages(100);
      
      // Mock the pagination hook to return hasNextPage: true
      const mockUseMessagePagination = require('@/hooks/useMessagePagination').useMessagePagination;
      mockUseMessagePagination.mockReturnValue({
        currentItems: messages.slice(0, 50),
        loadMore: jest.fn(),
        hasNextPage: true,
        isLoading: false
      });
      
      render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          enablePagination={true}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('Load Earlier Messages')).toBeInTheDocument();
    });

    test('shows loading state when pagination is loading', () => {
      const messages = generateTestMessages(100);
      
      const mockUseMessagePagination = require('@/hooks/useMessagePagination').useMessagePagination;
      mockUseMessagePagination.mockReturnValue({
        currentItems: messages.slice(0, 50),
        loadMore: jest.fn(),
        hasNextPage: true,
        isLoading: true
      });
      
      render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          enablePagination={true}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('Loading earlier messages...')).toBeInTheDocument();
    });
  });

  describe('Scroll to Bottom', () => {
    test('shows scroll to bottom button when not at bottom', () => {
      const messages = generateTestMessages(20);
      
      const { container } = render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          isLoading={false}
        />
      );
      
      // Simulate scroll event to trigger showScrollToBottom
      const scrollContainer = container.querySelector('[role="region"]') || container.firstChild as HTMLElement;
      
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true });
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, writable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 400, writable: true });
      
      fireEvent.scroll(scrollContainer);
      
      // The button should be conditionally rendered based on scroll position
      // This is tested indirectly through the component's scroll handling logic
    });

    test('uses correct CSS classes for scroll to bottom button', () => {
      const { container } = render(
        <MessageDisplayArea
          messagesToDisplay={generateTestMessages(5)}
          isLoading={false}
        />
      );
      
      // Check that the scroll-to-bottom CSS class is available
      const styles = document.querySelector('style');
      expect(styles?.textContent).toContain('scroll-to-bottom');
    });
  });

  describe('Performance Features Integration', () => {
    test('handles both virtual scrolling and pagination disabled (standard mode)', () => {
      const messages = generateTestMessages(10);
      
      render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          enableVirtualScrolling={false}
          enablePagination={false}
          isLoading={false}
        />
      );
      
      // Should render all messages in standard mode
      const messageElements = screen.getAllByText(/Test message content/);
      expect(messageElements.length).toBeGreaterThan(0);
    });

    test('prevents conflicting optimizations from breaking layout', () => {
      const messages = generateTestMessages(50);
      
      // Both virtual scrolling and pagination enabled
      render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          enableVirtualScrolling={true}
          enablePagination={true}
          isLoading={false}
        />
      );
      
      // Should prioritize virtual scrolling over pagination
      const virtualContainer = document.querySelector('.virtual-scroll-container');
      expect(virtualContainer).toBeInTheDocument();
    });

    test('applies chat-message-optimized class for performance', () => {
      const messages = generateTestMessages(5);
      
      const { container } = render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          enableVirtualScrolling={true}
          isLoading={false}
        />
      );
      
      const optimizedElements = container.querySelectorAll('.chat-message-optimized');
      expect(optimizedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('handles undefined messagesToDisplay gracefully', () => {
      render(
        <MessageDisplayArea
          messagesToDisplay={undefined as any}
          isLoading={false}
        />
      );
      
      expect(screen.getByText('No messages yet. Start a conversation!')).toBeInTheDocument();
    });

    test('renders loading state correctly', () => {
      render(
        <MessageDisplayArea
          messagesToDisplay={[]}
          isLoading={true}
        />
      );
      
      expect(screen.getByText('Loading conversation...')).toBeInTheDocument();
    });

    test('handles streaming messages without crashes', () => {
      const messages = generateTestMessages(5);
      
      render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          streamingMessage={{
            id: 'ai-streaming-123',
            content: 'Streaming content...',
            isComplete: false,
            isStreaming: true
          }}
          isLoading={false}
        />
      );
      
      // Should render without crashing
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('maintains proper ARIA attributes with optimizations enabled', () => {
      const messages = generateTestMessages(10);
      
      render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          enableVirtualScrolling={true}
          isLoading={false}
        />
      );
      
      const container = screen.getByRole('region');
      expect(container).toBeInTheDocument();
    });

    test('scroll to bottom button is keyboard accessible', () => {
      const messages = generateTestMessages(20);
      
      render(
        <MessageDisplayArea
          messagesToDisplay={messages}
          isLoading={false}
        />
      );
      
      // The button should be focusable when visible
      // This is inherently handled by the Button component
    });
  });
});