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
