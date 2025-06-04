import OpenAI from "openai";
import { TranscriptionProvider } from "@shared/schema";

interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

interface TranscriptionError {
  error: string;
  provider: TranscriptionProvider;
  details?: string;
}

class TranscriptionService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async transcribeWithOpenAI(audioBlob: Buffer, filename: string = "audio.wav"): Promise<TranscriptionResult> {
    try {
      // Detect proper file extension and MIME type based on filename
      const { extension, mimeType } = this.getFileFormatInfo(filename);
      const properFilename = `audio.${extension}`;
      
      // Create a File-like object for OpenAI API with correct MIME type
      const file = new File([audioBlob], properFilename, { type: mimeType });
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: undefined, // Auto-detect language
      });

      return {
        text: transcription.text,
        language: "auto-detected"
      };
    } catch (error: any) {
      throw new Error(`OpenAI transcription failed: ${error.message}`);
    }
  }

  private getFileFormatInfo(filename: string): { extension: string; mimeType: string } {
    // Extract file extension or detect from common patterns
    const lowercaseFilename = filename.toLowerCase();
    
    if (lowercaseFilename.includes('webm') || lowercaseFilename.endsWith('.webm')) {
      return { extension: 'webm', mimeType: 'audio/webm' };
    } else if (lowercaseFilename.includes('mp4') || lowercaseFilename.endsWith('.mp4') || lowercaseFilename.endsWith('.m4a')) {
      return { extension: 'mp4', mimeType: 'audio/mp4' };
    } else if (lowercaseFilename.includes('ogg') || lowercaseFilename.endsWith('.ogg')) {
      return { extension: 'ogg', mimeType: 'audio/ogg' };
    } else if (lowercaseFilename.includes('wav') || lowercaseFilename.endsWith('.wav')) {
      return { extension: 'wav', mimeType: 'audio/wav' };
    } else if (lowercaseFilename.includes('mp3') || lowercaseFilename.endsWith('.mp3')) {
      return { extension: 'mp3', mimeType: 'audio/mp3' };
    }
    
    // Default fallback - use mp4 since that's what most modern browsers create
    return { extension: 'mp4', mimeType: 'audio/mp4' };
  }

  async transcribeWithGoogle(audioBlob: Buffer): Promise<TranscriptionResult> {
    try {
      // Google Cloud Speech-to-Text API implementation
      // Note: This requires Google Cloud Speech-to-Text API key
      const googleApiKey = process.env.GOOGLE_API_KEY;
      
      if (!googleApiKey) {
        throw new Error("Google API key not configured");
      }

      // Convert audio to base64 for Google API
      const base64Audio = audioBlob.toString('base64');
      
      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: false,
          },
          audio: {
            content: base64Audio,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error('No transcription results from Google API');
      }

      const transcript = data.results[0]?.alternatives[0]?.transcript || '';
      const confidence = data.results[0]?.alternatives[0]?.confidence || 0;

      return {
        text: transcript,
        confidence: confidence,
        language: "auto-detected"
      };
    } catch (error: any) {
      throw new Error(`Google transcription failed: ${error.message}`);
    }
  }

  // Web Speech API transcription is handled on the frontend
  // This method is for consistency in error handling
  validateWebSpeechSupport(): boolean {
    // This check would be done on the frontend
    return true;
  }

  getProviderCapabilities() {
    return {
      webspeech: {
        name: "Web Speech API",
        offlineSupport: true,
        realTime: true,
        languages: ["auto-detect"],
        description: "Browser-based speech recognition (may work offline)"
      },
      openai: {
        name: "OpenAI Whisper",
        offlineSupport: false,
        realTime: false,
        languages: ["auto-detect"],
        description: "High-accuracy AI transcription (requires internet)"
      },
      google: {
        name: "Google Speech-to-Text",
        offlineSupport: false,
        realTime: false,
        languages: ["auto-detect"],
        description: "Google Cloud transcription (requires internet)"
      }
    };
  }
}

export const transcriptionService = new TranscriptionService();