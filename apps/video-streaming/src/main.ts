import { NestFactory } from "@nestjs/core";
import { VideoStreamingModule } from "./video-streaming.module";
import expressWsApp from "./mediasoup-webrtc";
import { Logger } from "@nestjs/common";
import { logUnhandledRejections } from '@app/common/helpers/process-guard';

async function bootstrap() {
  const app = await NestFactory.create(VideoStreamingModule);

  const PORT = 7100;
  expressWsApp.listen(PORT, () => {
    Logger.log(
      `Mediasoup server listening at http://localhost:${PORT}`
    );
  });

  await app.listen(7200);
}
logUnhandledRejections();
bootstrap();
