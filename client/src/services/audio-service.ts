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
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      }
    }
  }

  private getFilenameFromMimeType(mimeType: string): string {
    if (mimeType.includes('webm')) return 'recording.webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'recording.mp4';
    if (mimeType.includes('ogg')) return 'recording.ogg';
    if (mimeType.includes('wav')) return 'recording.wav';
    if (mimeType.includes('mp3')) return 'recording.mp3';
    
    if (this.supportedMimeType.includes('mp4')) return 'recording.mp4';
    if (this.supportedMimeType.includes('webm')) return 'recording.webm';
    if (this.supportedMimeType.includes('ogg')) return 'recording.ogg';
    if (this.supportedMimeType.includes('wav')) return 'recording.wav';
    
    return 'recording.mp4';
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
      
      const options: MediaRecorderOptions = {};
      if (this.supportedMimeType) {
        options.mimeType = this.supportedMimeType;
      }
      
      try {
        this.mediaRecorder = new MediaRecorder(this.stream, options);
      } catch (mimeError) {
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
        const mimeType = this.mediaRecorder?.mimeType || this.supportedMimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private isUserStoppedWebSpeech = false;
  private webSpeechTimeout: NodeJS.Timeout | null = null;
  private finalTranscript = '';

  async transcribeWithWebSpeech(onResult: (text: string) => void, onError: (error: string) => void): Promise<void> {
    if (!this.recognition) {
      throw new Error('Web Speech API not supported in this browser');
    }

    this.isUserStoppedWebSpeech = false;
    this.finalTranscript = '';
    
    // Clear any existing timeout
    if (this.webSpeechTimeout) {
      clearTimeout(this.webSpeechTimeout);
      this.webSpeechTimeout = null;
    }

    return new Promise((resolve, reject) => {
      let hasReceivedSpeech = false;

      this.recognition.onresult = (event: any) => {
        hasReceivedSpeech = true;
        let interimTranscript = '';
        
        // Process all results
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            this.finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Clear existing timeout and set a new one
        if (this.webSpeechTimeout) {
          clearTimeout(this.webSpeechTimeout);
        }

        // Set timeout for 3 seconds of silence after speech
        this.webSpeechTimeout = setTimeout(() => {
          if (!this.isUserStoppedWebSpeech && this.finalTranscript.trim()) {
            onResult(this.finalTranscript.trim());
            this.stopWebSpeech();
            resolve();
          }
        }, 3000);
      };

      this.recognition.onerror = (event: any) => {
        // Clear timeout on error
        if (this.webSpeechTimeout) {
          clearTimeout(this.webSpeechTimeout);
          this.webSpeechTimeout = null;
        }

        // Don't treat user-initiated stops as errors
        if (event.error === 'aborted' && this.isUserStoppedWebSpeech) {
          if (this.finalTranscript.trim()) {
            onResult(this.finalTranscript.trim());
          }
          resolve();
          return;
        }
        
        const errorMessage = `Speech recognition error: ${event.error}`;
        onError(errorMessage);
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        // Clear timeout when recognition ends
        if (this.webSpeechTimeout) {
          clearTimeout(this.webSpeechTimeout);
          this.webSpeechTimeout = null;
        }

        // If user manually stopped and we have text, return it
        if (this.isUserStoppedWebSpeech && this.finalTranscript.trim()) {
          onResult(this.finalTranscript.trim());
        }

        // Restart recognition if it ended unexpectedly and user hasn't stopped manually
        if (!this.isUserStoppedWebSpeech && hasReceivedSpeech && this.finalTranscript.trim()) {
          // Speech ended naturally after receiving input, return the result
          onResult(this.finalTranscript.trim());
          resolve();
        } else if (!this.isUserStoppedWebSpeech && !hasReceivedSpeech) {
          // Recognition ended without any speech, try to restart
          setTimeout(() => {
            if (!this.isUserStoppedWebSpeech) {
              try {
                this.recognition.start();
              } catch (e) {
                // If restart fails, resolve gracefully
                resolve();
              }
            }
          }, 100);
        } else {
          resolve();
        }
      };

      this.recognition.start();
    });
  }

  stopWebSpeech(): void {
    if (this.recognition) {
      this.isUserStoppedWebSpeech = true;
      
      // Clear any pending timeout
      if (this.webSpeechTimeout) {
        clearTimeout(this.webSpeechTimeout);
        this.webSpeechTimeout = null;
      }
      
      this.recognition.stop();
    }
  }

  async transcribeWithOpenAI(audioBlob: Blob): Promise<TranscriptionResult> {
    const formData = new FormData();
    const filename = this.getFilenameFromMimeType(audioBlob.type);
    formData.append('audio', audioBlob, filename);

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
    const filename = this.getFilenameFromMimeType(audioBlob.type);
    formData.append('audio', audioBlob, filename);

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
    
    // Clean up Web Speech API resources
    if (this.webSpeechTimeout) {
      clearTimeout(this.webSpeechTimeout);
      this.webSpeechTimeout = null;
    }
    this.isUserStoppedWebSpeech = false;
    this.finalTranscript = '';
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