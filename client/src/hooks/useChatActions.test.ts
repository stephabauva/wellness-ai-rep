import { renderHook, act, RenderHookOptions } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChatActions } from './useChatActions';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useFileManagement } from '@/hooks/useFileManagement';
import { useAppContext } from '@/context/AppContext';

// Mock dependencies
vi.mock('@/hooks/useChatMessages');
vi.mock('@/hooks/useFileManagement');
vi.mock('@/context/AppContext');

const mockSendMessageMutation = { mutate: vi.fn() };
const mockUploadFileMutation = { mutate: vi.fn(), isPending: false }; // Added isPending
const mockClearAttachedFiles = vi.fn();
const mockRemoveAttachedFile = vi.fn();

describe('useChatActions', () => {
  let mockSetInputMessage: ReturnType<typeof vi.fn>;
  let queryClient: QueryClient;

  // Helper to wrap hooks with QueryClientProvider
  const createWrapper = () => {
    // Create a new QueryClient for each test to ensure isolation
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for testing
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetInputMessage = vi.fn();

    (useChatMessages as vi.Mock).mockReturnValue({
      sendMessageMutation: mockSendMessageMutation,
    });

    (useFileManagement as vi.Mock).mockReturnValue({
      attachedFiles: [],
      setAttachedFiles: vi.fn(),
      clearAttachedFiles: mockClearAttachedFiles,
      uploadFileMutation: mockUploadFileMutation,
      removeAttachedFile: mockRemoveAttachedFile,
    });

    (useAppContext as vi.Mock).mockReturnValue({
      settings: {
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
        automaticModelSelection: false,
      },
      // Add other AppContext values if useChatActions depends on them
      refreshMessages: vi.fn(),
      setStreamingActive: vi.fn(),
      addOptimisticMessage: vi.fn(),
      updateOptimisticMessage: vi.fn(),
    });
  });

  it('should call sendMessageMutation with correct parameters on handleSendMessage', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatActions({
      inputMessage: 'Test message',
      setInputMessage: mockSetInputMessage,
      currentConversationId: 'conv123',
    }), { wrapper });

    act(() => {
      result.current.handleSendMessage();
    });

    expect(mockSendMessageMutation.mutate).toHaveBeenCalledWith({
      content: 'Test message',
      attachments: [],
      conversationId: 'conv123',
      aiProvider: 'openai',
      aiModel: 'gpt-4o',
      automaticModelSelection: false,
    });
    expect(mockSetInputMessage).toHaveBeenCalledWith('');
    expect(mockClearAttachedFiles).toHaveBeenCalled();
  });

  it('should handle file change and call uploadFileMutation', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatActions({
      inputMessage: '',
      setInputMessage: mockSetInputMessage,
      currentConversationId: null,
    }), { wrapper });

    const mockFile = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const mockEvent = {
      target: { files: [mockFile], value: '' } as unknown as HTMLInputElement,
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(mockEvent);
    });

    expect(mockUploadFileMutation.mutate).toHaveBeenCalledWith(mockFile);
    expect(mockEvent.target.value).toBe('');
  });

  it('should handle camera capture and call uploadFileMutation', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatActions({
      inputMessage: '',
      setInputMessage: mockSetInputMessage,
      currentConversationId: null,
    }), { wrapper });

    const mockFile = new File(['camera content'], 'camera.jpg', { type: 'image/jpeg' });
    const mockEvent = {
      target: { files: [mockFile], value: '' } as unknown as HTMLInputElement,
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCameraCapture(mockEvent);
    });

    expect(mockUploadFileMutation.mutate).toHaveBeenCalledWith(mockFile);
    expect(mockEvent.target.value).toBe('');
  });

  it('should use settings for automaticModelSelection when attachments are present', () => {
    const wrapper = createWrapper();
    (useAppContext as vi.Mock).mockReturnValue({
      settings: {
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
        automaticModelSelection: true,
      },
      refreshMessages: vi.fn(),
      setStreamingActive: vi.fn(),
      addOptimisticMessage: vi.fn(),
      updateOptimisticMessage: vi.fn(),
    });
     (useFileManagement as vi.Mock).mockReturnValue({
      attachedFiles: [{ id: 'file1', fileName: 'image.png', fileType: 'image/png', fileSize: 100 }],
      clearAttachedFiles: mockClearAttachedFiles,
      uploadFileMutation: mockUploadFileMutation,
      removeAttachedFile: mockRemoveAttachedFile,
    });


    const { result } = renderHook(() => useChatActions({
      inputMessage: 'Message with image',
      setInputMessage: mockSetInputMessage,
      currentConversationId: 'conv123',
    }), { wrapper });

    act(() => {
      result.current.handleSendMessage();
    });

    expect(mockSendMessageMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        automaticModelSelection: true,
      })
    );
  });

   it('should default automaticModelSelection to true if images are attached and settings.automaticModelSelection is undefined', () => {
    const wrapper = createWrapper();
    (useAppContext as vi.Mock).mockReturnValue({
      settings: {
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
        // automaticModelSelection is undefined
      },
      refreshMessages: vi.fn(),
      setStreamingActive: vi.fn(),
      addOptimisticMessage: vi.fn(),
      updateOptimisticMessage: vi.fn(),
    });
    (useFileManagement as vi.Mock).mockReturnValue({
      attachedFiles: [{ id: 'file1', fileName: 'image.png', fileType: 'image/png', fileSize:123 }],
      clearAttachedFiles: mockClearAttachedFiles,
      uploadFileMutation: mockUploadFileMutation,
      removeAttachedFile: mockRemoveAttachedFile,
    });

    const { result } = renderHook(() => useChatActions({
      inputMessage: 'Test with image',
      setInputMessage: mockSetInputMessage,
      currentConversationId: 'conv-img',
    }), { wrapper });

    act(() => {
      result.current.handleSendMessage();
    });

    expect(mockSendMessageMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        automaticModelSelection: true,
      })
    );
  });

  it('should not send message if input is empty and no attachments', () => {
    const wrapper = createWrapper();
    (useFileManagement as vi.Mock).mockReturnValue({
      attachedFiles: [],
      clearAttachedFiles: mockClearAttachedFiles,
      uploadFileMutation: mockUploadFileMutation,
      removeAttachedFile: mockRemoveAttachedFile,
    });
    const { result } = renderHook(() => useChatActions({
      inputMessage: '   ',
      setInputMessage: mockSetInputMessage,
      currentConversationId: 'conv456',
    }), { wrapper });

    act(() => {
      result.current.handleSendMessage();
    });

    expect(mockSendMessageMutation.mutate).not.toHaveBeenCalled();
    expect(mockSetInputMessage).not.toHaveBeenCalled();
    expect(mockClearAttachedFiles).not.toHaveBeenCalled();
  });
});
