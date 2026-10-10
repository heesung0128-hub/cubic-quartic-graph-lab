import { useMemo, useState } from 'react'
import { CheckCircle2, RotateCcw, Send, Trash2, XCircle } from 'lucide-react'
import GraphCanvas from '../components/GraphCanvas'
import {
  COLORS,
  dot,
  drawGrid,
  fillSign,
  label,
  plotFn,
  polyView,
  vLine,
  type Tf,
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

const XMIN = -5
const XMAX = 5

type Tool = 'max' | 'min'
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

const rnd = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

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

function randomDeriv(): { deriv: Coeffs } {
  const sign = rnd([1, -1])
  const scale = rnd([0.5, 1, 1.5])
  const kind = rnd(['c2', 'c2', 'c2d', 'q3', 'q3', 'q3', 'q21', 'q1c'] as const)
  let roots: number[]
  let extra: Coeffs = [1]
  switch (kind) {
    case 'c2': // 삼차함수: 서로 다른 두 근
      roots = pickRoots(2)
      break
    case 'c2d': // 삼차함수: 중근 (극값 없음)
      roots = [rnd([-2, -1, 0, 1, 2]), 0]
      roots[1] = roots[0]
      break
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
  return { deriv }
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

function makeProblem(): Problem {
  const { deriv } = randomDeriv()
  const f = integrate(deriv)
  const crit = criticalPoints(f)
  const options: Coeffs[] = [f]
  for (const cand of [f.map((c) => -c), mirrorX(f), mirrorX(f).map((c) => -c)]) {
    if (distinct(cand, options)) options.push(cand)
  }
  let guard = 0
  while (options.length < 4 && guard++ < 40) {
    const alt = integrate(randomDeriv().deriv)
    if (alt.length === f.length && distinct(alt, options)) options.push(alt)
  }
  const shuffled = options
    .map((o, i) => ({ o, i, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
  return {
    deriv,
    f,
    crit,
    options: shuffled.map((s) => s.o),
    correct: shuffled.findIndex((s) => s.i === 0),
  }
}

const snap = (x: number) => Math.max(-4.5, Math.min(4.5, Math.round(x * 2) / 2))

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
    if (!real.some((c) => Math.abs(c.x - m.x) < 0.26) && !p.crit.some((c) => Math.abs(c.x - m.x) < 0.26)) {
      ok = false
      lines.push({
        ok: false,
        text: `x = ${fmt(m.x, 1)}에서는 f′(x) = 0이 아니므로 극값이 될 수 없습니다.`,
      })
    }
  }
  if (real.length === 0 && markers.length === 0) {
    lines.push({ ok: true, text: "f′(x)의 부호가 바뀌는 점이 없으므로 극값이 없고, 함수는 한 방향으로만 증가(또는 감소)합니다." })
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

export default function Quiz() {
  const [problem, setProblem] = useState<Problem>(makeProblem)
  const [markers, setMarkers] = useState<Marker[]>([])
  const [tool, setTool] = useState<Tool>('max')
  const [choice, setChoice] = useState<number | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })

  const view = useMemo(() => polyView(problem.deriv, XMIN, XMAX, 25, 6), [problem])
  const fView = useMemo(() => polyView(problem.f, XMIN, XMAX, 30, 6), [problem])

  const g = (x: number) => evalPoly(problem.deriv, x)

  const next = () => {
    setProblem(makeProblem())
    setMarkers([])
    setChoice(null)
    setResult(null)
  }

  const place = (x: number) => {
    if (result) return
    const sx = snap(x)
    setMarkers((ms) =>
      ms.some((m) => m.x === sx) ? ms.filter((m) => m.x !== sx) : [...ms, { x: sx, type: tool }],
    )
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
    if (hover !== null && !result) vLine(ctx, tf, hover, '#94a3b8', [3, 3], 1.2)
    if (result) {
      problem.crit.forEach((c) => vLine(ctx, tf, c.x, c.type === 'flat' ? COLORS.amber : COLORS.guide))
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
        ctx.moveTo(px, py - 16)
        ctx.lineTo(px - 9, py - 1)
        ctx.lineTo(px + 9, py - 1)
      } else {
        ctx.moveTo(px, py + 16)
        ctx.lineTo(px - 9, py + 1)
        ctx.lineTo(px + 9, py + 1)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
      label(ctx, m.type === 'max' ? '극대' : '극소', px, m.type === 'max' ? py - 21 : py + 31, m.type === 'max' ? COLORS.neg : COLORS.pos)
    })
    label(ctx, "y = f ′(x)", 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  const drawAnswer = (ctx: CanvasRenderingContext2D, tf: Tf) => {
    drawGrid(ctx, tf)
    problem.crit.forEach((c) => vLine(ctx, tf, c.x, c.type === 'flat' ? COLORS.amber : COLORS.guide))
    plotFn(ctx, tf, (x) => evalPoly(problem.f, x), COLORS.curve, 3)
    problem.crit.forEach((c) => {
      dot(ctx, tf, c.x, c.y, 6, c.type === 'max' ? COLORS.neg : c.type === 'min' ? COLORS.pos : COLORS.amber)
      if (c.type !== 'flat') label(ctx, c.type === 'max' ? '극대' : '극소', tf.X(c.x), tf.Y(c.y) + (c.type === 'max' ? -12 : 20), COLORS.axis)
    })
    label(ctx, '정답: y = f(x)', 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-700">
              <b>문제.</b> 아래는 도함수 <i>y = f ′(x)</i> 의 그래프입니다. 극값의 위치에 마커를 놓고 <i>f(x)</i>의 개형을 고르세요.
            </p>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
              {score.right} / {score.total} 정답
            </span>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">마커 도구</span>
            <ToolBtn active={tool === 'max'} onClick={() => setTool('max')} color="red">
              ▲ 극대
            </ToolBtn>
            <ToolBtn active={tool === 'min'} onClick={() => setTool('min')} color="blue">
              ▼ 극소
            </ToolBtn>
            <button
              onClick={() => setMarkers([])}
              disabled={!!result}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Trash2 size={13} /> 마커 지우기
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <GraphCanvas
              view={view}
              height={300}
              draw={draw}
              onPointerMove={(p) => setHover(snap(p.x))}
              onPointerLeave={() => setHover(null)}
              onPointerDown={(p) => place(p.x)}
              ariaLabel="도함수 그래프 (클릭하여 마커 배치)"
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            그래프를 클릭하면 가장 가까운 0.5 단위 x좌표에 마커가 놓입니다. 같은 자리를 다시 클릭하면 삭제됩니다.
          </p>
        </div>

        {result && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <GraphCanvas view={fView} height={240} draw={drawAnswer} ariaLabel="정답 원함수 그래프" />
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
                  className={`rounded-lg border-2 p-1 transition ${
                    showRight
                      ? 'border-green-500 bg-green-50'
                      : showWrong
                        ? 'border-red-500 bg-red-50'
                        : selected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-left text-xs font-bold text-slate-500">
                    {['①', '②', '③', '④'][i]}
                  </span>
                  <MiniShape coeffs={o} />
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={submit}
              disabled={!!result}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              <Send size={15} /> 제출하고 채점
            </button>
            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw size={15} /> {result ? '다음 문제' : '다른 문제'}
            </button>
          </div>
        </div>

        {result && (
          <div
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
            <p className="mt-3 border-t border-slate-200 pt-2 font-mono text-xs text-slate-500">
              f′(x) = {formatPoly(problem.deriv)}
            </p>
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
      className={`rounded-lg border-2 px-3 py-1 text-xs font-bold ${active ? on : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  )
}

/** 선택지용 작은 그래프 */
function MiniShape({ coeffs }: { coeffs: Coeffs }) {
  const view = useMemo(() => polyView(coeffs, XMIN, XMAX, 30, 1), [coeffs])
  return (
    <GraphCanvas
      view={view}
      height={96}
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
