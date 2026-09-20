import {
  CallHandler, CanActivate, ExecutionContext, ForbiddenException, Injectable, NestInterceptor,
  NotFoundException, Type, mixin,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

// Roles that look after other users' records (a teacher reviewing a student's attempt...)
export const STAFF_ROLES = ['teacher', 'mentor', 'publisher', 'admin', 'operator', 'centerHead', 'director', 'support'];

export function isStaffUser(user: any): boolean {
  return Array.isArray(user?.roles) && user.roles.some((r: string) => STAFF_ROLES.includes(r));
}

const idOf = (value: any): string | undefined => {
  if (value === null || value === undefined) return undefined;
  // an ObjectId's own _id is itself, so it is read as a string rather than followed
  if (typeof value === 'object' && !value._bsontype && value._id !== undefined && value._id !== value) return idOf(value._id);
  return String(value);
};

/**
 * Guard for routes that take a user id (GET /auth/:id...): a student may only ask for their own
 * records; staff may ask for anyone's. Use after AuthenticationGuard.
 * With `from: 'query'` it checks an optional query parameter (?user=...) instead, which a
 * student may leave out to mean themselves.
 */
export function SelfOrStaffGuard(param = 'id', { from = 'params' }: { from?: 'params' | 'query' } = {}): Type<CanActivate> {
  @Injectable()
  class SelfOrStaff implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      if (isStaffUser(user)) return true;
      const asked = request[from]?.[param];
      if (from === 'query' && (asked === undefined || asked === '')) return true;
      if (user && idOf(user) === String(asked)) return true;
      throw new ForbiddenException('You can only view your own records');
    }
  }
  return mixin(SelfOrStaff);
}

// The user a record returned by a route belongs to: an attempt's `user` (an id or populated),
// also when the route wraps the attempt ({ atm }, { attemptObj }, { attempt }...). Not `userId`:
// on an attempt that is the student's login (their email or phone), not an id.
export function ownerOf(record: any): string | undefined {
  if (!record || typeof record !== 'object') return undefined;
  const direct = record.user;
  if (direct !== undefined) return idOf(direct);
  for (const key of ['atm', 'attemptObj', 'attempt', 'data', 'response', 'res']) {
    const inner = record[key];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      // GET /attempt/findAttempt/:id puts the attempt's user on its copy of the test
      const owner = inner.user ?? inner.practiceset?.user;
      if (owner !== undefined) return idOf(owner);
    }
  }
  return undefined;
}

/**
 * Interceptor for routes that return one attempt by its id: a student who asks for somebody
 * else's attempt gets 404, as if it did not exist. Staff get any attempt.
 */
@Injectable()
export class OwnRecordInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const user = context.switchToHttp().getRequest().user;
    return next.handle().pipe(map((result) => {
      if (isStaffUser(user)) return result;
      const owner = ownerOf(result);
      if (owner !== undefined && owner !== idOf(user)) throw new NotFoundException('Attempt not found');
      return result;
    }));
  }
}

const CONTACT_FIELDS = ['email', 'phoneNumber', 'phone', 'mobile'];
// a user's login (`userId`) is their email or phone number
const looksLikeContact = (v: string) => v.includes('@') || /^\+?\d{6,}$/.test(v);

// Copy of `value` without the email and phone number of anyone other than `self`
export function withoutOthersContact(value: any, self: { email?: string; phoneNumber?: string; userId?: string } | undefined, depth = 0): any {
  if (depth > 12 || value === null || typeof value !== 'object') return value;
  if (value instanceof Date || (value._bsontype && value._bsontype === 'ObjectId')) return value;
  if (Array.isArray(value)) return value.map((v) => withoutOthersContact(v, self, depth + 1));
  const out: any = {};
  const isSelf = !!self && ((self.email && value.email === self.email) || (self.phoneNumber && value.phoneNumber === self.phoneNumber) || (self.userId && value.userId === self.userId));
  for (const [key, v] of Object.entries(value)) {
    if (!isSelf && typeof v === 'string' && (CONTACT_FIELDS.includes(key) || (key === 'userId' && looksLikeContact(v)))) continue;
    out[key] = withoutOthersContact(v, self, depth + 1);
  }
  return out;
}

/**
 * Interceptor for routes that show other people by design (a test's top performers, a public
 * profile, a shared result): students and visitors get the names but not others' email or phone.
 */
@Injectable()
export class HideOthersContactInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const user = context.switchToHttp().getRequest().user;
    return next.handle().pipe(map((result) => (isStaffUser(user) ? result : withoutOthersContact(result, user))));
  }
}
