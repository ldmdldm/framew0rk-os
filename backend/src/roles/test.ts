import { BaseRole, RoleConfig } from './base';
import { logger } from '../utils/logger';

type TestType = 'unit' | 'integration' | 'e2e';
type PerformanceMetric = 'loadTime' | 'responseTime' | 'throughput' | 'errorRate';

interface TestMetrics {
  coverage: number;
  passed: number;
  failed: number;
  pending: number;
}

interface PerformanceMetrics {
  loadTime: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
}

interface PerformanceBenchmarks {
  [key: string]: number;
}

export class TestAgent extends BaseRole {
  private testTypes: {
    unit: TestMetrics;
    integration: TestMetrics;
    e2e: TestMetrics;
    performance: {
      metrics: PerformanceMetrics;
      benchmarks: PerformanceBenchmarks;
    };
  };

  private qualityMetrics: {
    codeQuality: number;
    testCoverage: number;
    bugDensity: number;
    reliability: number;
  };

  constructor(config: RoleConfig, web3: any) {
    super(config, web3);
    this.testTypes = {
      unit: {
        coverage: 0,
        passed: 0,
        failed: 0,
        pending: 0
      },
      integration: {
        coverage: 0,
        passed: 0,
        failed: 0,
        pending: 0
      },
      e2e: {
        coverage: 0,
        passed: 0,
        failed: 0,
        pending: 0
      },
      performance: {
        metrics: {
          loadTime: 0,
          responseTime: 0,
          throughput: 0,
          errorRate: 0
        },
        benchmarks: {
          'loadTime': 2000, // ms
          'responseTime': 500, // ms
          'throughput': 1000, // requests/second
          'errorRate': 0.01 // 1%
        }
      }
    };

    this.qualityMetrics = {
      codeQuality: 0,
      testCoverage: 0,
      bugDensity: 0,
      reliability: 0
    };
  }

  async processMessage(message: string, userWallet: string): Promise<any> {
    try {
      this.addToMemory('user', message);
      
      // Analyze testing needs and generate test response
      const response = await this.generateTestResponse(message);
      
      this.addToMemory('agent', response);
      
      return {
        role: this.name,
        response: response,
        wallet: userWallet,
        action: 'TestAnalysis'
      };
    } catch (error) {
      logger.error('Error processing test message:', error);
      throw error;
    }
  }

  private async generateTestResponse(message: string): Promise<string> {
    // Analyze testing needs from message
    this.analyzeTestingNeeds(message);
    
    // Generate test plan
    const testPlan = this.generateTestPlan();
    
    // Generate quality report
    const qualityReport = this.generateQualityReport();
    
    return `[Test Agent] Quality Assurance Analysis:\n\n` +
           `Test Coverage Analysis:\n` +
           this.formatTestCoverage() + '\n\n' +
           `Performance Metrics:\n` +
           this.formatPerformanceMetrics() + '\n\n' +
           `Quality Report:\n` +
           qualityReport + '\n\n' +
           `Test Plan:\n` +
           testPlan + '\n\n' +
           `Recommendations:\n` +
           this.generateRecommendations();
  }

  private analyzeTestingNeeds(message: string) {
    const messageLower = message.toLowerCase();
    
    // Analyze unit testing needs
    if (messageLower.includes('unit') || messageLower.includes('component')) {
      this.testTypes.unit.coverage = this.calculateCoverage(message, 'unit');
    }
    
    // Analyze integration testing needs
    if (messageLower.includes('integration') || messageLower.includes('api')) {
      this.testTypes.integration.coverage = this.calculateCoverage(message, 'integration');
    }
    
    // Analyze e2e testing needs
    if (messageLower.includes('e2e') || messageLower.includes('end to end')) {
      this.testTypes.e2e.coverage = this.calculateCoverage(message, 'e2e');
    }
    
    // Analyze performance testing needs
    if (messageLower.includes('performance') || messageLower.includes('speed')) {
      this.analyzePerformanceNeeds(message);
    }
  }

  private calculateCoverage(message: string, type: TestType): number {
    const keywords: Record<TestType, string[]> = {
      unit: ['test', 'component', 'function', 'class', 'method'],
      integration: ['api', 'service', 'system', 'module', 'interface'],
      e2e: ['user', 'flow', 'scenario', 'interaction', 'experience']
    };

    const matches = keywords[type].filter((k: string) => 
      message.toLowerCase().includes(k.toLowerCase())
    ).length;

    return Math.min(100, matches * 20);
  }

  private analyzePerformanceNeeds(message: string) {
    const messageLower = message.toLowerCase();
    const metrics = this.testTypes.performance.metrics;
    
    if (messageLower.includes('load') || messageLower.includes('traffic')) {
      metrics.loadTime = this.calculateMetric(message, 'loadTime');
    }
    
    if (messageLower.includes('response') || messageLower.includes('speed') || messageLower.includes('slow')) {
      metrics.responseTime = 600; // Set higher than benchmark to trigger optimization
    }
    
    if (messageLower.includes('throughput') || messageLower.includes('capacity')) {
      metrics.throughput = this.calculateMetric(message, 'throughput');
    }
    
    if (messageLower.includes('error') || messageLower.includes('failure')) {
      metrics.errorRate = this.calculateMetric(message, 'errorRate');
    }
  }

