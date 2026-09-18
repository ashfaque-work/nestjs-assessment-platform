import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClassroomModule } from './classroom.module';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { tenantAwareGrpc } from '@app/common/database/tenant-context';
import { protobufClassroomPackage } from '@app/common/grpc-clients/classroom';
import { RedisIoAdapter } from '@app/common';
import { logUnhandledRejections } from '@app/common/helpers/process-guard';
import { answerInvalidIdsWithBadRequest } from '@app/common/helpers/grpc-error';

async function bootstrap() {
  const app = await NestFactory.create(ClassroomModule);
  answerInvalidIdsWithBadRequest(app);
  const configService = app.get(ConfigService);
  app.connectMicroservice(tenantAwareGrpc({
    package: protobufClassroomPackage,
    protoPath: join(__dirname, '../../../proto/classroom.proto'),
    url: configService.getOrThrow('CLASSROOM_GRPC_URL')
  }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.startAllMicroservices();
  console.log('Classroom Microservice connected');
}
logUnhandledRejections();
bootstrap();
