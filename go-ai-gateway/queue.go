package main

import (
	"container/heap"
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// PriorityQueue implements a priority queue for AI requests
type PriorityQueue []*QueuedRequest

func (pq PriorityQueue) Len() int { return len(pq) }

func (pq PriorityQueue) Less(i, j int) bool {
	// Higher priority values come first
	if pq[i].Priority != pq[j].Priority {
		return pq[i].Priority > pq[j].Priority
	}
	// If same priority, older requests come first
	return pq[i].Timestamp.Before(pq[j].Timestamp)
}

func (pq PriorityQueue) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
}

func (pq *PriorityQueue) Push(x interface{}) {
	*pq = append(*pq, x.(*QueuedRequest))
}

func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	*pq = old[0 : n-1]
	return item
}

// RequestQueue manages AI request queuing with priority and batching
type RequestQueue struct {
	queue          PriorityQueue
	mutex          sync.RWMutex
	cond           *sync.Cond
	maxSize        int
	batchSize      int
	batchTimeout   time.Duration
	workers        int
	stopChan       chan struct{}
	responseChan   chan AIResponse
	errorChan      chan error
	stats          QueueStats
	logger         *logrus.Logger
	processingFunc func([]AIRequest) ([]AIResponse, error)
}

// QueueStats represents queue statistics
type QueueStats struct {
	TotalEnqueued   int64         `json:"total_enqueued"`
	TotalProcessed  int64         `json:"total_processed"`
	TotalErrors     int64         `json:"total_errors"`
	CurrentSize     int           `json:"current_size"`
	MaxWaitTime     time.Duration `json:"max_wait_time"`
	AvgWaitTime     time.Duration `json:"avg_wait_time"`
	BatchesSent     int64         `json:"batches_sent"`
	AvgBatchSize    float64       `json:"avg_batch_size"`
	ActiveWorkers   int           `json:"active_workers"`
}

// NewRequestQueue creates a new request queue
func NewRequestQueue(maxSize, batchSize, workers int, batchTimeout time.Duration, logger *logrus.Logger) *RequestQueue {
	rq := &RequestQueue{
		queue:        make(PriorityQueue, 0),
		maxSize:      maxSize,
		batchSize:    batchSize,
		batchTimeout: batchTimeout,
		workers:      workers,
		stopChan:     make(chan struct{}),
		responseChan: make(chan AIResponse, 100),
		errorChan:    make(chan error, 100),
		logger:       logger,
	}

	rq.cond = sync.NewCond(&rq.mutex)
	heap.Init(&rq.queue)

	return rq
}

// Start starts the queue processing workers
func (rq *RequestQueue) Start(processingFunc func([]AIRequest) ([]AIResponse, error)) {
	rq.processingFunc = processingFunc

	for i := 0; i < rq.workers; i++ {
		go rq.worker(i)
	}

	// Start batch timeout worker
	go rq.batchTimeoutWorker()

	rq.logger.WithFields(logrus.Fields{
		"workers":       rq.workers,
		"batch_size":    rq.batchSize,
		"batch_timeout": rq.batchTimeout,
		"max_size":      rq.maxSize,
	}).Info("Request queue started")
}

// Enqueue adds a request to the queue
func (rq *RequestQueue) Enqueue(req AIRequest, priority int) error {
	rq.mutex.Lock()
	defer rq.mutex.Unlock()

	if len(rq.queue) >= rq.maxSize {
		rq.stats.TotalErrors++
		return fmt.Errorf("queue is full (size: %d)", len(rq.queue))
	}

	queuedReq := &QueuedRequest{
		Request:   req,
		Priority:  priority,
		Timestamp: time.Now(),
		Retries:   0,
	}

	heap.Push(&rq.queue, queuedReq)
	rq.stats.TotalEnqueued++
	rq.stats.CurrentSize = len(rq.queue)

	rq.logger.WithFields(logrus.Fields{
		"request_id": req.ID,
		"priority":   priority,
		"queue_size": len(rq.queue),
	}).Debug("Request enqueued")

	// Wake up waiting workers
	rq.cond.Broadcast()

	return nil
}

