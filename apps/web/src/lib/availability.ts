import { parseDate } from './format';

export type Availability =
  | { state: 'open'; closesOn: Date | null }
  | { state: 'not-yet'; opensOn: Date }
  | { state: 'closed'; closedOn: Date };

// Whether a student can start a test now: after it opens and before it closes (the API checks
// the same when the attempt starts)
export function availability(test: { opensOn?: string | null; expiresOn?: string | null }, now: number): Availability {
  const opensOn = parseDate(test.opensOn ?? undefined);
  const closesOn = parseDate(test.expiresOn ?? undefined);
  if (opensOn && opensOn.getTime() > now) return { state: 'not-yet', opensOn };
  if (closesOn && closesOn.getTime() < now) return { state: 'closed', closedOn: closesOn };
  return { state: 'open', closesOn };
}

// "12 Oct 2026, 09:00" in the viewer's own time
export function when(date: Date): string {
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
