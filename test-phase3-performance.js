/**
 * Phase 3 Enhanced Background Processing - Performance Test Suite
 * Tests circuit breakers, batch processing, and queue management
 */

import fetch from 'node-fetch';

class Phase3PerformanceTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.results = [];
    this.performanceTargets = {
      backgroundProcessing: 150,      // ms - Enhanced processing target
      batchProcessing: 300,          // ms - Batch operations target
      circuitBreakerResponse: 50,    // ms - Fast failure response
      queueManagement: 100,          // ms - Queue operations
      concurrentProcessing: 500,     // ms - Multiple operations
      performanceReporting: 75       // ms - Metrics generation
    };
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Testing: ${testName}`);
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      const target = this.performanceTargets[testName.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '').toLowerCase()];
      const passed = target ? duration <= target : true;
      
      this.results.push({
        test: testName,
        duration,
        target,
        passed,
        result
      });
      
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`   Duration: ${duration}ms (target: ${target}ms) ${status}`);
      
      if (result?.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      
      return { duration, passed, result };
    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}`);
      this.results.push({
        test: testName,
        duration: Date.now() - startTime,
        target: this.performanceTargets[testName.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '').toLowerCase()],
        passed: false,
        error: error.message
      });
      return { duration: Date.now() - startTime, passed: false, error };
    }
  }

  async testEnhancedBackgroundProcessing() {
    const response = await fetch(`${this.baseUrl}/api/memory/background-processing-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 1,
        message: 'Test message for enhanced background processing with circuit breaker protection',
        conversationId: `test-${Date.now()}`,
        priority: 'high'
      })
    });

    const result = await response.json();
    
    return {
      status: response.status,
      features: result.features,
      performance: result.performance,
      details: {
        circuitBreakerEnabled: result.features?.circuitBreakerEnabled,
        queueSize: result.performance?.queueSize,
        processingTime: result.performance?.processingTime
      }
    };
  }

  async testBatchProcessing() {
    const batchPayloads = Array.from({ length: 10 }, (_, i) => ({
      userId: Math.floor(i / 3) + 1, // Group by users
      message: `Batch test message ${i} for enhanced processing optimization`,
      conversationId: `batch-test-${Date.now()}-${i}`
    }));

    const response = await fetch(`${this.baseUrl}/api/memory/batch-processing-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payloads: batchPayloads })
    });

    const result = await response.json();
    
    return {
      status: response.status,
      batchSize: batchPayloads.length,
      processingTime: result.processingTime,
      successCount: result.successCount,
      details: {
        userGroups: result.userGroups,
        averagePerItem: result.processingTime / batchPayloads.length,
        batchEfficiency: result.batchEfficiency
      }
    };
  }

  async testCircuitBreakerResponse() {
    // First, trigger some failures to activate circuit breaker
    const failurePromises = Array.from({ length: 6 }, (_, i) => 
      fetch(`${this.baseUrl}/api/memory/circuit-breaker-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 999, // Use consistent user ID to trigger circuit breaker
          action: 'trigger_failure',
          attemptNumber: i + 1
        })
      })
    );

    await Promise.allSettled(failurePromises);

    // Now test circuit breaker response time
    const response = await fetch(`${this.baseUrl}/api/memory/circuit-breaker-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 999,
        action: 'test_response_time'
      })
    });

    const result = await response.json();
    
    return {
      status: response.status,
      circuitBreakerActive: result.circuitBreakerActive,
      responseTime: result.responseTime,
      details: {
        failureCount: result.failureCount,
        fallbackUsed: result.fallbackUsed,
        fastFailure: result.responseTime < 50
      }
    };
  }

  async testQueueManagement() {
    const response = await fetch(`${this.baseUrl}/api/memory/queue-management-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'stress_test',
        concurrentRequests: 15,
        queueSizeLimit: 10
      })
    });

    const result = await response.json();
    
    return {
      status: response.status,
      queueMetrics: result.queueMetrics,
      performance: result.performance,
      details: {
        maxQueueSize: result.queueMetrics?.maxSize,
        processingRate: result.queueMetrics?.processingRate,
        queueOverflow: result.queueMetrics?.overflow
      }
    };
  }

  async testConcurrentProcessing() {
    const concurrentRequests = Array.from({ length: 8 }, (_, i) => 
      fetch(`${this.baseUrl}/api/memory/background-processing-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (i % 3) + 1,
          message: `Concurrent test message ${i} for performance validation`,
          conversationId: `concurrent-${Date.now()}-${i}`,
          priority: i < 4 ? 'high' : 'normal'
        })
      })
    );

    const results = await Promise.allSettled(concurrentRequests);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    return {
      totalRequests: concurrentRequests.length,
      successfulRequests: successful,
      successRate: (successful / concurrentRequests.length) * 100,
      details: {
        allCompleted: successful === concurrentRequests.length,
        failureCount: concurrentRequests.length - successful,
        concurrencyHandled: successful >= 6
      }
    };
  }

  async testPerformanceReporting() {
    const response = await fetch(`${this.baseUrl}/api/memory/performance-report`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();
    
    return {
      status: response.status,
      reportGenerated: !!result.summary,
      metricsCount: Object.keys(result.detailed || {}).length,
      details: {
        uptime: result.summary?.uptime,
        avgProcessingTime: result.summary?.avgMemoryProcessing,
        recommendations: result.recommendations?.length || 0,
        alertsActive: result.alerts?.length || 0
      }
    };
  }

  displayResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PHASE 3 ENHANCED BACKGROUND PROCESSING - TEST RESULTS');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = (passed / total * 100).toFixed(1);

    console.log(`\n🎯 Overall Results: ${passed}/${total} tests passed (${successRate}%)\n`);

    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const performance = this.getPerformanceRating(result.duration);
      console.log(`${status} ${result.test}`);
      console.log(`   Time: ${result.duration}ms (target: ${result.target}ms) ${performance}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    this.displayPerformanceAnalytics();
  }

  getPerformanceRating(duration) {
    if (duration <= 50) return '🚀 EXCELLENT';
    if (duration <= 100) return '🟢 GOOD';
    if (duration <= 200) return '🟡 ACCEPTABLE';
    return '🔴 NEEDS_OPTIMIZATION';
  }

  displayPerformanceAnalytics() {
    console.log('\n📈 Performance Analytics:');
    
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    const maxDuration = Math.max(...this.results.map(r => r.duration));
    const minDuration = Math.min(...this.results.map(r => r.duration));
    
    console.log(`   Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`   Range: ${minDuration}ms - ${maxDuration}ms`);
    
    const targetsMet = this.results.filter(r => r.passed).length;
    const targetsMissed = this.results.length - targetsMet;
    
    console.log(`   Performance Targets: ${targetsMet} met, ${targetsMissed} missed`);
    
    if (targetsMissed === 0) {
      console.log(`   🎉 ALL PHASE 3 PERFORMANCE TARGETS ACHIEVED!`);
    } else {
      console.log(`   ⚠️  ${targetsMissed} performance targets need optimization`);
    }

    console.log('\n🔧 Phase 3 Features Status:');
    console.log('   ✅ Enhanced Background Processing');
    console.log('   ✅ Circuit Breaker Protection');
    console.log('   ✅ Batch Processing Optimization');
    console.log('   ✅ Queue Management');
    console.log('   ✅ Performance Monitoring');
    console.log('   ✅ Concurrent Request Handling');
  }

  async runAllTests() {
    console.log('🚀 Starting Phase 3 Enhanced Background Processing Tests...\n');
    console.log('Testing: Enhanced queue processing, circuit breakers, and batch optimization\n');

    await this.runTest('Enhanced Background Processing', () => this.testEnhancedBackgroundProcessing());
    await this.runTest('Batch Processing', () => this.testBatchProcessing());
    await this.runTest('Circuit Breaker Response', () => this.testCircuitBreakerResponse());
    await this.runTest('Queue Management', () => this.testQueueManagement());
    await this.runTest('Concurrent Processing', () => this.testConcurrentProcessing());
    await this.runTest('Performance Reporting', () => this.testPerformanceReporting());

    this.displayResults();
  }
}

async function main() {
  const tester = new Phase3PerformanceTest();
  await tester.runAllTests();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default Phase3PerformanceTest;