// worker processes requests from the queue
func (rq *RequestQueue) worker(workerID int) {
	rq.logger.WithField("worker_id", workerID).Info("Queue worker started")

	for {
		select {
		case <-rq.stopChan:
			rq.logger.WithField("worker_id", workerID).Info("Queue worker stopping")
			return
		default:
			batch := rq.getBatch()
			if len(batch) == 0 {
				// No work available, wait
				rq.mutex.Lock()
				rq.cond.Wait()
				rq.mutex.Unlock()
				continue
			}

			rq.processBatch(batch, workerID)
		}
	}
}

// getBatch retrieves a batch of requests from the queue
func (rq *RequestQueue) getBatch() []AIRequest {
	rq.mutex.Lock()
	defer rq.mutex.Unlock()

	var batch []AIRequest
	batchSize := rq.batchSize
	if len(rq.queue) < batchSize {
		batchSize = len(rq.queue)
	}

	for i := 0; i < batchSize && len(rq.queue) > 0; i++ {
		queuedReq := heap.Pop(&rq.queue).(*QueuedRequest)
		batch = append(batch, queuedReq.Request)
	}

	rq.stats.CurrentSize = len(rq.queue)

	if len(batch) > 0 {
		rq.stats.BatchesSent++
		currentAvg := rq.stats.AvgBatchSize
		totalBatches := float64(rq.stats.BatchesSent)
		rq.stats.AvgBatchSize = ((currentAvg * (totalBatches - 1)) + float64(len(batch))) / totalBatches

		rq.logger.WithFields(logrus.Fields{
			"batch_size":      len(batch),
			"remaining_queue": len(rq.queue),
		}).Debug("Batch retrieved from queue")
	}

	return batch
}

// processBatch processes a batch of requests
func (rq *RequestQueue) processBatch(batch []AIRequest, workerID int) {
	startTime := time.Now()

	rq.logger.WithFields(logrus.Fields{
		"worker_id":  workerID,
		"batch_size": len(batch),
	}).Debug("Processing batch")

	// Update active workers count
	rq.mutex.Lock()
	rq.stats.ActiveWorkers++
	rq.mutex.Unlock()

	defer func() {
		rq.mutex.Lock()
		rq.stats.ActiveWorkers--
		rq.mutex.Unlock()
	}()

	// Process the batch
	responses, err := rq.processingFunc(batch)
	if err != nil {
		rq.handleBatchError(batch, err, workerID)
		return
	}

	// Update statistics and send responses
	processingTime := time.Since(startTime)
	
	rq.mutex.Lock()
	rq.stats.TotalProcessed += int64(len(batch))
	
	// Update wait time statistics
	for _, req := range batch {
		waitTime := startTime.Sub(req.Timestamp)
		if waitTime > rq.stats.MaxWaitTime {
			rq.stats.MaxWaitTime = waitTime
		}
		
		currentAvg := rq.stats.AvgWaitTime
		processed := rq.stats.TotalProcessed
		rq.stats.AvgWaitTime = time.Duration((int64(currentAvg)*(processed-1) + int64(waitTime)) / processed)
	}
	rq.mutex.Unlock()

	// Send responses
	for _, response := range responses {
		response.ProcessingTime = processingTime / time.Duration(len(responses))
		select {
		case rq.responseChan <- response:
		default:
			rq.logger.Warn("Response channel full, dropping response")
		}
	}

	rq.logger.WithFields(logrus.Fields{
		"worker_id":       workerID,
		"batch_size":      len(batch),
		"processing_time": processingTime,
		"responses":       len(responses),
	}).Debug("Batch processed successfully")
}

// handleBatchError handles errors during batch processing
func (rq *RequestQueue) handleBatchError(batch []AIRequest, err error, workerID int) {
	rq.mutex.Lock()
	rq.stats.TotalErrors += int64(len(batch))
	rq.mutex.Unlock()

	rq.logger.WithFields(logrus.Fields{
		"worker_id":  workerID,
		"batch_size": len(batch),
		"error":      err.Error(),
	}).Error("Batch processing failed")

	// Try to retry requests individually if it was a batch error
	for _, req := range batch {
		if req.RetryCount < 3 { // Max 3 retries
			req.RetryCount++
			req.Timestamp = time.Now() // Reset timestamp for retry

			rq.mutex.Lock()
			queuedReq := &QueuedRequest{
				Request:   req,
				Priority:  1, // Lower priority for retries
				Timestamp: time.Now(),
				Retries:   req.RetryCount,
			}
			heap.Push(&rq.queue, queuedReq)
			rq.stats.CurrentSize = len(rq.queue)
			rq.mutex.Unlock()

			rq.logger.WithFields(logrus.Fields{
				"request_id":  req.ID,
				"retry_count": req.RetryCount,
			}).Info("Request requeued for retry")
		} else {
			// Send error response for failed request
			errorResponse := AIResponse{
				ID:        fmt.Sprintf("error_%s", req.ID),
				RequestID: req.ID,
				Provider:  req.Provider,
				Model:     req.Model,
				Content:   fmt.Sprintf("Request failed after maximum retries: %s", err.Error()),
				Timestamp: time.Now(),
			}

			select {
			case rq.errorChan <- fmt.Errorf("request %s failed permanently: %w", req.ID, err):
			default:
				rq.logger.Warn("Error channel full, dropping error")
			}
		}
	}
}

