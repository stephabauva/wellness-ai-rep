import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadProgress as UploadProgressType, formatSpeed, formatDuration } from "@/shared";
import { formatFileSize } from "@/shared";
import { Archive, Upload, Loader2, CheckCircle2 } from "lucide-react";

interface UploadProgressProps {
  progress: UploadProgressType | null;
  fileName?: string;
  showDetails?: boolean;
  className?: string;
}

export function UploadProgressIndicator({ 
  progress, 
  fileName, 
  showDetails = true,
  className = "" 
}: UploadProgressProps) {
  if (!progress) return null;

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'compressing':
        return <Archive className="h-4 w-4 animate-pulse" />;
      case 'uploading':
        return <Upload className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  const getStageText = () => {
    switch (progress.stage) {
      case 'compressing':
        return 'Compressing file...';
      case 'uploading':
        return 'Uploading file...';
      case 'processing':
        return 'Processing file...';
      case 'complete':
        return 'Upload complete!';
      default:
        return 'Uploading...';
    }
  };

  const getProgressColor = () => {
    if (progress.stage === 'complete') return 'bg-green-500';
    if (progress.stage === 'compressing') return 'bg-blue-500';
    return 'bg-primary';
  };

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* File name and stage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStageIcon()}
              <span className="text-sm font-medium">
                {fileName && showDetails ? fileName : getStageText()}
              </span>
            </div>
            <Badge variant={progress.stage === 'complete' ? 'default' : 'secondary'}>
              {progress.percentage}%
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress 
              value={progress.percentage} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
              </span>
              {showDetails && progress.speed > 0 && (
                <span>{formatSpeed(progress.speed)}</span>
              )}
            </div>
          </div>

          {/* Detailed information */}
          {showDetails && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="capitalize">{getStageText()}</span>
              {progress.eta > 0 && progress.stage !== 'complete' && (
                <span>ETA: {formatDuration(progress.eta)}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CompressionResultProps {
  result: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
  className?: string;
}

export function CompressionResult({ result, className = "" }: CompressionResultProps) {
  const savedBytes = result.originalSize - result.compressedSize;
  
  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Compression Complete</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Original Size</p>
              <p className="font-medium">{formatFileSize(result.originalSize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Compressed Size</p>
              <p className="font-medium">{formatFileSize(result.compressedSize)}</p>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Space Saved</span>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">
                  {formatFileSize(savedBytes)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ({result.compressionRatio.toFixed(1)}% reduction)
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}