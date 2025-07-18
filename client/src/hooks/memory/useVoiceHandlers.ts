import { useState } from "react";
import { useToast } from "@shared/components/ui/use-toast";
import { useVoiceInput } from "../useVoiceInput";

export function useVoiceHandlers() {
  const [isVoiceInputActive, setIsVoiceInputActive] = useState<boolean>(false);
  const { toast } = useToast();

  const {
    isSupported: isVoiceSupported,
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoiceInput({
    onTranscript: () => {
      // Voice input handling is now managed by MemoryForm component
    },
    onError: (error) => {
      toast({
        title: "Voice Input Error",
        description: error,
        variant: "destructive",
      });
    },
    continuous: false,
    interimResults: true,
  });

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      setIsVoiceInputActive(false);
    } else {
      startListening();
      setIsVoiceInputActive(true);
    }
  };

  return {
    isVoiceInputActive,
    voiceInput: {
      isSupported: isVoiceSupported,
      isListening,
      isActive: isVoiceInputActive,
      transcript,
      interimTranscript,
      error: voiceError,
      onToggle: handleVoiceToggle,
    },
  };
}