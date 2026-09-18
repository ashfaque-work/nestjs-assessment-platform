import { Logger } from '@nestjs/common';

const logger = new Logger('Process');

/**
 * Keep the service running when a promise that nobody awaits is rejected.
 *
 * Node exits on an unhandled rejection by default. Many handlers start background
 * work without awaiting it (notifications, report calls), so a single failing request
 * would otherwise restart the whole service and drop every call in flight.
 * The rejection is logged with its stack instead.
 */
export function logUnhandledRejections(): void {
  process.on('unhandledRejection', (reason: any) => {
    logger.error(`Unhandled promise rejection: ${reason?.message ?? reason}`, reason?.stack);
  });
}
