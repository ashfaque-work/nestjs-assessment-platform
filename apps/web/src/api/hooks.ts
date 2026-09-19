import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Attempt, Me, ReviewQuestion, SubmittedAnswer, TestSummary, TestWithQuestions } from './types';

export function useMe(enabled: boolean) {
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('GET', '/auth/me'), enabled });
}

export function useOpenTests() {
  return useQuery({
    queryKey: ['tests'],
    queryFn: async () => (await api<{ results: TestSummary[] }>('GET', '/student/tests?limit=50')).results,
  });
}

export function useMyAttempts() {
  return useQuery({
    queryKey: ['attempts'],
    queryFn: async () => (await api<{ attempts: Attempt[] }>('GET', '/student/attempts?limit=50')).attempts,
  });
}

// The test with its questions, without the answer key
export function useTest(testId: string) {
  return useQuery({
    queryKey: ['test', testId],
    queryFn: () => api<TestWithQuestions>('GET', `/assessment/findOneWithQuestions/${testId}?hasAccessMode=true`),
    staleTime: Infinity,
  });
}

export function useAttempt(attemptId: string) {
  return useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: async () => (await api<{ attemptObj: Attempt }>('GET', `/attempt/me/findOne/${attemptId}`)).attemptObj,
  });
}

// The attempt's questions with their correct answers and explanations
export function useReview(attemptId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['review', attemptId],
    queryFn: async () => (await api<{ response: ReviewQuestion[] }>('GET', `/question/byAttempt/${attemptId}`)).response ?? [],
    enabled,
    retry: false,
  });
}

export function useStartAttempt() {
  return useMutation({
    mutationFn: async (testId: string) => (await api<{ attempt: string }>('POST', '/attempt/start', { testId })).attempt,
  });
}

export interface FinishInput {
  attemptId: string;
  testId: string;
  answers: SubmittedAnswer[];
  order: string[];
}

// Grades the attempt, then records it as completed so it counts in the student's history
export function useFinishAttempt() {
  return useMutation({
    mutationFn: async ({ attemptId, testId, answers, order }: FinishInput) => {
      await api('POST', '/attempt/finish', {
        attemptId,
        practiceId: testId,
        answersOfUser: answers,
        questionOrder: order,
        isAbandoned: false,
      });
      await api('PUT', `/attempt/updateAbandonStatus/${attemptId}`, {});
    },
  });
}
