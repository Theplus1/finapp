import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonLogger } from './common/utils/logger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { setDefaultResultOrder } from 'node:dns';
import { randomUUID } from 'node:crypto';
import { apiReference } from '@scalar/nestjs-api-reference';
import helmet from 'helmet';

// Polyfill for @nestjs/schedule compatibility with Node 18
if (!globalThis.crypto) {
  (globalThis as any).crypto = { randomUUID };
}

// Fix for IPv6/IPv4 DNS resolution issues with Telegram API
// Force IPv4 first to prevent connection timeouts
setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLogger(),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const mode = configService.get<string>('bot.mode');

  // Security headers (XSS, clickjacking, MIME sniffing, HSTS, etc).
  // contentSecurityPolicy disabled because it would require careful tuning
  // per-route and we serve Swagger/Scalar API docs on /api-docs which uses inline scripts.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS: restrict to known production + development origins only.
  // Previously app.enableCors() allowed all origins, so any third-party site
  // could initiate browser requests against the API. The admin-web and
  // customer-web Next.js apps proxy API calls server-side (via /api/[...proxy])
  // so browsers never directly hit api.3wcards.com — strict CORS is safe.
  const ALLOWED_ORIGINS = [
    'https://admin.3wcards.com',
    'https://customer.3wcards.com',
    'http://localhost:3001',
    'http://localhost:3002',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Silently deny: do not attach Access-Control-Allow-Origin header.
      // The browser will block the response client-side. Using `callback(null, false)`
      // instead of throwing so rejected requests do not turn into 500 errors in logs.
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Apply global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Apply global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('FinApp Admin API')
    .setDescription(
      'REST API for managing user access control in the FinApp Telegram bot. Provides endpoints for approving, denying, and managing user access requests.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'Enter your API key from ADMIN_API_KEY environment variable',
      },
      'bearer',
    )
    .addTag('Admin', 'User access management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI (Scalar temporarily disabled due to ESM issue)
  // SwaggerModule.setup('/api-docs', app, document);
  
  // TODO: Re-enable Scalar after fixing ESM compatibility
  app.use(
    '/api-docs',
    apiReference({
      theme: 'purple',
      content: document,
      metaData: {
        title: 'FinApp Admin API Documentation',
        description: 'Interactive API documentation for FinApp Admin REST API',
      },
      authentication: {
        preferredSecurityScheme: 'bearer',
      },
    }),
  );

  await app.listen(port);

  const logger = new WinstonLogger();
  logger.log(
    `Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
  logger.log(`Bot mode: ${mode}`, 'Bootstrap');
  logger.log(
    `Health check available at: http://localhost:${port}/health`,
    'Bootstrap',
  );
  logger.log(
    `API Documentation available at: http://localhost:${port}/api-docs`,
    'Bootstrap',
  );
}

bootstrap();
