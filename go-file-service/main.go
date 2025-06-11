package main

import (
	"bytes"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/chai2010/webp"
	"github.com/corona10/goimagehash"
	"github.com/disintegration/imaging"
	"github.com/gin-gonic/gin"
	"github.com/h2non/filetype"
	"github.com/rwcarlsen/goexif/exif"
)

// FileMetadata represents extracted file metadata
type FileMetadata struct {
	FileName     string            `json:"fileName"`
	FileSize     int64             `json:"fileSize"`
	MimeType     string            `json:"mimeType"`
	MD5Hash      string            `json:"md5Hash"`
	Width        int               `json:"width,omitempty"`
	Height       int               `json:"height,omitempty"`
	ColorProfile string            `json:"colorProfile,omitempty"`
	ExifData     map[string]string `json:"exifData,omitempty"`
	Duration     float64           `json:"duration,omitempty"`
	PerceptualHash string          `json:"perceptualHash,omitempty"`
	ProcessedAt  time.Time         `json:"processedAt"`
}

// ProcessingResult represents the result of file processing
type ProcessingResult struct {
	Original   FileMetadata `json:"original"`
	Thumbnails []Thumbnail  `json:"thumbnails"`
	ProcessingTime time.Duration `json:"processingTime"`
	Success    bool         `json:"success"`
	Error      string       `json:"error,omitempty"`
}

// Thumbnail represents a generated thumbnail
type Thumbnail struct {
	Size     string `json:"size"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	FilePath string `json:"filePath"`
	FileSize int64  `json:"fileSize"`
}

// ProcessingConfig holds configuration for file processing
type ProcessingConfig struct {
	MaxConcurrentJobs int `json:"maxConcurrentJobs"`
	ThumbnailSizes    []ThumbnailSize `json:"thumbnailSizes"`
	OutputFormats     []string `json:"outputFormats"`
	Quality           int `json:"quality"`
}

type ThumbnailSize struct {
	Name   string `json:"name"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

var (
	// Worker pool for concurrent processing
	workerPool = make(chan struct{}, runtime.NumCPU()*2)
	
	// Default configuration
	defaultConfig = ProcessingConfig{
		MaxConcurrentJobs: runtime.NumCPU() * 2,
		ThumbnailSizes: []ThumbnailSize{
			{Name: "small", Width: 150, Height: 150},
			{Name: "medium", Width: 300, Height: 300},
			{Name: "large", Width: 600, Height: 600},
		},
		OutputFormats: []string{"webp", "jpeg"},
		Quality:       85,
	}
)

func init() {
	// Initialize worker pool
	for i := 0; i < defaultConfig.MaxConcurrentJobs; i++ {
		workerPool <- struct{}{}
	}
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
			"service": "file-processor",
			"workers": len(workerPool),
			"maxWorkers": cap(workerPool),
		})
	})

	// Process single file endpoint
	r.POST("/process", handleFileProcessing)

	// Batch processing endpoint
	r.POST("/process-batch", handleBatchProcessing)

	// Image optimization endpoint
	r.POST("/optimize", handleImageOptimization)

	// Metadata extraction only
	r.POST("/metadata", handleMetadataExtraction)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("File processing service starting on port %s", port)
	log.Printf("Worker pool size: %d", cap(workerPool))
	log.Fatal(r.Run(":" + port))
}

func handleFileProcessing(c *gin.Context) {
	startTime := time.Now()

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read file"})
		return
	}

	// Process file concurrently
	result := processFile(header.Filename, fileContent, c.Query("generateThumbnails") == "true")
	result.ProcessingTime = time.Since(startTime)

	c.JSON(200, result)
}

func handleBatchProcessing(c *gin.Context) {
	startTime := time.Now()

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid multipart form"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(400, gin.H{"error": "No files provided"})
		return
	}

	// Process files concurrently
	results := make(chan ProcessingResult, len(files))
	var wg sync.WaitGroup

	for _, fileHeader := range files {
		wg.Add(1)
		go func(fh *multipart.FileHeader) {
			defer wg.Done()
			
			// Acquire worker
			<-workerPool
			defer func() { workerPool <- struct{}{} }()

			file, err := fh.Open()
			if err != nil {
				results <- ProcessingResult{
					Success: false,
					Error:   fmt.Sprintf("Failed to open file %s: %v", fh.Filename, err),
				}
				return
			}
			defer file.Close()

			fileContent, err := io.ReadAll(file)
			if err != nil {
				results <- ProcessingResult{
					Success: false,
					Error:   fmt.Sprintf("Failed to read file %s: %v", fh.Filename, err),
				}
				return
			}

			result := processFile(fh.Filename, fileContent, true)
			results <- result
		}(fileHeader)
	}

	// Collect results
	go func() {
		wg.Wait()
		close(results)
	}()

	var allResults []ProcessingResult
	for result := range results {
		allResults = append(allResults, result)
	}

	c.JSON(200, gin.H{
		"results":        allResults,
		"totalFiles":     len(files),
		"processingTime": time.Since(startTime),
	})
}

