// Fields of a user record that must never be sent to HTTP clients.
const USER_SECRET_FIELDS = [
  'hashedPassword', 'salt', 'token',
  'passwordResetToken', 'passwordResetExpired',
  'emailVerifyToken', 'emailVerifyExpired',
];

import { isObservable, lastValueFrom } from 'rxjs';

// gRPC client calls may return a value, an Observable, or a Promise of an Observable;
// resolve any of these to the actual response.
export async function resolveGrpc<T = any>(result: any): Promise<T> {
  const value = await result;
  return isObservable(value) ? lastValueFrom(value) : value;
}

// Returns a copy of the user without password hashes and one-time tokens.
export function withoutUserSecrets<T>(user: T): T {
  if (!user || typeof user !== 'object') return user;
  const copy: any = { ...user };
  for (const field of USER_SECRET_FIELDS) delete copy[field];
  return copy;
}
