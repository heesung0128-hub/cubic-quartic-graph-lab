import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Eye, EyeOff, LineChart, PartyPopper, Trophy } from 'lucide-react'
import GraphCanvas from '../components/GraphCanvas'
import { COLORS, dot, drawGrid, hLine, label, plotFn, type View, type Tf } from '../utils/draw'
import { clamp, useWindowSize } from '../utils/hooks'
import {
  countRealRoots,
  evalPoly,
  extrema,
  fmt,
  formatPoly,
  fromRoots,
  integrate,
  solveEqualsK,
  type Coeffs,
} from '../utils/math'

interface Level {
  coeffs: Coeffs
  target: number
  startK: number
  yMin: number
  yMax: number
  hint: string
}

const X3 = [1, 0, -3, 0]
const X4 = [1, 0, -2, 0, 0]
const ASYM = integrate(fromRoots(1, [-2, 0.5, 2]))

const LEVELS: Level[] = [
  { coeffs: X3, target: 3, startK: 3, yMin: -4, yMax: 4, hint: '극댓값과 극솟값 사이에 직선을 놓아 보세요.' },
  { coeffs: X3, target: 1, startK: 0, yMin: -4, yMax: 4, hint: '극댓값보다 크거나 극솟값보다 작은 k를 고르세요.' },
  { coeffs: X3, target: 2, startK: 0, yMin: -4, yMax: 4, hint: '직선이 극값에서 접할 때 교점은 몇 개일까요?' },
  { coeffs: X4, target: 4, startK: 1, yMin: -3, yMax: 3, hint: '극솟값(−1)과 극댓값(0) 사이입니다.' },
  { coeffs: X4, target: 3, startK: -0.5, yMin: -3, yMax: 3, hint: '직선이 극대점을 지날 때를 생각해 보세요.' },
  { coeffs: X4, target: 2, startK: -0.5, yMin: -3, yMax: 3, hint: '답이 두 가지 이상 존재할 수 있어요!' },
  { coeffs: X4, target: 0, startK: 0, yMin: -3, yMax: 3, hint: '곡선의 최솟값보다 아래에 직선을 놓으세요.' },
  { coeffs: ASYM, target: 4, startK: -5, yMin: -8, yMax: 4, hint: '두 극솟값 중 더 큰 값보다 크고 극댓값보다 작아야 해요.' },
]

interface RangeRow {
  label: string
  count: number
}

/** 극값을 경계로 k의 범위를 나누고, 범위마다 f(x)=k 의 실근 개수를 구한다. */
function rangeRows(f: Coeffs): RangeRow[] {
  const vs = [...new Set(extrema(f).map((e) => Math.round(e.y * 1e6) / 1e6))].sort((a, b) => a - b)
  if (vs.length === 0) return []
  const rows: RangeRow[] = [{ label: `k < ${fmt(vs[0])}`, count: countRealRoots(f, vs[0] - 1) }]
  vs.forEach((v, i) => {
    rows.push({ label: `k = ${fmt(v)}`, count: countRealRoots(f, v) })
    if (i < vs.length - 1) {
      rows.push({ label: `${fmt(v)} < k < ${fmt(vs[i + 1])}`, count: countRealRoots(f, (v + vs[i + 1]) / 2) })
    }
  })
  const last = vs[vs.length - 1]
  rows.push({ label: `k > ${fmt(last)}`, count: countRealRoots(f, last + 1) })
  return rows
}

const CONFETTI =Array.from({ length: 36 }, (_, i) => ({
  left: (i * 97) % 100,
  delay: ((i * 53) % 60) / 100,
  color: ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'][i % 5],
  size: 6 + ((i * 7) % 7),
}))

interface Props {
  /** 연동 모드(모드 1)에서 같은 함수를 열어 극값을 살펴본다 */
  onOpenViz?: (f: Coeffs) => void
}

