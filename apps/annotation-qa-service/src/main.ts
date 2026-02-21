import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Annotation & QA Service API')
    .setDescription(
      'Combined Annotation submission, Gold-task Quality Checks, Reviewer Scoring and State Management for Welo Platform',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('annotations', 'Annotator submission endpoints')
    .addTag('gold-tasks', 'Gold standard task management')
    .addTag('quality-checks', 'Quality check management')
    .addTag('reviews', 'Reviewer scoring and decisions')
    .addTag('health', 'Service health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port);

  console.log(`🚀 Annotation QA Service is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}

bootstrap();
