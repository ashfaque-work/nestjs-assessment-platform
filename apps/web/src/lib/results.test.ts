import { describe, expect, it } from 'vitest';
import { STATUS, type ResultAttempt } from '../api/types';
import { classResults } from './results';
import { draftProblems } from '../api/teacher';

const attempt = (over: Partial<ResultAttempt>, statuses: number[]): ResultAttempt => ({
  _id: Math.random().toString(36).slice(2),
  practicesetId: 't1',
  totalMark: statuses.filter((s) => s === STATUS.CORRECT).length,
  maximumMarks: statuses.length,
  totalCorrects: 0,
  totalErrors: 0,
  totalMissed: 0,
  totalQuestions: statuses.length,
  totalTime: 60_000,
  createdAt: 'Sat Sep 19 2026 01:00:00 GMT+0000 (Coordinated Universal Time)',
  subjects: [],
  QA: statuses.map((status, i) => ({ question: { _id: `q${i}` }, answers: [], status, obtainMarks: 0, actualMarks: 1, timeEslapse: 0 })),
  ...over,
});

const { CORRECT: R, INCORRECT: W, MISSED: M } = STATUS;
const questions = ['q0', 'q1', 'q2'];

describe('classResults', () => {
  it('builds one row per finished attempt, newest first', () => {
    const result = classResults([
      attempt({ studentName: 'Asha', email: 'a@x', createdAt: 'Sat Sep 19 2026 01:00:00 GMT+0000' }, [R, R, W]),
      attempt({ studentName: 'Ravi', email: 'r@x', createdAt: 'Sat Sep 19 2026 02:00:00 GMT+0000' }, [R, W, M]),
      attempt({ studentName: 'Left early', ongoing: true }, [R, R, R]),
      attempt({ studentName: 'Abandoned', isAbandoned: true }, [R, R, R]),
    ], questions);

    expect(result.rows.map((r) => r.name)).toEqual(['Ravi', 'Asha']);
    expect(result.rows[0].cells).toEqual(['right', 'wrong', 'missed']);
  });

  it('numbers a student\'s repeated attempts', () => {
    const result = classResults([
      attempt({ studentName: 'Asha', email: 'a@x', createdAt: 'Sat Sep 19 2026 01:00:00 GMT+0000' }, [W, W, W]),
      attempt({ studentName: 'Asha', email: 'a@x', createdAt: 'Sat Sep 19 2026 03:00:00 GMT+0000' }, [R, R, W]),
    ], questions);
    expect(result.rows.map((r) => r.attemptNumber)).toEqual([2, 1]);
  });

  it('counts right answers per question and finds the hardest one', () => {
    const result = classResults([
      attempt({ email: 'a@x' }, [R, R, W]),
      attempt({ email: 'b@x' }, [R, W, W]),
      attempt({ email: 'c@x' }, [R, R, R]),
    ], questions);
    expect(result.perQuestion).toEqual([{ right: 3, total: 3 }, { right: 2, total: 3 }, { right: 1, total: 3 }]);
    expect(result.hardest).toBe(2);
    expect(result.averageScore).toBeCloseTo(2);
    expect(result.maxScore).toBe(3);
  });

  it('shows a question an attempt has no answer for as missed', () => {
    const result = classResults([attempt({ email: 'a@x' }, [R])], questions);
    expect(result.rows[0].cells).toEqual(['right', 'missed', 'missed']);
  });

  it('has no hardest question before anyone has finished', () => {
    expect(classResults([], questions)).toMatchObject({ rows: [], hardest: null, averageScore: 0 });
  });
});

describe('draftProblems', () => {
  const ready = {
    questionText: 'Solve for x: 5x = 35',
    unit: { _id: 'u', name: 'Algebra' },
    topic: { _id: 't', name: 'Linear Equations' },
    options: [{ answerText: '5', isCorrectAnswer: false }, { answerText: '7', isCorrectAnswer: true }],
    answerExplain: '',
  };

  it('accepts a complete question', () => {
    expect(draftProblems(ready)).toEqual([]);
  });

  it('asks for exactly one correct answer', () => {
    expect(draftProblems({ ...ready, options: ready.options.map((o) => ({ ...o, isCorrectAnswer: false })) })).toContain('Mark the one correct answer.');
    expect(draftProblems({ ...ready, options: ready.options.map((o) => ({ ...o, isCorrectAnswer: true })) })).toContain('Mark the one correct answer.');
  });

  it('asks for the text, a topic and two filled options', () => {
    const problems = draftProblems({ ...ready, questionText: ' ', topic: null, options: [{ answerText: '7', isCorrectAnswer: true }, { answerText: '', isCorrectAnswer: false }] });
    expect(problems).toEqual(['Write the question.', 'Choose the topic it tests.', 'Give at least two answer options.', 'Fill in or remove the empty option.']);
  });
});
