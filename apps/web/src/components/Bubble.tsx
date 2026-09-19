// The answer-sheet bubble. One mark, used everywhere: the options of a question, the rows of the
// answer sheet, and the graded sheet on the results page.

export type BubbleState = 'empty' | 'filled' | 'correct' | 'wrong' | 'key';

const styles: Record<BubbleState, string> = {
  // printed in form ink, waiting for pencil
  empty: 'border-form/70 text-form',
  // filled in pencil
  filled: 'border-graphite bg-graphite text-paper',
  // the student's answer, and it was right
  correct: 'border-correct bg-correct text-paper',
  // the student's answer, and it was wrong
  wrong: 'border-wrong bg-wrong text-paper',
  // the right answer the student did not choose: ringed, not filled
  key: 'border-correct text-correct ring-2 ring-correct ring-offset-2 ring-offset-sheet',
};

const sizes = {
  sm: 'size-[18px] text-[10px] border-[1.5px]',
  md: 'size-8 text-sm border-2',
};

export function Bubble({ label, state = 'empty', size = 'md' }: { label: string; state?: BubbleState; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold leading-none transition-colors duration-150 ${sizes[size]} ${styles[state]}`}
    >
      {label}
    </span>
  );
}
