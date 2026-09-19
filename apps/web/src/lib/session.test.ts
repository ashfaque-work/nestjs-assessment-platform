import { describe, expect, it } from 'vitest';
import {
  createSession,
  findOpenSession,
  loadSession,
  progress,
  remainingMs,
  saveSession,
  sessionReducer,
  toSubmission,
} from './session';

const T0 = 1_000_000;
const start = () => createSession('att1', 'test1', ['q1', 'q2', 'q3'], 20 * 60_000, T0);

describe('test session', () => {
  it('keeps one option for a single-answer question, replacing the previous choice', () => {
    let s = sessionReducer(start(), { type: 'choose', questionId: 'q1', optionId: 'a', multiple: false, at: T0 });
    s = sessionReducer(s, { type: 'choose', questionId: 'q1', optionId: 'b', multiple: false, at: T0 });
    expect(s.answers.q1).toEqual(['b']);
  });

  it('toggles options on a multiple-answer question', () => {
    let s = sessionReducer(start(), { type: 'choose', questionId: 'q1', optionId: 'a', multiple: true, at: T0 });
    s = sessionReducer(s, { type: 'choose', questionId: 'q1', optionId: 'b', multiple: true, at: T0 });
    s = sessionReducer(s, { type: 'choose', questionId: 'q1', optionId: 'a', multiple: true, at: T0 });
    expect(s.answers.q1).toEqual(['b']);
  });

  it('adds up the time spent on each question across visits', () => {
    let s = sessionReducer(start(), { type: 'goTo', index: 1, at: T0 + 10_000 }); // 10 s on q1
    s = sessionReducer(s, { type: 'goTo', index: 0, at: T0 + 25_000 }); // 15 s on q2
    const answers = toSubmission(s, T0 + 30_000); // 5 more s on q1
    expect(answers.map((a) => a.timeEslapse)).toEqual([15_000, 15_000, 0]);
  });

  it('submits every question in order, answered or not, with its review mark', () => {
    let s = sessionReducer(start(), { type: 'choose', questionId: 'q2', optionId: 'x', multiple: false, at: T0 });
    s = sessionReducer(s, { type: 'toggleMark', questionId: 'q3' });
    expect(toSubmission(s, T0)).toEqual([
      { question: 'q1', answers: [], timeEslapse: 0, hasMarked: false },
      { question: 'q2', answers: ['x'], timeEslapse: 0, hasMarked: false },
      { question: 'q3', answers: [], timeEslapse: 0, hasMarked: true },
    ]);
  });

  it('counts answered, marked and unanswered questions', () => {
    let s = sessionReducer(start(), { type: 'choose', questionId: 'q1', optionId: 'a', multiple: false, at: T0 });
    s = sessionReducer(s, { type: 'toggleMark', questionId: 'q1' });
    s = sessionReducer(s, { type: 'clear', questionId: 'q1' });
    expect(progress(s)).toEqual({ answered: 0, marked: 1, unanswered: 3, total: 3 });
  });

  it('ignores moves past the first or last question', () => {
    const s = start();
    expect(sessionReducer(s, { type: 'goTo', index: -1, at: T0 })).toBe(s);
    expect(sessionReducer(s, { type: 'goTo', index: 3, at: T0 })).toBe(s);
  });

  it('counts the time down from when the attempt started, never below zero', () => {
    const s = start();
    expect(remainingMs(s, T0 + 60_000)).toBe(19 * 60_000);
    expect(remainingMs(s, T0 + 21 * 60_000)).toBe(0);
  });

  it('survives a reload, and offers an unfinished attempt only while time is left', () => {
    const s = sessionReducer(start(), { type: 'choose', questionId: 'q1', optionId: 'a', multiple: false, at: T0 });
    saveSession(s);
    expect(loadSession('att1')?.answers).toEqual({ q1: ['a'] });
    expect(findOpenSession('test1', T0 + 60_000)?.attemptId).toBe('att1');
    expect(findOpenSession('test1', T0 + 30 * 60_000)).toBeNull();
    expect(findOpenSession('other-test', T0)).toBeNull();
  });
});
