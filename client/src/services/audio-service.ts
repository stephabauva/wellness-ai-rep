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
  private supportedMimeType: string = "";

  constructor() {
    this.setupWebSpeechAPI();
    this.detectSupportedMimeType();
  }

  private detectSupportedMimeType(): void {
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];

    for (const mimeType of mimeTypes) {
      if (
        typeof window !== "undefined" &&
        MediaRecorder.isTypeSupported(mimeType)
      ) {
        this.supportedMimeType = mimeType;
        console.log(`Audio recording will use MIME type: ${mimeType}`);
        break;
      }
    }

    if (!this.supportedMimeType) {
      console.warn(
        "No supported audio MIME type found, will use browser default",
      );
      this.supportedMimeType = "";
    }
  }

  private setupWebSpeechAPI() {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US"; // Or make this configurable
      }
    }
  }

  private getFilenameFromMimeType(mimeType: string): string {
    if (mimeType.includes("webm")) return "recording.webm";
    if (mimeType.includes("mp4") || mimeType.includes("m4a"))
      return "recording.mp4";
    if (mimeType.includes("ogg")) return "recording.ogg";
    if (mimeType.includes("wav")) return "recording.wav";
    if (mimeType.includes("mp3")) return "recording.mp3";

    if (this.supportedMimeType.includes("mp4")) return "recording.mp4";
    if (this.supportedMimeType.includes("webm")) return "recording.webm";
    if (this.supportedMimeType.includes("ogg")) return "recording.ogg";
    if (this.supportedMimeType.includes("wav")) return "recording.wav";

    return "recording.mp4"; // A sensible default
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    try {
      if (typeof window === "undefined" || !window.MediaRecorder) {
        throw new Error("MediaRecorder is not supported in this browser");
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioChunks = [];

      const options: MediaRecorderOptions = {};
      if (this.supportedMimeType) {
        options.mimeType = this.supportedMimeType;
      }

      try {
        this.mediaRecorder = new MediaRecorder(this.stream, options);
      } catch (mimeError) {
        console.warn(
          "Failed to create MediaRecorder with specified MIME type, trying default",
        );
        this.mediaRecorder = new MediaRecorder(this.stream); // Fallback to default
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        // Potentially call an error handler if one is passed to startRecording
      };

      this.mediaRecorder.start();
    } catch (error) {
      this.cleanupRecordingResources(); // More specific cleanup
      throw new Error(`Failed to start recording: ${(error as Error).message}`);
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        // If already stopped or never started, resolve with what we have or an empty blob
        const mimeType =
          this.mediaRecorder?.mimeType ||
          this.supportedMimeType ||
          "audio/webm";
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanupRecordingResources();
        if (audioBlob.size > 0) {
          resolve(audioBlob);
        } else {
          reject(new Error("No audio data recorded or recording not active."));
        }
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType =
          this.mediaRecorder?.mimeType ||
          this.supportedMimeType ||
          "audio/webm";
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanupRecordingResources();
        resolve(audioBlob);
      };

      // Ensure ondataavailable has a chance to fire for the last chunk
      this.mediaRecorder.requestData?.();
      this.mediaRecorder.stop();
    });
  }

  private isUserStoppedWebSpeech = false;
  private webSpeechTimeout: NodeJS.Timeout | null = null;
  private finalTranscript = "";
  private hasReceivedAnySpeech = false;
  private _isResultSentOrPromiseSettled = false; // New flag

  async transcribeWithWebSpeech(
    onResult: (text: string) => void,
    onError: (error: string) => void,
  ): Promise<void> {
    if (!this.recognition) {
      onError("Web Speech API not supported in this browser");
      return Promise.reject(
        new Error("Web Speech API not supported in this browser"),
      );
    }

    // Reset state for this transcription attempt
    this.isUserStoppedWebSpeech = false;
    this.finalTranscript = "";
    this.hasReceivedAnySpeech = false;
    this._isResultSentOrPromiseSettled = false; // CRITICAL: Reset this flag

    if (this.webSpeechTimeout) {
      clearTimeout(this.webSpeechTimeout);
      this.webSpeechTimeout = null;
    }

    return new Promise((resolve, reject) => {
      let lastProcessedResultIndex = -1;

      // Abort any previous recognition instance just in case
      // This can happen if transcribeWithWebSpeech is called rapidly
      try {
        this.recognition.abort();
      } catch (e) {
        // Ignore errors from aborting if not running
      }

      this.recognition.onstart = () => {
        // console.log('Web Speech: onstart');
        lastProcessedResultIndex = -1; // Reset for new session
        // this.finalTranscript = ''; // Already reset above
      };

      this.recognition.onresult = (event: any) => {
        // console.log('Web Speech: onresult', event.results);
        if (this._isResultSentOrPromiseSettled) return; // Already done

        this.hasReceivedAnySpeech = true;
        // let interimTranscript = ''; // Not strictly needed if only using finalTranscript for onResult

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          // More robust iteration
          if (event.results[i].isFinal) {
            // Only append if it's a new final result not already part of finalTranscript
            // This simple concatenation can still lead to duplicates if API sends overlapping final results.
            // A more robust approach might involve comparing timestamps or more complex diffing if needed.
            // For now, the lastProcessedResultIndex should guard against reprocessing the same segment.
            if (i > lastProcessedResultIndex) {
              this.finalTranscript += event.results[i][0].transcript + " ";
              lastProcessedResultIndex = i;
            }
          }
          // else {
          //   interimTranscript += event.results[i][0].transcript;
          // }
        }

        if (this.webSpeechTimeout) {
          clearTimeout(this.webSpeechTimeout);
        }

        this.webSpeechTimeout = setTimeout(() => {
          // console.log('Web Speech: timeout fired');
          if (this._isResultSentOrPromiseSettled) return;

          if (!this.isUserStoppedWebSpeech) {
            // Only if user hasn't manually stopped
            this._isResultSentOrPromiseSettled = true;
            if (this.finalTranscript.trim()) {
              onResult(this.finalTranscript.trim());
            }
            this.stopWebSpeechInternal(); // Stop recognition, will trigger onend
            resolve();
          }
        }, 5000); // 5 seconds of silence
      };

      this.recognition.onerror = (event: any) => {
        // console.log('Web Speech: onerror', event.error);
        if (this._isResultSentOrPromiseSettled) return;

        if (this.webSpeechTimeout) {
          clearTimeout(this.webSpeechTimeout);
          this.webSpeechTimeout = null;
        }

        // 'aborted' is often due to stopWebSpeech() or internal API stop.
        // 'no-speech' means silence detected.
        // 'network' can happen.
        // 'audio-capture' means mic issues.
        // 'not-allowed' means permission denied mid-way or revoked.

        if (event.error === "aborted" && this.isUserStoppedWebSpeech) {
          // User manually stopped, this is an expected "abort"
          this._isResultSentOrPromiseSettled = true;
          if (this.finalTranscript.trim()) {
            onResult(this.finalTranscript.trim());
          }
          resolve();
          return;
        }

        // For other errors, or 'aborted' not by user, or 'no-speech' if we want to treat it as an error
        this._isResultSentOrPromiseSettled = true;
        const errorMessage = `Speech recognition error: ${event.error}`;
        onError(errorMessage);
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        // console.log('Web Speech: onend. isUserStopped:', this.isUserStoppedWebSpeech, 'hasSpeech:', this.hasReceivedAnySpeech, 'resultSent:', this._isResultSentOrPromiseSettled);
        if (this._isResultSentOrPromiseSettled) {
          // If promise is already settled (e.g., by timeout or error), just ensure cleanup
          if (this.webSpeechTimeout) {
            clearTimeout(this.webSpeechTimeout);
            this.webSpeechTimeout = null;
          }
          return;
        }
        this._isResultSentOrPromiseSettled = true; // Mark as settled now

        if (this.webSpeechTimeout) {
          clearTimeout(this.webSpeechTimeout);
          this.webSpeechTimeout = null;
        }

        // If onend is reached and result wasn't sent by timeout or error:
        // This path covers natural end of speech or manual stop that didn't hit timeout.
        if (this.finalTranscript.trim()) {
          onResult(this.finalTranscript.trim());
        }
        resolve();

        // Original restart logic:
        // This was causing issues. Generally, once a transcription session is explicitly started,
        // it should run until it's explicitly stopped, times out, or errors.
        // Automatic restarts can be very confusing and lead to unexpected behavior.
        // If you need continuous "listen for keyword then transcribe" style, that's a different pattern.
        // For a single "transcribe this utterance" call, no restart is desired.
        /*
        if (!this.isUserStoppedWebSpeech && !this.hasReceivedAnySpeech) {
          setTimeout(() => {
            if (!this.isUserStoppedWebSpeech && !this._isResultSentOrPromiseSettled) { // Check again
              try {
                console.log("Web Speech: Attempting restart due to no speech received before onend");
                this.recognition.start(); // This would need a new Promise logic or be outside this one.
              } catch (e) {
                console.error("Web Speech: Restart failed", e);
                resolve(); // Resolve gracefully if restart fails
              }
            }
          }, 100);
        } else {
          resolve();
        }
        */
      };

      try {
        // console.log('Web Speech: starting recognition');
        this.recognition.start();
      } catch (e: any) {
        // console.error('Web Speech: Failed to start recognition', e);
        if (!this._isResultSentOrPromiseSettled) {
          this._isResultSentOrPromiseSettled = true;
          const message =
            e.name === "InvalidStateError"
              ? "Speech recognition already active or ended."
              : "Failed to start speech recognition.";
          onError(message);
          reject(new Error(message));
        }
      }
    });
  }

  // Renamed to avoid confusion with the public stopWebSpeech
  private stopWebSpeechInternal(): void {
    if (this.recognition) {
      // this.isUserStoppedWebSpeech is set by the public stopWebSpeech()
      if (this.webSpeechTimeout) {
        clearTimeout(this.webSpeechTimeout);
        this.webSpeechTimeout = null;
      }
      try {
        this.recognition.stop(); // This will trigger onend
      } catch (e) {
        // console.warn("Error stopping recognition (already stopped?):", e);
      }
    }
  }

  public stopWebSpeech(): void {
    // console.log('Web Speech: public stopWebSpeech called');
    this.isUserStoppedWebSpeech = true; // Signal user initiated stop
    this.stopWebSpeechInternal();
    // The promise resolution is handled by onend or onerror triggered by recognition.stop()
  }

  async transcribeWithOpenAI(audioBlob: Blob): Promise<TranscriptionResult> {
    const formData = new FormData();
    const filename = this.getFilenameFromMimeType(audioBlob.type);
    formData.append("audio", audioBlob, filename);

    const response = await fetch("/api/transcribe/openai", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({
          details: "OpenAI transcription failed with non-JSON response",
        }));
      throw new Error(errorData.details || "OpenAI transcription failed");
    }

    const result = await response.json();
    return {
      ...result,
      provider: "openai" as TranscriptionProvider,
    };
  }

  async transcribeWithGoogle(audioBlob: Blob): Promise<TranscriptionResult> {
    const formData = new FormData();
    const filename = this.getFilenameFromMimeType(audioBlob.type);
    formData.append("audio", audioBlob, filename);

    const response = await fetch("/api/transcribe/google", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({
          details: "Google transcription failed with non-JSON response",
        }));
      throw new Error(errorData.details || "Google transcription failed");
    }

    const result = await response.json();
    return {
      ...result,
      provider: "google" as TranscriptionProvider,
    };
  }

  async transcribe(
    audioBlob: Blob,
    provider: TranscriptionProvider,
  ): Promise<TranscriptionResult> {
    switch (provider) {
      case "openai":
        return this.transcribeWithOpenAI(audioBlob);
      case "google":
        return this.transcribeWithGoogle(audioBlob);
      case "webspeech":
        // This method is not meant for blob transcription directly.
        // The transcribeWithWebSpeech is for real-time.
        throw new Error(
          "Web Speech API is for real-time. Use transcribeWithWebSpeech method for that flow.",
        );
      default:
        throw new Error(`Unknown transcription provider: ${provider}`);
    }
  }

  // Specific cleanup for MediaRecorder resources
  private cleanupRecordingResources(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null; // It's already stopped or inactive
    this.audioChunks = [];
  }

  // General cleanup for the service instance if needed (e.g., component unmount)
  public cleanup(): void {
    this.cleanupRecordingResources();

    // Clean up Web Speech API resources
    if (this.recognition) {
      try {
        this.recognition.abort(); // Stop any ongoing recognition
      } catch (e) {
        /* ignore */
      }
    }
    if (this.webSpeechTimeout) {
      clearTimeout(this.webSpeechTimeout);
      this.webSpeechTimeout = null;
    }
    // Reset WebSpeech state variables
    this.isUserStoppedWebSpeech = false;
    this.finalTranscript = "";
    this.hasReceivedAnySpeech = false;
    this._isResultSentOrPromiseSettled = false;
  }

  isWebSpeechSupported(): boolean {
    return !!(
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition)
    );
  }

  getProviderAvailability(isOnline: boolean) {
    return {
      webspeech: {
        available: this.isWebSpeechSupported(),
        requiresInternet: false, // Generally true, though some implementations might vary
        realTime: true,
      },
      openai: {
        available: isOnline,
        requiresInternet: true,
        realTime: false,
      },
      google: {
        available: isOnline,
        requiresInternet: true,
        realTime: false,
      },
    };
  }
}

export const audioService = new AudioService();
