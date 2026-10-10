import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, LineChart, Lightbulb, RotateCcw, Send, Trash2, XCircle } from 'lucide-react'
import GraphCanvas from '../components/GraphCanvas'
import SignTable from '../components/SignTable'
import {
  COLORS,
  dot,
  drawGrid,
  fillSign,
  label,
  plotFn,
  focusView,
  vLine,
  type Tf,
  type View,
} from '../utils/draw'
import {
  criticalPoints,
  evalPoly,
  fmt,
  formatPoly,
  fromRoots,
  integrate,
  polyMul,
  type Coeffs,
  type CriticalPoint,
} from '../utils/math'
import { clamp, useWindowSize } from '../utils/hooks'

const XMIN = -5
const XMAX = 5

type Tool = 'max' | 'min'
type Difficulty = 'basic' | 'adv'

interface Marker {
  x: number
  type: Tool
}

interface Problem {
  deriv: Coeffs
  f: Coeffs
  crit: CriticalPoint[]
  options: Coeffs[]
  correct: number
}

const rnd = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** 0.5 간격 격자 위에서 서로 1.5 이상 떨어진 근을 뽑는다. */
function pickRoots(n: number): number[] {
  const pool: number[] = []
  for (let v = -3; v <= 3; v += 0.5) pool.push(v)
  const out: number[] = []
  let guard = 0
  while (out.length < n && guard++ < 200) {
    const c = rnd(pool)
    if (out.every((r) => Math.abs(r - c) >= 1.5)) out.push(c)
  }
  return out.sort((a, b) => a - b)
}

/**
 * 기본: 극값이 반드시 있는 문제 (삼차 2개 / 사차 1~3개)
 * 심화: 중근(극값이 아닌 f′=0)이 섞인 문제도 출제
 */
function randomDeriv(level: Difficulty): Coeffs {
  const sign = rnd([1, -1])
  const scale = rnd([0.5, 1, 1.5])
  const basic = ['c2', 'c2', 'q3', 'q3', 'q1c'] as const
  const adv = ['c2', 'q3', 'q1c', 'c2d', 'q21', 'q21'] as const
  const kind = level === 'basic' ? rnd(basic) : rnd(adv)
  let roots: number[]
  let extra: Coeffs = [1]
  switch (kind) {
    case 'c2': // 삼차함수: 서로 다른 두 근
      roots = pickRoots(2)
      break
    case 'c2d': { // 삼차함수: 중근 (극값 없음)
      const r = rnd([-2, -1, 0, 1, 2])
      roots = [r, r]
      break
    }
    case 'q3': // 사차함수: 서로 다른 세 근
      roots = pickRoots(3)
      break
    case 'q21': { // 사차함수: 중근 + 단근
      const r = pickRoots(2)
      roots = [r[0], r[0], r[1]]
      break
    }
    default: // 사차함수: 단근 하나 + 허근
      roots = pickRoots(1)
      extra = [1, 0, rnd([1, 2, 4])]
  }
  let deriv = fromRoots(sign * scale, roots)
  if (extra.length > 1) deriv = polyMul(deriv, extra)
  return deriv
}

function shapeSig(p: Coeffs): number[] {
  const ys: number[] = []
  for (let i = 0; i <= 40; i++) ys.push(evalPoly(p, XMIN + ((XMAX - XMIN) * i) / 40))
  const lo = Math.min(...ys)
  const hi = Math.max(...ys)
  return ys.map((y) => (y - lo) / (hi - lo || 1))
}

function distinct(a: Coeffs, others: Coeffs[]): boolean {
  const sa = shapeSig(a)
  return others.every((o) => Math.max(...shapeSig(o).map((v, i) => Math.abs(v - sa[i]))) > 0.12)
}

function mirrorX(p: Coeffs): Coeffs {
  const n = p.length - 1
  return p.map((c, i) => ((n - i) % 2 === 1 ? -c : c))
}

