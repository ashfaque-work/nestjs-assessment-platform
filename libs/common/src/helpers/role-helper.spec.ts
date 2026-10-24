import { Types } from 'mongoose';
import { canGrantRoles, canManageTest, canReadTest } from './role-helper';

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

describe('canGrantRoles', () => {
  it('lets an admin give any role, admin included', () => {
    expect(canGrantRoles(['admin'], ['admin', 'teacher'])).toBe(true);
  });

  it('lets a director or operator give any role but admin', () => {
    expect(canGrantRoles(['director'], ['teacher', 'operator'])).toBe(true);
    expect(canGrantRoles(['operator'], ['admin'])).toBe(false);
  });

  it('lets support give only the learning roles', () => {
    expect(canGrantRoles(['support'], ['student', 'teacher'])).toBe(true);
    expect(canGrantRoles(['support'], ['director'])).toBe(false);
  });

  it('lets no one else give roles', () => {
    expect(canGrantRoles(['teacher'], ['student'])).toBe(false);
    expect(canGrantRoles(undefined, ['student'])).toBe(false);
  });
});

describe('canReadTest', () => {
  const owner = new Types.ObjectId();
  const test = { user: owner, instructors: [] };

  it("lets the author read the test's answers and results", () => {
    expect(canReadTest({ _id: owner.toString(), roles: ['teacher'] }, test)).toBe(true);
  });

  it('refuses another teacher or a student', () => {
    expect(canReadTest({ _id: new Types.ObjectId().toString(), roles: ['teacher'] }, test)).toBe(false);
    expect(canReadTest({ _id: new Types.ObjectId().toString(), roles: ['student'] }, test)).toBe(false);
  });

  it('lets the roles that oversee all tests read it', () => {
    for (const role of ['admin', 'director', 'operator', 'support', 'centerHead']) {
      expect(canReadTest({ _id: new Types.ObjectId().toString(), roles: [role] }, test)).toBe(true);
    }
  });

  it('refuses when no caller is given', () => {
    expect(canReadTest({ _id: undefined, roles: undefined }, test)).toBe(false);
  });
});
