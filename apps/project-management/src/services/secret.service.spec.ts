import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SecretService } from './secret.service';
import { PluginSecret, Project, User } from '@app/common/entities';

describe('SecretService', () => {
  let service: SecretService;
  let secretRepository: Repository<PluginSecret>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
  } as Project;

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
  } as User;

  const mockSecret = {
    id: 'secret-123',
    projectId: 'project-123',
    name: 'Test Secret',
    encryptedValue: 'encrypted-test-value',
    iv: 'test-iv-1234567890123456',
    authTag: 'test-auth-tag-1234567890123456',
    description: 'A test secret',
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    project: mockProject,
    creator: mockUser,
  } as PluginSecret;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretService,
        {
          provide: getRepositoryToken(Secret),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SecretService>(SecretService);
    secretRepository = module.get<Repository<Secret>>(getRepositoryToken(Secret));
    projectRepository = module.get<Repository<Project>>(getRepositoryToken(Project));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listSecrets', () => {
    it('should return all secrets when no projectId provided', async () => {
      const mockSecrets = [mockSecret];
      jest.spyOn(secretRepository, 'find').mockResolvedValue(mockSecrets);

      const result = await service.listSecrets();

      expect(result).toEqual(mockSecrets);
      expect(secretRepository.find).toHaveBeenCalledWith({
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter secrets by projectId', async () => {
      const mockSecrets = [mockSecret];
      jest.spyOn(secretRepository, 'find').mockResolvedValue(mockSecrets);

      const result = await service.listSecrets('project-123');

      expect(result).toEqual(mockSecrets);
      expect(secretRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-123' },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getSecret', () => {
    it('should return secret when found', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret);

      const result = await service.getSecret('secret-123');

      expect(result).toEqual(mockSecret);
      expect(secretRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'secret-123' },
        relations: ['project'],
      });
    });

    it('should throw error when secret not found', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getSecret('non-existent')).rejects.toThrow('Secret not found');
    });
  });

  describe('createSecret', () => {
    it('should create and return new secret', async () => {
      const createDto = {
        name: 'New Secret',
        projectId: 'project-123',
        type: SecretType.PASSWORD,
        value: 'plain-text-value',
      };

      const createdSecret = { ...mockSecret, ...createDto, value: 'encrypted-value' };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(mockProject);
      jest.spyOn(secretRepository, 'create').mockReturnValue(createdSecret as any);
      jest.spyOn(secretRepository, 'save').mockResolvedValue(createdSecret);

      const result = await service.createSecret(createDto);

      expect(result).toEqual(createdSecret);
      expect(secretRepository.create).toHaveBeenCalledWith({
        ...createDto,
        value: 'encrypted-value', // Should be encrypted
        isActive: true,
      });
    });

    it('should throw error when project not found', async () => {
      const createDto = {
        name: 'New Secret',
        projectId: 'non-existent',
        type: SecretType.API_KEY,
        value: 'test-value',
      };

      jest.spyOn(projectRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createSecret(createDto)).rejects.toThrow('Project not found');
    });
  });

  describe('updateSecret', () => {
    it('should update and return secret', async () => {
      const updateDto = {
        name: 'Updated Secret',
        value: 'new-plain-value',
      };

      const updatedSecret = { ...mockSecret, ...updateDto, value: 'new-encrypted-value' };

      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret);
      jest.spyOn(secretRepository, 'save').mockResolvedValue(updatedSecret);

      const result = await service.updateSecret('secret-123', updateDto);

      expect(result).toEqual(updatedSecret);
    });

    it('should throw error when secret not found', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.updateSecret('non-existent', {})).rejects.toThrow('Secret not found');
    });
  });

  describe('activateSecret', () => {
    it('should activate secret successfully', async () => {
      const inactiveSecret = { ...mockSecret, isActive: false };
      const activatedSecret = { ...inactiveSecret, isActive: true };

      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(inactiveSecret);
      jest.spyOn(secretRepository, 'save').mockResolvedValue(activatedSecret);

      const result = await service.activateSecret('secret-123');

      expect(result.isActive).toBe(true);
    });

    it('should throw error when secret not found', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.activateSecret('non-existent')).rejects.toThrow('Secret not found');
    });
  });

  describe('deactivateSecret', () => {
    it('should deactivate secret successfully', async () => {
      const activatedSecret = { ...mockSecret, isActive: true };
      const deactivatedSecret = { ...activatedSecret, isActive: false };

      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(activatedSecret);
      jest.spyOn(secretRepository, 'save').mockResolvedValue(deactivatedSecret);

      const result = await service.deactivateSecret('secret-123');

      expect(result.isActive).toBe(false);
    });

    it('should throw error when secret not found', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deactivateSecret('non-existent')).rejects.toThrow('Secret not found');
    });
  });

  describe('deleteSecret', () => {
    it('should delete secret successfully', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret);
      jest.spyOn(secretRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await expect(service.deleteSecret('secret-123')).resolves.not.toThrow();
      expect(secretRepository.delete).toHaveBeenCalledWith('secret-123');
    });

    it('should throw error when secret not found', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.deleteSecret('non-existent')).rejects.toThrow('Secret not found');
    });
  });

  describe('getActiveSecrets', () => {
    it('should return active secrets for project', async () => {
      const mockSecrets = [mockSecret];
      jest.spyOn(secretRepository, 'find').mockResolvedValue(mockSecrets);

      const result = await service.getActiveSecrets('project-123');

      expect(result).toEqual(mockSecrets);
      expect(secretRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-123', isActive: true },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getSecretsByType', () => {
    it('should return secrets by type', async () => {
      const mockSecrets = [mockSecret];
      jest.spyOn(secretRepository, 'find').mockResolvedValue(mockSecrets);

      const result = await service.getSecretsByType(SecretType.API_KEY);

      expect(result).toEqual(mockSecrets);
      expect(secretRepository.find).toHaveBeenCalledWith({
        where: { type: SecretType.API_KEY },
        relations: ['project'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getDecryptedSecretValue', () => {
    it('should return decrypted secret value', async () => {
      const decryptedValue = 'plain-text-api-key';

      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret);

      const result = await service.getDecryptedSecretValue('secret-123');

      expect(result).toBe(decryptedValue);
      expect(secretRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'secret-123', isActive: true },
        relations: ['project'],
      });
    });

    it('should throw error when secret not found', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getDecryptedSecretValue('non-existent')).rejects.toThrow('Secret not found');
    });

    it('should throw error when secret is not active', async () => {
      const inactiveSecret = { ...mockSecret, isActive: false };
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(inactiveSecret);

      await expect(service.getDecryptedSecretValue('secret-123')).rejects.toThrow('Secret is not active');
    });
  });

  describe('validateSecretName', () => {
    it('should validate secret name successfully', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(null);

      const result = await service.validateSecretName('new-secret-name', 'project-123');

      expect(result).toBe(true);
      expect(secretRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'new-secret-name', projectId: 'project-123' },
      });
    });

    it('should return false when secret name already exists', async () => {
      jest.spyOn(secretRepository, 'findOne').mockResolvedValue(mockSecret);

      const result = await service.validateSecretName('existing-secret', 'project-123');

      expect(result).toBe(false);
    });
  });
});