import { Types } from 'mongoose';
import { AttemptProcessor } from './AttemptProcessor';
import { Constants } from '../helpers';

// The submit path: a student finishes a test, and process() turns the raw answers into
// marks. Everything below the grading itself (saving, notifications, course progress) is
// stubbed out, so these tests only pin down what a given set of answers scores.

const oid = (hex: string) => new Types.ObjectId(hex.padStart(24, '0'));

const Q_RIGHT = oid('a1');
const Q_WRONG = oid('a2');
const Q_SKIPPED = oid('a3');

const ANSWER_A = oid('b1');
const ANSWER_B = oid('b2');

/** One single-choice question where ANSWER_A is the correct option. */
const question = (id: Types.ObjectId) => ({
  _id: id,
  category: 'mcq',
  questionType: 'single',
  plusMark: 4,
  minusMark: -1,
  hasMarked: false,
  subject: { _id: oid('c1'), name: 'Maths' },
  unit: { _id: oid('c2'), name: 'Algebra' },
  topic: { _id: oid('c3'), name: 'Equations' },
  answers: [
    { _id: ANSWER_A, answerText: 'right', isCorrectAnswer: true, marks: 4 },
    { _id: ANSWER_B, answerText: 'wrong', isCorrectAnswer: false, marks: 0 },
  ],
});

const QUESTION_IDS = [Q_RIGHT, Q_WRONG, Q_SKIPPED];
const PRACTICE_ID = oid('d1');

// A practice set as it comes out of Mongo: questions are still references, and
// getQuestionByPractice() populates them.
const makePractice = () => ({
  _id: PRACTICE_ID,
  totalTime: 30,
  totalQuestion: QUESTION_IDS.length,
  enableMarks: true,
  isMarksLevel: false,
  isShowAttempt: true,
  autoEvaluation: true,
  sectionTimeLimit: false,
  sections: [],
  questions: QUESTION_IDS.map((id, order) => ({
    question: id,
    order,
    createdAt: new Date(2024, 0, order + 1),
    section: null,
  })),
});

const populateQuestions = (practice: any) => ({
  ...practice,
  questions: practice.questions.map((qp: any) => ({ ...qp, question: question(qp.question) })),
});

/** What the client posts to /attempt/finish for one answered question. */
const answered = (questionId: Types.ObjectId, chosen: Types.ObjectId) => ({
  question: questionId.toString(),
  answers: [{ answerId: chosen.toString() }],
  timeEslapse: 20000,
});

function buildProcessor() {
  // handleNewAttempt is where persistence starts; capture the graded attempt instead.
  const saved: { attempt?: any } = {};

  // Only the first four dependencies take part in grading; the rest are reached
  // through handleNewAttempt, which is stubbed below.
  const processor: AttemptProcessor = new (AttemptProcessor as any)(
    {
      setInstanceKey: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ _id: oid('e1'), user: oid('e2') }),
      populate: jest.fn(async (doc: any) => ({ ...doc, user: { _id: oid('e2'), provider: null } })),
    } as any,
    { getSettingAsync: jest.fn().mockResolvedValue({ features: {}, ssoConfig: [] }) } as any,
    {
      setInstanceKey: jest.fn(),
      findById: jest.fn(async () => makePractice()),
      populate: jest.fn(async (doc: any) => doc),
    } as any,
    { setInstanceKey: jest.fn(), populate: jest.fn(async (doc: any) => populateQuestions(doc)) } as any,
    ...Array(11).fill({}),
  );

  jest.spyOn(processor as any, 'handleNewAttempt').mockImplementation(async (...args: any[]) => {
    saved.attempt = args[2];
    return saved.attempt;
  });

  return { processor, saved };
}

const finish = async (answersOfUser: any[], order: Types.ObjectId[] = QUESTION_IDS) => {
  const { processor } = buildProcessor();
  return processor.process('staging', oid('e1').toString(), {
    answersOfUser,
    practiceId: PRACTICE_ID.toString(),
    questionOrder: order.map((id) => id.toString()),
  });
};

const answerFor = (attempt: any, questionId: Types.ObjectId) =>
  attempt.QA.find((qa: any) => qa.question.toString() === questionId.toString());

