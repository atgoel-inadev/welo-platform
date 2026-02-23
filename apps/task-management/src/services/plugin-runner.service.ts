import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, PluginSecret, PluginExecutionLog } from '@app/common/entities';
import * as crypto from 'crypto';
import * as vm from 'vm';

const ALGORITHM = 'aes-256-gcm';
const SCRIPT_TIMEOUT_MS = 3000;
const DEFAULT_API_TIMEOUT_MS = 5000;

export interface PluginExecutePayload {
  pluginId: string;
  questionId: string;
  questionText: string;
  questionType: string;
  answerValue: any;
  taskContext?: Record<string, any>;
}

export interface PluginExecuteResult {
  result: 'PASS' | 'WARN' | 'FAIL' | 'ERROR' | 'TIMEOUT';
  message?: string;
  executionTimeMs: number;
  onFailBehavior: string;
}

@Injectable()
export class PluginRunnerService {
  private readonly logger = new Logger(PluginRunnerService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(PluginSecret)
    private readonly secretRepository: Repository<PluginSecret>,
    @InjectRepository(PluginExecutionLog)
    private readonly logRepository: Repository<PluginExecutionLog>,
  ) {
    const keyHex = process.env.PLUGIN_SECRETS_KEY;
    if (keyHex && keyHex.length === 64) {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    } else {
      this.logger.warn('PLUGIN_SECRETS_KEY not set or invalid — using insecure dev key');
      this.encryptionKey = Buffer.alloc(32, 0);
    }
  }