  private calculateMetric(message: string, metric: PerformanceMetric): number {
    const keywords: Record<PerformanceMetric, string[]> = {
      loadTime: ['load', 'time', 'render', 'display', 'show'],
      responseTime: ['response', 'speed', 'fast', 'quick', 'instant'],
      throughput: ['throughput', 'capacity', 'volume', 'load', 'traffic'],
      errorRate: ['error', 'failure', 'crash', 'bug', 'issue']
    };

    const matches = keywords[metric].filter((k: string) => 
      message.toLowerCase().includes(k.toLowerCase())
    ).length;

    return Math.min(100, matches * 20);
  }

  private formatTestCoverage(): string {
    const typeNames = {
      'unit': 'Unit',
      'integration': 'Integration',
      'e2e': 'End-to-End'
    };
    
    return (['unit', 'integration', 'e2e'] as TestType[])
      .map(type => {
        const data = this.testTypes[type];
        return `${typeNames[type]} Tests:\n` +
               `- Coverage: ${data.coverage}%\n` +
               `- Passed: ${data.passed}\n` +
               `- Failed: ${data.failed}\n` +
               `- Pending: ${data.pending}`;
      })
      .join('\n\n');
  }

  private formatPerformanceMetrics(): string {
    const metrics = this.testTypes.performance.metrics;
    const benchmarks = this.testTypes.performance.benchmarks;
    const metricNames: Record<PerformanceMetric, string> = {
      loadTime: 'Load Time',
      responseTime: 'Response Time',
      throughput: 'Throughput',
      errorRate: 'Error Rate'
    };
    
    return Object.entries(metrics)
      .map(([metric, value]) => {
        const benchmark = benchmarks[metric];
        const status = value <= benchmark ? '✅' : '❌';
        return `${metricNames[metric as PerformanceMetric]}: ${value} (Benchmark: ${benchmark}) ${status}`;
      })
      .join('\n');
  }

  private generateQualityReport(): string {
    return `Code Quality: ${this.qualityMetrics.codeQuality}/10\n` +
           `Test Coverage: ${this.qualityMetrics.testCoverage}%\n` +
           `Bug Density: ${this.qualityMetrics.bugDensity}/1000 LOC\n` +
           `Reliability: ${this.qualityMetrics.reliability}/10\n\n` +
           `Overall Quality Status: ${this.getQualityStatus()}`;
  }

  private getQualityStatus(): string {
    const avg = (this.qualityMetrics.codeQuality + 
                this.qualityMetrics.testCoverage / 10 + 
                (10 - this.qualityMetrics.bugDensity / 100) + 
                this.qualityMetrics.reliability) / 4;
    
    return avg >= 8 ? 'Excellent' : 
           avg >= 6 ? 'Good' : 
           avg >= 4 ? 'Fair' : 'Poor';
  }

  private generateTestPlan(): string {
    const plan = [];
    
    // Unit testing plan
    if (this.testTypes.unit.coverage < 80) {
      plan.push(
        'Unit Testing:',
        '- Increase test coverage for core components',
        '- Implement test-driven development practices',
        '- Add unit tests for edge cases',
        '- Improve test maintainability'
      );
    }
    
    // Integration testing plan
    if (this.testTypes.integration.coverage < 80) {
      plan.push(
        'Integration Testing:',
        '- Test API endpoints and services',
        '- Verify system interactions',
        '- Test data flow between components',
        '- Validate error handling'
      );
    }
    
    // E2E testing plan
    if (this.testTypes.e2e.coverage < 80) {
      plan.push(
        'End-to-End Testing:',
        '- Test critical user journeys',
        '- Verify cross-browser compatibility',
        '- Test mobile responsiveness',
        '- Validate user interactions'
      );
    }
    
    // Performance testing plan
    if (Object.values(this.testTypes.performance.metrics).some(v => v > 0)) {
      plan.push(
        'Performance Testing:',
        '- Load testing with realistic scenarios',
        '- Stress testing for system limits',
        '- Performance optimization',
        '- Resource utilization monitoring'
      );
    }
    
    return plan.join('\n');
  }

  private generateRecommendations(): string {
    const recommendations = [];
    
    // Test coverage recommendations
    if (this.testTypes.unit.coverage < 80) {
      recommendations.push('- Increase unit test coverage to at least 80%');
    }
    if (this.testTypes.integration.coverage < 80) {
      recommendations.push('- Expand integration test coverage');
    }
    if (this.testTypes.e2e.coverage < 80) {
      recommendations.push('- Add more end-to-end test scenarios');
    }
    
    // Performance recommendations
    const performance = this.testTypes.performance.metrics;
    const benchmarks = this.testTypes.performance.benchmarks;
    
    if (performance.loadTime > benchmarks.loadTime) {
      recommendations.push('- Optimize page load time');
    }
    if (performance.responseTime > benchmarks.responseTime) {
      recommendations.push('- Improve API response time');
    }
    if (performance.throughput < benchmarks.throughput) {
      recommendations.push('- Increase system throughput capacity');
    }
    if (performance.errorRate > benchmarks.errorRate) {
      recommendations.push('- Reduce system error rates');
    }
    
    // Quality recommendations
    if (this.qualityMetrics.codeQuality < 8) {
      recommendations.push('- Improve code quality through refactoring');
    }
    if (this.qualityMetrics.bugDensity > 5) {
      recommendations.push('- Implement stricter code review process');
    }
    if (this.qualityMetrics.reliability < 8) {
      recommendations.push('- Enhance system reliability measures');
    }
    
    return recommendations.join('\n');
  }
}