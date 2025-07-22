import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Zap, ZapOff, Check, X, RefreshCw } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { cn } from '@shared';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

interface CameraError {
  type: 'permission' | 'hardware' | 'connection' | 'unknown';
  message: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasFlash, setHasFlash] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError({
          type: 'hardware',
          message: 'Camera is not supported in this browser'
        });
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);

        // Check for flash support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.();
        setHasFlash(!!(capabilities as any)?.torch);
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      
      if (error.name === 'NotAllowedError') {
        setCameraError({
          type: 'permission',
          message: 'Camera permission denied. Please allow camera access and try again.'
        });
      } else if (error.name === 'NotFoundError') {
        setCameraError({
          type: 'hardware',
          message: 'No camera found on this device.'
        });
      } else {
        setCameraError({
          type: 'connection',
          message: 'Unable to connect to camera. Please try again.'
        });
      }
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setFlashEnabled(false);
  }, []);

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current || !hasFlash) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const newFlashState = !flashEnabled;
      
      await track.applyConstraints({
        advanced: [{ torch: newFlashState } as any]
      });
      
      setFlashEnabled(newFlashState);
    } catch (error) {
      console.error('Flash toggle error:', error);
    }
  }, [flashEnabled, hasFlash]);

  const flipCamera = useCallback(async () => {
    setIsRetaking(true);
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    
    setTimeout(() => {
      startCamera();
      setIsRetaking(false);
    }, 100);
  }, [startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);
    
    // Get the image data
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    
    stopCamera();
  }, [stopCamera]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const handleConfirm = useCallback(() => {
    if (!capturedImage) return;

    // Convert data URL to File
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `camera-capture-${timestamp}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        onCapture(file);
      }
    }, 'image/jpeg', 0.8);
  }, [capturedImage, onCapture]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Error state
  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <Camera className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Camera Access Error
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {cameraError.message}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {cameraError.type === 'permission' || cameraError.type === 'connection' ? (
            <Button onClick={startCamera}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  // Captured image preview
  if (capturedImage) {
    return (
      <div className="flex flex-col h-96">
        <div className="flex-1 relative bg-black rounded-t-lg overflow-hidden">
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
          <Button variant="outline" onClick={handleRetake}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake
          </Button>
          <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
            <Check className="h-4 w-4 mr-2" />
            Use Photo
          </Button>
        </div>
      </div>
    );
  }

  // Camera streaming view
  return (
    <div className="flex flex-col h-96">
      {/* Video viewport */}
      <div className="flex-1 relative bg-black rounded-t-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Loading overlay */}
        {(!isStreaming || isRetaking) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center text-white">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
              <span className="text-sm">
                {isRetaking ? 'Switching camera...' : 'Starting camera...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Camera controls */}
      <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
        <div className="flex gap-2">
          {/* Flash toggle */}
          {hasFlash && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFlash}
              className={cn(
                "p-2",
                flashEnabled && "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300"
              )}
            >
              {flashEnabled ? (
                <Zap className="h-4 w-4 text-yellow-600" />
              ) : (
                <ZapOff className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {/* Camera flip */}
          <Button
            variant="outline"
            size="sm"
            onClick={flipCamera}
            disabled={isRetaking}
            className="p-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRetaking && "animate-spin")} />
          </Button>
        </div>

        {/* Capture button */}
        <Button
          onClick={capturePhoto}
          disabled={!isStreaming || isRetaking}
          className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-full bg-gray-800" />
        </Button>

        {/* Cancel button */}
        <Button variant="outline" onClick={onClose} className="p-2">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden canvas for image capture */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />
    </div>
  );
};

export default CameraCapture;