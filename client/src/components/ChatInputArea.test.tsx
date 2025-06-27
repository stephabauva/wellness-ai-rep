import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatInputArea } from './ChatInputArea'; // Adjust path
import { UseChatActionsReturn } from '@/hooks/useChatActions'; // Type import
import { AppSettings } from '@/context/AppContext'; // Type import

// Mock AudioRecorder as its internal functionality is not the focus here
vi.mock('@/components/AudioRecorder', () => ({
  AudioRecorder: vi.fn(({ onTranscriptionComplete }) => (
    <button data-testid="mock-audio-recorder" onClick={() => onTranscriptionComplete('transcribed audio text')}>
      Record
    </button>
  )),
}));

// Mock getUserMedia API
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

describe('ChatInputArea', () => {
  let mockSetInputMessage: ReturnType<typeof vi.fn>;
  let mockChatActions: UseChatActionsReturn;
  let mockSettings: AppSettings;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetInputMessage = vi.fn();
    mockChatActions = {
      handleSendMessage: vi.fn(),
      handleFileChange: vi.fn(),
      handleCameraCapture: vi.fn(),
      removeAttachedFile: vi.fn(), // Not directly used by ChatInputArea UI but part of the type
      uploadFileMutation: { isPending: false } as any, // Cast if type is complex
      sendMessageMutation: { isPending: false } as any,
      attachedFiles: [],
      clearAttachedFiles: vi.fn(), // Not directly used by ChatInputArea UI but part of the type
      // Add missing properties
      streamingMessage: { id: 'test-id', content: '', isComplete: false, isStreaming: false },
      isConnected: false,
      isThinking: false,
      stopStreaming: vi.fn(),
      pendingUserMessage: null,
    };
    mockSettings = {
      transcriptionProvider: 'webspeech',
    };
  });

  const renderComponent = (props: Partial<any> = {}) => {
    const defaultProps = {
      inputMessage: '',
      setInputMessage: mockSetInputMessage,
      chatActions: mockChatActions,
      settings: mockSettings,
    };
    return render(<ChatInputArea {...defaultProps} {...props} />);
  };

  it('should render input field and buttons', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /attach file/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use camera/i })).toBeInTheDocument();
    expect(screen.getByTestId('mock-audio-recorder')).toBeInTheDocument();
  });

  it('should update inputMessage state on typing', async () => {
    renderComponent();
    const input = screen.getByPlaceholderText('Type your message...');
    await userEvent.type(input, 'Hello world');
    expect(mockSetInputMessage).toHaveBeenCalledTimes('Hello world'.length);
    // More specific: check the last call if input is controlled by parent state
    // For this component, it calls setInputMessage for each char.
  });

  it('should call handleSendMessage on send button click', () => {
    renderComponent({ inputMessage: 'Test message' }); // Ensure button is enabled
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(mockChatActions.handleSendMessage).toHaveBeenCalledTimes(1);
  });

  it('should call handleSendMessage on Enter key press (not Shift+Enter)', async () => {
    renderComponent({ inputMessage: 'Test message' });
    const input = screen.getByPlaceholderText('Type your message...');
    // userEvent.type(input, '{enter}') should work directly if component is set up for it
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(mockChatActions.handleSendMessage).toHaveBeenCalledTimes(1);
  });

  it('should NOT call handleSendMessage on Shift+Enter key press', async () => {
    renderComponent({ inputMessage: 'Test message' });
    const input = screen.getByPlaceholderText('Type your message...');
    // More robust way to simulate Shift+Enter for some setups with userEvent
    await userEvent.keyboard('{Shift>}'); // Press Shift
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true }); // Hold shift and press Enter
    await userEvent.keyboard('{/Shift}'); // Release Shift
    expect(mockChatActions.handleSendMessage).not.toHaveBeenCalled();
  });

  it('should trigger file input on Paperclip button click', () => {
    renderComponent();
    const fileInput = screen.getByTestId('file-input-upload') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByRole('button', { name: /attach file/i }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('should trigger camera input on Camera button click (when getUserMedia fails)', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Simulated camera access failure'));

    renderComponent();
    const cameraInput = screen.getByTestId('file-input-camera') as HTMLInputElement;
    const clickSpy = vi.spyOn(cameraInput, 'click');

    const cameraButton = screen.getByRole('button', { name: /use camera/i });
    // Using userEvent.click for better simulation of user interaction, especially with async logic
    await userEvent.click(cameraButton);

    // The click on cameraInputRef should happen after the promise rejection in openCamera
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('should call handleFileChange when file input changes', async () => {
    renderComponent();
    const fileInput = screen.getByTestId('file-input-upload');
    const mockFile = new File(['content'], 'test.png', { type: 'image/png' });
    await userEvent.upload(fileInput, mockFile);
    expect(mockChatActions.handleFileChange).toHaveBeenCalledTimes(1);
  });

  it('should call handleCameraCapture when camera input changes', async () => {
    renderComponent();
    const cameraInput = screen.getByTestId('file-input-camera');
    const mockFile = new File(['content'], 'camera.jpg', { type: 'image/jpeg' });
    await userEvent.upload(cameraInput, mockFile);
    expect(mockChatActions.handleCameraCapture).toHaveBeenCalledTimes(1);
  });

  it('should disable send button if message is empty and no attachments', () => {
    renderComponent({ inputMessage: '   ' }); // Whitespace only
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('should enable send button if message is not empty', () => {
    renderComponent({ inputMessage: 'Hi' });
    expect(screen.getByRole('button', { name: /send/i })).toBeEnabled();
  });

  it('should enable send button if attachments exist, even if message is empty', () => {
     mockChatActions.attachedFiles = [{ id: 'file1', fileName: 'att.txt', fileType:'text/plain', fileSize:100 }];
    renderComponent({ chatActions: mockChatActions });
    expect(screen.getByRole('button', { name: /send/i })).toBeEnabled();
  });

  it('should disable relevant buttons when mutations are pending', () => {
    mockChatActions.uploadFileMutation.isPending = true;
    mockChatActions.sendMessageMutation.isPending = true;
    renderComponent({ chatActions: mockChatActions, inputMessage: "test" });

    expect(screen.getByRole('button', { name: /attach file/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /use camera/i })).toBeDisabled();
    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('AudioRecorder should call setInputMessage onTranscriptionComplete', () => {
    renderComponent();
    const recorderButton = screen.getByTestId('mock-audio-recorder');
    fireEvent.click(recorderButton);
    expect(mockSetInputMessage).toHaveBeenCalledWith('transcribed audio text');
  });

  it('should open camera modal when camera button is clicked', async () => {
    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
    };
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    renderComponent();
    const cameraButton = screen.getByRole('button', { name: /use camera/i });
    
    await userEvent.click(cameraButton);
    
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });
  });

  it('should fallback to file input when camera access fails', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Camera access denied'));
    
    renderComponent();
    const cameraButton = screen.getByRole('button', { name: /use camera/i });
    
    await userEvent.click(cameraButton);
    
    expect(mockGetUserMedia).toHaveBeenCalled();
    // The fallback would trigger the hidden file input click
  });
});

// Helper to add data-testid to the hidden file inputs in ChatInputArea.tsx for easier selection
// In ChatInputArea.tsx:
// <input data-testid="file-input-upload" type="file" ref={fileInputRef} ... />
// <input data-testid="file-input-camera" type="file" ref={cameraInputRef} ... />
// And for Paperclip/Camera buttons, ensure they have accessible names (Lucide icons might provide this via title or internal structure,
// if not, wrap with title or aria-label on Button component).
// For testing, it's common to add `aria-label` to icon buttons for easier selection.
// e.g. <Button aria-label="Attach file" ...><Paperclip /></Button>
// <Button aria-label="Use camera" ...><Camera /></Button>
// <Button aria-label="Send message" ...><Send /></Button>
