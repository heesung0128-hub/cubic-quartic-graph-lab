import type { Coeffs } from '../utils/math'
import { formatPoly } from '../utils/math'

interface Props {
  coeffs: Coeffs
  onChange: (c: Coeffs) => void
  /** 차수 전환 (3 또는 4). 생략하면 전환 버튼을 숨긴다. */
  onDegreeChange?: (deg: 3 | 4) => void
}

const NAMES = ['a', 'b', 'c', 'd', 'e']
const RANGES: Record<number, [number, number]> = {
  0: [-3, 3],
  1: [-6, 6],
  2: [-9, 9],
  3: [-10, 10],
  4: [-10, 10],
}

/** 계수 슬라이더 + 숫자 입력 */
export default function CoefficientPanel({ coeffs, onChange, onDegreeChange }: Props) {
  const deg = coeffs.length - 1

  const set = (i: number, v: number) => {
    if (!Number.isFinite(v)) return
    const next = [...coeffs]
    // 최고차항 계수는 0이 될 수 없다
    next[i] = i === 0 && Math.abs(v) < 0.05 ? (coeffs[0] < 0 ? -0.05 : 0.05) : v
    onChange(next)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-700">계수 조절</h3>
        {onDegreeChange && (
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold">
            {([3, 4] as const).map((d) => (
              <button
                key={d}
                onClick={() => onDegreeChange(d)}
                className={`px-3 py-1 ${deg === d ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {d}차
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-800">
        f(x) = {formatPoly(coeffs)}
      </p>
      <div className="space-y-2.5">
        {coeffs.map((c, i) => {
          const [lo, hi] = RANGES[i]
          const power = deg - i
          return (
            <div key={i} className="flex items-center gap-2">
              <label className="w-12 shrink-0 text-xs font-semibold text-slate-600">
                {NAMES[i]}
                <span className="font-normal text-slate-400">{power > 0 ? ` x${power > 1 ? `^${power}` : ''}` : ''}</span>
              </label>
              <input
                type="range"
                min={lo}
                max={hi}
                step={0.05}
                value={Math.min(hi, Math.max(lo, c))}
                onChange={(e) => set(i, parseFloat(e.target.value))}
                className="min-w-0 flex-1"
                aria-label={`계수 ${NAMES[i]}`}
              />
              <input
                type="number"
                step={0.05}
                value={Math.round(c * 1000) / 1000}
                onChange={(e) => set(i, parseFloat(e.target.value))}
                className="w-16 rounded-md border border-slate-300 px-1.5 py-1 text-right text-sm tabular-nums"
                aria-label={`계수 ${NAMES[i]} 값`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
