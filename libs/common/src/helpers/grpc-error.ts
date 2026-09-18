import {
  ArgumentsHost, BadRequestException, Catch, ForbiddenException, INestApplication,
  NotFoundException, UnauthorizedException, UseFilters,
} from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import {
  GrpcInternalException, GrpcInvalidArgumentException, GrpcNotFoundException,
  GrpcPermissionDeniedException, GrpcUnauthenticatedException,
} from 'nestjs-grpc-exceptions';

const INVALID_ID_MESSAGE = /24 character hex string|Cast to ObjectId failed/i;

// True when an error comes from turning a malformed id (e.g. "abc" from a URL) into an
// ObjectId, whether thrown directly or already wrapped into a gRPC error by a handler.
export function isInvalidIdError(error: any): boolean {
  if (!error) return false;
  if (error.name === 'BSONError') return true;
  if (error.name === 'CastError' && error.kind === 'ObjectId') return true;
  if (error instanceof RpcException) {
    const inner: any = error.getError();
    const message = typeof inner === 'string' ? inner : inner?.message;
    return INVALID_ID_MESSAGE.test(String(message ?? ''));
  }
  return false;
}

// Converts an error caught in a gRPC handler into a gRPC error with the matching status code,
// so the gateway can answer 400/401/403/404 instead of turning everything into a 500.
export function toGrpcError(error: any): RpcException {
  if (isInvalidIdError(error)) return new GrpcInvalidArgumentException('Invalid id');
  if (error instanceof RpcException) return error;
  const message = error?.message || (typeof error === 'string' ? error : 'Internal Server Error');
  if (error instanceof NotFoundException) return new GrpcNotFoundException(message);
  if (error instanceof BadRequestException) return new GrpcInvalidArgumentException(message);
  if (error instanceof ForbiddenException) return new GrpcPermissionDeniedException(message);
  if (error instanceof UnauthorizedException) return new GrpcUnauthenticatedException(message);
  return new GrpcInternalException(message);
}

// Global filter for the gRPC services: a malformed id in a request is the caller's mistake,
// so it is answered with INVALID_ARGUMENT (400 at the gateway) instead of INTERNAL (500).
// Every other error is handled exactly as before.
@Catch()
export class InvalidIdExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    if (isInvalidIdError(exception)) {
      return super.catch(new GrpcInvalidArgumentException('Invalid id'), host);
    }
    return super.catch(exception, host);
  }
}

/**
 * Applies InvalidIdExceptionFilter to every controller of a gRPC service.
 * Call it before connectMicroservice(): a hybrid app resolves the handlers' filters while
 * connecting, and its microservice does not see filters added to the app with useGlobalFilters.
 */
export function answerInvalidIdsWithBadRequest(app: INestApplication): void {
  const filter = new InvalidIdExceptionFilter();
  const seen = new Set<Function>();
  for (const module of app.get(ModulesContainer).values()) {
    for (const controller of module.controllers.values()) {
      const type = controller.metatype as Function;
      if (type && !seen.has(type)) {
        seen.add(type);
        UseFilters(filter)(type);
      }
    }
  }
}
