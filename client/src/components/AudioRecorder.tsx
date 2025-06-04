import React, { useState, useEffect } from "react";
import { Mic, MicOff, Square, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { audioService, TranscriptionResult } from "@/services/audio-service";
import { TranscriptionProvider } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  provider: TranscriptionProvider;
  disabled?: boolean;
}

export function AudioRecorder({ onTranscriptionComplete, provider, disabled = false }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Check microphone permission on mount
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const permission = await audioService.requestMicrophonePermission();
      setHasPermission(permission);
    } catch (error) {
      setHasPermission(false);
    }
  };

  const handleWebSpeechRecording = async () => {
    if (isListening) {
      audioService.stopWebSpeech();
      setIsListening(false);
      setIsProcessing(false);
      return;
    }

    setIsListening(true);
    setIsProcessing(true);

    try {
      await audioService.transcribeWithWebSpeech(
        (text: string) => {
          onTranscriptionComplete(text);
          setIsProcessing(false);
          setIsListening(false);
          toast({
            title: "Speech recognized",
            description: "Text has been added to your message",
          });
        },
        (error: string) => {
          console.error('Web Speech error:', error);
          setIsProcessing(false);
          setIsListening(false);
          toast({
            title: "Speech recognition failed",
            description: error,
            variant: "destructive",
          });
        }
      );
    } catch (error) {
      setIsProcessing(false);
      setIsListening(false);
      toast({
        title: "Speech recognition error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleFileBasedRecording = async () => {
    if (isRecording) {
      try {
        setIsProcessing(true);
        const audioBlob = await audioService.stopRecording();
        setIsRecording(false);

        const result = await audioService.transcribe(audioBlob, provider);
        onTranscriptionComplete(result.text);
        
        toast({
          title: "Transcription complete",
          description: `Transcribed using ${provider.toUpperCase()}`,
        });
      } catch (error) {
        console.error('Transcription error:', error);
        toast({
          title: "Transcription failed",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      try {
        await audioService.startRecording();
        setIsRecording(true);
        toast({
          title: "Recording started",
          description: "Speak your message now",
        });
      } catch (error) {
        console.error('Recording error:', error);
        toast({
          title: "Recording failed",
          description: (error as Error).message || "Failed to start audio recording",
          variant: "destructive",
        });
      }
    }
  };

  const handleRecording = () => {
    if (provider === 'webspeech') {
      handleWebSpeechRecording();
    } else {
      handleFileBasedRecording();
    }
  };

  const getProviderStatus = () => {
    const availability = audioService.getProviderAvailability(isOnline);
    return availability[provider];
  };

  const getButtonVariant = () => {
    return "outline";
  };

  const getButtonIcon = () => {
    if (isProcessing || isRecording || isListening) return <Mic className="h-4 w-4 text-red-500 animate-pulse" />;
    return <Mic className="h-4 w-4" />;
  };

  const getButtonText = () => {
    if (isProcessing) return "Processing...";
    if (provider === 'webspeech') {
      return isListening ? "Stop listening" : "Start speaking";
    }
    return isRecording ? "Stop recording" : "Start recording";
  };

  const providerStatus = getProviderStatus();
  const isProviderAvailable = providerStatus.available;
  const requiresInternet = providerStatus.requiresInternet;

  const isDisabled = disabled || 
    !hasPermission || 
    !isProviderAvailable || 
    (requiresInternet && !isOnline);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={getButtonVariant()}
        size="sm"
        onClick={handleRecording}
        disabled={isDisabled}
        className="flex items-center gap-2"
      >
        {getButtonIcon()}
        <span className="hidden sm:inline">{getButtonText()}</span>
      </Button>
      
      {requiresInternet && (
        <div className="flex items-center">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
        </div>
      )}
      
      {!hasPermission && (
        <Button
          variant="ghost"
          size="sm"
          onClick={checkMicrophonePermission}
          className="text-xs"
        >
          Grant mic access
        </Button>
      )}
    </div>
  );
}