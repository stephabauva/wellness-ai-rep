package main

import (
        "bytes"
        "compress/gzip"
        "io"
        "log"
        "mime/multipart"
        "net/http"
        "runtime"
        "strings"
        "sync"
        "time"

        "github.com/gin-contrib/cors"
        "github.com/gin-gonic/gin"
)

type CompressionResult struct {
        CompressedData   []byte  `json:"compressedData"`
        CompressionRatio float64 `json:"compressionRatio"`
        OriginalSize     int64   `json:"originalSize"`
        CompressedSize   int64   `json:"compressedSize"`
        ProcessingTime   int64   `json:"processingTime"`
        Algorithm        string  `json:"algorithm"`
        CompressionLevel int     `json:"compressionLevel"`
        Throughput       float64 `json:"throughput"` // MB/s
}

type OptimizedGzipWriter struct {
        *gzip.Writer
        level int
}

func NewOptimizedGzipWriter(w io.Writer, level int) *OptimizedGzipWriter {
        gw, _ := gzip.NewWriterLevel(w, level)
        return &OptimizedGzipWriter{Writer: gw, level: level}
}

type HealthCheckResponse struct {
        Status    string `json:"status"`
        Service   string `json:"service"`
        Timestamp int64  `json:"timestamp"`
        Version   string `json:"version"`
}

func main() {
        r := gin.Default()
        
        // CORS configuration
        config := cors.DefaultConfig()
        config.AllowAllOrigins = true
        config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
        config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
        r.Use(cors.New(config))

        // Health check endpoint
        r.GET("/accelerate/health", handleHealthCheck)
        
        // Large file compression endpoint
        r.POST("/accelerate/compress-large", handleLargeFileCompression)
        
        // Batch processing endpoint
        r.POST("/accelerate/batch-process", handleBatchProcessing)

        log.Println("Go File Accelerator Service starting on port 5001")
        log.Println("Endpoints available:")
        log.Println("  GET  /accelerate/health")
        log.Println("  POST /accelerate/compress-large")
        log.Println("  POST /accelerate/batch-process")
        
        r.Run(":5001")
}

func handleHealthCheck(c *gin.Context) {
        response := HealthCheckResponse{
                Status:    "healthy",
                Service:   "go-file-accelerator",
                Timestamp: time.Now().Unix(),
                Version:   "1.0.0",
        }
        c.JSON(http.StatusOK, response)
}

func handleLargeFileCompression(c *gin.Context) {
        startTime := time.Now()
        
        // Parse multipart form
        err := c.Request.ParseMultipartForm(200 << 20) // 200MB max memory
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
                return
        }

        file, header, err := c.Request.FormFile("file")
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
                return
        }
        defer file.Close()

        // Check file size - lowered threshold for better acceleration (>5MB)
        if header.Size < 5*1024*1024 {
                c.JSON(http.StatusBadRequest, gin.H{
                        "error": "File too small for acceleration",
                        "size":  header.Size,
                        "minimum": 5 * 1024 * 1024,
                })
                return
        }

        // Check file type - only process health data formats
        filename := strings.ToLower(header.Filename)
        if !strings.HasSuffix(filename, ".xml") && 
           !strings.HasSuffix(filename, ".json") && 
           !strings.HasSuffix(filename, ".csv") {
                c.JSON(http.StatusBadRequest, gin.H{
                        "error": "Unsupported file type",
                        "filename": header.Filename,
                        "supported": []string{".xml", ".json", ".csv"},
                })
                return
        }

        // Read file content
        content, err := io.ReadAll(file)
        if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
                return
        }

        // Determine optimal compression level based on file size and type
        compressionLevel := getOptimalCompressionLevel(content, filename)
        
        // Use optimized compression with adaptive level
        var compressedBuffer bytes.Buffer
        gzipWriter, err := gzip.NewWriterLevel(&compressedBuffer, compressionLevel)
        if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create compressor"})
                return
        }
        
        // Use chunked writing for better memory efficiency on large files
        chunkSize := 64 * 1024 // 64KB chunks
        contentLen := len(content)
        
        for i := 0; i < contentLen; i += chunkSize {
                end := i + chunkSize
                if end > contentLen {
                        end = contentLen
                }
                
                _, err = gzipWriter.Write(content[i:end])
                if err != nil {
                        c.JSON(http.StatusInternalServerError, gin.H{"error": "Compression failed"})
                        return
                }
        }
        
        err = gzipWriter.Close()
        if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize compression"})
                return
        }

        compressedData := compressedBuffer.Bytes()
        processingTime := time.Since(startTime).Milliseconds()
        
        // Calculate compression ratio and throughput
        originalSize := int64(len(content))
        compressedSize := int64(len(compressedData))
        compressionRatio := float64(compressedSize) / float64(originalSize)
        throughputMBps := float64(originalSize) / (1024 * 1024) / (float64(processingTime) / 1000)

        result := CompressionResult{
                CompressedData:   compressedData,
                CompressionRatio: compressionRatio,
                OriginalSize:     originalSize,
                CompressedSize:   compressedSize,
                ProcessingTime:   processingTime,
                Algorithm:        "gzip-optimized",
                CompressionLevel: compressionLevel,
                Throughput:       throughputMBps,
        }

        log.Printf("Compressed %s: %d -> %d bytes (%.2f%% reduction) in %dms (%.1f MB/s)",
                header.Filename, originalSize, compressedSize, 
                (1-compressionRatio)*100, processingTime, throughputMBps)

        c.JSON(http.StatusOK, result)
}

