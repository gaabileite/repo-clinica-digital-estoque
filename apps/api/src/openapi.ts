import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Estoque e insumos API')
    .setDescription('API do módulo Estoque e insumos da Clínica Digital UFPE (OpenAPI 3.0). Contrato de referência: docs/api-contract.md.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api/v1/docs', app, buildOpenApiDocument(app), {
    customSiteTitle: 'Estoque e insumos API',
  });
}
