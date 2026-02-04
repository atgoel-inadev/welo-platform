import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ProjectManagementModule } from './../src/project-management.module';

describe('ProjectManagementController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProjectManagementModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/v1/projects (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/projects')
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
