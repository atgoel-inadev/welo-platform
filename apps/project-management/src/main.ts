import { NestFactory } from '@nestjs/core';
import { ProjectManagementModule } from './project-management.module';

async function bootstrap() {
  const app = await NestFactory.create(ProjectManagementModule);
  
  // Enable CORS
  app.enableCors();
  
  // Global prefix
  app.setGlobalPrefix('api/v1');
  
  const port = process.env.PORT || 3004;
  await app.listen(port);
  
  console.log(`🚀 Project Management Service running on port ${port}`);
}
bootstrap();
