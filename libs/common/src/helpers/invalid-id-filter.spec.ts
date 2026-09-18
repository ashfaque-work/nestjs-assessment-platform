import { Controller, INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ClientProxy, ClientProxyFactory, MessagePattern, Transport } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { answerInvalidIdsWithBadRequest } from './grpc-error';

// Boots a hybrid app the way the services' main.ts does, to check the filter really reaches
// the microservice handlers (filters added with useGlobalFilters after connecting do not).
@Controller()
class ItemsController {
  @MessagePattern('getItem')
  getItem(id: string) {
    return { _id: new Types.ObjectId(id) };
  }

  @MessagePattern('broken')
  broken() {
    throw new Error('database is down');
  }
}

@Module({ controllers: [ItemsController] })
class ItemsModule {}

describe('answerInvalidIdsWithBadRequest in a hybrid app', () => {
  let app: INestApplication;
  let client: ClientProxy;

  beforeAll(async () => {
    const port = 40000 + Math.floor(Math.random() * 10000);
    app = await NestFactory.create(ItemsModule, { logger: false });
    answerInvalidIdsWithBadRequest(app);
    app.connectMicroservice({ transport: Transport.TCP, options: { port } });
    await app.startAllMicroservices();
    await app.init();
    client = ClientProxyFactory.create({ transport: Transport.TCP, options: { port } });
    await client.connect();
  });

  afterAll(async () => {
    client?.close();
    await app?.close();
  });

  it('answers a malformed id with INVALID_ARGUMENT', async () => {
    // nestjs-grpc-exceptions wraps the message in JSON; the gateway unwraps it
    await expect(lastValueFrom(client.send('getItem', 'abc'))).rejects.toMatchObject({
      code: 3,
      message: expect.stringContaining('Invalid id'),
    });
  });

  it('still serves a well-formed id', async () => {
    const id = new Types.ObjectId().toString();
    await expect(lastValueFrom(client.send('getItem', id))).resolves.toEqual({ _id: id });
  });

  it('reports other failures as internal errors, as before', async () => {
    await expect(lastValueFrom(client.send('broken', {}))).rejects.toMatchObject({
      message: 'Internal server error',
    });
  });
});
