import { describe, expect, it } from 'vitest';
import { clock, duration, letter, marks, parseDate, percent, plural } from './format';

describe('format', () => {
  it('shows the countdown as m:ss, and h:mm:ss past an hour', () => {
    expect(clock(20 * 60_000)).toBe('20:00');
    expect(clock(65_000)).toBe('1:05');
    expect(clock(500)).toBe('0:01');
    expect(clock(0)).toBe('0:00');
    expect(clock(3_725_000)).toBe('1:02:05');
  });

  it('writes durations in words', () => {
    expect(duration(45_000)).toBe('45 s');
    expect(duration(300)).toBe('under 1 s');
    expect(duration(130_000)).toBe('2 min 10 s');
    expect(duration(120_000)).toBe('2 min');
    expect(duration(3_900_000)).toBe('1 h 5 min');
  });

  it('reads the dates the API sends', () => {
    const date = parseDate('Sat Sep 19 2026 01:14:55 GMT+0000 (Coordinated Universal Time)');
    expect(date?.toISOString()).toBe('2026-09-19T01:14:55.000Z');
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate(undefined)).toBeNull();
  });

  it('handles the small things', () => {
    expect(percent(1, 4)).toBe(25);
    expect(percent(1, 0)).toBe(0);
    expect(plural(1, 'question')).toBe('1 question');
    expect(plural(3, 'test is', 'tests are')).toBe('3 tests are');
    expect(marks(2.5000001)).toBe('2.5');
    expect(letter(0) + letter(3)).toBe('AD');
  });
});
