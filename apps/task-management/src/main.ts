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
    .setTitle('Task Management API')
    .setDescription('Task, Batch, Queue Management Service for Welo Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('tasks', 'Task management')
    .addTag('batches', 'Batch management')
    .addTag('queues', 'Queue management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);
  
  console.log(`🚀 Task Management is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}

bootstrap();
