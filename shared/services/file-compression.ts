/**
 * @used-by file-manager/useFileUpload - Smart compression for uploads
 * @used-by health/HealthDataSection - Health file compression
 * @used-by shared/universal-file-service - General file operations
 * @cross-domain true
 * @critical-path true
 * @performance-impact High CPU usage for large files
 */
import pako from 'pako';

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface CompressionOptions {
  level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // Compression level, 6 is default
}

const DEFAULT_OPTIONS: CompressionOptions = {
  level: 6
};

/**
 * Helper function to read file as ArrayBuffer
 */
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * @used-by file-manager/useFileUpload - Smart compression skips media files
 * @used-by health/data-upload - Compresses large health data files
 * @behavior-note File manager skips compression for media files
 * @behavior-note Health data always compresses for storage efficiency
 * 
 * Compresses a file using gzip compression
 * Most effective for text-based files like XML, JSON, CSV
 */
export const compressFile = async (
  file: File, 
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Read file as ArrayBuffer for binary processing
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Compress using pako (gzip implementation)
    const compressed = pako.gzip(uint8Array, {
      level: finalOptions.level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    });
    
    // Create new compressed file
    const compressedBlob = new Blob([compressed], { 
      type: 'application/gzip' 
    });
    
    const compressedFile = new File(
      [compressedBlob], 
      `${file.name}.gz`, 
      { 
        type: 'application/gzip',
        lastModified: file.lastModified 
      }
    );
    
    const originalSize = file.size;
    const compressedSize = compressedFile.size;
    const compressionRatio = (1 - compressedSize / originalSize) * 100;
    
    return {
      compressedFile,
      originalSize,
      compressedSize,
      compressionRatio
    };
  } catch (error) {
    throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Checks if a file is worth compressing based on type and size
 */
export const shouldCompressFile = (file: File): boolean => {
  // Files that compress well
  const compressibleTypes = [
    'text/xml',
    'application/xml',
    'text/csv',
    'application/csv',
    'application/json',
    'text/plain',
    'text/html'
  ];
  
  const compressibleExtensions = [
    '.xml', '.csv', '.json', '.txt', '.html', '.js', '.css'
  ];
  
  // Don't compress files smaller than 1MB
  if (file.size < 1024 * 1024) {
    return false;
  }
  
  // Check MIME type
  if (compressibleTypes.includes(file.type)) {
    return true;
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  return compressibleExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Estimates compression ratio without actually compressing
 * Useful for showing potential savings in UI
 */
export const estimateCompressionRatio = (file: File): number => {
  if (!shouldCompressFile(file)) {
    return 0;
  }
  
  // Rough estimates based on file type
  const estimateMap: Record<string, number> = {
    'text/xml': 80,     // XML typically compresses very well
    'application/xml': 80,
    'text/csv': 70,     // CSV compresses well
    'application/csv': 70,
    'application/json': 75,  // JSON compresses well
    'text/plain': 60,   // Plain text varies
    'text/html': 65
  };
  
  return estimateMap[file.type] || 60; // Default 60% compression
};

/**
 * Decompresses a gzipped file (for testing/verification)
 */
export const decompressFile = async (compressedFile: File): Promise<File> => {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(compressedFile);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const decompressed = pako.ungzip(uint8Array);
    
    // Remove .gz extension from filename
    const originalName = compressedFile.name.replace(/\.gz$/, '');
    
    const decompressedBlob = new Blob([decompressed]);
    return new File([decompressedBlob], originalName, {
      lastModified: compressedFile.lastModified
    });
  } catch (error) {
    throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};