function makeProblem(level: Difficulty): Problem {
  const deriv = randomDeriv(level)
  const f = integrate(deriv)
  const crit = criticalPoints(f)
  const options: Coeffs[] = [f]
  for (const cand of [f.map((c) => -c), mirrorX(f), mirrorX(f).map((c) => -c)]) {
    if (distinct(cand, options)) options.push(cand)
  }
  let guard = 0
  while (options.length < 4 && guard++ < 40) {
    const alt = integrate(randomDeriv(level))
    if (alt.length === f.length && distinct(alt, options)) options.push(alt)
  }
  const shuffled = options.map((o, i) => ({ o, i, r: Math.random() })).sort((a, b) => a.r - b.r)
  return {
    deriv,
    f,
    crit,
    options: shuffled.map((s) => s.o),
    correct: shuffled.findIndex((s) => s.i === 0),
  }
}

const snap = (x: number) => clamp(Math.round(x * 2) / 2, -4.5, 4.5)

/** 선택지 그래프의 y범위: 극값을 기준으로 잡아 곡선 끝이 잘려도 개형이 한눈에 보이게 한다. */
function shapeView(f: Coeffs): View {
  const vals = criticalPoints(f).map((c) => c.y)
  const ends = [evalPoly(f, -4), evalPoly(f, 4)]
  const span = Math.max(Math.max(...vals, 0) - Math.min(...vals, 0), (Math.max(...ends) - Math.min(...ends)) / 4, 1e-3)
  const lo = vals.length ? Math.min(...vals) : Math.min(...ends)
  const hi = vals.length ? Math.max(...vals) : Math.max(...ends)
  return { xmin: -4.5, xmax: 4.5, ymin: lo - span * 0.7, ymax: hi + span * 0.7 }
}

interface Result {
  ok: boolean
  lines: { ok: boolean; text: string }[]
}

function grade(p: Problem, markers: Marker[], choice: number | null): Result {
  const lines: Result['lines'] = []
  let ok = true
  const real = p.crit.filter((c) => c.type !== 'flat')

  for (const c of p.crit) {
    const a = fmt(c.x, 1)
    const m = markers.find((k) => Math.abs(k.x - c.x) < 0.26)
    if (c.type === 'flat') {
      const bad = m !== undefined
      if (bad) ok = false
      lines.push({
        ok: !bad,
        text: `x = ${a}에서 f′(x) = 0이지만 f′(x)의 부호가 바뀌지 않으므로 극값이 아닙니다.${bad ? ' (표시한 마커는 잘못되었습니다.)' : ''}`,
      })
      continue
    }
    const expl =
      c.type === 'max'
        ? `x = ${a}에서 f′(x)의 부호가 +에서 −로 변하므로 극댓값입니다. (극댓값 ${fmt(c.y)})`
        : `x = ${a}에서 f′(x)의 부호가 −에서 +로 변하므로 극솟값입니다. (극솟값 ${fmt(c.y)})`
    if (!m) {
      ok = false
      lines.push({ ok: false, text: `${expl} → 마커를 놓지 않았어요.` })
    } else if (m.type !== c.type) {
      ok = false
      lines.push({ ok: false, text: `${expl} → ${m.type === 'max' ? '극대' : '극소'}로 잘못 표시했어요.` })
    } else lines.push({ ok: true, text: expl })
  }

  for (const m of markers) {
    if (!p.crit.some((c) => Math.abs(c.x - m.x) < 0.26)) {
      ok = false
      lines.push({ ok: false, text: `x = ${fmt(m.x, 1)}에서는 f′(x) = 0이 아니므로 극값이 될 수 없습니다.` })
    }
  }
  if (real.length === 0 && markers.length === 0) {
    lines.push({ ok: true, text: 'f′(x)의 부호가 바뀌는 점이 없으므로 극값이 없고, 함수는 한 방향으로만 증가(또는 감소)합니다.' })
  }

  const shapeOk = choice === p.correct
  if (!shapeOk) ok = false
  lines.push({
    ok: shapeOk,
    text: shapeOk
      ? '개형 선택 정답! f′(x)의 부호(+: 증가, −: 감소)를 따라 올바른 개형을 골랐어요.'
      : choice === null
        ? '개형을 선택하지 않았어요. f′ > 0인 구간에서 증가, f′ < 0인 구간에서 감소하는 그래프를 찾아보세요.'
        : '개형이 달라요. f′ > 0인 구간에서 증가, f′ < 0인 구간에서 감소하는지 확인해 보세요.',
  })
  return { ok, lines }
}

