import { NestFactory } from '@nestjs/core';
import { AttemptModule } from './attempt.module';
import { ConfigService } from '@nestjs/config';
import { protobufAttemptPackage } from '@app/common/grpc-clients/attempt';
import { join } from 'path';
import { tenantAwareGrpc } from '@app/common/database/tenant-context';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AttemptModule);
  const configService = app.get(ConfigService);
  app.connectMicroservice(tenantAwareGrpc({
    package: protobufAttemptPackage,
    protoPath: join(__dirname, '../../../proto/attempt.proto'),
    url: configService.getOrThrow('ATTEMPT_GRPC_URL')
  }))
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.startAllMicroservices();
  console.log('Attempt Microservice connected');
}
bootstrap();
