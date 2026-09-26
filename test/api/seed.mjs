// Test data for the API suites, with fixed ids so the gateway can be started with
// SIGNUP_INSTITUTE_ID=${SEED.locationId}. Drops and refills the test database.
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { MongoClient, ObjectId } = require('mongodb');

const id = (n) => new ObjectId(n.toString(16).padStart(24, '0'));

export const SEED = {
  password: 'Passw0rd!23',
  locationId: id(0x10).toString(),
  subjectId: id(0x20).toString(),
  unitId: id(0x21).toString(),
  topicId: id(0x22).toString(),
  testId: id(0x30).toString(),
  draftId: id(0x31).toString(),
  questions: [id(0x40), id(0x41), id(0x42)].map(String),
  users: {
    student: id(0x50).toString(),
    student2: id(0x51).toString(),
    teacher: id(0x52).toString(),
    admin: id(0x53).toString(),
    operator: id(0x54).toString(),
  },
  // the account the suites start the gateway with in PROTECTED_ACCOUNTS
  protectedEmail: 'admin@example.com',
};

const hash = (password, salt) => crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 10000, 64, 'sha1').toString('hex');

export async function seed(mongoUrl, dbName) {
  const client = await MongoClient.connect(mongoUrl);
  const db = client.db(dbName);
  await db.dropDatabase();
  const now = new Date();
  const [locationId, subjectId, unitId, topicId] = [SEED.locationId, SEED.subjectId, SEED.unitId, SEED.topicId].map((s) => new ObjectId(s));
  const users = Object.fromEntries(Object.entries(SEED.users).map(([k, v]) => [k, new ObjectId(v)]));
  const questionIds = SEED.questions.map((q) => new ObjectId(q));

  await db.collection('settings').insertOne({
    slug: 'whiteLabel', productName: 'Assess', pageTitle: 'Assess', supportEmail: 'support@example.com', baseUrl: 'http://localhost:5173/',
    countries: [{ code: 'IN', name: 'India', currency: 'INR', default: true }],
    features: {}, ssoConfig: [], isWhiteLabelled: false, identityInfo: { city: true }, roles: { teacher: true, student: true }, signupType: { local: true },
    // must never reach a browser
    facebookAuth: { clientID: 'fb-id', clientSecret: 'FB-SECRET-SHOULD-NOT-LEAK' },
    payment: { ccA: { workingKey: 'CCA-KEY-SHOULD-NOT-LEAK', accessCode: 'AC-SECRET', merchantId: 1 } },
  });

  await db.collection('subjects').insertOne({ _id: subjectId, name: 'Maths', active: true, units: [unitId] });
  await db.collection('units').insertOne({ _id: unitId, name: 'Algebra', subject: subjectId, topics: [topicId], active: true });
  await db.collection('topics').insertOne({ _id: topicId, name: 'Equations', unit: unitId, active: true });
  await db.collection('locations').insertOne({ _id: locationId, name: 'Test school', active: true, subjects: [subjectId], user: users.admin });

  const country = { code: 'IN', name: 'India', currency: 'INR', callingCodes: ['91'], confirmed: true };
  const roles = { student: ['student'], student2: ['student'], teacher: ['teacher'], admin: ['admin'], operator: ['operator'] };
  for (const [key, _id] of Object.entries(users)) {
    const salt = crypto.randomBytes(16).toString('hex');
    await db.collection('users').insertOne({
      _id, name: `Test ${key}`, userId: `${key}@example.com`, email: `${key}@example.com`, roles: roles[key],
      salt, hashedPassword: hash(SEED.password, salt), provider: 'local', isActive: true, emailVerified: true,
      isVerified: true, isMentor: key === 'teacher', subjects: [subjectId], country, activeLocation: locationId, locations: [locationId],
      emailVerifyToken: `VERIFY-TOKEN-${key}`, createdAt: now, updatedAt: now,
    });
  }

  const ref = { subject: { _id: subjectId, name: 'Maths' }, unit: { _id: unitId, name: 'Algebra' }, topic: { _id: topicId, name: 'Equations' } };
  for (const [i, _id] of questionIds.entries()) {
    const n = i + 1;
    await db.collection('questions').insertOne({
      _id, questionText: `What is ${n} + ${n}?`, category: 'mcq', questionType: 'single', complexity: 'moderate',
      // answerNumber 2 on a 4-option question, as the web app used to create them
      plusMark: 1, minusMark: 0, answerNumber: 2, isActive: true, questionTextArray: [], tags: [], coding: [], testcases: [],
      user: users.teacher, practiceSets: [], ...ref,
      answers: [2 * n, 2 * n + 1, 2 * n + 2, 0].map((v, k) => ({ _id: new ObjectId(), answerText: String(v), isCorrectAnswer: k === 0 })),
      answerExplain: `${n} + ${n} = ${2 * n}`, createdAt: now, updatedAt: now,
    });
  }

  const test = (overrides) => ({
    testMode: 'practice', testType: 'standard', accessMode: 'public', user: users.teacher, userInfo: { _id: users.teacher, name: 'Test teacher' },
    totalTime: 10, totalQuestion: 3, plusMark: 1, minusMark: 0, enableMarks: true, isShowAttempt: true, isShowResult: true, autoEvaluation: true,
    subjects: [{ _id: subjectId, name: 'Maths' }], units: [{ _id: unitId, name: 'Algebra' }], instructors: [], inviteeEmails: [], classRooms: [],
    countries: [{ code: 'IN', name: 'India', currency: 'INR', price: 0 }], expiresOn: null, opensOn: null, attemptAllowed: 0, statusChangedAt: now,
    initiator: 'teacher', isAdaptive: false, locations: [locationId], sections: [], active: true,
    questions: questionIds.map((q, order) => ({ question: q, order, createdAt: now, section: null })),
    createdAt: now, updatedAt: now,
    ...overrides,
  });
  await db.collection('practicesets').insertOne(test({ _id: new ObjectId(SEED.testId), title: 'Addition quiz', titleLower: 'addition quiz', status: 'published' }));
  await db.collection('practicesets').insertOne(test({ _id: new ObjectId(SEED.draftId), title: 'Secret draft', titleLower: 'secret draft', status: 'draft' }));
  await client.close();
}
