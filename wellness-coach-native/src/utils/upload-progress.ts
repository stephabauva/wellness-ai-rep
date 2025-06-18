export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // estimated time remaining in seconds
  stage: 'compressing' | 'uploading' | 'processing' | 'complete';
}

export interface UploadSpeedCalculator {
  addDataPoint(loaded: number, timestamp: number): void;
  getCurrentSpeed(): number;
  getETA(loaded: number, total: number): number;
  reset(): void;
}

export class SpeedCalculator implements UploadSpeedCalculator {
  private dataPoints: Array<{ loaded: number; timestamp: number }> = [];
  private readonly maxDataPoints = 10;
  private readonly minSampleTime = 1000; // 1 second

  addDataPoint(loaded: number, timestamp: number): void {
    this.dataPoints.push({ loaded, timestamp });

    if (this.dataPoints.length > this.maxDataPoints) {
      this.dataPoints.shift();
    }

    const cutoffTime = timestamp - 10000; // Keep data points from the last 10 seconds
    this.dataPoints = this.dataPoints.filter(point => point.timestamp > cutoffTime);
  }

  getCurrentSpeed(): number {
    if (this.dataPoints.length < 2) {
      return 0;
    }

    const recent = this.dataPoints[this.dataPoints.length - 1];
    const older = this.dataPoints[0];

    const timeDiff = recent.timestamp - older.timestamp;
    const loadedDiff = recent.loaded - older.loaded;

    if (timeDiff < this.minSampleTime && this.dataPoints.length > 2) {
      // Not enough time elapsed between first and last point for a stable reading, try intermediate
      const secondRecent = this.dataPoints[this.dataPoints.length - 2];
      const intermediateTimeDiff = recent.timestamp - secondRecent.timestamp;
      const intermediateLoadedDiff = recent.loaded - secondRecent.loaded;
      if (intermediateTimeDiff > 0) return (intermediateLoadedDiff / intermediateTimeDiff) * 1000;
    }

    if (timeDiff <= 0) return 0; // Avoid division by zero or negative speeds

    return (loadedDiff / timeDiff) * 1000; // bytes per second
  }

  getETA(loaded: number, total: number): number {
    const speed = this.getCurrentSpeed();

    if (speed <= 0 || loaded >= total) {
      return 0;
    }

    const remaining = total - loaded;
    return Math.round(remaining / speed);
  }

  reset(): void {
    this.dataPoints = [];
  }
}

export class ProgressTracker {
  private speedCalculator: SpeedCalculator;
  private startTime: number;
  private onProgress?: (progress: UploadProgress) => void;

  constructor(onProgress?: (progress: UploadProgress) => void) {
    this.speedCalculator = new SpeedCalculator();
    this.startTime = Date.now();
    this.onProgress = onProgress;
  }

  updateProgress(
    loaded: number,
    total: number,
    stage: UploadProgress['stage'] = 'uploading'
  ): UploadProgress {
    const timestamp = Date.now();
    this.speedCalculator.addDataPoint(loaded, timestamp);

    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
    const speed = this.speedCalculator.getCurrentSpeed();
    const eta = this.speedCalculator.getETA(loaded, total);

    const progress: UploadProgress = {
      loaded,
      total,
      percentage,
      speed,
      eta,
      stage
    };

    if (this.onProgress) {
      this.onProgress(progress);
    }

    return progress;
  }

  reset(): void {
    this.speedCalculator.reset();
    this.startTime = Date.now();
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; // Added TB
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Ensure index is within bounds
  const index = Math.min(i, sizes.length - 1);

  return parseFloat((bytes / Math.pow(k, index)).toFixed(2)) + ' ' + sizes[index];
}

export function formatSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s';
}

export function formatTime(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return 'N/A'; // Handle invalid inputs
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

// TODO: RN-Adapt - ProgressEvent is a web API type.
// If this callback is intended for use with RN networking (e.g., react-native-blob-util progress events),
// the event type will be different, or this helper might not be directly applicable.
// For basic fetch, progress events are not available.
export function createUploadProgressCallback(
  onProgress: (progress: UploadProgress) => void
): (event: any /* ProgressEvent */) => void {
  const tracker = new ProgressTracker(onProgress);

  return (event: any /* ProgressEvent */) => {
    // Assuming event has { loaded: number, total: number }
    // This structure is common in XHR ProgressEvent and some RN upload libraries.
    if (event.lengthComputable || (typeof event.loaded === 'number' && typeof event.total === 'number')) {
      tracker.updateProgress(event.loaded, event.total);
    }
  };
}
