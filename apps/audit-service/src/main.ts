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
    .setTitle('Audit Service API')
    .setDescription('Centralized audit log reader and compliance reporter for Welo Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('audit-logs', 'Audit log queries')
    .addTag('compliance', 'Compliance reports and GDPR tools')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.AUDIT_SERVICE_PORT || process.env.PORT || 3010;
  await app.listen(port);

  console.log(`Audit Service is running on: http://localhost:${port}`);
  console.log(`API Documentation: http://localhost:${port}/api`);
}

bootstrap();
