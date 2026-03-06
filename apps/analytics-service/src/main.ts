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
    .setTitle('Analytics Service API')
    .setDescription('Dashboard metrics, productivity analytics, quality trends, and project progress for Welo Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('analytics', 'Analytics and reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.ANALYTICS_SERVICE_PORT || process.env.PORT || 3009;
  await app.listen(port);

  console.log(`Analytics Service is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api`);
}

bootstrap();
