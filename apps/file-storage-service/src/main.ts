import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initTracer, TraceInterceptor } from '@app/infrastructure';

async function bootstrap() {
  initTracer('file-storage-service', '1.0.0');

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TraceInterceptor());

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('File Storage Service API')
    .setDescription('File upload, presigned URL generation, and file metadata management for Welo Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('files', 'File upload and management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.FILE_STORAGE_SERVICE_PORT || process.env.PORT || 3006;
  await app.listen(port);

  console.log(`File Storage Service is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api`);
}

bootstrap();
