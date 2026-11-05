import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OutboxDispatcher } from './events/outbox-dispatcher.service';
import { APP_CONFIG, type AppConfig } from './config/app.config';
import { setupSwagger } from './openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);

  // O shell encaminha /api/v1/supplies para o módulo (o gateway da plataforma publica o módulo como /stock/v1, ver contrato 0.12).
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
  if (config.outboxDispatchEnabled) app.get(OutboxDispatcher).start(config.outboxIntervalMs);
  console.log(`[api] ouvindo em ${config.apiBaseUrl}`);
  if (swaggerEnabled) console.log(`[api] Swagger em ${config.apiBaseUrl}/api/v1/docs`);
}

void bootstrap();
