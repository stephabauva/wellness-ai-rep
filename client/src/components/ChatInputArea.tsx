import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Camera, X } from "lucide-react"; // Added X for close button
import { AudioRecorder } from "@/components/AudioRecorder";
import { UseChatActionsReturn } from "@/hooks/useChatActions";
import { AppSettings } from "@shared";
import { AttachedFile } from "@shared/hooks/useFileManagement"; // Import AttachedFile

interface ChatInputAreaProps {
  inputMessage: string;
  setInputMessage: React.Dispatch<React.SetStateAction<string>>;
  chatActions: UseChatActionsReturn;
  settings: AppSettings | null | undefined; // Match AppContext type (settings is optional)
}

export function ChatInputArea({
  inputMessage,
  setInputMessage,
  chatActions,
  settings,
}: ChatInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Type assertion for chatActions to ensure correct types from the hook
  const {
    handleSendMessage,
    handleFileChange,
    handleCameraCapture,
    uploadFileMutation,
    sendMessageMutation,
    attachedFiles, // Used for disabling send button, now correctly typed as AttachedFile[] | null
  } = chatActions as UseChatActionsReturn;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment", // Use back camera on mobile if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      setCameraStream(stream);
      setIsCameraOpen(true);
      
      // Set video stream after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error) {
      console.error("Error accessing camera:", error);
      // Fallback to file input if camera access fails
      cameraInputRef.current?.click();
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a file from the blob
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `camera-capture-${timestamp}.png`, { type: 'image/png' });
        
        // Create a synthetic event to pass to handleCameraCapture
        const syntheticEvent = {
          target: {
            files: [file]
          }
        } as any;
        
        handleCameraCapture(syntheticEvent);
        closeCamera();
      }
    }, 'image/png', 0.9);
  };

  // Cleanup effect to stop camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className="border-t p-4">
      <div className="flex items-end gap-2">
        {/* File Upload Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadFileMutation.isPending}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Camera Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={openCamera}
          disabled={uploadFileMutation.isPending}
          aria-label="Use camera"
        >
          <Camera className="h-4 w-4" />
        </Button>

        {/* Audio Recording */}
        <AudioRecorder
          onTranscriptionComplete={(text) => {
            // Append transcription to existing message if there's already text
            setInputMessage(prev => prev.trim() ? `${prev} ${text}` : text);
          }}
          provider={(settings?.transcriptionProvider as any) || "webspeech"}
        />

        {/* Text Input */}
        <div className="flex-1">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sendMessageMutation.isPending}
            className="resize-none" // Consider using Textarea if multi-line is desired and not just auto-height
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={
            sendMessageMutation.isPending ||
            (!inputMessage.trim() &&
             (!attachedFiles || (attachedFiles as AttachedFile[]).length === 0) // Ensure attachedFiles is treated as array
            )
          }
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden File Inputs */}
      <input
        data-testid="file-input-upload"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        multiple
        className="hidden"
      />
      <input
        data-testid="file-input-camera"
        type="file"
        ref={cameraInputRef}
        onChange={handleCameraCapture}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg p-4 max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold">Take Photo</h3>
              <Button
                variant="outline"
                size="icon"
                onClick={closeCamera}
                aria-label="Close camera"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative flex-1 min-h-0 mb-4 overflow-hidden rounded-lg">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Overlay button positioned over video */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <Button
                  onClick={capturePhoto}
                  disabled={uploadFileMutation.isPending}
                  className="px-8 py-3 text-base bg-white/90 hover:bg-white text-black border shadow-lg backdrop-blur-sm"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Capture Photo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
