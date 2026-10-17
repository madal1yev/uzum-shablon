import 'reflect-metadata';
import { loadEnv } from '@marketpix/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { loggerProvider, httpLoggerOptions } from './common/logger';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: false, abortOnError: false });

  app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));
  app.use(cookieParser());
  app.use(require('pino-http')(httpLoggerOptions(env)));

  app.setGlobalPrefix(env.API_PREFIX);
  app.enableCors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (env.CORS_ORIGINS.length === 0) return cb(null, origin === env.PUBLIC_APP_URL);
      cb(null, env.CORS_ORIGINS.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  const swagger = new DocumentBuilder()
    .setTitle('MarketPix AI API')
    .setDescription('Marketplace product image generation platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(`${env.API_PREFIX}/docs`, app, SwaggerModule.createDocument(app, swagger), {
    customSiteTitle: 'MarketPix API',
  });

  app.enableShutdownHooks();

  await app.listen(env.PORT, env.HOST);
  const logger = app.get(loggerProvider);
  logger.info(
    { port: env.PORT, nodeEnv: env.NODE_ENV, aiProvider: env.AI_PROVIDER, storage: env.STORAGE_DRIVER },
    'MarketPix API started',
  );
}

bootstrap().catch((err) => {
  // Oxirgi chora: bootstrap xatosini ko'rsatamiz va chiqamiz.
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
