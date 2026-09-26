import { describe, expect, it } from 'vitest';
import { availability } from './availability';

const NOW = Date.parse('2026-10-01T12:00:00Z');

describe('availability', () => {
  it('is open with no dates at all', () => {
    expect(availability({}, NOW)).toEqual({ state: 'open', closesOn: null });
  });

  it('is not open yet before its opening time', () => {
    const a = availability({ opensOn: '2026-10-02T09:00:00Z' }, NOW);
    expect(a.state).toBe('not-yet');
  });

  it('is closed after its closing time', () => {
    const a = availability({ opensOn: '2026-09-01T09:00:00Z', expiresOn: '2026-09-30T23:59:59Z' }, NOW);
    expect(a.state).toBe('closed');
  });

  it('is open between the two, and says when it closes', () => {
    const a = availability({ opensOn: '2026-09-30T09:00:00Z', expiresOn: '2026-10-05T23:59:59Z' }, NOW);
    expect(a.state).toBe('open');
    expect(a.state === 'open' && a.closesOn?.toISOString()).toBe('2026-10-05T23:59:59.000Z');
  });

  it('ignores an empty or unreadable date', () => {
    expect(availability({ opensOn: '', expiresOn: 'not a date' }, NOW).state).toBe('open');
  });
});
