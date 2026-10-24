import { describe, expect, it } from 'vitest';
import { parseEmails } from './emails';

describe('parseEmails', () => {
  it('takes one per line, commas or semicolons, in lower case and without repeats', () => {
    expect(parseEmails('A@x.com\nb@y.org, a@x.com; c@z.io')).toEqual({ emails: ['a@x.com', 'b@y.org', 'c@z.io'], invalid: [] });
  });

  it('lists what is not an email', () => {
    expect(parseEmails('a@x.com nobody b@@ ok@y.org').invalid).toEqual(['nobody', 'b@@']);
  });

  it('is empty for empty text', () => {
    expect(parseEmails('  \n ')).toEqual({ emails: [], invalid: [] });
  });
});
