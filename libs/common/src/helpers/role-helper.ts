export const READ_ALL_CONTENT_ROLES = ['admin', 'director', 'operator', 'support'];
export const WRITE_ALL_CONTENT_ROLES = ['admin', 'director', 'operator', 'publisher'];
export const OWN_CONTENT_ROLES = ['teacher', 'mentor'];
export const GLOBAL_CONTENT_ROLES = ['publisher'];
export const LOCATION_CONTENT_ROLES = ['admin', 'director', 'operator', 'support', 'teacher', 'student', 'mentor'];

export function canReadContentsOfAllUsers(roles: string[]): boolean {
  return roles.some(role => READ_ALL_CONTENT_ROLES.includes(role));
}

export function canWriteContentsOfAllUsers(roles: string[]): boolean {
  return roles.some(role => WRITE_ALL_CONTENT_ROLES.includes(role));
}

export function canOnlySeeHisOwnContents(roles: string[]): boolean {
  return roles.some(role => OWN_CONTENT_ROLES.includes(role));
}

export function canOnlySeeLocationContents(roles: string[]): boolean {
  return roles.some(role => LOCATION_CONTENT_ROLES.includes(role));
}

export function canSeeGlobalContents(roles: string[]): boolean {
  return roles.some(role => GLOBAL_CONTENT_ROLES.includes(role));
}

// Who may change a test (its settings, its questions): its owner, a teacher listed as one of its
// instructors, or a role that writes every user's content.
export function canManageTest(user: { _id?: unknown; roles?: string[] | string } | undefined, test: { user?: unknown; instructors?: unknown[] } | undefined): boolean {
  if (!user || !test) return false;
  const roles = ([] as string[]).concat(user.roles ?? []);
  if (canWriteContentsOfAllUsers(roles)) return true;
  const me = String(user._id);
  const idOf = (x: any) => String(x?._id ?? x);
  return idOf(test.user) === me || (test.instructors ?? []).some((i) => idOf(i) === me);
}

// The roles a visitor may give themselves when signing up; every other role is given by staff
export const SELF_SIGNUP_ROLES = ['student', 'teacher'];

// Which roles a staff member may give other people: an admin any role, a director or operator any
// role but admin, support only the learning roles. Nobody else gives roles.
export function canGrantRoles(actorRoles: string[] | string | undefined, roles: string[]): boolean {
  const actor = ([] as string[]).concat(actorRoles ?? []);
  if (actor.includes('admin')) return true;
  if (actor.some((r) => r === 'director' || r === 'operator')) return roles.every((r) => r !== 'admin');
  if (actor.includes('support')) return roles.every((r) => ['student', 'teacher', 'mentor'].includes(r));
  return false;
}

// Who may see a test's answer key and every student's results: its author and instructors, and
// the roles that look after everyone's content (and a centre head, who runs a location)
export function canReadTest(user: { _id?: unknown; roles?: string[] | string } | undefined, test: { user?: unknown; instructors?: unknown[] } | undefined): boolean {
  if (!user || !test) return false;
  const roles = ([] as string[]).concat(user.roles ?? []);
  if (canReadContentsOfAllUsers(roles) || roles.includes('centerHead')) return true;
  return canManageTest(user, test);
}
