import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '@app/common/entities';
import { v4 as uuidv4 } from 'uuid';

export interface Plugin {
  id: string;
  name: string;
  description?: string;
  type: 'API' | 'SCRIPT';
  enabled: boolean;
  trigger: 'ON_BLUR' | 'ON_SUBMIT';
  onFailBehavior: 'HARD_BLOCK' | 'SOFT_WARN' | 'ADVISORY';
  questionBindings: string[];
  isDraft: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
  apiConfig?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH';
    headers: Record<string, string>;
    payload?: string;
    responseMapping: { resultPath: string; messagePath?: string };
    timeout: number;
    retries: number;
  };
  scriptCode?: string;
}

@Injectable()
export class PluginService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  private async findProject(projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return project;
  }

  private getPlugins(project: Project): Plugin[] {
    return (project.configuration?.plugins as Plugin[]) ?? [];
  }

  async listPlugins(projectId: string): Promise<{ success: boolean; data: { plugins: Plugin[] } }> {
    const project = await this.findProject(projectId);
    return { success: true, data: { plugins: this.getPlugins(project) } };
  }

  async createPlugin(projectId: string, dto: Partial<Plugin>): Promise<{ success: boolean; data: { plugin: Plugin } }> {
    this.validatePluginDto(dto);
    const project = await this.findProject(projectId);
    const plugins = this.getPlugins(project);

    const now = new Date().toISOString();
    const plugin: Plugin = {
      id: uuidv4(),
      name: dto.name!,
      description: dto.description,
      type: dto.type!,
      enabled: false,
      trigger: dto.trigger ?? 'ON_BLUR',
      onFailBehavior: dto.onFailBehavior ?? 'ADVISORY',
      questionBindings: dto.questionBindings ?? [],
      isDraft: true,
      version: 1,
      createdAt: now,
      updatedAt: now,
      apiConfig: dto.apiConfig,
      scriptCode: dto.scriptCode,
    };

    plugins.push(plugin);
    project.configuration = { ...project.configuration, plugins };
    await this.projectRepository.save(project);

    return { success: true, data: { plugin } };
  }

  async updatePlugin(
    projectId: string,
    pluginId: string,
    dto: Partial<Plugin>,
  ): Promise<{ success: boolean; data: { plugin: Plugin } }> {
    const project = await this.findProject(projectId);
    const plugins = this.getPlugins(project);
    const idx = plugins.findIndex((p) => p.id === pluginId);
    if (idx === -1) throw new NotFoundException(`Plugin ${pluginId} not found`);

    const updated: Plugin = {
      ...plugins[idx],
      ...dto,
      id: pluginId,
      updatedAt: new Date().toISOString(),
      isDraft: true, // any edit resets to draft — must re-deploy
    };

    if (dto.name !== undefined || dto.type !== undefined || dto.apiConfig !== undefined || dto.scriptCode !== undefined) {
      this.validatePluginDto(updated);
    }

    plugins[idx] = updated;
    project.configuration = { ...project.configuration, plugins };
    await this.projectRepository.save(project);

    return { success: true, data: { plugin: updated } };
  }

  async deletePlugin(projectId: string, pluginId: string): Promise<{ success: boolean; message: string }> {
    const project = await this.findProject(projectId);
    const plugins = this.getPlugins(project);
    const idx = plugins.findIndex((p) => p.id === pluginId);
    if (idx === -1) throw new NotFoundException(`Plugin ${pluginId} not found`);

    plugins.splice(idx, 1);
    project.configuration = { ...project.configuration, plugins };
    await this.projectRepository.save(project);

    return { success: true, message: `Plugin ${pluginId} deleted` };
  }

  async deployPlugin(projectId: string, pluginId: string): Promise<{ success: boolean; data: { plugin: Plugin } }> {
    const project = await this.findProject(projectId);
    const plugins = this.getPlugins(project);
    const idx = plugins.findIndex((p) => p.id === pluginId);
    if (idx === -1) throw new NotFoundException(`Plugin ${pluginId} not found`);

    const plugin = plugins[idx];
    this.validatePluginForDeploy(plugin);

    const now = new Date().toISOString();
    plugins[idx] = {
      ...plugin,
      isDraft: false,
      version: plugin.version + 1,
      deployedAt: now,
      updatedAt: now,
    };

    project.configuration = { ...project.configuration, plugins };
    await this.projectRepository.save(project);

    return { success: true, data: { plugin: plugins[idx] } };
  }

  async togglePlugin(
    projectId: string,
    pluginId: string,
    enabled: boolean,
  ): Promise<{ success: boolean; data: { plugin: Plugin } }> {
    const project = await this.findProject(projectId);
    const plugins = this.getPlugins(project);
    const idx = plugins.findIndex((p) => p.id === pluginId);
    if (idx === -1) throw new NotFoundException(`Plugin ${pluginId} not found`);

    if (enabled && plugins[idx].isDraft) {
      throw new BadRequestException('Cannot enable a draft plugin — deploy it first');
    }

    plugins[idx] = { ...plugins[idx], enabled, updatedAt: new Date().toISOString() };
    project.configuration = { ...project.configuration, plugins };
    await this.projectRepository.save(project);

    return { success: true, data: { plugin: plugins[idx] } };
  }

  private validatePluginDto(dto: Partial<Plugin>) {
    if (!dto.name?.trim()) throw new BadRequestException('Plugin name is required');
    if (!dto.type || !['API', 'SCRIPT'].includes(dto.type)) {
      throw new BadRequestException("Plugin type must be 'API' or 'SCRIPT'");
    }
    if (dto.trigger && !['ON_BLUR', 'ON_SUBMIT'].includes(dto.trigger)) {
      throw new BadRequestException("Trigger must be 'ON_BLUR' or 'ON_SUBMIT'");
    }
    if (dto.onFailBehavior && !['HARD_BLOCK', 'SOFT_WARN', 'ADVISORY'].includes(dto.onFailBehavior)) {
      throw new BadRequestException("onFailBehavior must be 'HARD_BLOCK', 'SOFT_WARN', or 'ADVISORY'");
    }
    if (dto.type === 'API' && !dto.apiConfig?.url) {
      throw new BadRequestException('API plugins require apiConfig.url');
    }
    if (dto.type === 'SCRIPT' && !dto.scriptCode?.trim()) {
      throw new BadRequestException('SCRIPT plugins require scriptCode');
    }
  }

  private validatePluginForDeploy(plugin: Plugin) {
    this.validatePluginDto(plugin);
    if (plugin.type === 'API') {
      if (!plugin.apiConfig?.responseMapping?.resultPath) {
        throw new BadRequestException('API plugins require responseMapping.resultPath before deploying');
      }
      const timeout = plugin.apiConfig.timeout ?? 0;
      if (timeout < 1000 || timeout > 15000) {
        throw new BadRequestException('API plugin timeout must be between 1000 and 15000 ms');
      }
    }
  }
}
