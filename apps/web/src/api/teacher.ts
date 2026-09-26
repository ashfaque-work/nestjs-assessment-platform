import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { BankQuestion, NamedRef, QuestionDraft, ResultAttempt, TeacherTest, TopicOption, UnitOption } from './types';

// A test needs at least this many questions before it can be published (enforced by the API)
export const MIN_QUESTIONS_TO_PUBLISH = 5;

export function useTeacherTests() {
  return useQuery({
    queryKey: ['teacher', 'tests'],
    queryFn: async () => (await api<{ tests: TeacherTest[] }>('POST', '/assessment/teacher/find', { limit: 100 })).tests ?? [],
  });
}

export function useMySubjects() {
  return useQuery({
    queryKey: ['teacher', 'subjects'],
    queryFn: async () => (await api<{ response: NamedRef[] }>('GET', '/subjects/mine')).response ?? [],
    staleTime: Infinity,
  });
}

export function useUnits(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['teacher', 'units', subjectId],
    queryFn: async () => (await api<{ response: UnitOption[] }>('GET', `/units/bySubject/${subjectId}`)).response ?? [],
    enabled: !!subjectId,
    staleTime: Infinity,
  });
}

export function useTopics(unitId: string | undefined) {
  return useQuery({
    queryKey: ['teacher', 'topics', unitId],
    queryFn: async () => (await api<{ response: TopicOption[] }>('GET', `/topics/byUnit/${unitId}`)).response ?? [],
    enabled: !!unitId,
    staleTime: Infinity,
  });
}

// The full test document: the API's update expects the whole test back
export function useTeacherTest(testId: string) {
  return useQuery({
    queryKey: ['teacher', 'test', testId],
    queryFn: () => api<TeacherTest & Record<string, unknown>>('GET', `/assessment/${testId}`),
  });
}

// The test's questions with their answer key, in the test's order
export function useTestQuestions(testId: string) {
  return useQuery({
    queryKey: ['teacher', 'questions', testId],
    queryFn: async () => {
      const questions = (await api<{ response: BankQuestion[] }>('GET', `/question/getByPractice/${testId}`)).response ?? [];
      return [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
  });
}

export function useTestResults(testId: string) {
  return useQuery({
    queryKey: ['teacher', 'results', testId],
    queryFn: async () => (await api<{ result: ResultAttempt[] }>('GET', `/attempt/results/${testId}`)).result ?? [],
  });
}

export function useCreateTest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; subject: NamedRef; unit: NamedRef }) =>
      (await api<{ response: TeacherTest }>('POST', '/assessment', {
        title: input.title,
        subjects: [input.subject],
        units: [input.unit],
      })).response,
    onSuccess: () => client.invalidateQueries({ queryKey: ['teacher', 'tests'] }),
  });
}

// Saves changes to a test: the API takes the whole test, so changes are merged into the loaded one
export function useSaveTest(testId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ test, changes }: { test: Record<string, unknown>; changes: Record<string, unknown> }) =>
      api('PUT', `/assessment/${testId}`, { ...test, ...changes }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['teacher', 'test', testId] });
      client.invalidateQueries({ queryKey: ['teacher', 'tests'] });
    },
  });
}

export function usePublishTest(testId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (test: Record<string, unknown>) => {
      // the API explains what is missing (too few questions...) before the test changes
      await api('GET', `/assessment/checkQuestionsBeforePublish/${testId}`);
      await api('PUT', `/assessment/${testId}`, { ...test, status: 'published', accessMode: 'public' });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['teacher', 'test', testId] });
      client.invalidateQueries({ queryKey: ['teacher', 'tests'] });
    },
  });
}

// Withdraw a published test: students can no longer start it; results stay
export function useWithdrawTest(testId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (test: Record<string, unknown>) => api('PUT', `/assessment/${testId}`, { ...test, status: 'revoked' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['teacher', 'test', testId] });
      client.invalidateQueries({ queryKey: ['teacher', 'tests'] });
    },
  });
}

// Delete a draft
export function useDeleteTest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) => api('DELETE', `/assessment/${testId}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['teacher', 'tests'] }),
  });
}

// A new draft with the same settings and its own copies of the questions
export function useDuplicateTest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ testId, title }: { testId: string; title: string }) =>
      (await api<{ response: TeacherTest }>('PUT', `/assessment/saveAs/${testId}`, { title })).response,
    onSuccess: () => client.invalidateQueries({ queryKey: ['teacher', 'tests'] }),
  });
}

// Move a question of a draft to a new place (1 = first)
export function useMoveQuestion(testId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, order }: { questionId: string; order: number }) =>
      api('PUT', `/assessment/${testId}/questionOrder`, { question: questionId, order }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['teacher', 'questions', testId] }),
  });
}

// The body POST /question and PUT /question/:id expect
export function questionBody(draft: QuestionDraft, test: TeacherTest) {
  return {
    questionText: draft.questionText.trim(),
    category: 'mcq',
    questionType: draft.multiple ? 'multiple' : 'single',
    complexity: 'moderate',
    subject: test.subjects[0],
    unit: draft.unit,
    topic: draft.topic,
    plusMark: test.plusMark ?? 1,
    // the grader adds minusMark to the score for a wrong answer, so a penalty is negative
    minusMark: -Math.abs(test.minusMark ?? 0),
    answerExplain: draft.answerExplain.trim(),
    // each saved option keeps its own id, so earlier attempts still match the option they chose
    answers: draft.options.map((o) => ({ ...(o._id ? { _id: o._id } : {}), answerText: o.answerText.trim(), isCorrectAnswer: o.isCorrectAnswer })),
  };
}

export function useSaveQuestion(testId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ draft, test, questionId }: { draft: QuestionDraft; test: TeacherTest; questionId?: string }) => {
      const body = questionBody(draft, test);
      if (!questionId) return api('POST', '/question', { ...body, practiceSets: [testId] });
      return api('PUT', `/question/${questionId}`, body);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['teacher', 'questions', testId] });
      client.invalidateQueries({ queryKey: ['teacher', 'test', testId] });
    },
  });
}

export function useRemoveQuestion(testId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => api('POST', '/assessment/removeQuestion', { practice: testId, question: questionId }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['teacher', 'questions', testId] });
      client.invalidateQueries({ queryKey: ['teacher', 'test', testId] });
    },
  });
}

// What is wrong with a question draft, in the order a teacher would fix it; empty when it is ready
export function draftProblems(draft: QuestionDraft): string[] {
  const problems: string[] = [];
  if (!draft.questionText.trim()) problems.push('Write the question.');
  if (!draft.topic) problems.push('Choose the topic it tests.');
  const filled = draft.options.filter((o) => o.answerText.trim());
  if (filled.length < 2) problems.push('Give at least two answer options.');
  if (filled.length !== draft.options.length) problems.push('Fill in or remove the empty option.');
  const correct = draft.options.filter((o) => o.isCorrectAnswer).length;
  if (draft.multiple ? correct < 1 : correct !== 1) problems.push(draft.multiple ? 'Mark at least one correct answer.' : 'Mark the one correct answer.');
  return problems;
}
