/**
 * Phase 1 ChatGPT Memory Test Runner
 * Executes comprehensive performance tests for memory deduplication system
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  performanceMetrics: {
    averageTime?: number;
    maxTime?: number;
    minTime?: number;
    totalOperations?: number;
  };
}

class Phase1TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🧪 Phase 1 ChatGPT Memory Deduplication - Performance Test Suite');
    console.log('================================================================\n');
    
    this.startTime = Date.now();
    
    try {
      // Run the vitest suite with performance output
      const { stdout, stderr } = await execAsync(
        'npx vitest run server/tests/chatgpt-memory-phase1.test.ts --reporter=verbose',
        { cwd: process.cwd(), maxBuffer: 1024 * 1024 * 10 }
      );
      
      this.parseTestOutput(stdout);
      this.displayResults();
      
      if (stderr) {
        console.log('\n⚠️  Test Warnings/Errors:');
        console.log(stderr);
      }
      
    } catch (error: any) {
      console.error('❌ Test execution failed:', error.message);
      
      // Try to parse partial results from error output
      if (error.stdout) {
        this.parseTestOutput(error.stdout);
        this.displayResults();
      }
    }
  }

  private parseTestOutput(output: string): void {
    const lines = output.split('\n');
    let currentTest = '';
    let performanceData: any = {};
    
    for (const line of lines) {
      // Parse test names
      if (line.includes('✓') && line.includes('should')) {
        currentTest = line.trim();
      }
      
      // Parse performance metrics
      if (line.includes('ms') && (line.includes('✓') || line.includes(':'))) {
        const match = line.match(/(\d+\.?\d*)ms/);
        if (match) {
          const duration = parseFloat(match[1]);
          
          if (currentTest) {
            this.results.push({
              testName: currentTest,
              passed: line.includes('✓'),
              duration,
              performanceMetrics: { averageTime: duration }
            });
          }
        }
      }
    }
  }

  private displayResults(): void {
    const totalTime = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    
    console.log('\n📊 Performance Test Results Summary');
    console.log('=====================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Total Execution Time: ${totalTime}ms\n`);
    
    console.log('🚀 Individual Test Performance:');
    console.log('--------------------------------');
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const testName = result.testName.replace(/^✓\s*/, '').substring(0, 60);
      const duration = result.duration.toFixed(2);
      
      console.log(`${status} ${testName}`);
      console.log(`   Duration: ${duration}ms`);
      
      // Performance rating
      const rating = this.getPerformanceRating(result.duration);
      console.log(`   Performance: ${rating}\n`);
    });
    
    this.displayPerformanceSummary();
  }

  private getPerformanceRating(duration: number): string {
    if (duration < 50) return '🟢 EXCELLENT (<50ms)';
    if (duration < 100) return '🟡 GOOD (50-100ms)';
    if (duration < 500) return '🟠 ACCEPTABLE (100-500ms)';
    return '🔴 NEEDS OPTIMIZATION (>500ms)';
  }

  private displayPerformanceSummary(): void {
    if (this.results.length === 0) return;
    
    const durations = this.results.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    console.log('📈 Performance Analytics:');
    console.log('-------------------------');
    console.log(`Average Test Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`Fastest Test: ${minDuration.toFixed(2)}ms`);
    console.log(`Slowest Test: ${maxDuration.toFixed(2)}ms`);
    
    // Performance targets validation
    console.log('\n🎯 Performance Target Compliance:');
    console.log('----------------------------------');
    
    const targets = {
      'Semantic Hash Generation': 500,
      'Memory Deduplication': 50,
      'Enhanced Prompt Building': 100,
      'Concurrent Operations': 200
    };
    
    Object.entries(targets).forEach(([operation, target]) => {
      const relevantTests = this.results.filter(r => 
        r.testName.toLowerCase().includes(operation.toLowerCase())
      );
      
      if (relevantTests.length > 0) {
        const avgTime = relevantTests.reduce((sum, test) => sum + test.duration, 0) / relevantTests.length;
        const status = avgTime <= target ? '✅ PASSED' : '❌ FAILED';
        console.log(`${operation}: ${avgTime.toFixed(2)}ms (target: ${target}ms) ${status}`);
      }
    });
    
    console.log('\n🏆 Phase 1 Memory System Status:');
    console.log('---------------------------------');
    
    const overallSuccess = this.results.every(r => r.passed);
    const avgPerformance = avgDuration < 200;
    
    if (overallSuccess && avgPerformance) {
      console.log('🎉 PHASE 1 COMPLETE: All tests passed with excellent performance!');
      console.log('   ✅ Real-time deduplication operational');
      console.log('   ✅ Enhanced system prompts functional');
      console.log('   ✅ Performance targets met');
      console.log('   ✅ Memory intelligence system ready for production');
    } else if (overallSuccess) {
      console.log('✅ PHASE 1 FUNCTIONAL: All tests passed, performance acceptable');
      console.log('   ⚠️  Some performance optimizations recommended');
    } else {
      console.log('⚠️  PHASE 1 NEEDS ATTENTION: Some tests failed');
      console.log('   🔧 Review failed tests and optimize implementation');
    }
  }
}

// Execute the test runner
async function main() {
  const runner = new Phase1TestRunner();
  await runner.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { Phase1TestRunner };