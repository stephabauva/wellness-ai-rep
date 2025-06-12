
interface GoProcessRequest {
  file_path: string;
  file_name: string;
  user_id: number;
  compress: boolean;
  socket_id?: string;
}

interface GoProcessResult {
  success: boolean;
  data?: any[];
  summary?: {
    total_records: number;
    valid_records: number;
    skipped_records: number;
    categories: Record<string, number>;
    processing_time: string;
  };
  compression?: {
    original_size: number;
    compressed_size: number;
    compression_ratio: number;
    time_saved: string;
  };
  errors?: string[];
}

export class GoHealthService {
  private static readonly BASE_URL = 'http://localhost:8081';

  static async processHealthFile(request: GoProcessRequest): Promise<GoProcessResult> {
    try {
      const response = await fetch(`${this.BASE_URL}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Go service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        errors: [`Go service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  static async compressFile(filePath: string): Promise<any> {
    try {
      const response = await fetch(`${this.BASE_URL}/compress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_path: filePath }),
      });

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  static createProgressWebSocket(onProgress: (progress: any) => void): WebSocket | null {
    try {
      const ws = new WebSocket(`ws://localhost:8081/ws/progress`);
      
      ws.onmessage = (event) => {
        const progress = JSON.parse(event.data);
        onProgress(progress);
      };

      return ws;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      return null;
    }
  }
}
