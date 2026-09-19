// Shapes of the API responses the app reads. Only the fields it uses are listed.

export interface NamedRef {
  _id: string;
  name: string;
}

export interface Me {
  _id: string;
  name: string;
  userId: string;
  email?: string;
  roles: string[];
}

export interface TestSummary {
  _id: string;
  title: string;
  description?: string;
  instructions?: string;
  subjects: NamedRef[];
  totalTime: number; // minutes
  totalQuestion?: number;
  questions?: unknown[];
  testMode?: string;
  enableMarks?: boolean;
  plusMark?: number;
  minusMark?: number;
  isShowAttempt?: boolean;
}

export interface AnswerOption {
  _id: string;
  answerText: string;
}

export interface Question {
  _id: string;
  questionText: string;
  questionHeader?: string;
  category: string;
  questionType: string; // 'single' | 'multiple'
  answers: AnswerOption[];
  plusMark?: number;
  minusMark?: number;
  subject?: NamedRef;
  unit?: NamedRef;
  topic?: NamedRef;
}

export interface TestWithQuestions extends TestSummary {
  questions: Question[];
}

export interface Score {
  _id: string;
  name: string;
  correct: number;
  incorrect: number;
  missed: number;
  pending: number;
  mark: number;
  maxMarks: number;
  accuracy: number; // 0..1
  speed: number; // ms per answered question
}

export interface UnitScore extends Score {
  topics: Score[];
}

export interface SubjectScore extends Score {
  units: UnitScore[];
}

/** Answer status codes used by the grader */
export const STATUS = { CORRECT: 1, INCORRECT: 2, MISSED: 3, PENDING: 4 } as const;

export interface GradedAnswer {
  question: { _id: string } | string;
  answers: { answerId: string }[];
  status: number;
  obtainMarks: number;
  actualMarks: number;
  timeEslapse: number;
  hasMarked?: boolean;
}

export interface Attempt {
  _id?: string;
  practicesetId: string;
  practiceSetInfo?: { title: string; subjects?: NamedRef[] };
  totalMark: number;
  maximumMarks: number;
  totalCorrects: number;
  totalErrors: number;
  totalMissed: number;
  totalQuestions: number;
  totalTime: number; // ms
  totalMarkeds?: number;
  createdAt: string;
  isAbandoned?: boolean;
  ongoing?: boolean;
  isEvaluated?: boolean;
  subjects: SubjectScore[];
  QA?: GradedAnswer[];
}

export interface ReviewQuestion extends Question {
  answers: (AnswerOption & { isCorrectAnswer?: boolean })[];
  answerExplain?: string;
}

/** One answer as /attempt/finish expects it */
export interface SubmittedAnswer {
  question: string;
  answers: string[];
  timeEslapse: number;
  hasMarked: boolean;
}
