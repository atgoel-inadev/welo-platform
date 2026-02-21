import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class WorkflowEngineClient {
  private readonly logger = new Logger(WorkflowEngineClient.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get(
      'WORKFLOW_ENGINE_URL',
      'http://workflow-engine:3001/api/v1',
    );
  }

  async sendTaskEvent(
    taskId: string,
    eventType: string,
    payload: Record<string, any> = {},
  ): Promise<any> {
    const body = JSON.stringify({
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await this.httpPost(`/tasks/${taskId}/events`, body);
      this.logger.log(`Sent XState event '${eventType}' to task ${taskId}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to send XState event '${eventType}' to task ${taskId}: ${error.message}`,
      );
      // Non-blocking: log but do not throw — state management continues
      return null;
    }
  }

  async getTaskState(taskId: string): Promise<any> {
    try {
      return await this.httpGet(`/tasks/${taskId}/state`);
    } catch (error) {
      this.logger.error(`Failed to get state for task ${taskId}: ${error.message}`);
      return null;
    }
  }

  private httpPost(path: string, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${path}`);
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.write(body);
      req.end();
    });
  }

  private httpGet(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${path}`);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.get(url.toString(), (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }
}
