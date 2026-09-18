import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { tenantAwareGrpc } from '@app/common/database/tenant-context';
import { protobufAssessmentPackage } from '@app/common/grpc-clients/assessment';
import { AssessmentModule } from './assessment.module';
import { logUnhandledRejections } from '@app/common/helpers/process-guard';
import { answerInvalidIdsWithBadRequest } from '@app/common/helpers/grpc-error';

async function bootstrap() {
  const app = await NestFactory.create(AssessmentModule);
  answerInvalidIdsWithBadRequest(app);
  const configService = app.get(ConfigService);
  app.connectMicroservice(tenantAwareGrpc({
    package: protobufAssessmentPackage,
    protoPath: join(__dirname, '../../../proto/assessment.proto'),
    url: configService.getOrThrow('ASSESSMENT_GRPC_URL'),
  }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.startAllMicroservices();
  console.log('Assessment microservice connected');
}
logUnhandledRejections();
bootstrap();