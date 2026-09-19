import { STATUS, type GradedAnswer, type ResultAttempt } from '../api/types';

export type Cell = 'right' | 'wrong' | 'missed' | 'pending';

export interface StudentRow {
  id: string;
  name: string;
  attemptNumber: number; // 1 for the student's first finished attempt
  score: number;
  maxScore: number;
  timeMs: number;
  date: string;
  cells: Cell[];
}

export interface ClassResults {
  rows: StudentRow[];
  // for each question (in test order): how many answered it right, out of how many attempts
  perQuestion: { right: number; total: number }[];
  averageScore: number;
  maxScore: number;
  hardest: number | null; // index of the question fewest got right
}

const idOf = (q: GradedAnswer['question']) => (typeof q === 'string' ? q : q?._id);

function cellFor(status: number | undefined): Cell {
  if (status === STATUS.CORRECT) return 'right';
  if (status === STATUS.INCORRECT) return 'wrong';
  if (status === STATUS.PENDING) return 'pending';
  return 'missed';
}

// Turns the test's attempts into the teacher's class sheet. Only finished attempts count; each
// student's attempts are numbered in the order they were taken; the newest are listed first.
export function classResults(attempts: ResultAttempt[], questionIds: string[]): ClassResults {
  const finished = attempts
    .filter((a) => !a.ongoing && !a.isAbandoned)
    .sort((a, b) => time(a.createdAt) - time(b.createdAt));

  const seen = new Map<string, number>();
  const rows: StudentRow[] = finished.map((a, i) => {
    const student = a.email || a.studentName || `student-${i}`;
    const attemptNumber = (seen.get(student) ?? 0) + 1;
    seen.set(student, attemptNumber);
    const byQuestion = new Map((a.QA ?? []).map((qa) => [idOf(qa.question), qa.status]));
    return {
      id: a._id ?? `${student}-${attemptNumber}`,
      name: a.studentName || a.email || 'Student',
      attemptNumber,
      score: a.totalMark,
      maxScore: a.maximumMarks,
      timeMs: a.totalTime,
      date: a.createdAt,
      cells: questionIds.map((id) => cellFor(byQuestion.get(id))),
    };
  });
  rows.reverse();

  const perQuestion = questionIds.map((_, q) => ({
    right: rows.filter((r) => r.cells[q] === 'right').length,
    total: rows.length,
  }));

  let hardest: number | null = null;
  if (rows.length) {
    perQuestion.forEach((p, q) => {
      if (hardest === null || p.right < perQuestion[hardest].right) hardest = q;
    });
  }

  const maxScore = rows[0]?.maxScore ?? 0;
  const averageScore = rows.length ? rows.reduce((sum, r) => sum + r.score, 0) / rows.length : 0;
  return { rows, perQuestion, averageScore, maxScore, hardest };
}

function time(value: string | undefined): number {
  const t = value ? Date.parse(value.replace(/\s*\(.*\)\s*$/, '')) : NaN;
  return Number.isNaN(t) ? 0 : t;
}
