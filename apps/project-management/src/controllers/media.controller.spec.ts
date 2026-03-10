import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { BadRequestException } from '@nestjs/common';

describe('MediaController', () => {
  let controller: MediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /media/upload', () => {
    it('should throw BadRequestException when no file is provided', async () => {
      await expect(controller.uploadFile(null, 'project-123', 'batch-001'))
        .rejects.toThrow(BadRequestException);
    });

    it('should return file URL when file is uploaded', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        filename: 'test.jpg',
        size: 1024,
        mimetype: 'image/jpeg',
      } as any;

      const result = await controller.uploadFile(mockFile, 'project-123', 'batch-001');

      expect(result).toHaveProperty('fileUrl');
      expect(result).toHaveProperty('fileName', 'test.jpg');
      expect(result).toHaveProperty('fileSize', 1024);
      expect(result).toHaveProperty('mimeType', 'image/jpeg');
    });
  });
});