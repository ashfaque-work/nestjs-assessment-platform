import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EcommerceModule } from './ecommerce.module';
import { join } from 'path';
import { tenantAwareGrpc } from '@app/common/database/tenant-context';
import { protobufEcommercePackage } from '@app/common/grpc-clients/eCommerce/coupon';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(EcommerceModule);
  const configService = app.get(ConfigService);
  app.connectMicroservice(tenantAwareGrpc({
    package: protobufEcommercePackage,
    protoPath: join(__dirname, '../../../proto/eCommerce.proto'),
    url: configService.getOrThrow('ECOMMERCE_GRPC_URL')
  }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.startAllMicroservices();
  console.log('Ecommerce Microservice connected');
}
bootstrap();
