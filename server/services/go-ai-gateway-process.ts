import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fetch from 'node-fetch';
import { GoHealthStatus } from './go-ai-gateway-types.js';
import { GO_AI_GATEWAY_CONFIG } from './go-ai-gateway-utils.js';

/**
 * Manages the Go AI Gateway process lifecycle
 */
export class GoProcessManager {
  private goProcess: ChildProcess | null = null;
  private serviceUrl: string;
  private isStarting = false;
  private startPromise: Promise<void> | null = null;

  constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl;
  }

  /**
   * Get the current Go process
   */
  getProcess(): ChildProcess | null {
    return this.goProcess;
  }

  /**
   * Check if the service is starting
   */
  isServiceStarting(): boolean {
    return this.isStarting;
  }

  /**
   * Start the Go AI Gateway service
   */
  async startService(): Promise<void> {
    if (this.goProcess || this.isStarting) {
      if (this.startPromise) {
        await this.startPromise;
      }
      return;
    }

    this.isStarting = true;
    this.startPromise = this._startServiceInternal();
    await this.startPromise;
    this.isStarting = false;
  }

  private async _startServiceInternal(): Promise<void> {
    return new Promise((resolve, reject) => {
      const goServicePath = path.join(process.cwd(), 'go-ai-gateway');
      
      console.log('[GoAIGateway] Starting Go AI Gateway microservice...');
      
      // Build the Go service first
      const buildProcess = spawn('go', ['build', '-o', 'ai-gateway', '.'], {
        cwd: goServicePath,
        stdio: 'pipe'
      });

      buildProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('[GoAIGateway] Failed to build Go AI Gateway service');
          reject(new Error('Failed to build Go AI Gateway service'));
          return;
        }

        // Start the built service
        this.goProcess = spawn('./ai-gateway', [], {
          cwd: goServicePath,
          stdio: 'pipe',
          env: {
            ...process.env,
            AI_GATEWAY_PORT: process.env.AI_GATEWAY_PORT || GO_AI_GATEWAY_CONFIG.DEFAULT_PORT,
            LOG_LEVEL: process.env.LOG_LEVEL || GO_AI_GATEWAY_CONFIG.DEFAULT_LOG_LEVEL,
            MAX_WORKERS: process.env.MAX_WORKERS || GO_AI_GATEWAY_CONFIG.DEFAULT_MAX_WORKERS,
            QUEUE_SIZE: process.env.QUEUE_SIZE || GO_AI_GATEWAY_CONFIG.DEFAULT_QUEUE_SIZE,
            CACHE_TTL_MINUTES: process.env.CACHE_TTL_MINUTES || GO_AI_GATEWAY_CONFIG.DEFAULT_CACHE_TTL_MINUTES,
            BATCH_SIZE: process.env.BATCH_SIZE || GO_AI_GATEWAY_CONFIG.DEFAULT_BATCH_SIZE,
            BATCH_TIMEOUT_MS: process.env.BATCH_TIMEOUT_MS || GO_AI_GATEWAY_CONFIG.DEFAULT_BATCH_TIMEOUT_MS,
            API_KEY: process.env.API_KEY || GO_AI_GATEWAY_CONFIG.DEFAULT_API_KEY,
          }
        });

        this.goProcess.stdout?.on('data', (data) => {
          console.log(`[GoAIGateway] ${data.toString().trim()}`);
        });

        this.goProcess.stderr?.on('data', (data) => {
          console.error(`[GoAIGateway] Error: ${data.toString().trim()}`);
        });

        this.goProcess.on('close', (code) => {
          console.log(`[GoAIGateway] Process exited with code ${code}`);
          this.goProcess = null;
        });

        // Wait for service to be ready
        this.waitForServiceReady()
          .then(() => {
            console.log('[GoAIGateway] AI Gateway service is ready');
            resolve();
          })
          .catch(reject);
      });
    });
  }

  /**
   * Wait for the service to be ready
   */
  async waitForServiceReady(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.serviceUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        
        if (response.ok) {
          const health = await response.json() as GoHealthStatus;
          if (health.status === 'healthy' || health.status === 'degraded') {
            return;
          }
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Go AI Gateway service failed to start within timeout');
  }

  /**
   * Stop the Go service
   */
  stopService(): void {
    if (this.goProcess) {
      console.log('[GoAIGateway] Stopping Go AI Gateway service...');
      this.goProcess.kill('SIGTERM');
      this.goProcess = null;
    }
  }
}