import {
  ArgumentsHost, BadRequestException, Catch, ForbiddenException, HttpException, INestApplication,
  NotFoundException, UnauthorizedException, UseFilters,
} from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import {
  GrpcInternalException, GrpcInvalidArgumentException, GrpcNotFoundException,
  GrpcPermissionDeniedException, GrpcUnauthenticatedException, GrpcUnavailableException,
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
// `internalMessage`, when given, is what an unexpected error reports, as the handler's own
// catch block did before.
export function toGrpcError(error: any, internalMessage?: any): RpcException {
  if (isInvalidIdError(error)) return new GrpcInvalidArgumentException('Invalid id');
  if (error instanceof RpcException) return error;
  const message = error?.message || (typeof error === 'string' ? error : 'Internal Server Error');
  if (error instanceof NotFoundException) return new GrpcNotFoundException(message);
  if (error instanceof BadRequestException) return new GrpcInvalidArgumentException(message);
  if (error instanceof ForbiddenException) return new GrpcPermissionDeniedException(message);
  if (error instanceof UnauthorizedException) return new GrpcUnauthenticatedException(message);
  // a handler's own "Not found" / "... is required" is the caller's error, even when the handler
  // gives a generic message for unexpected ones
  return clientErrorFrom(error) ?? new GrpcInternalException(internalMessage ?? message);
}

const NOT_FOUND_MESSAGE = /\b(not found|cannot find|can't find|could not find|(does not|doesn't|not) exist|no \w+( \w+)? found)\b/i;
// A service this one depends on is not reachable or not set up (the report API, S3...)
const UNAVAILABLE_MESSAGE = /Failed to fetch data from report API|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|Empty value provided for input HTTP label: Bucket/i;
const FORBIDDEN_MESSAGE = /\b(not authori[sz]ed|not allowed|permission denied)\b/i;
const BAD_INPUT_MESSAGE = /\b(invalid|is missing|are missing|is required|are required)\b/i;

// The text of an error: a thrown string, an Error's message, or the message a gRPC error carries
// (nestjs-grpc-exceptions wraps it in JSON as {"error": "..."})
function messageOf(error: any): string {
  if (typeof error === 'string') return error;
  if (error instanceof RpcException) {
    const inner: any = error.getError();
    const raw = typeof inner === 'string' ? inner : inner?.message;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.error === 'string') return parsed.error;
    } catch {
      /* not JSON: the message itself */
    }
    return String(raw ?? '');
  }
  return String(error?.message ?? error?.msg ?? '');
}

// The client error an otherwise internal error really is: a malformed id, a record that was not
// found, or input that is missing or invalid, as the handlers' own messages say; or a service it
// depends on that is not reachable (503). Programming errors (a TypeError reading a property of
// null...) are left as internal errors.
export function clientErrorFrom(error: any): RpcException | null {
  if (isInvalidIdError(error)) return new GrpcInvalidArgumentException('Invalid id');
  // a value from the request that does not fit the field it is compared with (a date, a number...)
  if (error?.name === 'CastError') return new GrpcInvalidArgumentException(`Invalid ${error.path ?? 'value'}`);
  if (!error || error instanceof TypeError || error instanceof ReferenceError || error instanceof SyntaxError) return null;
  // an HTTP call to another service that got no answer at all
  if (error.isAxiosError && !error.response) return new GrpcUnavailableException('A service this request needs is not available');
  // Nest's HTTP exceptions thrown as they are, without toGrpcError
  if (error instanceof HttpException) {
    const message = messageOf(error);
    switch (error.getStatus()) {
      case 400: case 422: return new GrpcInvalidArgumentException(message);
      case 401: return new GrpcUnauthenticatedException(message);
      case 403: return new GrpcPermissionDeniedException(message);
      case 404: return new GrpcNotFoundException(message);
      case 503: return new GrpcUnavailableException(message);
    }
  }
  if (error instanceof RpcException) {
    const code = (error.getError() as any)?.code;
    if (code !== undefined && code !== 13) return null; // already has a specific status
  } else if (typeof error !== 'string' && !(error instanceof Error) && typeof error?.msg !== 'string' && typeof error?.message !== 'string') {
    return null; // not an error we can read (a thrown { msg } or { message } object is one)
  }
  const message = messageOf(error);
  if (UNAVAILABLE_MESSAGE.test(message)) return new GrpcUnavailableException('A service this request needs is not available');
  if (NOT_FOUND_MESSAGE.test(message)) return new GrpcNotFoundException(message);
  if (FORBIDDEN_MESSAGE.test(message)) return new GrpcPermissionDeniedException(message);
  if (BAD_INPUT_MESSAGE.test(message)) return new GrpcInvalidArgumentException(message);
  return null;
}

// Filter for the gRPC services' controllers: an error that is the caller's (a malformed id, a
// record that does not exist, missing input) is answered with its own status (400 or 404 at the
// gateway) instead of INTERNAL (500). Every other error is handled exactly as before.
@Catch()
export class InvalidIdExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    return super.catch(clientErrorFrom(exception) ?? exception, host);
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

// For an endpoint that was never finished: the gateway answers 501 Not Implemented
export function notImplemented(message: string): RpcException {
  // gRPC UNIMPLEMENTED, with the message as JSON like nestjs-grpc-exceptions' errors, which is the
  // form the gateway's exception filter reads a status from
  return new RpcException({ code: 12, message: JSON.stringify({ error: message, type: 'string', exceptionName: 'RpcException' }) });
}
