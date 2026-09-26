import { STATUS, type GradedAnswer, type ResultAttempt } from '../api/types';
import { parseDate } from './format';

export type Cell = 'right' | 'wrong' | 'missed' | 'pending';

export interface StudentRow {
  id: string;
  student: string; // who took it: the same for every attempt by one student
  name: string;
  attemptNumber: number; // 1 for the student's first finished attempt
  late: boolean; // handed in after the time ran out
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

const idOf = (q: GradedAnswer['question'] | ResultAttempt['user']) => (typeof q === 'string' ? q : q?._id);

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
    // by account first: two students can share a name
    const student = idOf(a.user) || a.email || a.studentName || `student-${i}`;
    const attemptNumber = (seen.get(student) ?? 0) + 1;
    seen.set(student, attemptNumber);
    const byQuestion = new Map((a.QA ?? []).map((qa) => [idOf(qa.question), qa.status]));
    return {
      id: a._id ?? `${student}-${attemptNumber}`,
      student,
      late: !!a.submittedLate,
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

// One field of a CSV line: quoted when it holds a comma, quote or line break; a leading = + - @
// is prefixed so a spreadsheet does not run it as a formula
function csvField(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// The class sheet as CSV: a line per attempt, newest first, with each question's outcome
export function classResultsCsv(results: ClassResults, questionCount: number): string {
  const header = ['Student', 'Attempt', 'Score', 'Out of', 'Time (s)', 'Handed in', 'Late', ...Array.from({ length: questionCount }, (_, i) => `Q${i + 1}`)];
  const lines = results.rows.map((r) => [
    r.name, r.attemptNumber, r.score, r.maxScore, Math.round((r.timeMs ?? 0) / 1000), parseDate(r.date)?.toISOString() ?? '', r.late ? 'yes' : '', ...r.cells,
  ]);
  return [header, ...lines].map((line) => line.map(csvField).join(',')).join('\r\n');
}
