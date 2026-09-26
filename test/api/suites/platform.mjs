// Platform: settings (never leaking credentials), the audit log, resetting a forgotten password
import { call, db, login, ObjectId, SEED } from '../lib.mjs';

export const name = 'Settings, audit log, password reset';

export async function run({ check }) {
  const settings = (await db()).collection('settings');
  const users = (await db()).collection('users');
  const [admin, operator, teacher] = await Promise.all(['admin', 'operator', 'teacher'].map((u) => login(`${u}@example.com`, SEED.password)));
  const leaks = (text) => /SHOULD-NOT-LEAK|AC-SECRET|clientSecret|workingKey/.test(text);

  // settings
  for (const slugs of ['facebookAuth,payment', 'payment.ccA', 'facebookAuth.clientSecret', ' payment']) {
    const r = await call('GET', `/settings/find/${encodeURIComponent(slugs)}`);
    check(`/settings/find/${slugs.trim()} returns no credentials`, r.status === 200 && !leaks(r.text), r.text);
  }
  const mixed = await call('GET', '/settings/find/pageTitle,payment');
  check('public fields asked next to a private one still come back', mixed.text.includes('"pageTitle"') && !leaks(mixed.text), mixed.text);
  const wl = await call('GET', '/settings/getWhiteLabel');
  check('the white label hides credentials', wl.status === 200 && !leaks(wl.text), wl.text);
  const save = await call('PUT', '/settings/update', { ...wl.data.response, productName: 'Assess Pro', copyRight: '© Test', isWhiteLabelled: true }, admin);
  const stored = await settings.findOne({ slug: 'whiteLabel' });
  check('saving settings keeps the branding fields', save.status === 200 && stored.productName === 'Assess Pro' && stored.copyRight === '© Test' && stored.isWhiteLabelled === true, stored);
  check('...keeps the role switches', stored.roles?.teacher === true && stored.roles?.student === true, stored.roles);
  check('...and keeps the credentials', stored.payment?.ccA?.workingKey === 'CCA-KEY-SHOULD-NOT-LEAK' && stored.facebookAuth?.clientSecret === 'FB-SECRET-SHOULD-NOT-LEAK');
  check('only an admin saves settings', (await call('PUT', '/settings/update', { productName: 'x' }, operator)).status === 403);

  // the audit log
  await call('PUT', `/auth/updateUserStatus/${SEED.users.student2}`, { _id: SEED.users.student2, isActive: false }, operator);
  await call('PUT', `/auth/updateUserStatus/${SEED.users.student2}`, { _id: SEED.users.student2, isActive: true }, operator);
  await call('PUT', `/auth/${SEED.users.student2}/role`, { newRoles: ['student', 'mentor'] }, operator);
  await call('PUT', `/auth/manageUser/${SEED.users.student2}`, { name: 'Student Two', password: 'Newpass123!' }, admin);
  await call('PUT', `/auth/${SEED.users.operator}/role`, { newRoles: ['admin'] }, operator); // refused: must not be logged
  const log = await call('GET', '/auth/audit?page=1&limit=50', undefined, admin);
  const entries = log.data.entries ?? [];
  const has = (action, pred) => entries.some((e) => e.action === action && pred(e));
  check('the audit log records deactivation and reactivation', has('user.status', (e) => e.details === 'deactivated') && has('user.status', (e) => e.details === 'activated'), entries);
  check('...role changes, before and after', has('user.roles', (e) => /student → student, mentor/.test(e.details)), entries.filter((e) => e.action === 'user.roles'));
  check('...edits, naming what changed but never the password', has('user.edit', (e) => /name: Student Two/.test(e.details) && /password reset/.test(e.details) && !/Newpass/.test(e.details)), entries.filter((e) => e.action === 'user.edit'));
  check('...the settings change', has('settings.update', (e) => /productName/.test(e.details)));
  check('...who did it and to whom', entries.every((e) => e.actorName) && has('user.status', (e) => e.targetName === 'Test student2'), entries[0]);
  check('...and not a change that was refused', !entries.some((e) => e.action === 'user.roles' && e.targetName === 'Test operator'), entries);
  check('newest first', entries.length > 1 && entries[0].createdAt >= entries[entries.length - 1].createdAt);
  check('only admins and directors read the log', (await call('GET', '/auth/audit', undefined, teacher)).status === 403 && (await call('GET', '/auth/audit', undefined, operator)).status === 403);

  // password reset
  const unknown = await call('POST', '/auth/recoverPassword', { type: 'email', email: 'nobody-here@example.com' });
  const known = await call('POST', '/auth/recoverPassword', { type: 'email', email: 'student@example.com' });
  check('asking for a reset answers the same whether or not the account exists', unknown.status === 201 && known.status === 201 && unknown.text === known.text, { unknown: unknown.text, known: known.text });
  const u = await users.findOne({ _id: new ObjectId(SEED.users.student) });
  check('the reset token is long and random, and good for an hour', /^[a-f0-9]{64}$/.test(u.passwordResetToken ?? '')
    && Math.abs(new Date(u.passwordResetExpired).getTime() - Date.now() - 3_600_000) < 120_000, { token: u.passwordResetToken, expires: u.passwordResetExpired });
  const confirm = await call('GET', `/auth/confirmPasswordResetToken/${u.passwordResetToken}`);
  check('the link check names the account and nothing more', confirm.status === 200 && confirm.data.user?._id === SEED.users.student
    && !confirm.data.user?.email && !confirm.data.user?.hashedPassword, confirm.data);
  check('a wrong token is refused', (await call('GET', `/auth/confirmPasswordResetToken/${'0'.repeat(64)}`)).status === 404);
  const short = await call('PUT', `/auth/${SEED.users.student}/newPassword`, { newPassword: 'short', token: u.passwordResetToken });
  check('a new password under 8 characters is refused', short.status === 400, short);
  const set = await call('PUT', `/auth/${SEED.users.student}/newPassword`, { newPassword: 'Brandnew123!', token: u.passwordResetToken });
  check('the link sets a new password', set.status === 200 && !!(await login('student@example.com', 'Brandnew123!')), set);
  check('...and cannot be used again', (await call('PUT', `/auth/${SEED.users.student}/newPassword`, { newPassword: 'Another123!', token: u.passwordResetToken })).status === 401);

  // guessing: a few wrong tokens and the link is gone
  await call('POST', '/auth/recoverPassword', { type: 'email', email: 'teacher@example.com' });
  const t = await users.findOne({ _id: new ObjectId(SEED.users.teacher) });
  for (let i = 0; i < 5; i++) await call('PUT', `/auth/${SEED.users.teacher}/newPassword`, { newPassword: 'Guessed123!', token: 'f'.repeat(64) });
  const afterGuesses = await call('PUT', `/auth/${SEED.users.teacher}/newPassword`, { newPassword: 'Guessed123!', token: t.passwordResetToken });
  check('five wrong tokens and even the right one no longer works', afterGuesses.status === 401, afterGuesses);
}