export default function ParameterGame({ onOpenViz }: Props) {
  const [idx, setIdx] = useState(0)
  const level = LEVELS[idx]
  const [k, setK] = useState(level.startK)
  const [solved, setSolved] = useState<Set<number>>(new Set())
  const [celebrate, setCelebrate] = useState(false)
  const [showExt, setShowExt] = useState(false)
  const { h } = useWindowSize()
  const chartH = Math.round(clamp(h * 0.46, 220, 380))
  const timer = useRef<number | undefined>(undefined)

  const roots = useMemo(() => solveEqualsK(level.coeffs, k), [level, k])
  const count = roots.length
  const success = count === level.target
  const isSolved = solved.has(idx)
  const ext = useMemo(() => extrema(level.coeffs), [level])
  const rows = useMemo(() => rangeRows(level.coeffs), [level])
  const answers = rows.filter((r) => r.count === level.target)
  const view: View = useMemo(
    () => ({ xmin: -3.5, xmax: 3.5, ymin: level.yMin, ymax: level.yMax }),
    [level],
  )

  useEffect(() => {
    if (success && !solved.has(idx)) {
      setSolved((s) => new Set(s).add(idx))
      setCelebrate(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCelebrate(false), 2200)
    }
  }, [success, idx, solved])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const go = (i: number) => {
    setIdx(i)
    setK(LEVELS[i].startK)
    setCelebrate(false)
    setShowExt(false)
  }

  const draw = (ctx: CanvasRenderingContext2D, tf: Tf) => {
    drawGrid(ctx, tf)
    const color = success ? COLORS.green : COLORS.neg
    if (showExt || isSolved) {
      ext.forEach((e) => {
        hLine(ctx, tf, e.y, '#f59e0b', [6, 5], 1.5)
        label(ctx, (e.type === 'max' ? '극댓값 ' : '극솟값 ') + fmt(e.y), 8, tf.Y(e.y) - 6, '#b45309', 'left', '700 12px system-ui')
      })
    }
    hLine(ctx, tf, k, color, [], 2.5)
    plotFn(ctx, tf, (x) => evalPoly(level.coeffs, x), COLORS.curve, 3)
    roots.forEach((r) => {
      ctx.save()
      ctx.beginPath()
      ctx.arc(tf.X(r), tf.Y(k), 13, 0, Math.PI * 2)
      ctx.fillStyle = success ? 'rgba(22,163,74,0.2)' : 'rgba(245,158,11,0.25)'
      ctx.fill()
      ctx.restore()
      dot(ctx, tf, r, k, 6.5, success ? COLORS.green : COLORS.amber)
    })
    label(ctx, `y = k = ${fmt(k, 1)}`, tf.w - 8, Math.max(14, Math.min(tf.h - 6, tf.Y(k) - 8)), color, 'right', '700 13px system-ui')
    label(ctx, 'y = f(x)', 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  const done = solved.size === LEVELS.length

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] md:gap-4">
      <section className="relative space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
            미션 {idx + 1} / {LEVELS.length}
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-slate-800">
            방정식 f(x) = k 가 서로 다른 <span className="text-indigo-600">{level.target}개</span>의 실근을 갖도록 k를 조절하세요.
          </h2>
          <p className="mt-1 font-mono text-sm text-slate-500">f(x) = {formatPoly(level.coeffs)}</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <GraphCanvas view={view} height={chartH} draw={draw} ariaLabel="f(x)와 직선 y=k" />
          {celebrate && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              {CONFETTI.map((c, i) => (
                <span
                  key={i}
                  className="absolute top-0 rounded-sm"
                  style={{
                    left: `${c.left}%`,
                    width: c.size,
                    height: c.size * 1.6,
                    background: c.color,
                    animation: `confetti-fall 1.8s ${c.delay}s ease-in forwards`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-8 text-lg font-bold italic text-slate-700">k</span>
            <input
              type="range"
              min={level.yMin}
              max={level.yMax}
              step={0.1}
              value={k}
              onChange={(e) => setK(Math.round(parseFloat(e.target.value) * 10) / 10)}
              className="min-w-0 flex-1"
              aria-label="k 값"
            />
            <input
              type="number"
              step={0.1}
              value={k}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (Number.isFinite(v)) setK(Math.max(level.yMin, Math.min(level.yMax, v)))
              }}
              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums"
              aria-label="k 직접 입력"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">힌트: {level.hint}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setShowExt((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100"
            >
              {showExt || isSolved ? <EyeOff size={15} /> : <Eye size={15} />}
              극값 {showExt || isSolved ? '숨기기' : '보기'}
            </button>
            {onOpenViz && (
              <button
                onClick={() => onOpenViz(level.coeffs)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <LineChart size={15} /> 도함수·증감표로 살펴보기
              </button>
            )}
          </div>
        </div>
      </section>

      <aside className="space-y-3">
        <div
          className={`rounded-xl border-2 p-5 text-center shadow-sm transition-colors ${
            success ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-xs font-semibold text-slate-500">현재 교점의 개수</p>
          <p className={`text-6xl font-black tabular-nums ${success ? 'text-green-600' : 'text-amber-500'}`}>{count}</p>
          <p className="text-sm text-slate-500">목표 {level.target}개</p>
          {success ? (
            <p className="animate-pop-in mt-3 inline-flex items-center gap-1.5 text-base font-extrabold text-green-700">
              <PartyPopper size={20} /> 미션 성공!
            </p>
          ) : (
            <p className="mt-3 text-sm font-semibold text-slate-400">
              {count < level.target ? '교점이 더 필요해요' : '교점이 너무 많아요'}
            </p>
          )}
          {roots.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">x = {roots.map((r) => fmt(r)).join(', ')}</p>
          )}
        </div>

        <button
          onClick={() => go(idx + 1)}
          disabled={!isSolved || idx === LEVELS.length - 1}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          다음 문제 <ArrowRight size={18} />
        </button>

        {isSolved && rows.length > 0 && (
          <div className="animate-pop-in rounded-xl border border-green-300 bg-green-50 p-4 shadow-sm">
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-extrabold text-green-800">
              <BookOpen size={16} /> 왜 그럴까?
            </h3>
            <p className="text-xs leading-relaxed text-slate-700">
              직선 y = k 가 곡선과 만나는 점의 개수는 k가 <b>극값</b>({ext.map((e) => fmt(e.y)).join(', ')})을 지나갈 때마다 바뀝니다.
            </p>
            <table className="mt-2 w-full border-collapse text-sm">
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.count === level.target ? 'bg-green-200 font-bold text-green-900' : 'bg-white text-slate-700'}>
                    <td className="border border-slate-300 px-2 py-1">{r.label}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">{r.count}개</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-sm font-bold text-green-800">
              ⇒ 실근이 {level.target}개가 되는 k : {answers.map((r) => r.label).join(' 또는 ')}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700">
            <Trophy size={15} className="text-amber-500" /> 진행 상황
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`h-11 w-11 rounded-lg text-sm font-bold ${
                  i === idx
                    ? 'bg-indigo-600 text-white'
                    : solved.has(i)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {done && <p className="mt-3 text-sm font-bold text-green-600">🎉 모든 미션을 완료했어요!</p>}
        </div>
      </aside>
    </div>
  )
}
