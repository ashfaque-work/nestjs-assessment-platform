import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { Types } from 'mongoose';
import {
  HideOthersContactInterceptor, OwnRecordInterceptor, SelfOrStaffGuard, ownerOf, withoutOthersContact,
} from './ownership';

const student = { _id: new Types.ObjectId(), roles: ['student'], email: 'me@example.com' };
const other = new Types.ObjectId();
const teacher = { _id: new Types.ObjectId(), roles: ['teacher'], email: 't@example.com' };

const contextFor = (user: any, params: any = {}) => ({
  switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
}) as any;
const run = (interceptor: any, user: any, result: any) =>
  lastValueFrom(interceptor.intercept(contextFor(user), { handle: () => of(result) }));

describe('SelfOrStaffGuard', () => {
  const guard = new (SelfOrStaffGuard('id'))();

  it('lets a student read their own records', () => {
    expect(guard.canActivate(contextFor(student, { id: String(student._id) }))).toBe(true);
  });

  it('stops a student reading another user\'s records', () => {
    expect(() => guard.canActivate(contextFor(student, { id: String(other) }))).toThrow(ForbiddenException);
  });

  it('lets staff read anyone\'s records', () => {
    expect(guard.canActivate(contextFor(teacher, { id: String(other) }))).toBe(true);
  });

  it('checks an optional ?user= query parameter, which may be left out', () => {
    const queryGuard = new (SelfOrStaffGuard('user', { from: 'query' }))();
    const withQuery = (user: any, query: any) => ({ switchToHttp: () => ({ getRequest: () => ({ user, params: {}, query }) }) }) as any;
    expect(queryGuard.canActivate(withQuery(student, {}))).toBe(true);
    expect(queryGuard.canActivate(withQuery(student, { user: String(student._id) }))).toBe(true);
    expect(() => queryGuard.canActivate(withQuery(student, { user: String(other) }))).toThrow(ForbiddenException);
    expect(queryGuard.canActivate(withQuery(teacher, { user: String(other) }))).toBe(true);
  });
});

describe('ownerOf', () => {
  it('reads the owner as an id or a populated user', () => {
    expect(ownerOf({ user: other })).toBe(String(other));
    expect(ownerOf({ user: { _id: other, name: 'A' } })).toBe(String(other));
    expect(ownerOf({ attempt: { user: String(other) } })).toBe(String(other));
    expect(ownerOf({ name: 'no owner' })).toBeUndefined();
  });

  it('finds the owner inside the wrappers the attempt routes use', () => {
    expect(ownerOf({ atm: { user: { _id: other, roles: ['student'] } } })).toBe(String(other));
    expect(ownerOf({ attemptObj: { user: String(other) } })).toBe(String(other));
    expect(ownerOf({ attemptObj: { QA: [], practiceset: { user: { _id: other } } } })).toBe(String(other));
  });

  it('does not take an attempt\'s userId (the login email) for the owner', () => {
    expect(ownerOf({ userId: 'student1@example.com' })).toBeUndefined();
  });
});

describe('OwnRecordInterceptor', () => {
  const interceptor = new OwnRecordInterceptor();

  it('answers a student asking for someone else\'s attempt with 404', async () => {
    await expect(run(interceptor, student, { _id: 'a', user: { _id: other } })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the student\'s own attempt', async () => {
    const attempt = { _id: 'a', user: String(student._id) };
    await expect(run(interceptor, student, attempt)).resolves.toBe(attempt);
  });

  it('returns any attempt to staff', async () => {
    const attempt = { _id: 'a', user: other };
    await expect(run(interceptor, teacher, attempt)).resolves.toBe(attempt);
  });
});

describe('hiding other users\' contact details', () => {
  const summary = {
    topPerformers: [{ name: 'Aarav', email: 'student1@example.com', phoneNumber: '999' }, { name: 'Me', email: 'me@example.com' }],
    at: new Date(0),
  };

  it('keeps names and your own email, drops the others\'', () => {
    const out = withoutOthersContact(summary, student);
    expect(out.topPerformers[0]).toEqual({ name: 'Aarav' });
    expect(out.topPerformers[1]).toEqual({ name: 'Me', email: 'me@example.com' });
    expect(out.at).toBeInstanceOf(Date);
  });

  it('drops another user\'s login when it is an email or phone number, keeps ids', () => {
    const out = withoutOthersContact([{ userId: 'student1@example.com' }, { userId: '+919876543210' }, { userId: String(other) }], student);
    expect(out).toEqual([{}, {}, { userId: String(other) }]);
  });

  it('drops every email for a visitor who is not signed in', async () => {
    const out: any = await run(new HideOthersContactInterceptor(), undefined, summary);
    expect(JSON.stringify(out)).not.toContain('@example.com');
  });

  it('shows staff everything', async () => {
    await expect(run(new HideOthersContactInterceptor(), teacher, summary)).resolves.toBe(summary);
  });
});
