import { Test, TestingModule } from '@nestjs/testing';
import { UIConfigurationController } from './ui-configuration.controller';
import { UIConfigurationService } from '../services/ui-configuration.service';

describe('UIConfigurationController', () => {
  let controller: UIConfigurationController;
  let uiConfigurationService: UIConfigurationService;

  const mockUIConfig = {
    id: 'config-123',
    projectId: 'project-123',
    name: 'Test UI Config',
    config: { theme: 'dark', layout: 'grid' },
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUIConfigurationService = {
    createOrUpdateUIConfiguration: jest.fn(),
    getUIConfiguration: jest.fn(),
    getUIConfigurationVersions: jest.fn(),
    getUIConfigurationVersion: jest.fn(),
    rollbackToVersion: jest.fn(),
    deleteUIConfiguration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UIConfigurationController],
      providers: [
        {
          provide: UIConfigurationService,
          useValue: mockUIConfigurationService,
        },
      ],
    }).compile();

    controller = module.get<UIConfigurationController>(UIConfigurationController);
    uiConfigurationService = module.get<UIConfigurationService>(UIConfigurationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /projects/:projectId/ui-configurations', () => {
    it('should create or update UI configuration', async () => {
      const createDto = {
        name: 'Updated UI Config',
        configuration: {
          name: 'Test Config',
          fileType: 'IMAGE' as const,
          responseType: 'TEXT' as const,
          widgets: [],
        },
      };

      const updatedConfig = { ...mockUIConfig, ...createDto, version: 2 };
      mockUIConfigurationService.createOrUpdateUIConfiguration.mockResolvedValue(updatedConfig);

      const req = { user: { id: 'user-123' } };
      const result = await controller.createOrUpdate('project-123', createDto, req);

      expect(result).toEqual(updatedConfig);
      expect(mockUIConfigurationService.createOrUpdateUIConfiguration).toHaveBeenCalledWith('project-123', createDto, 'user-123');
    });
  });

  describe('GET /projects/:projectId/ui-configurations', () => {
    it('should return UI configuration for project', async () => {
      mockUIConfigurationService.getUIConfiguration.mockResolvedValue(mockUIConfig);

      const result = await controller.get('project-123');

      expect(result).toEqual(mockUIConfig);
      expect(mockUIConfigurationService.getUIConfiguration).toHaveBeenCalledWith('project-123');
    });
  });

  describe('PUT /projects/:projectId/ui-configurations', () => {
    it('should update UI configuration', async () => {
      const updateDto = {
        name: 'Updated Config',
        configuration: {
          name: 'Updated Config',
          fileType: 'TEXT' as const,
          responseType: 'TEXT' as const,
          widgets: [],
        },
      };

      const updatedConfig = { ...mockUIConfig, ...updateDto };
      mockUIConfigurationService.createOrUpdateUIConfiguration.mockResolvedValue(updatedConfig);

      const req = { user: { id: 'user-123' } };
      const result = await controller.update('project-123', updateDto, req);

      expect(result).toEqual(updatedConfig);
      expect(mockUIConfigurationService.createOrUpdateUIConfiguration).toHaveBeenCalledWith('project-123', updateDto, 'user-123');
    });
  });

  describe('GET /projects/:projectId/ui-configurations/versions', () => {
    it('should return UI configuration versions', async () => {
      const mockVersions = [
        { version: 1, createdAt: new Date() },
        { version: 2, createdAt: new Date() },
      ];

      mockUIConfigurationService.getUIConfigurationVersions.mockResolvedValue(mockVersions);

      const result = await controller.getVersions('project-123');

      expect(result).toEqual(mockVersions);
      expect(mockUIConfigurationService.getUIConfigurationVersions).toHaveBeenCalledWith('project-123');
    });
  });

  describe('GET /projects/:projectId/ui-configurations/versions/:version', () => {
    it('should return specific UI configuration version', async () => {
      const versionConfig = { ...mockUIConfig, version: 2 };
      mockUIConfigurationService.getUIConfigurationVersion.mockResolvedValue(versionConfig);

      const result = await controller.getVersion('project-123', '2');

      expect(result).toEqual(versionConfig);
      expect(mockUIConfigurationService.getUIConfigurationVersion).toHaveBeenCalledWith('project-123', '2');
    });
  });
});