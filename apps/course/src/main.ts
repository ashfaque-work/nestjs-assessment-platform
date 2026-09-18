import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CourseModule } from './course.module';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { tenantAwareGrpc } from '@app/common/database/tenant-context';
import { protobufCoursePackage } from '@app/common/grpc-clients/course';
import { logUnhandledRejections } from '@app/common/helpers/process-guard';
import { answerInvalidIdsWithBadRequest } from '@app/common/helpers/grpc-error';

async function bootstrap() {
  const app = await NestFactory.create(CourseModule);
  answerInvalidIdsWithBadRequest(app);
  const configService = app.get(ConfigService);
  app.connectMicroservice(tenantAwareGrpc({
    package: protobufCoursePackage,
    protoPath: join(__dirname, '../../../proto/course.proto'),
    url: configService.getOrThrow('COURSE_GRPC_URL')
  }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.startAllMicroservices();
  console.log('Course Microservice connected');
}
logUnhandledRejections();
bootstrap();
