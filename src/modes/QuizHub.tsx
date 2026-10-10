import { useState } from 'react'
import type { Coeffs } from '../utils/math'
import Quiz from './Quiz'
import TableQuiz from './TableQuiz'

const KINDS = [
  { id: 'shape', label: '극값 · 개형 맞히기' },
  { id: 'table', label: '증감표 채우기' },
] as const

/** 퀴즈 탭: 문제 유형을 고른다. 두 유형 모두 마운트해 두어 풀던 문제가 유지된다. */
export default function QuizHub({ onOpenViz }: { onOpenViz?: (f: Coeffs) => void }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('shape')
  return (
    <div className="space-y-3">
      <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 bg-white text-sm font-bold shadow-sm" role="tablist">
        {KINDS.map((k) => (
          <button
            key={k.id}
            role="tab"
            aria-selected={kind === k.id}
            onClick={() => setKind(k.id)}
            className={`px-4 py-2 ${kind === k.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div hidden={kind !== 'shape'}>
        <Quiz onOpenViz={onOpenViz} />
      </div>
      <div hidden={kind !== 'table'}>
        <TableQuiz onOpenViz={onOpenViz} />
      </div>
    </div>
  )
}
