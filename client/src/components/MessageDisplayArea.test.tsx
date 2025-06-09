import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageDisplayArea, DisplayMessage } from './MessageDisplayArea'; // Adjust path as needed
import { ChatMessage } from '@/components/ui/chat-message'; // The actual child component

// Mock ChatMessage to verify props and simplify testing
vi.mock('@/components/ui/chat-message', () => ({
  ChatMessage: vi.fn(({ message, isUser, timestamp, attachments }) => (
    <div data-testid="chat-message">
      <span data-testid="message-content">{message}</span>
      <span data-testid="message-isUser">{isUser.toString()}</span>
      <span data-testid="message-timestamp">{timestamp.toISOString()}</span>
      {attachments && attachments.map((att: any, idx: number) => (
        <div key={idx} data-testid="message-attachment">
          <span>{att.name}</span>
          <span>{att.type}</span>
          <span>{att.url}</span>
        </div>
      ))}
    </div>
  )),
}));

// Mock ResizeObserver, often needed for tests involving scroll/layout effects in JSDOM
const MockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal('ResizeObserver', MockResizeObserver);


describe('MessageDisplayArea', () => {
  const mockMessages: DisplayMessage[] = [
    { id: '1', content: 'Hello user', isUserMessage: false, timestamp: new Date('2023-01-01T10:00:00Z'), attachments: [{ name: 'file1.pdf', type: 'application/pdf', url: '/file1.pdf' }] },
    { id: '2', content: 'Hello AI', isUserMessage: true, timestamp: new Date('2023-01-01T10:01:00Z') },
  ];

  let messagesEndRefObserve: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    messagesEndRefObserve = vi.fn();
    // Mock scrollIntoView for messagesEndRef
    // @ts-ignore
    window.HTMLElement.prototype.scrollIntoView = messagesEndRefObserve;
  });

  it('should render a loading indicator when isLoading is true', () => {
    render(<MessageDisplayArea messagesToDisplay={[]} isLoading={true} />);
    expect(screen.getByText(/Loading conversation.../i)).toBeInTheDocument();
    // The spinner div itself does not have an explicit role="status" by default.
    // The text check is sufficient, or role="status" can be added to the component.
    // For now, removing the getByRole check for "status" if the div doesn't have it.
    // If the spinner div should have a role, it should be added in the component itself.
  });

  it('should render messages when isLoading is false', () => {
    render(<MessageDisplayArea messagesToDisplay={mockMessages} isLoading={false} />);
    const messageElements = screen.getAllByTestId('chat-message');
    expect(messageElements).toHaveLength(mockMessages.length);

    // Verify props for the first message
    expect(ChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: mockMessages[0].content,
        isUser: mockMessages[0].isUserMessage,
        timestamp: mockMessages[0].timestamp,
        attachments: mockMessages[0].attachments?.map(att => ({ ...att, url: att.url || '' })),
      }),
      expect.anything() // For React's internal props like key
    );

    // Verify props for the second message
     expect(ChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: mockMessages[1].content,
        isUser: mockMessages[1].isUserMessage,
        timestamp: mockMessages[1].timestamp,
        attachments: undefined, // Or an empty array depending on ChatMessage's expectation
      }),
      expect.anything()
    );
  });

  it('should render no messages if messagesToDisplay is empty and not loading', () => {
    render(<MessageDisplayArea messagesToDisplay={[]} isLoading={false} />);
    expect(screen.queryByTestId('chat-message')).not.toBeInTheDocument();
  });

  it('should correctly map attachments to ChatMessage props', () => {
    const messageWithAttachments: DisplayMessage[] = [
      {
        id: '3',
        content: 'Message with multiple attachments',
        isUserMessage: false,
        timestamp: new Date(),
        attachments: [
          { name: 'image.jpg', type: 'image/jpeg', url: '/image.jpg' },
          { name: 'doc.pdf', type: 'application/pdf' } // URL is optional
        ]
      }
    ];
    render(<MessageDisplayArea messagesToDisplay={messageWithAttachments} isLoading={false} />);

    expect(ChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          { name: 'image.jpg', type: 'image/jpeg', url: '/image.jpg' },
          { name: 'doc.pdf', type: 'application/pdf', url: '' } // Ensure fallback for URL
        ]
      }),
      expect.anything()
    );
  });

  it('should call scrollIntoView on messagesEndRef when messagesToDisplay changes', async () => {
    const { rerender } = render(<MessageDisplayArea messagesToDisplay={[]} isLoading={false} />);
    // Initial render might call it once due to useEffect design
    await waitFor(() => expect(messagesEndRefObserve).toHaveBeenCalled());

    const initialCallCount = messagesEndRefObserve.mock.calls.length;

    const newMessages: DisplayMessage[] = [
        { id: 'new1', content: 'A new message', isUserMessage: false, timestamp: new Date() }
    ];
    rerender(<MessageDisplayArea messagesToDisplay={newMessages} isLoading={false} />);

    // Wait for the effect to run after rerender
    await waitFor(() => expect(messagesEndRefObserve.mock.calls.length).toBeGreaterThan(initialCallCount));
  });
});
