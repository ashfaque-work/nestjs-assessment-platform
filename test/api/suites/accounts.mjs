// Accounts: sign-up, roles, deactivation, protected accounts, editing people, profile, tokens,
// the admin list. The gateway runs with PROTECTED_ACCOUNTS=admin@example.com and
// SIGNUP_INSTITUTE_ID set to the seeded location.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { call, db, login, ObjectId, ROOT, SEED } from '../lib.mjs';

const require = createRequire(import.meta.url);

export const name = 'Accounts and access';

export async function run({ check }) {
  const users = (await db()).collection('users');
  const stamp = Date.now();
  const signup = (email, roles, extra = {}) => call('POST', '/auth/users', { name: 'Visitor', userId: email, email, password: 'Visitor123!', userRoles: roles, ...extra });
  const [admin, operator, teacher] = await Promise.all(['admin', 'operator', 'teacher'].map((u) => login(`${u}@example.com`, SEED.password)));

  // sign-up
  const asAdmin = await signup(`evil-${stamp}@example.com`, ['admin']);
  check('a visitor cannot sign up as admin', asAdmin.status === 403, asAdmin);
  const sneaky = `sneaky-${stamp}@example.com`;
  const s1 = await signup(sneaky, ['teacher'], { isVerified: true, isActive: true, emailVerified: true });
  const sneakyDoc = await users.findOne({ email: sneaky });
  check('sign-up cannot make itself a verified teacher', s1.status === 201 && sneakyDoc && !sneakyDoc.isVerified, { status: s1.status, isVerified: sneakyDoc?.isVerified });
  const kid = `kid-${stamp}@example.com`;
  await signup(kid, ['student']);
  const kidDoc = await users.findOne({ email: kid });
  check('a student who signs up joins the institute and its subjects, stored as ids',
    String(kidDoc?.activeLocation) === SEED.locationId && kidDoc?.activeLocation instanceof ObjectId && kidDoc?.subjects?.[0] instanceof ObjectId, kidDoc);
  const kidTests = await call('GET', '/student/tests?limit=50', undefined, await login(kid, 'Visitor123!'));
  check('...and sees the open tests at once', (kidTests.data?.results ?? []).length >= 1, kidTests.data);
  check('a duplicate email is refused', (await signup(kid, ['student'])).status >= 400);

  // roles
  const self = await call('PUT', `/auth/${SEED.users.operator}/role`, { newRoles: ['admin'] }, operator);
  check('an operator cannot promote themselves', self.status === 403, self);
  const other = await call('PUT', `/auth/${SEED.users.student}/role`, { newRoles: ['admin'] }, operator);
  check('an operator cannot make someone admin', other.status === 403, other);
  const ok = await call('PUT', `/auth/${SEED.users.student2}/role`, { newRoles: ['student', 'mentor'] }, operator);
  check('an operator can give ordinary roles', ok.status === 200, ok);
  const addAdmin = await call('POST', '/auth/addUser', { name: 'X', userId: `x-${stamp}@example.com`, email: `x-${stamp}@example.com`, password: 'Visitor123!', userRoles: ['admin'], roles: ['admin'] }, operator);
  check('only admin, support and director add people (an operator cannot)', addAdmin.status === 403, addAdmin);
  for (const role of ['operator', 'centerHead']) {
    const add = await call('POST', '/auth/addUser', { name: `New ${role}`, userId: `${role}-${stamp}@example.com`, email: `${role}-${stamp}@example.com`, password: 'Visitor123!', userRoles: [role], roles: [role] }, admin);
    check(`an admin can add a ${role}`, add.status === 201, add);
  }
  const added = `added-${stamp}@example.com`;
  await call('POST', '/auth/addUser', { name: 'Added', userId: added, email: added, password: 'Visitor123!', userRoles: ['student'], roles: ['student'], subjects: [SEED.subjectId] }, admin);
  const addedDoc = await users.findOne({ email: added });
  check("a person an admin adds gets the admin's institute and the chosen subjects, stored as ids",
    addedDoc?.activeLocation instanceof ObjectId && addedDoc?.subjects?.[0] instanceof ObjectId, addedDoc);
  const addedTests = await call('GET', '/student/tests?limit=50', undefined, await login(added, 'Visitor123!'));
  check('...and, as a student, sees the tests', (addedTests.data?.results ?? []).length >= 1, addedTests.data);

  // deactivation
  const student2 = await login('student2@example.com', SEED.password);
  await call('PUT', `/auth/updateUserStatus/${SEED.users.student2}`, { _id: SEED.users.student2, isActive: false }, admin);
  check('a deactivated account loses access at once', (await call('GET', '/auth/me', undefined, student2)).status === 401);
  check('...cannot sign in', (await call('POST', '/auth/login', { userId: 'student2@example.com', password: SEED.password })).status === 403);
  check('...and a wrong password still gets the usual answer', (await call('POST', '/auth/login', { userId: 'student2@example.com', password: 'nope-wrong-1' })).status === 401);
  const listed = (await call('GET', '/auth/users?page=1&limit=50&includeInactive=true', undefined, admin)).data.users.map((u) => u.email);
  check('an admin still sees them, to reactivate', listed.includes('student2@example.com'), listed);
  const listedByTeacher = (await call('GET', '/auth/users?page=1&limit=50&includeInactive=true', undefined, teacher)).data.users.map((u) => u.email);
  check('a teacher does not', !listedByTeacher.includes('student2@example.com'), listedByTeacher);
  await call('PUT', `/auth/updateUserStatus/${SEED.users.student2}`, { _id: SEED.users.student2, isActive: true }, admin);
  check('reactivated, they can sign in again', !!(await login('student2@example.com', SEED.password)));

  // protected accounts
  check('a protected account cannot change its own password',
    (await call('PUT', `/auth/${SEED.users.admin}/password`, { oldPassword: SEED.password, newPassword: 'Changed123!' }, admin)).status === 403);
  check('a protected account cannot rename itself', (await call('PUT', '/auth/me/profile', { name: 'Renamed' }, admin)).status === 403);
  check('nobody can deactivate a protected account',
    (await call('PUT', `/auth/updateUserStatus/${SEED.users.admin}`, { _id: SEED.users.admin, isActive: false }, operator)).status === 403);

  // editing people
  const edit = await call('PUT', `/auth/manageUser/${SEED.users.student2}`, { name: 'Student Two', subjects: [SEED.subjectId], password: 'Newpass123!' }, admin);
  const s2 = await users.findOne({ _id: new ObjectId(SEED.users.student2) });
  check('an admin edits name, subjects and password', edit.status === 200 && s2.name === 'Student Two' && s2.subjects?.[0] instanceof ObjectId, { edit, s2: s2?.name });
  check('...and the new password works', !!(await login('student2@example.com', 'Newpass123!')));
  check('an admin can unverify a teacher', (await call('PUT', `/auth/manageUser/${SEED.users.teacher}`, { isVerified: false }, admin)).status === 200
    && (await users.findOne({ _id: new ObjectId(SEED.users.teacher) })).isVerified === false);
  await users.updateOne({ _id: new ObjectId(SEED.users.teacher) }, { $set: { isVerified: true } });
  check('unknown subjects are refused', (await call('PUT', `/auth/manageUser/${SEED.users.student}`, { subjects: [new ObjectId().toString()] }, admin)).status === 400);
  check('nobody edits themselves through manageUser', (await call('PUT', `/auth/manageUser/${SEED.users.operator}`, { name: 'x' }, operator)).status === 403);
  const sup = `support-${stamp}@example.com`;
  await call('POST', '/auth/addUser', { name: 'Help Desk', userId: sup, email: sup, password: 'Visitor123!', userRoles: ['support'], roles: ['support'] }, admin);
  const support = await login(sup, 'Visitor123!');
  check('support can change a student', (await call('PUT', `/auth/updateUserStatus/${SEED.users.student}`, { _id: SEED.users.student, isActive: true }, support)).status === 200);
  check('support cannot deactivate an operator', (await call('PUT', `/auth/updateUserStatus/${SEED.users.operator}`, { _id: SEED.users.operator, isActive: false }, support)).status === 403);
  await call('PUT', `/auth/updateUser/${SEED.users.student}`, { name: 'Test student', subjects: [SEED.subjectId], locations: [SEED.locationId] }, operator);
  const stu = await users.findOne({ _id: new ObjectId(SEED.users.student) });
  check("updateUser keeps the person's own roles", JSON.stringify(stu.roles) === '["student"]', stu.roles);

  // profile
  const student = await login('student@example.com', SEED.password);
  const rename = await call('PUT', '/auth/me/profile', { name: 'Stu Dent' }, student);
  const me = await call('GET', '/auth/me', undefined, student);
  check('a student renames themselves', rename.status === 200 && (me.data.name ?? me.data.user?.name) === 'Stu Dent', me.data.name);
  check('a new password under 8 characters is refused',
    (await call('PUT', `/auth/${SEED.users.student}/password`, { oldPassword: SEED.password, newPassword: 'short' }, student)).status === 400);
  check('a wrong current password is refused',
    (await call('PUT', `/auth/${SEED.users.student}/password`, { oldPassword: 'not-it-123', newPassword: 'Another123!' }, student)).status === 403);

  // records that are not yours
  check("a student cannot change another person's country", (await call('PUT', `/auth/${SEED.users.student2}/country`, { code: 'US', name: 'USA' }, student)).status === 403);
  check('a student cannot review dossiers',
    (await call('PUT', `/auth/dossierStatusUpdate/${SEED.users.student2}`, { dossier: { status: 'approved', notes: [] }, mentorInfo: {} }, student)).status === 403);

  // the admin list: paging, search, counts, no tokens
  const list = async (q) => (await call('GET', `/auth/users?${new URLSearchParams({ includeInactive: 'true', count: 'true', ...q })}`, undefined, admin)).data;
  const total = (await list({ limit: '1' })).count;
  const page1 = await list({ page: '1', limit: '2' });
  const last = await list({ page: String(Math.ceil(total / 2)), limit: '2' });
  check('the list pages on the server and counts everyone', page1.users.length === 2 && page1.count === total && last.users.length === (total % 2 || 2), { total, last: last.users.length });
  const found = await list({ searchText: 'student2@' });
  check('search matches email', found.count === 1 && found.users[0].email === 'student2@example.com', found);
  const odd = await call('GET', `/auth/users?${new URLSearchParams({ searchText: '(((a+)+)+$[', count: 'true' })}`, undefined, admin);
  check('regex characters in a search are literal, not an error', odd.status === 200 && odd.data.count === 0, odd);
  const byTeacher = await call('GET', '/auth/users?page=1&limit=50', undefined, teacher);
  check('the list carries no email verification tokens', !byTeacher.text.includes('VERIFY-TOKEN') && !byTeacher.text.includes('emailVerifyToken'));

  // refreshing a token
  const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
  const jwt = require('jsonwebtoken');
  const logs = (await db()).collection('userlogs');
  const now = Math.floor(Date.now() / 1000);
  const session = async (userId, ago) => {
    const token = jwt.sign({ userId, roles: ['student'], ik: 'staging', iat: now - ago - 86_400, exp: now - ago }, env.JWT_SECRET);
    await logs.insertOne({ user: new ObjectId(userId), token, createdAt: new Date() });
    return token;
  };
  const refresh = async (token, remember) => call('GET', `/auth/refreshToken${remember === undefined ? '' : `?remember=${remember}`}`, undefined, token);
  const recent = await refresh(await session(SEED.users.student, 3600), 'false');
  const days = recent.data.token ? (jwt.decode(recent.data.token).exp - now) / 86_400 : 0;
  check('a token that expired an hour ago is refreshed, for a day (remember=false)', recent.status === 200 && days > 0.9 && days < 1.1, { status: recent.status, days });
  check('a token that expired 8 days ago is refused', (await refresh(await session(SEED.users.student, 8 * 86_400))).status === 403);
}