const HINTS = [
  '',
  'f′(x)의 그래프가 x축과 만나는 점(f′(x)=0)을 먼저 찾아보세요. 그 점의 앞뒤에서 부호가 바뀌는지가 핵심입니다.',
  '점선이 f′(x)=0인 곳이에요. 그중 부호가 바뀌는 곳만 극값이고, + → − 면 극대, − → + 면 극소입니다.',
]

export default function Quiz({ onOpenViz }: { onOpenViz?: (f: Coeffs) => void }) {
  const [level, setLevel] = useState<Difficulty>('basic')
  const [problem, setProblem] = useState<Problem>(() => makeProblem('basic'))
  const [markers, setMarkers] = useState<Marker[]>([])
  const [tool, setTool] = useState<Tool>('max')
  const [choice, setChoice] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [hint, setHint] = useState(0)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const resultRef = useRef<HTMLDivElement>(null)
  const { h } = useWindowSize()

  const view = useMemo(() => focusView(problem.deriv, XMIN, XMAX), [problem])
  const fView = useMemo(() => focusView(problem.f, XMIN, XMAX), [problem])
  const chartH = Math.round(clamp(h * 0.42, 230, 340))

  const g = (x: number) => evalPoly(problem.deriv, x)

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [result])

  const next = (lv: Difficulty = level) => {
    setProblem(makeProblem(lv))
    setMarkers([])
    setChoice(null)
    setResult(null)
    setHint(0)
  }

  const changeLevel = (lv: Difficulty) => {
    setLevel(lv)
    next(lv)
  }

  /** 빈 곳을 탭하면 마커 추가, 이미 있는 마커를 탭하면 (다른 도구면 종류 변경 / 같은 도구면 삭제) */
  const place = (x: number) => {
    if (result) return
    const sx = snap(x)
    setMarkers((ms) => {
      const ex = ms.find((m) => m.x === sx)
      if (!ex) return [...ms, { x: sx, type: tool }]
      if (ex.type !== tool) return ms.map((m) => (m.x === sx ? { ...m, type: tool } : m))
      return ms.filter((m) => m.x !== sx)
    })
  }

  const submit = () => {
    const r = grade(problem, markers, choice)
    setResult(r)
    setScore((s) => ({ right: s.right + (r.ok ? 1 : 0), total: s.total + 1 }))
  }

  const draw = (ctx: CanvasRenderingContext2D, tf: Tf) => {
    drawGrid(ctx, tf)
    fillSign(ctx, tf, g)
    plotFn(ctx, tf, g, COLORS.curve, 2.5)

    // 마커를 놓을 수 있는 0.5 단위 눈금
    ctx.save()
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1
    for (let x = -4.5; x <= 4.5; x += 0.5) {
      const px = tf.X(x)
      const len = Number.isInteger(x) ? 6 : 3.5
      ctx.beginPath()
      ctx.moveTo(px, tf.Y(0) - len)
      ctx.lineTo(px, tf.Y(0) + len)
      ctx.stroke()
    }
    ctx.restore()

    if (hover !== null && !result) vLine(ctx, tf, hover, '#64748b', [3, 3], 1.2)
    if (hint >= 2 && !result) {
      problem.crit.forEach((c) => vLine(ctx, tf, c.x, '#a5b4fc', [6, 5], 1.5))
    }
    if (result) {
      problem.crit.forEach((c) => vLine(ctx, tf, c.x, c.type === 'flat' ? COLORS.amber : COLORS.guide))
      // 정답 공개 후에는 부호 기호도 보여 준다
      const xs = [XMIN, ...problem.crit.map((c) => c.x), XMAX]
      for (let i = 0; i + 1 < xs.length; i++) {
        if (xs[i + 1] - xs[i] < 0.5) continue
        const mid = (xs[i] + xs[i + 1]) / 2
        const s = Math.sign(g(mid))
        label(ctx, s > 0 ? '+' : '−', tf.X(mid), tf.Y(0) + (s > 0 ? -12 : 26), s > 0 ? COLORS.pos : COLORS.neg, 'center', '800 22px system-ui')
      }
    }
    markers.forEach((m) => {
      const px = tf.X(m.x)
      const py = tf.Y(0)
      ctx.save()
      ctx.fillStyle = m.type === 'max' ? COLORS.neg : COLORS.pos
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      if (m.type === 'max') {
        ctx.moveTo(px, py - 22)
        ctx.lineTo(px - 12, py - 2)
        ctx.lineTo(px + 12, py - 2)
      } else {
        ctx.moveTo(px, py + 22)
        ctx.lineTo(px - 12, py + 2)
        ctx.lineTo(px + 12, py + 2)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      label(ctx, m.type === 'max' ? '극대' : '극소', px, m.type === 'max' ? py - 28 : py + 38, m.type === 'max' ? COLORS.neg : COLORS.pos, 'center', '700 13px system-ui')
    })
    label(ctx, 'y = f ′(x)', 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  const drawAnswer = (ctx: CanvasRenderingContext2D, tf: Tf) => {
    drawGrid(ctx, tf)
    problem.crit.forEach((c) => vLine(ctx, tf, c.x, c.type === 'flat' ? COLORS.amber : COLORS.guide))
    plotFn(ctx, tf, (x) => evalPoly(problem.f, x), COLORS.curve, 3)
    problem.crit.forEach((c) => {
      dot(ctx, tf, c.x, c.y, 6, c.type === 'max' ? COLORS.neg : c.type === 'min' ? COLORS.pos : COLORS.amber)
      if (c.type !== 'flat') label(ctx, c.type === 'max' ? '극대' : '극소', tf.X(c.x), tf.Y(c.y) + (c.type === 'max' ? -12 : 22), COLORS.axis)
    })
    label(ctx, '정답: y = f(x)', 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] md:gap-4">
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-700">
              <b>문제.</b> <i>y = f ′(x)</i> 의 그래프입니다. 극값의 위치를 표시하고 <i>f(x)</i>의 개형을 고르세요.
            </p>
            <div className="flex items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-bold">
                {(['basic', 'adv'] as const).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => changeLevel(lv)}
                    className={`px-3 py-1.5 ${level === lv ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {lv === 'basic' ? '기본' : '심화'}
                  </button>
                ))}
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {score.right} / {score.total}
              </span>
            </div>
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">표시할 것</span>
            <ToolBtn active={tool === 'max'} onClick={() => setTool('max')} color="red">
              ▲ 극대
            </ToolBtn>
            <ToolBtn active={tool === 'min'} onClick={() => setTool('min')} color="blue">
              ▼ 극소
            </ToolBtn>
            <button
              onClick={() => setHint((n) => Math.min(2, n + 1))}
              disabled={!!result || hint >= 2}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
            >
              <Lightbulb size={15} /> 힌트 {hint}/2
            </button>
            <button
              onClick={() => setMarkers([])}
              disabled={!!result}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Trash2 size={15} /> 지우기
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <GraphCanvas
              view={view}
              height={chartH}
              draw={draw}
              touchAction="none"
              onPointerMove={(p) => setHover(snap(p.x))}
              onPointerLeave={() => setHover(null)}
              onPointerDown={(p) => place(p.x)}
              ariaLabel="도함수 그래프 (탭하여 극값 표시)"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            x축 눈금(0.5 간격) 중 가까운 곳을 탭하면 위에서 고른 마커가 놓여요. 놓인 마커를 다른 종류로 탭하면 바뀌고, 같은 종류로 다시 탭하면 지워집니다.
          </p>
          {hint > 0 && !result && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">💡 {HINTS[hint]}</p>
          )}
        </div>

        {result && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <GraphCanvas view={fView} height={Math.round(chartH * 0.8)} draw={drawAnswer} ariaLabel="정답 원함수 그래프" />
          </div>
        )}
      </section>

      <aside className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-slate-700">f(x)의 개형을 고르세요</h3>
          <div className="grid grid-cols-2 gap-2">
            {problem.options.map((o, i) => {
              const selected = choice === i
              const showRight = result && i === problem.correct
              const showWrong = result && selected && i !== problem.correct
              return (
                <button
                  key={i}
                  disabled={!!result}
                  onClick={() => setChoice(i)}
                  className={`rounded-lg border-2 p-1.5 transition ${
                    showRight
                      ? 'border-green-500 bg-green-50'
                      : showWrong
                        ? 'border-red-500 bg-red-50'
                        : selected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-left text-sm font-bold text-slate-600">{['①', '②', '③', '④'][i]}</span>
                  <MiniShape coeffs={o} />
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={submit}
              disabled={!!result}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-base font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              <Send size={16} /> 제출하고 채점
            </button>
            <button
              onClick={() => next()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw size={16} /> {result ? '다음 문제' : '다른 문제'}
            </button>
          </div>
        </div>

        {result && (
          <div
            ref={resultRef}
            className={`animate-pop-in rounded-xl border p-4 shadow-sm ${result.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
          >
            <p className={`mb-2 flex items-center gap-1.5 text-base font-extrabold ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
              {result.ok ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              {result.ok ? '정답입니다!' : '아쉬워요, 해설을 확인해 보세요.'}
            </p>
            <ul className="space-y-1.5 text-sm leading-relaxed">
              {result.lines.map((l, i) => (
                <li key={i} className={`flex gap-1.5 ${l.ok ? 'text-slate-700' : 'text-red-700'}`}>
                  <span className="mt-0.5 shrink-0">{l.ok ? '✔' : '✘'}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="mb-1.5 text-xs font-bold text-slate-600">증감표</p>
              <div className="rounded-lg bg-white">
                <SignTable f={problem.f} />
              </div>
              <p className="mt-2 font-mono text-xs text-slate-500">f′(x) = {formatPoly(problem.deriv)}</p>
              {onOpenViz && (
                <button
                onClick={() => onOpenViz(problem.f)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                <LineChart size={15} /> 연동 모드에서 이 함수 살펴보기
              </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

function ToolBtn({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean
  onClick: () => void
  color: 'red' | 'blue'
  children: React.ReactNode
}) {
  const on = color === 'red' ? 'border-red-500 bg-red-50 text-red-700' : 'border-blue-500 bg-blue-50 text-blue-700'
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 px-4 py-1.5 text-sm font-bold ${active ? on : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  )
}

/** 선택지용 작은 그래프 */
function MiniShape({ coeffs }: { coeffs: Coeffs }) {
  const view = useMemo(() => shapeView(coeffs), [coeffs])
  return (
    <GraphCanvas
      view={view}
      height={104}
      touchAction="pan-y"
      cursor="pointer"
      draw={(ctx, tf) => {
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, tf.w, tf.h)
        ctx.strokeStyle = '#cbd5e1'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, tf.Y(0))
        ctx.lineTo(tf.w, tf.Y(0))
        ctx.moveTo(tf.X(0), 0)
        ctx.lineTo(tf.X(0), tf.h)
        ctx.stroke()
        plotFn(ctx, tf, (x) => evalPoly(coeffs, x), COLORS.curve, 2.5)
      }}
    />
  )
}
