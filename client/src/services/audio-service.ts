import { TranscriptionProvider } from "@shared/schema";

export interface AudioRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  audioBlob: Blob | null;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  provider: TranscriptionProvider;
}

export interface AudioServiceConfig {
  provider: TranscriptionProvider;
  onlineStatus: boolean;
}

class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private recognition: any = null;
  private supportedMimeType: string = '';

  constructor() {
    this.setupWebSpeechAPI();
    this.detectSupportedMimeType();
  }

  private detectSupportedMimeType(): void {
    // Try different MIME types in order of preference
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        this.supportedMimeType = mimeType;
        console.log(`Audio recording will use MIME type: ${mimeType}`);
        break;
      }
    }

    if (!this.supportedMimeType) {
      console.warn('No supported audio MIME type found, will use browser default');
      this.supportedMimeType = '';
    }
  }

  private setupWebSpeechAPI() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
      }
    }
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    try {
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      this.audioChunks = [];
      
      // Create MediaRecorder with supported MIME type or let browser choose default
      const options: MediaRecorderOptions = {};
      if (this.supportedMimeType) {
        options.mimeType = this.supportedMimeType;
      }
      
      try {
        this.mediaRecorder = new MediaRecorder(this.stream, options);
      } catch (mimeError) {
        // If MIME type fails, try without specifying one
        console.warn('Failed to create MediaRecorder with specified MIME type, trying default');
        this.mediaRecorder = new MediaRecorder(this.stream);
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      this.mediaRecorder.start();
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to start recording: ${(error as Error).message}`);
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Use the actual MIME type from the MediaRecorder or fallback to detected type
        const mimeType = this.mediaRecorder?.mimeType || this.supportedMimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  async transcribeWithWebSpeech(onResult: (text: string) => void, onError: (error: string) => void): Promise<void> {
    if (!this.recognition) {
      throw new Error('Web Speech API not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        resolve();
      };

      this.recognition.onerror = (event: any) => {
        const errorMessage = `Speech recognition error: ${event.error}`;
        onError(errorMessage);
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        resolve();
      };

      this.recognition.start();
    });
  }

  stopWebSpeech(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  async transcribeWithOpenAI(audioBlob: Blob): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch('/api/transcribe/openai', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'OpenAI transcription failed');
    }

    const result = await response.json();
    return {
      ...result,
      provider: 'openai' as TranscriptionProvider
    };
  }

  async transcribeWithGoogle(audioBlob: Blob): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch('/api/transcribe/google', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Google transcription failed');
    }

    const result = await response.json();
    return {
      ...result,
      provider: 'google' as TranscriptionProvider
    };
  }

  async transcribe(audioBlob: Blob, provider: TranscriptionProvider): Promise<TranscriptionResult> {
    switch (provider) {
      case 'openai':
        return this.transcribeWithOpenAI(audioBlob);
      case 'google':
        return this.transcribeWithGoogle(audioBlob);
      case 'webspeech':
        throw new Error('Web Speech API should be used for real-time transcription');
      default:
        throw new Error(`Unknown transcription provider: ${provider}`);
    }
  }

  cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  isWebSpeechSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  getProviderAvailability(isOnline: boolean) {
    return {
      webspeech: {
        available: this.isWebSpeechSupported(),
        requiresInternet: false,
        realTime: true
      },
      openai: {
        available: isOnline,
        requiresInternet: true,
        realTime: false
      },
      google: {
        available: isOnline,
        requiresInternet: true,
        realTime: false
      }
    };
  }
}

export const audioService = new AudioService();