import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  GrpcInternalException, GrpcInvalidArgumentException, GrpcNotFoundException,
  GrpcPermissionDeniedException, GrpcUnauthenticatedException,
} from 'nestjs-grpc-exceptions';

// Converts an error caught in a gRPC handler into a gRPC error with the matching status code,
// so the gateway can answer 400/401/403/404 instead of turning everything into a 500.
export function toGrpcError(error: any): RpcException {
  if (error instanceof RpcException) return error;
  const message = error?.message || (typeof error === 'string' ? error : 'Internal Server Error');
  if (error instanceof NotFoundException) return new GrpcNotFoundException(message);
  if (error instanceof BadRequestException) return new GrpcInvalidArgumentException(message);
  if (error instanceof ForbiddenException) return new GrpcPermissionDeniedException(message);
  if (error instanceof UnauthorizedException) return new GrpcUnauthenticatedException(message);
  return new GrpcInternalException(message);
}
