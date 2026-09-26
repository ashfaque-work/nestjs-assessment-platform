// Writing and running tests: questions, copies, order, delete, withdraw, published settings,
// results and who may read them, the preview
import { call, db, login, ObjectId, SEED } from '../lib.mjs';

export const name = 'Teaching';

export async function run({ check }) {
  const stamp = Date.now();
  const [teacher, student, admin, operator] = await Promise.all(['teacher', 'student', 'admin', 'operator'].map((u) => login(`${u}@example.com`, SEED.password)));
  const other = `other-${stamp}@example.com`;
  await call('POST', '/auth/users', { name: 'Other Teacher', userId: other, email: other, password: 'Visitor123!', userRoles: ['teacher'] });
  const otherTeacher = await login(other, 'Visitor123!');
  const questionsOf = async (testId) => (await call('GET', `/question/getByPractice/${testId}`, undefined, teacher)).data?.response ?? [];

  // editing a question keeps its options (answerNumber 2 used to cut them to two)
  const [q1] = (await questionsOf(SEED.draftId)).filter((q) => q._id === SEED.questions[0]);
  const kept = q1.answers.filter((_, i) => i !== 1); // remove B
  const edited = [...kept.map((a, i) => ({ _id: a._id, answerText: a.answerText, isCorrectAnswer: i === 2 })), { answerText: '11', isCorrectAnswer: false }];
  const save = await call('PUT', `/question/${q1._id}`, { questionText: q1.questionText, category: 'mcq', questionType: 'single', subject: q1.subject, unit: q1.unit, topic: q1.topic, answers: edited }, teacher);
  const after = (await questionsOf(SEED.draftId)).find((q) => q._id === q1._id);
  check('editing a question keeps every option sent, with their ids, and adds the new one', save.status === 200 && after.answers.length === 4
    && kept.every((k) => after.answers.some((a) => a._id === k._id && a.answerText === k.answerText)) && !after.answers.some((a) => a._id === q1.answers[1]._id), after?.answers);
  check('...with exactly the one correct answer marked', after.answers.filter((a) => a.isCorrectAnswer).length === 1);
  const multi = await call('PUT', `/question/${q1._id}`, { questionText: 'Pick every even one', category: 'mcq', questionType: 'multiple', subject: q1.subject, unit: q1.unit, topic: q1.topic,
    answers: after.answers.map((a, i) => ({ _id: a._id, answerText: a.answerText, isCorrectAnswer: i < 2 })) }, teacher);
  const multiQ = (await questionsOf(SEED.draftId)).find((q) => q._id === q1._id);
  check('a question can have several correct answers', multi.status === 200 && multiQ.questionType === 'multiple' && multiQ.answers.filter((a) => a.isCorrectAnswer).length === 2, multiQ);

  // copies
  check('a student cannot copy a test (and so read its answers)', (await call('PUT', `/assessment/saveAs/${SEED.testId}`, { title: `x ${stamp}` }, student)).status === 403);
  const copy = await call('PUT', `/assessment/saveAs/${SEED.testId}`, { title: `Addition quiz (copy ${stamp})` }, teacher);
  const copyId = copy.data?.response?._id;
  const original = await questionsOf(SEED.testId);
  const copied = await questionsOf(copyId);
  check('the author copies a test into a draft with its own questions', copy.status === 200 && copy.data.response.status === 'draft'
    && copied.length === original.length && copied.every((q) => !original.some((o) => o._id === q._id)), { status: copy.status });
  const c0 = copied[0];
  await call('PUT', `/question/${c0._id}`, { questionText: 'Changed in the copy', category: 'mcq', questionType: 'single', subject: c0.subject, unit: c0.unit, topic: c0.topic, answers: c0.answers }, teacher);
  check("editing the copy's question leaves the original alone", !(await questionsOf(SEED.testId)).some((q) => q.questionText === 'Changed in the copy'));

  // order
  const lastQ = copied[copied.length - 1];
  const move = await call('PUT', `/assessment/${copyId}/questionOrder`, { question: lastQ._id, order: 1 }, teacher);
  const reordered = (await questionsOf(copyId)).sort((a, b) => a.order - b.order);
  check('the author moves a question to the top of a draft', move.status === 200 && reordered[0]._id === lastQ._id, reordered.map((q) => q._id));
  check('a published test cannot be reordered', (await call('PUT', `/assessment/${SEED.testId}/questionOrder`, { question: SEED.questions[1], order: 1 }, teacher)).status === 400);
  check("another teacher cannot reorder someone's draft", (await call('PUT', `/assessment/${copyId}/questionOrder`, { question: lastQ._id, order: 2 }, otherTeacher)).status === 403);

  // the preview: staff see a draft as a student would, without the answer key
  const preview = await call('GET', `/assessment/findOneWithQuestions/${copyId}`, undefined, teacher);
  check('the author previews a draft without the answer key', preview.status === 200 && preview.data.questions?.length === copied.length
    && preview.data.questions.every((q) => q.answers.every((a) => a.isCorrectAnswer === undefined)), preview.status);

  // delete
  const del = await call('DELETE', `/assessment/${copyId}`, undefined, teacher);
  const gone = await (await db()).collection('practicesets').findOne({ _id: new ObjectId(copyId) });
  check('the author deletes a draft', del.status === 200 && gone?.active === false, { status: del.status, active: gone?.active });

  // questions of a published test stay; drafts can lose one
  check('a question cannot be removed from a published test', (await call('POST', '/assessment/removeQuestion', { practice: SEED.testId, question: SEED.questions[0] }, teacher)).status === 400);
  check('a question can be removed from a draft', (await call('POST', '/assessment/removeQuestion', { practice: SEED.draftId, question: SEED.questions[2] }, teacher)).status === 201);

  // routes after PUT /assessment/:id are reached
  const share = await call('PUT', '/assessment/shareLink', {}, teacher);
  check('PUT /assessment/shareLink reaches its own handler', !share.text.includes("Invalid ObjectId for parameter 'id'"), share);

  // published settings: time, schedule, attempts change; marks do not
  const full = (await call('GET', `/assessment/${SEED.testId}`, undefined, teacher)).data;
  const opensOn = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const upd = await call('PUT', `/assessment/${SEED.testId}`, { ...full, totalTime: 15, attemptAllowed: 2, opensOn }, teacher);
  const reread = (await call('GET', `/assessment/${SEED.testId}`, undefined, teacher)).data;
  check('a published test takes a new time, attempt limit and opening date', upd.status === 200 && reread.totalTime === 15 && reread.attemptAllowed === 2 && !!reread.opensOn, { status: upd.status, reread });
  await (await db()).collection('practicesets').updateOne({ _id: new ObjectId(SEED.testId) }, { $set: { opensOn: null, attemptAllowed: 0, plusMark: 0.5 } });
  check('fractional marks come back as they are (not rounded to a whole number)', (await call('GET', `/assessment/${SEED.testId}`, undefined, teacher)).data.plusMark === 0.5);
  await (await db()).collection('practicesets').updateOne({ _id: new ObjectId(SEED.testId) }, { $set: { plusMark: 1 } });

  // results: who may read them, what they carry
  const started = await call('POST', '/attempt/start', { testId: SEED.testId }, student);
  const results = await call('GET', `/attempt/results/${SEED.testId}`, undefined, teacher);
  check('results have no NaN for an unfinished attempt, and carry each attempt id', results.status === 200 && !results.text.includes('NaN')
    && (results.data.result ?? []).some((r) => r._id === started.data.attempt), results.status);
  check("another teacher gets neither the answer key nor the results",
    (await call('GET', `/question/getByPractice/${SEED.testId}`, undefined, otherTeacher)).status === 403 && (await call('GET', `/attempt/results/${SEED.testId}`, undefined, otherTeacher)).status === 403);
  check('admin and operator get both', (await call('GET', `/attempt/results/${SEED.testId}`, undefined, admin)).status === 200
    && (await call('GET', `/question/getByPractice/${SEED.testId}`, undefined, operator)).status === 200);

  // withdraw
  const withdraw = await call('PUT', `/assessment/${SEED.testId}`, { ...full, status: 'revoked' }, teacher);
  check('the author withdraws a published test', withdraw.status === 200 && withdraw.data?.response?.status === 'revoked', withdraw);
  check('a withdrawn test cannot be started', (await call('POST', '/attempt/start', { testId: SEED.testId }, student)).status === 403);
}
