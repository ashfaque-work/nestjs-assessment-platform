import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from '@app/common/filters/global-exception.filter';
import { RedisIoAdapter } from '@app/common';
import { logUnhandledRejections } from '@app/common/helpers/process-guard';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  const configService = app.get(ConfigService);

  // Behind a reverse proxy (nginx, Caddy, a load balancer) the client address is in
  // X-Forwarded-For; without this, per-IP rate limits would count every visitor as one.
  if (configService.get('TRUST_PROXY') !== 'false') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  const config = new DocumentBuilder()
    .setTitle('Assessment Platform API')
    .setDescription('REST gateway for the assessment platform microservices')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(HttpAdapterHost)));
  app.useGlobalPipes(new ValidationPipe({ stopAtFirstError: true }));

  // Uncomment these lines to use the Redis adapter:
  // const redisIoAdapter = new RedisIoAdapter(app);
  // await redisIoAdapter.connectToRedis();
  // app.useWebSocketAdapter(redisIoAdapter);

  // CORS_ALLOWED_DOMAINS: comma separated domains, e.g. "example.com,app.example.org" (subdomains allowed)
  const allowedDomains = (configService.get<string>('CORS_ALLOWED_DOMAINS') || '')
    .split(',').map(d => d.trim().replace(/^\./, '')).filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow requests with no origin (like mobile apps, curl requests)
      let hostname = '';
      try { hostname = new URL(origin).hostname; } catch { }
      if (
        hostname === 'localhost' ||
        allowedDomains.some(d => hostname === d || hostname.endsWith('.' + d))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(configService.getOrThrow('APIGATEWAY_PORT'));
}
logUnhandledRejections();
bootstrap();
