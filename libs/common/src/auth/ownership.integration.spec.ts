import {
  CanActivate, Controller, ExecutionContext, Get, Injectable, INestApplication, Param, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { Types } from 'mongoose';
import { HideOthersContactInterceptor, OwnRecordInterceptor, SelfOrStaffGuard } from './ownership';

// These tests drive the guards and interceptors the way the gateway does — applied by decorators
// and run through Nest's real request pipeline — so they catch wiring mistakes (decorator order,
// a guard that never reads the user) that the pure-function unit tests cannot.

const OWNER = new Types.ObjectId();
const OTHER = new Types.ObjectId();

// Stands in for AuthenticationGuard: puts the caller on the request from an x-user header.
@Injectable()
class FakeAuth implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const raw = req.headers['x-user'];
    req.user = raw ? JSON.parse(raw) : undefined;
    return true;
  }
}

@Controller()
class ProbeController {
  @Get('records/:id')
  @UseGuards(FakeAuth, SelfOrStaffGuard('id'))
  record(@Param('id') id: string) {
    return { id };
  }

  @Get('attempts/:id')
  @UseGuards(FakeAuth)
  @UseInterceptors(OwnRecordInterceptor)
  attempt(@Param('id') id: string) {
    return { attemptObj: { _id: id, user: OWNER, email: 'owner@example.com' } };
  }

  @Get('leaderboard')
  @UseGuards(FakeAuth)
  @UseInterceptors(HideOthersContactInterceptor)
  leaderboard() {
    return { top: [{ name: 'Aarav', email: 'aarav@example.com', phoneNumber: '999' }] };
  }
}

const asUser = (user: object | null) => (user ? { 'x-user': JSON.stringify(user) } : {});
const student = { _id: OWNER, roles: ['student'], email: 'owner@example.com' };
const otherStudent = { _id: OTHER, roles: ['student'], email: 'other@example.com' };
const teacher = { _id: new Types.ObjectId(), roles: ['teacher'] };

describe('ownership guards, as the gateway applies them', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('SelfOrStaffGuard on a user-id route', () => {
    it('lets a student read their own record', () =>
      request(app.getHttpServer()).get(`/records/${OWNER}`).set(asUser(student)).expect(200));

    it('forbids a student reading another user\'s record', () =>
      request(app.getHttpServer()).get(`/records/${OTHER}`).set(asUser(student)).expect(403));

    it('lets staff read anyone\'s record', () =>
      request(app.getHttpServer()).get(`/records/${OWNER}`).set(asUser(teacher)).expect(200));
  });

  describe('OwnRecordInterceptor on an attempt route', () => {
    it('returns the student their own attempt', () =>
      request(app.getHttpServer()).get(`/attempts/${OWNER}`).set(asUser(student)).expect(200));

    it('gives 404 when the attempt belongs to someone else', () =>
      request(app.getHttpServer()).get(`/attempts/${OWNER}`).set(asUser(otherStudent)).expect(404));

    it('lets staff read any attempt', () =>
      request(app.getHttpServer()).get(`/attempts/${OWNER}`).set(asUser(teacher)).expect(200));
  });

  describe('HideOthersContactInterceptor on a leaderboard route', () => {
    it('keeps names but strips others\' email and phone for a student', async () => {
      const res = await request(app.getHttpServer()).get('/leaderboard').set(asUser(otherStudent)).expect(200);
      expect(res.body.top[0].name).toBe('Aarav');
      expect(res.body.top[0].email).toBeUndefined();
      expect(res.body.top[0].phoneNumber).toBeUndefined();
    });

    it('shows staff everything', async () => {
      const res = await request(app.getHttpServer()).get('/leaderboard').set(asUser(teacher)).expect(200);
      expect(res.body.top[0].email).toBe('aarav@example.com');
    });
  });
});