  private decryptSecret(secret: PluginSecret): string {
    const iv = Buffer.from(secret.iv, 'hex');
    const authTag = Buffer.from(secret.authTag, 'hex');
    const encryptedData = Buffer.from(secret.encryptedValue, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    return decipher.update(encryptedData).toString('utf8') + decipher.final('utf8');
  }

  private async resolveSecrets(projectId: string, template: string): Promise<string> {
    const secretPattern = /\{\{secrets\.([A-Z][A-Z0-9_]*)\}\}/g;
    const matches = [...template.matchAll(secretPattern)];
    if (matches.length === 0) return template;

    const secretNames = [...new Set(matches.map((m) => m[1]))];
    const secrets = await this.secretRepository.find({
      where: secretNames.map((name) => ({ projectId, name })),
    });

    const secretMap = new Map<string, string>();
    for (const secret of secrets) {
      secretMap.set(secret.name, this.decryptSecret(secret));
    }

    return template.replace(secretPattern, (_, key) => secretMap.get(key) ?? `{{secrets.${key}}}`);
  }

  private interpolate(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const parts = path.trim().split('.');
      let value: any = vars;
      for (const part of parts) {
        if (value == null) return `{{${path}}}`;
        value = value[part];
      }
      return value !== undefined && value !== null ? String(value) : `{{${path}}}`;
    });
  }

  private getByPath(obj: any, dotPath: string): any {
    return dotPath.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
  }

  async execute(
    taskId: string,
    projectId: string,
    payload: PluginExecutePayload,
  ): Promise<PluginExecuteResult> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const plugins: any[] = project.configuration?.plugins ?? [];
    const plugin = plugins.find((p) => p.id === payload.pluginId);
    if (!plugin) throw new NotFoundException(`Plugin ${payload.pluginId} not found in project`);

    const startedAt = Date.now();
    let result: PluginExecuteResult['result'] = 'ERROR';
    let message: string | undefined;
    let httpStatus: number | undefined;
    let errorDetail: string | undefined;

    try {
      if (plugin.type === 'API') {
        ({ result, message, httpStatus } = await this.executeApiPlugin(plugin, projectId, payload));
      } else if (plugin.type === 'SCRIPT') {
        ({ result, message } = await this.executeScriptPlugin(plugin, payload));
      } else {
        throw new Error(`Unknown plugin type: ${plugin.type}`);
      }
    } catch (err) {
      errorDetail = err instanceof Error ? err.message : String(err);
      if (errorDetail?.toLowerCase().includes('timeout')) {
        result = 'TIMEOUT';
        message = 'Plugin execution timed out';
      } else {
        result = 'ERROR';
        message = 'Plugin execution failed';
      }
      this.logger.error(`Plugin ${payload.pluginId} error: ${errorDetail}`);
    }

    const executionTimeMs = Date.now() - startedAt;

    // Audit log — never store answerValue
    await this.logRepository.save(
      this.logRepository.create({
        pluginId: payload.pluginId,
        projectId,
        taskId,
        questionId: payload.questionId,
        result,
        message,
        executionTimeMs,
        httpStatus,
        errorDetail,
      }),
    );

    return {
      result,
      message,
      executionTimeMs,
      onFailBehavior: plugin.onFailBehavior ?? 'ADVISORY',
    };
  }

  private async executeApiPlugin(
    plugin: any,
    projectId: string,
    payload: PluginExecutePayload,
  ): Promise<{ result: PluginExecuteResult['result']; message?: string; httpStatus?: number }> {
    const cfg = plugin.apiConfig;
    const vars = {
      question: { id: payload.questionId, text: payload.questionText, type: payload.questionType },
      answer: { value: payload.answerValue },
      context: payload.taskContext ?? {},
    };

    // Resolve secrets in URL and headers
    let url = this.interpolate(cfg.url, vars);
    url = await this.resolveSecrets(projectId, url);

    const resolvedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries<string>(cfg.headers ?? {})) {
      let val = this.interpolate(v, vars);
      val = await this.resolveSecrets(projectId, val);
      resolvedHeaders[k] = val;
    }

    let body: string | undefined;
    if (cfg.payload) {
      let payloadStr = this.interpolate(cfg.payload, vars);
      payloadStr = await this.resolveSecrets(projectId, payloadStr);
      body = payloadStr;
      resolvedHeaders['Content-Type'] = resolvedHeaders['Content-Type'] ?? 'application/json';
    }

    const timeout = Math.min(cfg.timeout ?? DEFAULT_API_TIMEOUT_MS, 15000);
    const maxRetries = Math.min(cfg.retries ?? 0, 3);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        let httpStatus: number;
        let responseBody: any;

        try {
          const response = await fetch(url, {
            method: cfg.method ?? 'POST',
            headers: resolvedHeaders,
            body,
            signal: controller.signal,
          });
          httpStatus = response.status;
          const text = await response.text();
          try {
            responseBody = JSON.parse(text);
          } catch {
            responseBody = text;
          }
        } finally {
          clearTimeout(timer);
        }

        // Extract result via dot-path
        const rawResult = this.getByPath(responseBody, cfg.responseMapping?.resultPath ?? 'result');
        const normalized = String(rawResult ?? '').toUpperCase();
        const validResults = ['PASS', 'WARN', 'FAIL'];
        const result: PluginExecuteResult['result'] = validResults.includes(normalized)
          ? (normalized as any)
          : 'ERROR';

        const message = cfg.responseMapping?.messagePath
          ? String(this.getByPath(responseBody, cfg.responseMapping.messagePath) ?? '')
          : undefined;

        return { result, message, httpStatus };
      } catch (err) {
        lastError = err as Error;
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('API plugin timeout');
        }
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error('API plugin failed after retries');
  }

  private async executeScriptPlugin(
    plugin: any,
    payload: PluginExecutePayload,
  ): Promise<{ result: PluginExecuteResult['result']; message?: string }> {
    const question = {
      id: payload.questionId,
      text: payload.questionText,
      type: payload.questionType,
    };
    const answer = { value: payload.answerValue };
    const context = payload.taskContext ?? {};

    // Wrap user function call to capture return value
    const wrappedCode = `
      ${plugin.scriptCode}
      __result__ = (typeof validate === 'function') ? validate(question, answer, context) : { result: 'ERROR', message: 'validate function not found' };
    `;

    const sandbox: Record<string, any> = {
      Math,
      JSON,
      Date,
      String,
      Number,
      Array,
      Object,
      RegExp,
      Boolean,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      question,
      answer,
      context,
      __result__: null,
    };

    try {
      vm.runInNewContext(wrappedCode, sandbox, { timeout: SCRIPT_TIMEOUT_MS });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Script execution timed out')) {
        throw new Error('Script plugin timeout');
      }
      throw err;
    }

    const rawResult = sandbox.__result__;
    if (!rawResult || typeof rawResult !== 'object') {
      return { result: 'ERROR', message: 'Plugin did not return a valid result object' };
    }

    const normalized = String(rawResult.result ?? '').toUpperCase();
    const validResults = ['PASS', 'WARN', 'FAIL'];
    const result: PluginExecuteResult['result'] = validResults.includes(normalized)
      ? (normalized as any)
      : 'ERROR';

    return { result, message: rawResult.message };
  }
}
