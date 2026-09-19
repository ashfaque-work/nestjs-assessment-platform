import type { SubmittedAnswer } from '../api/types';

// Everything the student has done in one attempt. It is saved after every change, so a
// refresh or a dropped connection does not lose answers or restart the clock.
export interface Session {
  attemptId: string;
  testId: string;
  startedAt: number; // epoch ms
  durationMs: number;
  order: string[]; // question ids, in the order shown
  current: number; // index into order
  enteredAt: number; // when the current question was opened
  answers: Record<string, string[]>; // question id -> chosen option ids
  marked: Record<string, boolean>; // marked for review
  spent: Record<string, number>; // ms spent on each question
}

export type SessionAction =
  | { type: 'choose'; questionId: string; optionId: string; multiple: boolean; at: number }
  | { type: 'clear'; questionId: string }
  | { type: 'toggleMark'; questionId: string }
  | { type: 'goTo'; index: number; at: number };

export function createSession(attemptId: string, testId: string, order: string[], durationMs: number, now: number): Session {
  return { attemptId, testId, startedAt: now, durationMs, order, current: 0, enteredAt: now, answers: {}, marked: {}, spent: {} };
}

// Adds the time since the current question was opened to that question
function closeCurrent(s: Session, at: number): Session {
  const id = s.order[s.current];
  const elapsed = Math.max(0, at - s.enteredAt);
  return { ...s, enteredAt: at, spent: { ...s.spent, [id]: (s.spent[id] ?? 0) + elapsed } };
}

export function sessionReducer(s: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'choose': {
      const chosen = s.answers[action.questionId] ?? [];
      let next: string[];
      if (!action.multiple) next = [action.optionId];
      else next = chosen.includes(action.optionId) ? chosen.filter((o) => o !== action.optionId) : [...chosen, action.optionId];
      return { ...s, answers: { ...s.answers, [action.questionId]: next } };
    }
    case 'clear': {
      const answers = { ...s.answers };
      delete answers[action.questionId];
      return { ...s, answers };
    }
    case 'toggleMark':
      return { ...s, marked: { ...s.marked, [action.questionId]: !s.marked[action.questionId] } };
    case 'goTo': {
      if (action.index === s.current || action.index < 0 || action.index >= s.order.length) return s;
      return { ...closeCurrent(s, action.at), current: action.index };
    }
  }
}

export const isAnswered = (s: Session, questionId: string) => (s.answers[questionId]?.length ?? 0) > 0;

export function remainingMs(s: Session, now: number) {
  return Math.max(0, s.startedAt + s.durationMs - now);
}

export function progress(s: Session) {
  const answered = s.order.filter((id) => isAnswered(s, id)).length;
  const marked = s.order.filter((id) => s.marked[id]).length;
  return { answered, marked, unanswered: s.order.length - answered, total: s.order.length };
}

// The answers in the shape /attempt/finish expects, with the time on the open question included
export function toSubmission(s: Session, now: number): SubmittedAnswer[] {
  const closed = closeCurrent(s, now);
  return closed.order.map((id) => ({
    question: id,
    answers: closed.answers[id] ?? [],
    timeEslapse: Math.round(closed.spent[id] ?? 0),
    hasMarked: !!closed.marked[id],
  }));
}

const storageKey = (attemptId: string) => `attempt:${attemptId}`;

export function saveSession(s: Session) {
  try {
    localStorage.setItem(storageKey(s.attemptId), JSON.stringify(s));
  } catch {
    /* storage full or blocked: the attempt still works, it just will not survive a refresh */
  }
}

export function loadSession(attemptId: string): Session | null {
  try {
    const raw = localStorage.getItem(storageKey(attemptId));
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

// An attempt of this test that was started on this device and still has time left
export function findOpenSession(testId: string, now: number): Session | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('attempt:')) continue;
      const s = JSON.parse(localStorage.getItem(key) ?? 'null') as Session | null;
      if (s?.testId === testId && remainingMs(s, now) > 0) return s;
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

export function discardSession(attemptId: string) {
  try {
    localStorage.removeItem(storageKey(attemptId));
  } catch {
    /* nothing to remove */
  }
}
