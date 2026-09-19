import { hideAnswerKey } from './question.bus';

// What a student receives for each question while taking a test must not reveal the answer.
describe('hideAnswerKey', () => {
  const mcq = () => ({
    category: 'mcq',
    questionText: 'Solve for x: 3x + 9 = 24',
    answers: [
      { _id: 'a1', answerText: '3', isCorrectAnswer: false, marks: 0, score: 0, correctMatch: '' },
      { _id: 'a2', answerText: '5', isCorrectAnswer: true, marks: 1, score: 0, correctMatch: '' },
    ],
  });

  it('removes which option is correct, and the marks that would show it', () => {
    const q: any = hideAnswerKey(mcq());
    for (const a of q.answers) {
      expect(a).not.toHaveProperty('isCorrectAnswer');
      expect(a).not.toHaveProperty('marks');
      expect(a).not.toHaveProperty('score');
    }
  });

  it('keeps what the student needs to answer', () => {
    const q: any = hideAnswerKey(mcq());
    expect(q.questionText).toBe('Solve for x: 3x + 9 = 24');
    expect(q.answers.map((a: any) => [a._id, a.answerText])).toEqual([['a1', '3'], ['a2', '5']]);
  });

  it('removes the expected text of a fill-in-the-blank answer', () => {
    const q: any = hideAnswerKey({ category: 'fib', answers: [{ _id: 'b1', answerText: 'photosynthesis', answerTextArray: ['photosynthesis'] }] });
    expect(q.answers[0]).toEqual({ _id: 'b1' });
  });

  it('keeps the match options but not which item each one belongs to', () => {
    const answers = Array.from({ length: 8 }, (_, i) => ({ _id: `m${i}`, answerText: `left ${i}`, correctMatch: `right ${i}` }));
    let shuffledAtLeastOnce = false;
    for (let run = 0; run < 20 && !shuffledAtLeastOnce; run++) {
      const q: any = hideAnswerKey({ category: 'mixmatch', answers: answers.map((a) => ({ ...a })) });
      expect(q.answers.map((a: any) => a.correctMatch).sort()).toEqual(answers.map((a) => a.correctMatch).sort());
      shuffledAtLeastOnce = q.answers.some((a: any, i: number) => a.correctMatch !== `right ${i}`);
    }
    expect(shuffledAtLeastOnce).toBe(true);
  });

  it('leaves a question without answers alone', () => {
    expect(hideAnswerKey({ category: 'descriptive' })).toEqual({ category: 'descriptive' });
  });
});