func handleImageOptimization(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read file"})
		return
	}

	// Parse quality parameter
	quality := 85
	if q := c.Query("quality"); q != "" {
		if parsed, err := strconv.Atoi(q); err == nil && parsed > 0 && parsed <= 100 {
			quality = parsed
		}
	}

	// Parse format parameter
	format := c.DefaultQuery("format", "webp")

	optimized, err := optimizeImage(fileContent, format, quality)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to optimize image: %v", err)})
		return
	}

	// Set appropriate headers
	switch format {
	case "webp":
		c.Header("Content-Type", "image/webp")
	case "jpeg":
		c.Header("Content-Type", "image/jpeg")
	case "png":
		c.Header("Content-Type", "image/png")
	}

	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"optimized_%s\"", header.Filename))
	c.Data(200, c.GetHeader("Content-Type"), optimized)
}

func handleMetadataExtraction(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read file"})
		return
	}

	metadata := extractMetadata(header.Filename, fileContent)
	c.JSON(200, metadata)
}

func processFile(filename string, content []byte, generateThumbnails bool) ProcessingResult {
	startTime := time.Now()
	
	result := ProcessingResult{
		Success: true,
	}

	// Extract metadata
	result.Original = extractMetadata(filename, content)

	// Generate thumbnails for images
	if generateThumbnails && isImage(content) {
		thumbnails, err := generateThumbnails(content, filename)
		if err != nil {
			result.Success = false
			result.Error = fmt.Sprintf("Failed to generate thumbnails: %v", err)
			return result
		}
		result.Thumbnails = thumbnails
	}

	result.ProcessingTime = time.Since(startTime)
	return result
}

func extractMetadata(filename string, content []byte) FileMetadata {
	metadata := FileMetadata{
		FileName:    filename,
		FileSize:    int64(len(content)),
		ProcessedAt: time.Now(),
	}

	// Detect file type
	kind, _ := filetype.Match(content)
	if kind != filetype.Unknown {
		metadata.MimeType = kind.MIME.Value
	}

	// Calculate MD5 hash
	hash := md5.Sum(content)
	metadata.MD5Hash = hex.EncodeToString(hash[:])

	// Extract image-specific metadata
	if isImage(content) {
		extractImageMetadata(&metadata, content)
	}

	return metadata
}

func extractImageMetadata(metadata *FileMetadata, content []byte) {
	// Decode image to get dimensions
	reader := bytes.NewReader(content)
	img, _, err := image.Decode(reader)
	if err == nil {
		bounds := img.Bounds()
		metadata.Width = bounds.Dx()
		metadata.Height = bounds.Dy()

		// Generate perceptual hash
		if hash, err := goimagehash.AverageHash(img); err == nil {
			metadata.PerceptualHash = hash.ToString()
		}
	}

	// Extract EXIF data
	reader.Seek(0, 0)
	if exifData, err := exif.Decode(reader); err == nil {
		metadata.ExifData = make(map[string]string)
		
		// Extract common EXIF fields
		if tag, err := exifData.Get(exif.Make); err == nil {
			metadata.ExifData["Make"] = tag.String()
		}
		if tag, err := exifData.Get(exif.Model); err == nil {
			metadata.ExifData["Model"] = tag.String()
		}
		if tag, err := exifData.Get(exif.DateTime); err == nil {
			metadata.ExifData["DateTime"] = tag.String()
		}
		if tag, err := exifData.Get(exif.Orientation); err == nil {
			metadata.ExifData["Orientation"] = tag.String()
		}
	}
}

func generateThumbnails(content []byte, filename string) ([]Thumbnail, error) {
	var thumbnails []Thumbnail

	// Decode original image
	img, err := imaging.Decode(bytes.NewReader(content))
	if err != nil {
		return nil, err
	}

	// Generate thumbnails for each size
	for _, size := range defaultConfig.ThumbnailSizes {
		// Resize maintaining aspect ratio
		thumbnail := imaging.Fit(img, size.Width, size.Height, imaging.Lanczos)
		
		// Save as WebP for better compression
		var buf bytes.Buffer
		if err := webp.Encode(&buf, thumbnail, &webp.Options{Quality: float32(defaultConfig.Quality)}); err == nil {
			thumbPath := fmt.Sprintf("thumbnails/%s_%s.webp", 
				strings.TrimSuffix(filename, filepath.Ext(filename)), size.Name)
			
			thumbnails = append(thumbnails, Thumbnail{
				Size:     size.Name,
				Width:    thumbnail.Bounds().Dx(),
				Height:   thumbnail.Bounds().Dy(),
				FilePath: thumbPath,
				FileSize: int64(buf.Len()),
			})
		}
	}

	return thumbnails, nil
}

func optimizeImage(content []byte, format string, quality int) ([]byte, error) {
	img, err := imaging.Decode(bytes.NewReader(content))
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer

	switch format {
	case "webp":
		err = webp.Encode(&buf, img, &webp.Options{Quality: float32(quality)})
	case "jpeg":
		err = jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality})
	case "png":
		err = png.Encode(&buf, img)
	default:
		return nil, fmt.Errorf("unsupported format: %s", format)
	}

	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func isImage(content []byte) bool {
	kind, _ := filetype.Match(content)
	return kind != filetype.Unknown && strings.HasPrefix(kind.MIME.Value, "image/")
}