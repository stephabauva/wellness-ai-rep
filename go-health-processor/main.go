
package main

import (
	"compress/gzip"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type HealthProcessor struct {
	upgrader websocket.Upgrader
}

type ProcessRequest struct {
	FilePath   string `json:"file_path"`
	FileName   string `json:"file_name"`
	UserID     int    `json:"user_id"`
	Compress   bool   `json:"compress"`
	SocketID   string `json:"socket_id"`
}

type ProcessResult struct {
	Success      bool                     `json:"success"`
	Data         []ParsedHealthDataPoint  `json:"data,omitempty"`
	Summary      *ProcessSummary          `json:"summary,omitempty"`
	Errors       []string                 `json:"errors,omitempty"`
	Compression  *CompressionResult       `json:"compression,omitempty"`
}

type ParsedHealthDataPoint struct {
	DataType  string                 `json:"data_type"`
	Value     string                 `json:"value"`
	Unit      *string                `json:"unit,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	Source    string                 `json:"source"`
	Category  string                 `json:"category"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

type ProcessSummary struct {
	TotalRecords   int            `json:"total_records"`
	ValidRecords   int            `json:"valid_records"`
	SkippedRecords int            `json:"skipped_records"`
	Categories     map[string]int `json:"categories"`
	ProcessingTime string         `json:"processing_time"`
}

type CompressionResult struct {
	OriginalSize   int64   `json:"original_size"`
	CompressedSize int64   `json:"compressed_size"`
	CompressionRatio float64 `json:"compression_ratio"`
	TimeSaved      string  `json:"time_saved"`
}

type ProgressUpdate struct {
	Stage       string  `json:"stage"`
	Progress    float64 `json:"progress"`
	Message     string  `json:"message"`
	RecordsProcessed int `json:"records_processed"`
}

func main() {
	processor := &HealthProcessor{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins in development
			},
		},
	}

	r := mux.NewRouter()
	
	// WebSocket endpoint for real-time progress
	r.HandleFunc("/ws/progress", processor.handleWebSocket)
	
	// HTTP endpoints
	r.HandleFunc("/process", processor.processHealthFile).Methods("POST")
	r.HandleFunc("/compress", processor.compressFile).Methods("POST")
	r.HandleFunc("/health", processor.healthCheck).Methods("GET")

	fmt.Println("Go Health Processor starting on :8081")
	log.Fatal(http.ListenAndServe("0.0.0.0:8081", r))
}

func (h *HealthProcessor) healthCheck(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func (h *HealthProcessor) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	// Keep connection alive and handle progress updates
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
		// Connection maintained for sending progress updates
	}
}

func (h *HealthProcessor) processHealthFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	var req ProcessRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	startTime := time.Now()
	
	// Read file
	content, err := os.ReadFile(req.FilePath)
	if err != nil {
		result := ProcessResult{
			Success: false,
			Errors:  []string{fmt.Sprintf("Failed to read file: %v", err)},
		}
		json.NewEncoder(w).Encode(result)
		return
	}

	// Handle compression if requested
	var compressionResult *CompressionResult
	if req.Compress {
		compressionResult = h.compressData(content)
	}

	// Parse based on file extension
	ext := strings.ToLower(filepath.Ext(req.FileName))
	var result ProcessResult

	switch ext {
	case ".xml":
		result = h.parseAppleHealthXML(string(content))
	case ".json":
		result = h.parseGoogleFitJSON(string(content))
	case ".csv":
		result = h.parseGenericCSV(string(content))
	default:
		result = ProcessResult{
			Success: false,
			Errors:  []string{fmt.Sprintf("Unsupported file format: %s", ext)},
		}
	}

	// Add processing metadata
	if result.Summary != nil {
		result.Summary.ProcessingTime = time.Since(startTime).String()
	}
	result.Compression = compressionResult

	json.NewEncoder(w).Encode(result)
}

func (h *HealthProcessor) compressData(data []byte) *CompressionResult {
	var compressed strings.Builder
	gz := gzip.NewWriter(&compressed)
	
	_, err := gz.Write(data)
	if err != nil {
		return nil
	}
	gz.Close()

	originalSize := int64(len(data))
	compressedSize := int64(len(compressed.String()))
	ratio := float64(compressedSize) / float64(originalSize)

	return &CompressionResult{
		OriginalSize:     originalSize,
		CompressedSize:   compressedSize,
		CompressionRatio: ratio,
		TimeSaved:        fmt.Sprintf("%.1f%% reduction", (1-ratio)*100),
	}
}

func (h *HealthProcessor) parseAppleHealthXML(content string) ProcessResult {
	// Simplified XML parsing - would need proper implementation
	return ProcessResult{
		Success: true,
		Data:    []ParsedHealthDataPoint{},
		Summary: &ProcessSummary{
			TotalRecords:   0,
			ValidRecords:   0,
			SkippedRecords: 0,
			Categories:     make(map[string]int),
		},
	}
}

func (h *HealthProcessor) parseGoogleFitJSON(content string) ProcessResult {
	// Simplified JSON parsing - would need proper implementation
	return ProcessResult{
		Success: true,
		Data:    []ParsedHealthDataPoint{},
		Summary: &ProcessSummary{
			TotalRecords:   0,
			ValidRecords:   0,
			SkippedRecords: 0,
			Categories:     make(map[string]int),
		},
	}
}

func (h *HealthProcessor) parseGenericCSV(content string) ProcessResult {
	// Simplified CSV parsing - would need proper implementation
	return ProcessResult{
		Success: true,
		Data:    []ParsedHealthDataPoint{},
		Summary: &ProcessSummary{
			TotalRecords:   0,
			ValidRecords:   0,
			SkippedRecords: 0,
			Categories:     make(map[string]int),
		},
	}
}

func (h *HealthProcessor) compressFile(w http.ResponseWriter, r *http.Request) {
	// Handle standalone file compression
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "compression endpoint"})
}
