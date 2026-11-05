import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APP_CONFIG, type AppConfig } from './config/app.config';
import { setupSwagger } from './openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);

  // O shell encaminha /api/v1/supplies para o módulo (o contrato v0.11 usa /stock/v1; a v0.12 registra a diferença).
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/(.*)'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: [new URL(config.shellBaseUrl).origin, new URL(config.webBaseUrl).origin],
    credentials: true,
  });
  app.enableShutdownHooks();

  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || config.nodeEnv !== 'production';
  if (swaggerEnabled) setupSwagger(app);

  await app.listen(config.apiPort);
  console.log(`[api] ouvindo em ${config.apiBaseUrl}`);
  if (swaggerEnabled) console.log(`[api] Swagger em ${config.apiBaseUrl}/api/v1/docs`);
}

void bootstrap();
