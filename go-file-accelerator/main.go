package main

import (
        "bytes"
        "compress/gzip"
        "io"
        "log"
        "net/http"
        "strings"
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

        // Check file size - only process large files (>100MB)
        if header.Size < 100*1024*1024 {
                c.JSON(http.StatusBadRequest, gin.H{
                        "error": "File too small for acceleration",
                        "size":  header.Size,
                        "minimum": 100 * 1024 * 1024,
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

        // Compress using gzip
        var compressedBuffer bytes.Buffer
        gzipWriter := gzip.NewWriter(&compressedBuffer)
        
        _, err = gzipWriter.Write(content)
        if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Compression failed"})
                return
        }
        
        err = gzipWriter.Close()
        if err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize compression"})
                return
        }

        compressedData := compressedBuffer.Bytes()
        processingTime := time.Since(startTime).Milliseconds()
        
        // Calculate compression ratio
        originalSize := int64(len(content))
        compressedSize := int64(len(compressedData))
        compressionRatio := float64(compressedSize) / float64(originalSize)

        result := CompressionResult{
                CompressedData:   compressedData,
                CompressionRatio: compressionRatio,
                OriginalSize:     originalSize,
                CompressedSize:   compressedSize,
                ProcessingTime:   processingTime,
                Algorithm:        "gzip",
        }

        log.Printf("Compressed %s: %d -> %d bytes (%.2f%% reduction) in %dms",
                header.Filename, originalSize, compressedSize, 
                (1-compressionRatio)*100, processingTime)

        c.JSON(http.StatusOK, result)
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

        results := make([]map[string]interface{}, 0, len(files))
        startTime := time.Now()

        for i, fileHeader := range files {
                file, err := fileHeader.Open()
                if err != nil {
                        results = append(results, map[string]interface{}{
                                "filename": fileHeader.Filename,
                                "error":    "Failed to open file",
                                "index":    i,
                        })
                        continue
                }

                // Check if file qualifies for acceleration
                if fileHeader.Size < 100*1024*1024 {
                        file.Close()
                        results = append(results, map[string]interface{}{
                                "filename": fileHeader.Filename,
                                "error":    "File too small for acceleration",
                                "size":     fileHeader.Size,
                                "index":    i,
                        })
                        continue
                }

                // Process the file
                content, err := io.ReadAll(file)
                file.Close()
                
                if err != nil {
                        results = append(results, map[string]interface{}{
                                "filename": fileHeader.Filename,
                                "error":    "Failed to read file",
                                "index":    i,
                        })
                        continue
                }

                // Compress
                var compressedBuffer bytes.Buffer
                gzipWriter := gzip.NewWriter(&compressedBuffer)
                gzipWriter.Write(content)
                gzipWriter.Close()

                compressedData := compressedBuffer.Bytes()
                originalSize := int64(len(content))
                compressedSize := int64(len(compressedData))
                compressionRatio := float64(compressedSize) / float64(originalSize)

                results = append(results, map[string]interface{}{
                        "filename":         fileHeader.Filename,
                        "originalSize":     originalSize,
                        "compressedSize":   compressedSize,
                        "compressionRatio": compressionRatio,
                        "compressedData":   compressedData,
                        "algorithm":        "gzip",
                        "index":            i,
                })
        }

        totalProcessingTime := time.Since(startTime).Milliseconds()

        c.JSON(http.StatusOK, gin.H{
                "results":        results,
                "totalFiles":     len(files),
                "processedFiles": len(results),
                "processingTime": totalProcessingTime,
                "service":        "go-file-accelerator",
        })
}