// batchTimeoutWorker ensures batches are processed even if they don't fill up
func (rq *RequestQueue) batchTimeoutWorker() {
	ticker := time.NewTicker(rq.batchTimeout)
	defer ticker.Stop()

	for {
		select {
		case <-rq.stopChan:
			return
		case <-ticker.C:
			rq.mutex.Lock()
			if len(rq.queue) > 0 {
				rq.logger.WithFields(logrus.Fields{
					"queue_size": len(rq.queue),
					"timeout":    rq.batchTimeout,
				}).Debug("Batch timeout triggered")
				rq.cond.Broadcast() // Wake up workers to process partial batch
			}
			rq.mutex.Unlock()
		}
	}
}

// GetResponseChannel returns the response channel
func (rq *RequestQueue) GetResponseChannel() <-chan AIResponse {
	return rq.responseChan
}

// GetErrorChannel returns the error channel
func (rq *RequestQueue) GetErrorChannel() <-chan error {
	return rq.errorChan
}

// GetStats returns queue statistics
func (rq *RequestQueue) GetStats() QueueStats {
	rq.mutex.RLock()
	defer rq.mutex.RUnlock()

	stats := rq.stats
	stats.CurrentSize = len(rq.queue)
	return stats
}

// GetQueueLength returns current queue length
func (rq *RequestQueue) GetQueueLength() int {
	rq.mutex.RLock()
	defer rq.mutex.RUnlock()
	return len(rq.queue)
}

// Stop stops the queue processing
func (rq *RequestQueue) Stop() {
	close(rq.stopChan)
	rq.cond.Broadcast() // Wake up all workers

	rq.logger.Info("Request queue stopped")
}

// Drain processes all remaining requests in the queue
func (rq *RequestQueue) Drain(ctx context.Context) error {
	rq.logger.Info("Draining request queue")

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			rq.mutex.RLock()
			queueSize := len(rq.queue)
			rq.mutex.RUnlock()

			if queueSize == 0 {
				rq.logger.Info("Queue drained successfully")
				return nil
			}

			// Wake up workers to process remaining requests
			rq.cond.Broadcast()
			time.Sleep(100 * time.Millisecond)
		}
	}
}

// SetBatchSize updates the batch size
func (rq *RequestQueue) SetBatchSize(newSize int) {
	rq.mutex.Lock()
	defer rq.mutex.Unlock()

	oldSize := rq.batchSize
	rq.batchSize = newSize

	rq.logger.WithFields(logrus.Fields{
		"old_batch_size": oldSize,
		"new_batch_size": newSize,
	}).Info("Batch size updated")
}

// SetBatchTimeout updates the batch timeout
func (rq *RequestQueue) SetBatchTimeout(newTimeout time.Duration) {
	rq.mutex.Lock()
	defer rq.mutex.Unlock()

	oldTimeout := rq.batchTimeout
	rq.batchTimeout = newTimeout

	rq.logger.WithFields(logrus.Fields{
		"old_timeout": oldTimeout,
		"new_timeout": newTimeout,
	}).Info("Batch timeout updated")
}

// Clear removes all requests from the queue
func (rq *RequestQueue) Clear() int {
	rq.mutex.Lock()
	defer rq.mutex.Unlock()

	cleared := len(rq.queue)
	rq.queue = make(PriorityQueue, 0)
	heap.Init(&rq.queue)
	rq.stats.CurrentSize = 0

	rq.logger.WithField("cleared_count", cleared).Info("Queue cleared")
	return cleared
}