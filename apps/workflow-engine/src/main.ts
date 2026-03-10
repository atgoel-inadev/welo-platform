import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@app/common';
import { initTracer, TraceInterceptor } from '@app/infrastructure';

async function bootstrap() {
  initTracer('workflow-engine', '1.0.0');

  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global trace interceptor — enriches OTel spans and injects x-trace-id header
  app.useGlobalInterceptors(new TraceInterceptor());

  // CORS
  app.enableCors();

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Workflow Engine API')
    .setDescription('XState-based Workflow Engine for Welo Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('workflows', 'Workflow definition management')
    .addTag('events', 'XState event management')
    .addTag('instances', 'Workflow instance management')
    .addTag('transitions', 'State transition tracking')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Workflow Engine is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
}

bootstrap();
