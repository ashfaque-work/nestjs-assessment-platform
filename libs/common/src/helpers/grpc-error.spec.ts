import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { GrpcInternalException, GrpcNotFoundException } from 'nestjs-grpc-exceptions';
import mongoose, { Types } from 'mongoose';
import { isInvalidIdError, toGrpcError } from './grpc-error';

// gRPC status codes the gateway maps to HTTP: 3 -> 400, 5 -> 404, 7 -> 403, 16 -> 401, 13 -> 500
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

  it('still keeps not found as 404 when the handler had its own message', () => {
    expect(codeOf(toGrpcError(new NotFoundException('no course'), 'Failed to get course by Id'))).toBe(5);
  });

  it('carries the message across', () => {
    const mapped = toGrpcError(new NotFoundException('no classroom')) as GrpcInternalException;
    expect(JSON.stringify(mapped.getError())).toContain('no classroom');
  });
});
