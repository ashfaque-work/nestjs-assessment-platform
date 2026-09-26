// Taking tests: who may start and hand in an attempt, how it is graded, time limits, schedules,
// attempt limits, invitations
import { call, db, login, ObjectId, SEED } from '../lib.mjs';

export const name = 'Attempts and grading';

export async function run({ check }) {
  const [student, student2, teacher] = await Promise.all(['student', 'student2', 'teacher'].map((u) => login(`${u}@example.com`, SEED.password)));
  const tests = (await db()).collection('practicesets');
  const attempts = (await db()).collection('attempts');
  const setTest = (changes) => tests.updateOne({ _id: new ObjectId(SEED.testId) }, { $set: changes });

  const test = await call('GET', `/assessment/findOneWithQuestions/${SEED.testId}?hasAccessMode=true`, undefined, student);
  check('a student loads a published test without the answer key', test.status === 200 && test.data.questions?.length === 3
    && test.data.questions.every((q) => q.answers.every((a) => a.isCorrectAnswer === undefined)), test.status);
  const q1 = test.data.questions[0];
  const key = (await call('GET', `/question/getByPractice/${SEED.testId}`, undefined, teacher)).data.response;
  const correct = key.find((q) => q._id === q1._id).answers.find((a) => a.isCorrectAnswer)._id;

  const start = await call('POST', '/attempt/start', { testId: SEED.testId }, student);
  const attemptId = start.data.attempt;
  check('a student starts an attempt', start.status === 201 && !!attemptId, start);

  const other = await call('POST', '/attempt/finish', { attemptId, answersOfUser: [], questionOrder: SEED.questions }, student2);
  check('another student cannot hand it in', other.status === 404, other);
  const otherStatus = await call('PUT', `/attempt/updateAbandonStatus/${attemptId}`, {}, student2);
  check("another student cannot change its status", otherStatus.status === 404, otherStatus);

  // only the known question listed, and a different test named: both ignored
  const finish = await call('POST', '/attempt/finish', {
    attemptId, practiceId: SEED.draftId, questionOrder: [q1._id], isAbandoned: false,
    answersOfUser: [{ question: q1._id, answers: [correct], timeEslapse: 5000 }],
  }, student);
  check('the owner hands it in', finish.status === 201, finish);
  const graded = (await call('GET', `/attempt/me/findOne/${attemptId}`, undefined, student)).data.attemptObj;
  check('every question of the test is graded, not only the ones listed', graded?.totalQuestions === 3 && graded?.totalMissed === 2, graded);
  check("it is graded against the attempt's own test", String(graded?.practicesetId) === SEED.testId, graded?.practicesetId);
  check('one call finishes it: it counts in the student\'s results at once', graded?.isAbandoned === false && !graded?.ongoing, graded);

  const again = await call('POST', '/attempt/finish', { attemptId, questionOrder: SEED.questions, answersOfUser: [{ question: q1._id, answers: [correct] }] }, student);
  check('a graded attempt cannot be handed in again', again.status === 400, again);

  const empty = await call('POST', '/attempt/start', { testId: SEED.testId }, student2);
  const emptyFinish = await call('POST', '/attempt/finish', { attemptId: empty.data.attempt, answersOfUser: [], questionOrder: SEED.questions, isAbandoned: false }, student2);
  check('a hand-in with no answers at all is graded, not an error', emptyFinish.status === 201, emptyFinish);

  // the review
  const review = await call('GET', `/question/byAttempt/${attemptId}`, undefined, student);
  check('the student reviews their own answers', review.status === 200 && review.data.response?.length === 3, review.status);
  const peek = await call('GET', `/attempt/getUserResponse/${attemptId}`, undefined, student2);
  check("another student cannot read the responses", peek.status === 404, peek);
  const fb = await call('GET', `/attempt/me/findQuestionFeedback/${attemptId}`, undefined, student2);
  check("another student cannot read the question feedback", fb.status === 404, fb);
  check('staff can read the question feedback', (await call('GET', `/attempt/me/findQuestionFeedback/${attemptId}`, undefined, teacher)).status === 200);

  // what can be started
  const draft = await call('POST', '/attempt/start', { testId: SEED.draftId }, student);
  check('a student cannot start a draft', draft.status === 403, draft);
  const draftLoad = await call('GET', `/assessment/findOneWithQuestions/${SEED.draftId}`, undefined, student);
  check('a student cannot load a draft by leaving out hasAccessMode', draftLoad.status >= 400, draftLoad.status);
  check('the author can try their own draft', (await call('POST', '/attempt/start', { testId: SEED.draftId }, teacher)).status === 201);

  await setTest({ expiresOn: new Date(Date.now() - 86_400_000) });
  const closed = await call('POST', '/attempt/start', { testId: SEED.testId }, student);
  check('a closed test cannot be started', closed.status === 403 && /expired/i.test(closed.text), closed);
  await setTest({ expiresOn: null, opensOn: new Date(Date.now() + 86_400_000) });
  const early = await call('POST', '/attempt/start', { testId: SEED.testId }, student);
  check('a test cannot be started before it opens', early.status === 403 && /opens on/i.test(early.text), early);
  const list = (await call('GET', '/student/tests?limit=50', undefined, student)).data.results ?? [];
  check('...but it is listed with its opening time', list.some((t) => t._id === SEED.testId && t.opensOn), list.map((t) => [t._id, t.opensOn]));
  // student2 has handed in once already (above): a limit of 2 leaves one more
  await setTest({ opensOn: new Date(Date.now() - 60_000), attemptAllowed: 2 });
  const s2 = await call('POST', '/attempt/start', { testId: SEED.testId }, student2);
  check('a test that has opened can be started', s2.status === 201, s2);
  await call('POST', '/attempt/finish', { attemptId: s2.data.attempt, answersOfUser: [], questionOrder: SEED.questions, isAbandoned: false }, student2);
  const overLimit = await call('POST', '/attempt/start', { testId: SEED.testId }, student2);
  check('the attempt limit stops a third attempt', overLimit.status === 403 && /all 2 attempts/.test(overLimit.text), overLimit);
  await setTest({ attemptAllowed: 0, opensOn: null });

  // invitation only
  await setTest({ accessMode: 'invitation', inviteeEmails: ['student@example.com'] });
  const invitedList = (await call('GET', '/student/tests?limit=50', undefined, student)).data.results ?? [];
  const uninvitedList = (await call('GET', '/student/tests?limit=50', undefined, student2)).data.results ?? [];
  check('an invited student sees an invitation-only test', invitedList.some((t) => t._id === SEED.testId), invitedList.map((t) => t._id));
  check('a student who is not invited does not', !uninvitedList.some((t) => t._id === SEED.testId), uninvitedList.map((t) => t._id));
  check('the invited student can start it', (await call('POST', '/attempt/start', { testId: SEED.testId }, student)).status === 201);
  const uninvited = await call('POST', '/attempt/start', { testId: SEED.testId }, student2);
  check('a student who is not invited cannot', uninvited.status === 403, uninvited);
  check("the list does not carry other students' emails", invitedList.every((t) => !t.inviteeEmails?.length && !t.studentEmails?.length), invitedList[0]);
  await setTest({ accessMode: 'public', inviteeEmails: [] });

  // a late hand-in: graded, flagged, time capped at the limit (10 minutes)
  const late = await call('POST', '/attempt/start', { testId: SEED.testId }, student);
  await attempts.updateOne({ _id: new ObjectId(late.data.attempt) }, { $set: { createdAt: new Date(Date.now() - 40 * 60_000) } });
  const lateFin = await call('POST', '/attempt/finish', { attemptId: late.data.attempt, answersOfUser: [{ question: SEED.questions[0], answers: [], timeEslapse: 99_999_999 }], questionOrder: SEED.questions, isAbandoned: false }, student);
  const lateDoc = await attempts.findOne({ _id: new ObjectId(late.data.attempt) });
  check('a late hand-in is graded and flagged', lateFin.status === 201 && lateDoc.submittedLate === true, lateDoc?.submittedLate);
  check('...with its time capped at the limit', lateDoc.totalTime <= 10 * 60_000, lateDoc.totalTime);
  const onTime = await attempts.findOne({ _id: new ObjectId(attemptId) });
  check('an on-time hand-in is not flagged', onTime.submittedLate === false, onTime.submittedLate);
}
