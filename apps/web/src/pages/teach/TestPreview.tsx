import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { TestWithQuestions } from '../../api/types';
import { Page } from '../../components/Layout';
import { buttonClass, ErrorNote, Spinner } from '../../components/ui';
import { marks, plural } from '../../lib/format';
import { QuestionView } from '../TakeTest';

// The test as a student will see it: the questions and options without the answer key. Choices
// made here are not saved anywhere.
export function TestPreview() {
  const { testId = '' } = useParams();
  // staff get the test whatever its status (a draft too), still without the answers
  const test = useQuery({
    queryKey: ['teacher', 'preview', testId],
    queryFn: () => api<TestWithQuestions>('GET', `/assessment/findOneWithQuestions/${testId}`),
  });
  const [chosen, setChosen] = useState<Record<string, string[]>>({});

  if (test.isPending) return <Page><Spinner label="Loading the preview" /></Page>;
  if (test.isError) {
    return <Page><ErrorNote message={test.error.message} action={<Link to={`/teach/tests/${testId}`} className={buttonClass('secondary')}>Back to the test</Link>} /></Page>;
  }
  const t = test.data;
  const minus = Math.abs(t.minusMark ?? 0);

  const choose = (questionId: string, optionId: string, multiple: boolean) =>
    setChosen((c) => {
      const now = c[questionId] ?? [];
      const next = multiple ? (now.includes(optionId) ? now.filter((o) => o !== optionId) : [...now, optionId]) : [optionId];
      return { ...c, [questionId]: next };
    });

  return (
    <Page>
      <Link to={`/teach/tests/${testId}`} className="text-sm font-semibold text-graphite-soft hover:text-graphite">Back to the test</Link>
      <p className="mt-6 text-sm font-semibold text-form">Preview · as a student sees it</p>
      <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight">{t.title}</h1>
      <p className="mt-2 text-graphite-soft">
        {plural(t.questions.length, 'question')} · {t.totalTime} min · {minus ? `+${marks(t.plusMark ?? 1)} / −${marks(minus)}` : `+${marks(t.plusMark ?? 1)} each`}.
        {' '}Nothing you choose here is saved.
      </p>
      {t.instructions && <p className="mt-4 max-w-prose font-serif text-[17px] leading-[1.7]">{t.instructions}</p>}

      <ol className="mt-10 space-y-14">
        {t.questions.map((q, i) => (
          <li key={q._id}>
            <QuestionView
              question={q}
              number={i + 1}
              total={t.questions.length}
              headingLevel={2}
              chosen={chosen[q._id] ?? []}
              onChoose={(optionId) => choose(q._id, optionId, q.questionType === 'multiple')}
              onClear={() => setChosen((c) => ({ ...c, [q._id]: [] }))}
            />
          </li>
        ))}
      </ol>
    </Page>
  );
}