// getOptimalCompressionLevel determines the best compression level based on file characteristics
func getOptimalCompressionLevel(content []byte, filename string) int {
        size := len(content)
        
        // For very large files (>100MB), use faster compression
        if size > 100*1024*1024 {
                return gzip.BestSpeed // Level 1 - fastest
        }
        
        // For Apple Health XML files, use balanced compression
        if strings.Contains(filename, ".xml") {
                if size > 50*1024*1024 {
                        return 3 // Fast but good compression for large XML
                }
                return 6 // Default level for medium XML files
        }
        
        // For JSON files, use higher compression (they compress well)
        if strings.Contains(filename, ".json") {
                return 7 // Good compression for JSON
        }
        
        // For CSV files, use moderate compression
        if strings.Contains(filename, ".csv") {
                return 5 // Balanced for tabular data
        }
        
        // Default to standard compression
        return gzip.DefaultCompression // Level 6
}

func handleBatchProcessing(c *gin.Context) {
        // Parse multipart form for batch processing
        err := c.Request.ParseMultipartForm(500 << 20) // 500MB max memory for batch
        if err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
                return
        }

        form := c.Request.MultipartForm
        files := form.File["files"]
        
        if len(files) == 0 {
                c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided for batch processing"})
                return
        }

        // Use parallel processing for batch operations
        numWorkers := runtime.NumCPU()
        if numWorkers > len(files) {
                numWorkers = len(files)
        }
        
        type fileJob struct {
                header *multipart.FileHeader
                index  int
        }
        
        type fileResult struct {
                result map[string]interface{}
                index  int
        }
        
        jobs := make(chan fileJob, len(files))
        results := make(chan fileResult, len(files))
        
        startTime := time.Now()
        
        // Start workers
        var wg sync.WaitGroup
        for w := 0; w < numWorkers; w++ {
                wg.Add(1)
                go func() {
                        defer wg.Done()
                        for job := range jobs {
                                result := processFileJob(job.header, job.index)
                                results <- fileResult{result: result, index: job.index}
                        }
                }()
        }
        
        // Send jobs
        for i, fileHeader := range files {
                jobs <- fileJob{header: fileHeader, index: i}
        }
        close(jobs)
        
        // Wait for completion
        go func() {
                wg.Wait()
                close(results)
        }()
        
        // Collect results
        finalResults := make([]map[string]interface{}, len(files))
        for result := range results {
                finalResults[result.index] = result.result
        }

        totalProcessingTime := time.Since(startTime).Milliseconds()

        c.JSON(http.StatusOK, gin.H{
                "results":        finalResults,
                "totalFiles":     len(files),
                "processedFiles": len(finalResults),
                "processingTime": totalProcessingTime,
                "service":        "go-file-accelerator",
                "parallelWorkers": numWorkers,
        })
}

// processFileJob handles individual file compression in parallel workers
func processFileJob(fileHeader *multipart.FileHeader, index int) map[string]interface{} {
        file, err := fileHeader.Open()
        if err != nil {
                return map[string]interface{}{
                        "filename": fileHeader.Filename,
                        "error":    "Failed to open file",
                        "index":    index,
                }
        }
        defer file.Close()

        // Check if file qualifies for acceleration (lowered threshold)
        if fileHeader.Size < 5*1024*1024 {
                return map[string]interface{}{
                        "filename": fileHeader.Filename,
                        "error":    "File too small for acceleration",
                        "size":     fileHeader.Size,
                        "index":    index,
                }
        }

        // Read file content
        content, err := io.ReadAll(file)
        if err != nil {
                return map[string]interface{}{
                        "filename": fileHeader.Filename,
                        "error":    "Failed to read file",
                        "index":    index,
                }
        }

        // Get optimal compression level for this file
        filename := strings.ToLower(fileHeader.Filename)
        compressionLevel := getOptimalCompressionLevel(content, filename)

        // Compress with optimized level
        var compressedBuffer bytes.Buffer
        gzipWriter, err := gzip.NewWriterLevel(&compressedBuffer, compressionLevel)
        if err != nil {
                return map[string]interface{}{
                        "filename": fileHeader.Filename,
                        "error":    "Failed to create compressor",
                        "index":    index,
                }
        }

        // Use chunked writing for better performance
        chunkSize := 64 * 1024 // 64KB chunks
        contentLen := len(content)
        
        for i := 0; i < contentLen; i += chunkSize {
                end := i + chunkSize
                if end > contentLen {
                        end = contentLen
                }
                
                _, err = gzipWriter.Write(content[i:end])
                if err != nil {
                        return map[string]interface{}{
                                "filename": fileHeader.Filename,
                                "error":    "Compression failed",
                                "index":    index,
                        }
                }
        }
        
        err = gzipWriter.Close()
        if err != nil {
                return map[string]interface{}{
                        "filename": fileHeader.Filename,
                        "error":    "Failed to finalize compression",
                        "index":    index,
                }
        }

        compressedData := compressedBuffer.Bytes()
        originalSize := int64(len(content))
        compressedSize := int64(len(compressedData))
        compressionRatio := float64(compressedSize) / float64(originalSize)

        return map[string]interface{}{
                "filename":         fileHeader.Filename,
                "originalSize":     originalSize,
                "compressedSize":   compressedSize,
                "compressionRatio": compressionRatio,
                "compressedData":   compressedData,
                "algorithm":        "gzip-optimized",
                "compressionLevel": compressionLevel,
                "index":            index,
        }
}