import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initTracer, TraceInterceptor } from '@app/infrastructure';

async function bootstrap() {
  initTracer('export-service', '1.0.0');

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
    .setTitle('Export Service API')
    .setDescription('Async annotation export jobs supporting JSON, JSONL, CSV, COCO, and PASCAL VOC formats')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('exports', 'Export job management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.EXPORT_SERVICE_PORT || process.env.PORT || 3007;
  await app.listen(port);

  console.log(`Export Service is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api`);
}

bootstrap();
