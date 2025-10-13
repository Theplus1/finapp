import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WinstonLogger } from './common/utils/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLogger(),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const mode = configService.get<string>('bot.mode');

  // Enable CORS if needed
  app.enableCors();

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
}

bootstrap();
