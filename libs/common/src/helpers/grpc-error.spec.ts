import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { GrpcInternalException, GrpcNotFoundException, GrpcPermissionDeniedException } from 'nestjs-grpc-exceptions';
import mongoose, { Types } from 'mongoose';
import { clientErrorFrom, isInvalidIdError, notImplemented, toGrpcError } from './grpc-error';

// gRPC status codes the gateway maps to HTTP: 3 -> 400, 5 -> 404, 7 -> 403, 16 -> 401, 14 -> 503, 13 -> 500
const codeOf = (e: RpcException) => (e.getError() as any)?.code;

// The error a handler gets from new Types.ObjectId('abc'), e.g. for GET /attempt/abc
const bsonError = () => {
  try {
    new Types.ObjectId('abc');
  } catch (e) {
    return e;
  }
  throw new Error('expected ObjectId to reject "abc"');
};

describe('isInvalidIdError', () => {
  it('recognises the error from building an ObjectId out of a malformed id', () => {
    expect(isInvalidIdError(bsonError())).toBe(true);
  });

  it('recognises a mongoose cast failure on an ObjectId field', () => {
    expect(isInvalidIdError(new mongoose.Error.CastError('ObjectId', 'abc', '_id'))).toBe(true);
  });

  it('recognises one a handler already wrapped into an internal gRPC error', () => {
    expect(isInvalidIdError(new GrpcInternalException(bsonError().message))).toBe(true);
  });

  it('leaves other failures alone', () => {
    expect(isInvalidIdError(new Error('connection refused'))).toBe(false);
    expect(isInvalidIdError(new mongoose.Error.CastError('Number', 'abc', 'count'))).toBe(false);
    expect(isInvalidIdError(new GrpcInternalException('Failed to find one setting!'))).toBe(false);
    expect(isInvalidIdError(undefined)).toBe(false);
  });
});

describe('toGrpcError', () => {
  it('keeps "not found" as 5, so the gateway answers 404', () => {
    expect(codeOf(toGrpcError(new NotFoundException('no classroom')))).toBe(5);
  });

  it('keeps "bad request" as 3, so the gateway answers 400', () => {
    expect(codeOf(toGrpcError(new BadRequestException('subjects required')))).toBe(3);
  });

  it('keeps "forbidden" as 7 and "unauthorized" as 16', () => {
    expect(codeOf(toGrpcError(new ForbiddenException()))).toBe(7);
    expect(codeOf(toGrpcError(new UnauthorizedException()))).toBe(16);
  });

  it('turns anything else into an internal error', () => {
    expect(codeOf(toGrpcError(new Error('unexpected')))).toBe(13);
    expect(codeOf(toGrpcError('a thrown string'))).toBe(13);
  });

  it('passes an existing gRPC exception through unchanged', () => {
    const original = new GrpcNotFoundException('already mapped');
    expect(toGrpcError(original)).toBe(original);
  });

  it('treats a malformed id as a bad request, not an internal error', () => {
    expect(codeOf(toGrpcError(bsonError()))).toBe(3);
    expect(codeOf(toGrpcError(new mongoose.Error.CastError('ObjectId', 'abc', '_id')))).toBe(3);
  });

  it('reports an unexpected error with the handler\'s own message', () => {
    const mapped = toGrpcError(new Error('E11000 duplicate key'), 'Failed to save course');
    expect(codeOf(mapped)).toBe(13);
    expect(JSON.stringify(mapped.getError())).toContain('Failed to save course');
    expect(JSON.stringify(mapped.getError())).not.toContain('E11000');
  });

  it('keeps a handler\'s own "Not Found" as 404 despite its generic message', () => {
    expect(codeOf(toGrpcError('Not Found', 'Internal server error'))).toBe(5);
    expect(codeOf(toGrpcError(new Error('Test series not found'), 'Internal server error'))).toBe(5);
    expect(codeOf(toGrpcError(new TypeError("Cannot read properties of null (reading 'x')"), 'Internal server error'))).toBe(13);
  });

  it('still keeps not found as 404 when the handler had its own message', () => {
    expect(codeOf(toGrpcError(new NotFoundException('no course'), 'Failed to get course by Id'))).toBe(5);
  });

  it('carries the message across', () => {
    const mapped = toGrpcError(new NotFoundException('no classroom')) as GrpcInternalException;
    expect(JSON.stringify(mapped.getError())).toContain('no classroom');
  });
});

describe('clientErrorFrom', () => {
  const code = (e: RpcException | null) => (e?.getError() as any)?.code;

  it('answers a record that does not exist with NOT_FOUND', () => {
    expect(code(clientErrorFrom(new Error('Subject not found')))).toBe(5);
    expect(code(clientErrorFrom('No classroom found by this ID.'))).toBe(5);
    expect(code(clientErrorFrom(new GrpcInternalException('Cannot find this post')))).toBe(5);
    expect(code(clientErrorFrom({ msg: 'Attempt is not found' }))).toBe(5);
    expect(code(clientErrorFrom({ message: "Course expired or doesn't exist" }))).toBe(5);
  });

  it('answers a refusal with PERMISSION_DENIED', () => {
    expect(code(clientErrorFrom({ message: 'You are not authorized to access this course' }))).toBe(7);
  });

  it('answers missing or invalid input with INVALID_ARGUMENT', () => {
    expect(code(clientErrorFrom(new Error('url parameter is missing')))).toBe(3);
    expect(code(clientErrorFrom(new GrpcInternalException('Invalid Classroom ID')))).toBe(3);
  });

  it('leaves programming errors and real failures as internal errors', () => {
    expect(clientErrorFrom(new TypeError("Cannot read properties of null (reading 'title')"))).toBeNull();
    expect(clientErrorFrom(new GrpcInternalException('Internal Server Error'))).toBeNull();
  });

  it('answers Nest\'s HTTP exceptions thrown as they are with their own status', () => {
    expect(code(clientErrorFrom(new BadRequestException()))).toBe(3);
    expect(code(clientErrorFrom(new NotFoundException()))).toBe(5);
    expect(code(clientErrorFrom(new ForbiddenException()))).toBe(7);
  });

  it('answers a service it depends on being unreachable with UNAVAILABLE (503)', () => {
    expect(code(clientErrorFrom(new Error('connect ECONNREFUSED 10.0.0.5:6379')))).toBe(14);
    expect(code(clientErrorFrom(new Error('Failed to fetch data from report API: undefined')))).toBe(14);
    expect(code(clientErrorFrom(Object.assign(new Error('socket hang up'), { isAxiosError: true })))).toBe(14);
    // the other service answered, with an error of its own: not an outage
    expect(clientErrorFrom(Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status: 500 } }))).toBeNull();
  });

  it('keeps a status the handler already chose', () => {
    expect(clientErrorFrom(new GrpcPermissionDeniedException('Topic not found in your institute'))).toBeNull();
  });
});

describe('clientErrorFrom with values that do not fit', () => {
  it('answers a value the database cannot use (a bad date...) with INVALID_ARGUMENT', () => {
    const err = new mongoose.Error.CastError('date', 'Invalid Date', 'endDate');
    expect((clientErrorFrom(err)?.getError() as any)?.code).toBe(3);
  });
});

describe('notImplemented', () => {
  it('is UNIMPLEMENTED (501 at the gateway) with the message where the gateway reads it', () => {
    const error: any = notImplemented('Not available').getError();
    expect(error.code).toBe(12);
    expect(JSON.parse(error.message).error).toBe('Not available');
  });
});
