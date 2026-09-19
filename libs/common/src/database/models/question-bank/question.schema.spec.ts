import mongoose from 'mongoose';
import { QuestionSchema } from './question.schema';

// The answer options of a question are told apart by _id: the student's answer is an option id,
// and the grader compares it with the ids of the correct options. The default used to be a
// single ObjectId created when the module loaded, so every option of every question created
// by a running service shared one id and any answer was graded as correct.
describe('question schema ids', () => {
  const Question = mongoose.models.QuestionIdSpec || mongoose.model('QuestionIdSpec', QuestionSchema);

  const make = () =>
    new Question({
      questionText: 'Solve for x: 5x = 35',
      answers: [{ answerText: '5' }, { answerText: '6' }, { answerText: '7', isCorrectAnswer: true }, { answerText: '8' }],
    });

  it('gives every answer option its own id', () => {
    const ids = make().answers.map((a: any) => String(a._id));
    expect(new Set(ids).size).toBe(4);
  });

  it('does not reuse option ids across questions', () => {
    const first = make().answers.map((a: any) => String(a._id));
    const second = make().answers.map((a: any) => String(a._id));
    expect(first.filter((id) => second.includes(id))).toEqual([]);
  });

  it('stamps each question with the time it was made, not the time the service started', async () => {
    const first = make();
    await new Promise((r) => setTimeout(r, 5));
    const second = make();
    expect((second as any).createdAt.getTime()).toBeGreaterThan((first as any).createdAt.getTime());
  });
});