describe('AttemptProcessor.process — grading a submitted attempt', () => {
  it('marks the right option correct and the wrong one incorrect', async () => {
    const attempt: any = await finish([
      answered(Q_RIGHT, ANSWER_A),
      answered(Q_WRONG, ANSWER_B),
    ]);

    expect(answerFor(attempt, Q_RIGHT).status).toBe(Constants.CORRECT);
    expect(answerFor(attempt, Q_WRONG).status).toBe(Constants.INCORRECT);
  });

  it('counts an unanswered question as missed rather than wrong', async () => {
    const attempt: any = await finish([answered(Q_RIGHT, ANSWER_A)]);

    expect(answerFor(attempt, Q_SKIPPED).status).toBe(Constants.MISSED);
    expect(answerFor(attempt, Q_SKIPPED).obtainMarks).toBe(0);
    expect(attempt.totalMissed).toBe(2);
    expect(attempt.totalErrors).toBe(0);
  });

  it('awards the question mark for a correct answer and the penalty for a wrong one', async () => {
    const attempt: any = await finish([
      answered(Q_RIGHT, ANSWER_A),
      answered(Q_WRONG, ANSWER_B),
    ]);

    expect(answerFor(attempt, Q_RIGHT).obtainMarks).toBe(4);
    expect(answerFor(attempt, Q_WRONG).obtainMarks).toBe(-1);
    expect(attempt.plusMark).toBe(4);
    expect(attempt.minusMark).toBe(-1);
  });

  it('totals corrects, errors and missed over the whole test', async () => {
    const attempt: any = await finish([
      answered(Q_RIGHT, ANSWER_A),
      answered(Q_WRONG, ANSWER_B),
    ]);

    expect(attempt.totalQuestions).toBe(3);
    expect(attempt.totalCorrects).toBe(1);
    expect(attempt.totalErrors).toBe(1);
    expect(attempt.totalMissed).toBe(1);
    expect(attempt.pending).toBe(0);
    expect(attempt.isEvaluated).toBe(true);
  });

  it('records the subject, unit and topic the question belongs to', async () => {
    const attempt: any = await finish([answered(Q_RIGHT, ANSWER_A)]);
    const qa = answerFor(attempt, Q_RIGHT);

    expect(qa.subject).toMatchObject({ name: 'Maths' });
    expect(qa.unit).toMatchObject({ name: 'Algebra' });
    expect(qa.topic).toMatchObject({ name: 'Equations' });
  });

  it('adds up the time spent on the questions the student answered', async () => {
    const attempt: any = await finish([
      answered(Q_RIGHT, ANSWER_A),
      answered(Q_WRONG, ANSWER_B),
    ]);

    expect(attempt.totalTime).toBe(40000);
  });

  it('returns the answers in the order the student saw the questions', async () => {
    const shuffled = [Q_SKIPPED, Q_WRONG, Q_RIGHT];
    const attempt: any = await finish([answered(Q_RIGHT, ANSWER_A)], shuffled);

    expect(attempt.QA.map((qa: any) => qa.question.toString())).toEqual(
      shuffled.map((id) => id.toString()),
    );
  });

  // The gRPC contract (QuestionDataDto) sends the chosen options as plain id strings
  const answeredById = (questionId: Types.ObjectId, ...chosen: Types.ObjectId[]) => ({
    question: questionId.toString(),
    answers: chosen.map((id) => id.toString()),
    timeEslapse: 20000,
  });

  it('grades answers sent as id strings, as they arrive over gRPC', async () => {
    const attempt: any = await finish([
      answeredById(Q_RIGHT, ANSWER_A),
      answeredById(Q_WRONG, ANSWER_B),
    ]);

    expect(answerFor(attempt, Q_RIGHT).status).toBe(Constants.CORRECT);
    expect(answerFor(attempt, Q_WRONG).status).toBe(Constants.INCORRECT);
    expect(attempt.plusMark).toBe(4);
    expect(attempt.minusMark).toBe(-1);
  });

  it('keeps the questions the student marked for review', async () => {
    const attempt: any = await finish([
      { ...answeredById(Q_RIGHT, ANSWER_A), hasMarked: true },
      answeredById(Q_WRONG, ANSWER_B),
      { question: Q_SKIPPED.toString(), answers: [], timeEslapse: 0, hasMarked: true },
    ]);

    expect(answerFor(attempt, Q_RIGHT).hasMarked).toBe(true);
    expect(answerFor(attempt, Q_WRONG).hasMarked).toBe(false);
    expect(answerFor(attempt, Q_SKIPPED).hasMarked).toBe(true);
    expect(attempt.totalMarkeds).toBe(2);
  });

  it('marks the graded attempt as no longer ongoing, so it cannot be resumed', async () => {
    const attempt: any = await finish([answered(Q_RIGHT, ANSWER_A)]);
    expect(attempt.ongoing).toBe(false);
  });

  it('scores an empty submission as all missed instead of failing', async () => {
    const attempt: any = await finish([]);

    expect(attempt.totalMissed).toBe(3);
    expect(attempt.totalCorrects).toBe(0);
    expect(attempt.plusMark).toBe(0);
  });
});

describe('AttemptProcessor.createAttemptAndAttemptDetails — subject, unit and topic totals', () => {
  it('adds up marks for the subject the same way as for its units and topics', async () => {
    const saved: any[] = [];
    const processor: AttemptProcessor = new (AttemptProcessor as any)(
      {
        setInstanceKey: jest.fn(),
        findOneAndUpdate: jest.fn(async (_filter: any, update: any) => { saved.push(update); return { ...update, _id: update._id }; }),
      },
      {},
      { setInstanceKey: jest.fn(), findOne: jest.fn().mockResolvedValue(null) },
      ...Array(12).fill({}),
    );
    const place = { subject: { _id: oid('c1'), name: 'Maths' }, unit: { _id: oid('c2'), name: 'Algebra' }, topic: { _id: oid('c3'), name: 'Equations' } };

    await processor.createAttemptAndAttemptDetails('staging', {
      _id: oid('e1'),
      practiceSetInfo: { accessMode: 'public' },
      plusMark: 4,
      minusMark: -1,
      QA: [
        { ...place, status: Constants.CORRECT, obtainMarks: 4, actualMarks: 4, timeEslapse: 1000 },
        { ...place, status: Constants.INCORRECT, obtainMarks: -1, actualMarks: 4, timeEslapse: 3000 },
      ],
    });

    const [subject] = saved[0].subjects;
    const [unit] = subject.units;
    const [topic] = unit.topics;
    for (const level of [subject, unit, topic]) {
      expect(level.mark).toBe(3);
      expect(level.maxMarks).toBe(8);
      expect(level.accuracy).toBeCloseTo(3 / 8);
    }
    expect(saved[0].totalMark).toBe(3);
  });
});
