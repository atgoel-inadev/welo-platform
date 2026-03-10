import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ProjectManagementModule } from './project-management.module';
import { initTracer, TraceInterceptor } from '@app/infrastructure';

async function bootstrap() {
  initTracer('project-management', '1.0.0');

  const app = await NestFactory.create(ProjectManagementModule);

  // Enable CORS
  app.enableCors();

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new TraceInterceptor());

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Project Management Service')
    .setDescription(
      'Manages projects, batches, customers, UI configurations, annotation questions, ' +
      'workflow configuration, project teams, plugins, secrets, and media files.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('projects', 'Project CRUD, annotation questions, workflow config, team, plugins, secrets')
    .addTag('batches', 'Batch management, file allocation, task assignment')
    .addTag('customers', 'Customer CRUD')
    .addTag('ui-configurations', 'UI configuration templates for annotation/review UIs')
    .addTag('media', 'Media file serving')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  const port = process.env.PORT || 3004;
  await app.listen(port);
  
  console.log(`🚀 Project Management Service running on port ${port}`);
  console.log(`📖 Swagger docs available at http://localhost:${port}/api`);
}
bootstrap();
