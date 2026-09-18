import { firstValueFrom, of, throwError } from 'rxjs';
import { resolveGrpc, withoutUserSecrets } from './user-secrets';

describe('withoutUserSecrets', () => {
  const user = {
    _id: 'u1', name: 'Demo', email: 'demo@example.com', roles: ['student'],
    hashedPassword: 'f4a2…', salt: 'ab12…', token: 'jwt…',
    passwordResetToken: 'r1', passwordResetExpired: new Date(),
    emailVerifyToken: 'e1', emailVerifyExpired: new Date(),
  };

  it('removes password hashes and one-time tokens', () => {
    const safe: any = withoutUserSecrets(user);
    for (const field of ['hashedPassword', 'salt', 'token', 'passwordResetToken', 'passwordResetExpired', 'emailVerifyToken', 'emailVerifyExpired']) {
      expect(safe[field]).toBeUndefined();
    }
  });

  it('keeps the fields a client needs', () => {
    const safe: any = withoutUserSecrets(user);
    expect(safe).toMatchObject({ _id: 'u1', name: 'Demo', email: 'demo@example.com', roles: ['student'] });
  });

  it('does not modify the original object', () => {
    withoutUserSecrets(user);
    expect(user.hashedPassword).toBe('f4a2…');
  });

  it('passes through null and undefined', () => {
    expect(withoutUserSecrets(null)).toBeNull();
    expect(withoutUserSecrets(undefined)).toBeUndefined();
  });
});

describe('resolveGrpc', () => {
  it('resolves a plain value', async () => {
    await expect(resolveGrpc({ ok: true })).resolves.toEqual({ ok: true });
  });

  it('resolves an observable', async () => {
    await expect(resolveGrpc(of({ ok: true }))).resolves.toEqual({ ok: true });
  });

  it('resolves a promise of an observable, as the gRPC clients return', async () => {
    await expect(resolveGrpc(Promise.resolve(of({ ok: true })))).resolves.toEqual({ ok: true });
  });

  it('propagates an observable error instead of swallowing it', async () => {
    await expect(resolveGrpc(throwError(() => new Error('boom')))).rejects.toThrow('boom');
  });
});
