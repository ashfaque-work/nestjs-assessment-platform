import { Types } from 'mongoose';
import { canManageTest } from './role-helper';

describe('canManageTest', () => {
  const owner = new Types.ObjectId();
  const colleague = new Types.ObjectId();
  const test = { user: owner, instructors: [{ _id: colleague }] };

  it('lets the owner change the test, whether the ids are strings or ObjectIds', () => {
    expect(canManageTest({ _id: owner.toString(), roles: ['teacher'] }, test)).toBe(true);
    expect(canManageTest({ _id: owner, roles: ['teacher'] }, { user: owner.toString() })).toBe(true);
  });

  it('lets a teacher listed as an instructor change it', () => {
    expect(canManageTest({ _id: colleague.toString(), roles: ['teacher'] }, test)).toBe(true);
    expect(canManageTest({ _id: colleague, roles: ['mentor'] }, { user: owner, instructors: [colleague] })).toBe(true);
  });

  it('refuses another teacher', () => {
    expect(canManageTest({ _id: new Types.ObjectId().toString(), roles: ['teacher'] }, test)).toBe(false);
  });

  it('lets the roles that manage everyone\'s content change any test', () => {
    for (const role of ['admin', 'director', 'operator', 'publisher']) {
      expect(canManageTest({ _id: new Types.ObjectId(), roles: [role] }, test)).toBe(true);
    }
  });

  it('refuses when the user or the test is missing', () => {
    expect(canManageTest(undefined, test)).toBe(false);
    expect(canManageTest({ _id: owner, roles: ['teacher'] }, undefined)).toBe(false);
  });
});
