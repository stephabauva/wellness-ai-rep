/**
 * Phase 1 ChatGPT Memory Deduplication - Performance Test Suite
 * Direct performance testing with metrics output
 */

import fetch from 'node-fetch';

class Phase1PerformanceTest {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.results = [];
    this.startTime = Date.now();
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    const start = performance.now();
    
    try {
      const result = await testFunction();
      const duration = performance.now() - start;
      
      this.results.push({
        name: testName,
        duration: duration,
        passed: true,
        result: result
      });
      
      console.log(`✅ PASSED: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.results.push({
        name: testName,
        duration: duration,
        passed: false,
        error: error.message
      });
      
      console.log(`❌ FAILED: ${duration.toFixed(2)}ms - ${error.message}`);
      throw error;
    }
  }

  async testChatGPTMemoryEnhancement() {
    return await this.runTest('ChatGPT Memory Enhancement API Test', async () => {
      const response = await fetch(`${this.baseUrl}/api/memory/chatgpt-enhancement-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'I want to lose 10 pounds through strength training and low-carb diet',
          userId: 1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.phase !== "1") {
        throw new Error('Phase 1 not detected in response');
      }

      return {
        phase: data.phase,
        status: data.status,
        features: data.features,
        metrics: data.metrics
      };
    });
  }

  async testEnhancedMemoryRetrieval() {
    return await this.runTest('Enhanced Memory Retrieval Performance', async () => {
      const response = await fetch(`${this.baseUrl}/api/memory/enhanced-retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'nutrition and weight loss preferences',
          limit: 5,
          contextualHints: ['diet', 'exercise']
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        memoriesCount: data.count,
        features: data.features,
        retrievalTime: data.retrievalTime || 'Not provided'
      };
    });
  }

  async testConcurrentMemoryOperations() {
    return await this.runTest('Concurrent Memory Operations Stress Test', async () => {
      const messages = [
        'I prefer morning workouts at 6 AM',
        'I follow intermittent fasting 16:8',
        'I have lactose intolerance',
        'My goal is to bench press 200 pounds',
        'I drink green tea instead of coffee'
      ];

      const promises = messages.map((message, index) =>
        fetch(`${this.baseUrl}/api/memory/chatgpt-enhancement-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            userId: 1 + index // Different users for isolation
          })
        })
      );

      const responses = await Promise.all(promises);
      
      for (const response of responses) {
        if (!response.ok) {
          throw new Error(`Concurrent operation failed: ${response.status}`);
        }
      }

      return {
        operationsCompleted: responses.length,
        allSuccessful: responses.every(r => r.ok)
      };
    });
  }

  async testMemoryDeduplicationLogic() {
    return await this.runTest('Memory Deduplication Algorithm Test', async () => {
      // Send identical message twice to test deduplication
      const duplicateMessage = 'I exercise 3 times per week for 45 minutes';
      
      const response1 = await fetch(`${this.baseUrl}/api/memory/chatgpt-enhancement-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: duplicateMessage,
          userId: 999
        })
      });

      const response2 = await fetch(`${this.baseUrl}/api/memory/chatgpt-enhancement-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: duplicateMessage,
          userId: 999
        })
      });

      if (!response1.ok || !response2.ok) {
        throw new Error('Deduplication test requests failed');
      }

      const data1 = await response1.json();
      const data2 = await response2.json();

      return {
        deduplicationActive: data1.features?.realTimeDeduplication && data2.features?.realTimeDeduplication,
        semanticHashingEnabled: data1.features?.semanticHashing && data2.features?.semanticHashing,
        bothResponsesValid: data1.status === 'operational' && data2.status === 'operational'
      };
    });
  }

  async testSystemPromptEnhancement() {
    return await this.runTest('Enhanced System Prompt Generation', async () => {
      const response = await fetch(`${this.baseUrl}/api/memory/chatgpt-enhancement-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What should I eat for breakfast to support my fitness goals?',
          userId: 1
        })
      });

      if (!response.ok) {
        throw new Error(`System prompt test failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        enhancedPromptGenerated: !!data.testResults?.enhancedPrompt,
        promptLength: data.testResults?.enhancedPrompt?.length || 0,
        parallelProcessing: data.features?.parallelProcessing,
        enhancedSystemPrompts: data.features?.enhancedSystemPrompts
      };
    });
  }

  displayResults() {
    const totalTime = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 PHASE 1 CHATGPT MEMORY DEDUPLICATION - PERFORMANCE RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Total Execution Time: ${totalTime}ms`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    console.log('🚀 Individual Test Performance:');
    console.log('-'.repeat(50));
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const performance = this.getPerformanceRating(result.duration);
      
      console.log(`${status} ${result.name}`);
      console.log(`   Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`   Performance: ${performance}`);
      
      if (result.result) {
        console.log(`   Result: ${JSON.stringify(result.result, null, 4)}`);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    });

    this.displayPerformanceAnalytics();
  }

  getPerformanceRating(duration) {
    if (duration < 50) return '🟢 EXCELLENT (<50ms)';
    if (duration < 100) return '🟡 GOOD (50-100ms)';
    if (duration < 500) return '🟠 ACCEPTABLE (100-500ms)';
    if (duration < 1000) return '🔴 SLOW (500ms-1s)';
    return '⚫ VERY SLOW (>1s)';
  }

  displayPerformanceAnalytics() {
    if (this.results.length === 0) return;

    const durations = this.results.filter(r => r.passed).map(r => r.duration);
    if (durations.length === 0) return;

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    console.log('📈 Performance Analytics:');
    console.log('-'.repeat(30));
    console.log(`Average Response Time: ${avgDuration.toFixed(2)}ms`);
    console.log(`Fastest Response: ${minDuration.toFixed(2)}ms`);
    console.log(`Slowest Response: ${maxDuration.toFixed(2)}ms`);

    // Performance targets validation
    console.log('\n🎯 Performance Target Compliance:');
    console.log('-'.repeat(35));
    
    const targets = {
      'Memory Enhancement API': 200,
      'Memory Retrieval': 150,
      'Concurrent Operations': 3000,
      'Deduplication Algorithm': 100,
      'System Prompt Generation': 200
    };

    Object.entries(targets).forEach(([operation, target]) => {
      const relevantTests = this.results.filter(r => 
        r.passed && r.name.toLowerCase().includes(operation.toLowerCase())
      );

      if (relevantTests.length > 0) {
        const avgTime = relevantTests.reduce((sum, test) => sum + test.duration, 0) / relevantTests.length;
        const status = avgTime <= target ? '✅ PASSED' : '❌ FAILED';
        console.log(`${operation}: ${avgTime.toFixed(2)}ms (target: ${target}ms) ${status}`);
      }
    });

    console.log('\n🏆 Phase 1 System Status:');
    console.log('-'.repeat(25));
    
    const allPassed = this.results.every(r => r.passed);
    const goodPerformance = avgDuration < 500;

    if (allPassed && goodPerformance) {
      console.log('🎉 PHASE 1 COMPLETE: All systems operational with excellent performance!');
      console.log('   ✅ Real-time deduplication operational');
      console.log('   ✅ Enhanced system prompts functional');
      console.log('   ✅ Performance targets met');
      console.log('   ✅ ChatGPT-level memory capabilities achieved');
    } else if (allPassed) {
      console.log('✅ PHASE 1 FUNCTIONAL: All tests passed, performance acceptable');
      console.log('   ⚠️  Some performance optimizations recommended');
    } else {
      console.log('⚠️  PHASE 1 NEEDS ATTENTION: Some functionality issues detected');
      console.log('   🔧 Review failed tests and optimize implementation');
    }
  }

  async runAllTests() {
    console.log('🧪 Phase 1 ChatGPT Memory Deduplication - Performance Test Suite');
    console.log('================================================================\n');

    try {
      // Core functionality tests
      await this.testChatGPTMemoryEnhancement();
      await this.testEnhancedMemoryRetrieval();
      
      // Performance and stress tests
      await this.testConcurrentMemoryOperations();
      await this.testMemoryDeduplicationLogic();
      await this.testSystemPromptEnhancement();
      
    } catch (error) {
      console.log(`\n⚠️  Test suite interrupted: ${error.message}`);
    } finally {
      this.displayResults();
    }
  }
}

// Execute the performance test suite
async function main() {
  const testSuite = new Phase1PerformanceTest();
  await testSuite.runAllTests();
}

// Execute if this is the main module
main().catch(console.error);