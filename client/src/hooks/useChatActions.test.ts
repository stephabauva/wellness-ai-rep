import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test

    mockSetInputMessage = vi.fn();

    (useChatMessages as vi.Mock).mockReturnValue({
      sendMessageMutation: mockSendMessageMutation,
    });

    (useFileManagement as vi.Mock).mockReturnValue({
      attachedFiles: [],
      setAttachedFiles: vi.fn(), // Mocked but not directly tested here
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
    });
  });

  it('should call sendMessageMutation with correct parameters on handleSendMessage', () => {
    const { result } = renderHook(() => useChatActions({
      inputMessage: 'Test message',
      setInputMessage: mockSetInputMessage,
      currentConversationId: 'conv123',
    }));

    act(() => {
      result.current.handleSendMessage();
    });

    expect(mockSendMessageMutation.mutate).toHaveBeenCalledWith({
      content: 'Test message',
      attachments: [],
      conversationId: 'conv123',
      aiProvider: 'openai',
      aiModel: 'gpt-4o',
      automaticModelSelection: false, // Based on mock settings
    });
    expect(mockSetInputMessage).toHaveBeenCalledWith('');
    expect(mockClearAttachedFiles).toHaveBeenCalled();
  });

  it('should handle file change and call uploadFileMutation', () => {
    const { result } = renderHook(() => useChatActions({
      inputMessage: '',
      setInputMessage: mockSetInputMessage,
      currentConversationId: null,
    }));

    const mockFile = new File(['dummy content'], 'example.png', { type: 'image/png' });
    const mockEvent = {
      target: { files: [mockFile], value: '' } as unknown as HTMLInputElement,
    } as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(mockEvent);
    });

    expect(mockUploadFileMutation.mutate).toHaveBeenCalledWith(mockFile);
    expect(mockEvent.target.value).toBe(''); // Check if input value is cleared
  });

  it('should handle camera capture and call uploadFileMutation', () => {
    const { result } = renderHook(() => useChatActions({
      inputMessage: '',
      setInputMessage: mockSetInputMessage,
      currentConversationId: null,
    }));

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
    (useAppContext as vi.Mock).mockReturnValue({
      settings: {
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
        automaticModelSelection: true, // Setting is true
      },
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
    }));

    act(() => {
      result.current.handleSendMessage();
    });

    expect(mockSendMessageMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        automaticModelSelection: true, // Should be true because settings.automaticModelSelection is true
      })
    );
  });

   it('should default automaticModelSelection to true if images are attached and settings.automaticModelSelection is undefined', () => {
    (useAppContext as vi.Mock).mockReturnValue({
      settings: { // automaticModelSelection is undefined here
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
      },
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
    }));

    act(() => {
      result.current.handleSendMessage();
    });

    expect(mockSendMessageMutation.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        automaticModelSelection: true, // Defaults to true due to image
      })
    );
  });

  it('should not send message if input is empty and no attachments', () => {
     (useFileManagement as vi.Mock).mockReturnValue({ // Ensure no attachments
      attachedFiles: [],
      clearAttachedFiles: mockClearAttachedFiles,
      uploadFileMutation: mockUploadFileMutation,
      removeAttachedFile: mockRemoveAttachedFile,
    });
    const { result } = renderHook(() => useChatActions({
      inputMessage: '   ', // Whitespace only
      setInputMessage: mockSetInputMessage,
      currentConversationId: 'conv456',
    }));

    act(() => {
      result.current.handleSendMessage();
    });

    expect(mockSendMessageMutation.mutate).not.toHaveBeenCalled();
    expect(mockSetInputMessage).not.toHaveBeenCalled();
    expect(mockClearAttachedFiles).not.toHaveBeenCalled();
  });
});
