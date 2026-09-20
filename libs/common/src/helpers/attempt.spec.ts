import { codingAnswerCompare, codingPartialMark, fibAnswerCompare, mixmatchAnswerCompare } from './attempt';

// The compare functions decide whether a fill-in-blank, match-the-following or coding answer is
// right, so a bug here silently mis-scores those question types. The grader passes each side as
// { answerText } / { userText }.
const actual = (answerText: string) => ({ answerText });
const user = (answerText: string) => ({ answerText });

describe('fibAnswerCompare — a number the student typed', () => {
  it('accepts the same value however it is written', () => {
    expect(fibAnswerCompare(actual('5'), user('5'))).toBe(true);
    expect(fibAnswerCompare(actual('5'), user('5.00'))).toBe(true);
    expect(fibAnswerCompare(actual('1000'), user('1,000'))).toBe(true); // thousands separators are ignored
  });

  it('rejects a different value', () => {
    expect(fibAnswerCompare(actual('5'), user('6'))).toBe(false);
  });

  it('accepts a value inside a low_high range and rejects one outside it', () => {
    expect(fibAnswerCompare(actual('10_20'), user('15'))).toBe(true);
    expect(fibAnswerCompare(actual('10_20'), user('10'))).toBe(true);
    expect(fibAnswerCompare(actual('10_20'), user('20'))).toBe(true);
    expect(fibAnswerCompare(actual('10_20'), user('21'))).toBe(false);
  });

  it('accepts any value from a pipe-separated set', () => {
    expect(fibAnswerCompare(actual('3|5|7'), user('5'))).toBe(true);
    expect(fibAnswerCompare(actual('3|5|7'), user('4'))).toBe(false);
  });
});

describe('fibAnswerCompare — text the student typed', () => {
  it('matches ignoring case and surrounding space', () => {
    expect(fibAnswerCompare(actual('Paris'), user('  paris '))).toBe(true);
  });

  it('accepts any of the alternatives separated by ||', () => {
    expect(fibAnswerCompare(actual('colour||color'), user('color'))).toBe(true);
    expect(fibAnswerCompare(actual('colour||color'), user('colour'))).toBe(true);
    expect(fibAnswerCompare(actual('colour||color'), user('couleur'))).toBe(false);
  });

  it('counts an empty answer as wrong, and never throws on bad input', () => {
    expect(fibAnswerCompare(actual('Paris'), user(''))).toBe(false);
    expect(fibAnswerCompare(actual('Paris'), {} as any)).toBe(false);
    expect(fibAnswerCompare({} as any, user('Paris'))).toBe(false);
  });
});

describe('mixmatchAnswerCompare', () => {
  const pair = (answerText: string, correctMatch: string) => ({ answerText, correctMatch });

  it('is right when the student paired the item with its correct match', () => {
    expect(mixmatchAnswerCompare(pair('France', 'Paris'), { userText: 'Paris' })).toBe(true);
  });

  it('is wrong for a different match', () => {
    expect(mixmatchAnswerCompare(pair('France', 'Paris'), { userText: 'Berlin' })).toBe(false);
  });

  it('is wrong (not an error) when the student left it blank', () => {
    expect(mixmatchAnswerCompare(pair('France', 'Paris'), {} as any)).toBe(false);
  });
});

describe('codingAnswerCompare', () => {
  it('accepts output equal to any of the allowed outputs, ignoring surrounding whitespace', () => {
    expect(codingAnswerCompare('42', '42')).toBe(true);
    expect(codingAnswerCompare('yes@@@@@Yes', 'Yes')).toBe(true);
    expect(codingAnswerCompare('42', '  42\n')).toBe(true);
  });

  it('rejects output that matches none of them', () => {
    expect(codingAnswerCompare('yes@@@@@Yes', 'no')).toBe(false);
  });
});

describe('codingPartialMark', () => {
  const test = { enableMarks: true, isMarksLevel: false, plusMark: 8 };
  const question = { plusMark: 4 };

  it('gives no marks when the test does not award marks', () => {
    expect(codingPartialMark({ enableMarks: false }, question, [{ status: true }], 0, 0)).toBe(0);
  });

  it('awards the full question mark when every test case passes', () => {
    const cases = [{ status: true }, { status: true }, { status: true }, { status: true }];
    expect(codingPartialMark(test, question, cases, 0, 0)).toBe(4); // question.plusMark, spread over the cases
  });

  it('awards a share of the mark when only some test cases pass', () => {
    const cases = [{ status: true }, { status: true }, { status: false }, { status: false }];
    expect(codingPartialMark(test, question, cases, 0, 0)).toBe(2); // half the cases → half the mark
  });

  it('uses the test-level mark when marks are set at the test level', () => {
    const cases = [{ status: true }, { status: true }];
    expect(codingPartialMark({ ...test, isMarksLevel: true }, question, cases, 0, 0)).toBe(8); // test.plusMark
  });
});
