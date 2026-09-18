import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AdministrationModule } from './administration.module';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { tenantAwareGrpc } from '@app/common/database/tenant-context';
import { protobufAdministrationPackage } from '@app/common/grpc-clients/administration';
import { logUnhandledRejections } from '@app/common/helpers/process-guard';
import { answerInvalidIdsWithBadRequest } from '@app/common/helpers/grpc-error';

async function bootstrap() {
  const app = await NestFactory.create(AdministrationModule);
  answerInvalidIdsWithBadRequest(app);
  const configService = app.get(ConfigService);
  app.connectMicroservice(tenantAwareGrpc({
    package: protobufAdministrationPackage,
    protoPath: join(__dirname, '../../../proto/administration.proto'),
    url: configService.getOrThrow('ADMINISTRATION_GRPC_URL')
  }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.startAllMicroservices();
  console.log('Administration Microservice connected');
}
logUnhandledRejections();
bootstrap();
