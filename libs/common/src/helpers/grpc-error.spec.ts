import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { GrpcInternalException, GrpcNotFoundException } from 'nestjs-grpc-exceptions';
import { toGrpcError } from './grpc-error';

// gRPC status codes the gateway maps to HTTP: 3 -> 400, 5 -> 404, 7 -> 403, 16 -> 401, 13 -> 500
const codeOf = (e: RpcException) => (e.getError() as any)?.code;

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

  it('carries the message across', () => {
    const mapped = toGrpcError(new NotFoundException('no classroom')) as GrpcInternalException;
    expect(JSON.stringify(mapped.getError())).toContain('no classroom');
  });
});
