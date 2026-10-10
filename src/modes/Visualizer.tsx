import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import GraphCanvas from '../components/GraphCanvas'
import CoefficientPanel from '../components/CoefficientPanel'
import PresetPicker from '../components/PresetPicker'
import SignTable from '../components/SignTable'
import {
  COLORS,
  dot,
  drawGrid,
  fillSign,
  label,
  plotFn,
  plotFnBySign,
  focusView,
  vLine,
  type Tf,
} from '../utils/draw'
import {
  criticalPoints,
  cubicDiscriminantQuarter,
  derivative,
  evalPoly,
  fmt,
  formatPoly,
  inflectionPoints,
  type Coeffs,
} from '../utils/math'
import { clamp, useWindowSize } from '../utils/hooks'
import { CUBIC_PRESETS, QUARTIC_PRESETS } from '../utils/presets'

const XMIN = -4
const XMAX = 4

export default function Visualizer({ initial }: { initial?: Coeffs }) {
  const [coeffs, setCoeffs] = useState<Coeffs>(initial ?? CUBIC_PRESETS[0].coeffs)
  const [cx, setCx] = useState(0.6)
  const { w, h } = useWindowSize()

  const small = w < 768
  const topH = Math.round(small ? clamp(h * 0.2, 120, 190) : clamp(h * 0.26, 150, 240))
  const botH = Math.round(small ? clamp(h * 0.27, 150, 240) : clamp(h * 0.34, 190, 320))

  const deg = coeffs.length - 1
  const fp = useMemo(() => derivative(coeffs), [coeffs])
  const crit = useMemo(() => criticalPoints(coeffs), [coeffs])
  const infl = useMemo(() => inflectionPoints(coeffs), [coeffs])
  const topView = useMemo(() => focusView(fp, XMIN, XMAX), [fp])
  const botView = useMemo(() => focusView(coeffs, XMIN, XMAX), [coeffs])

  const f = (x: number) => evalPoly(coeffs, x)
  const g = (x: number) => evalPoly(fp, x)
  const trackX = clamp(cx, XMIN, XMAX)
  const slope = g(trackX)

  const presets = deg === 3 ? CUBIC_PRESETS : QUARTIC_PRESETS

  // f′의 부호가 일정한 구간들의 가운데 x좌표 (+/−, ↗/↘ 기호를 놓을 위치)
  const segments = useMemo(() => {
    const bounds = [XMIN, ...crit.map((c) => c.x).filter((x) => x > XMIN && x < XMAX), XMAX]
    const out: { mid: number; sign: number }[] = []
    for (let i = 0; i + 1 < bounds.length; i++) {
      if (bounds[i + 1] - bounds[i] < 0.5) continue
      const mid = (bounds[i] + bounds[i + 1]) / 2
      out.push({ mid, sign: Math.sign(evalPoly(fp, mid)) })
    }
    return out
  }, [crit, fp])

  const changeDegree = (d: 3 | 4) => {
    const p = (d === 3 ? CUBIC_PRESETS : QUARTIC_PRESETS)[0]
    setCoeffs(p.coeffs)
  }

  const guides = (ctx: CanvasRenderingContext2D, tf: Tf) => {
    crit.forEach((c) => {
      if (c.x >= XMIN && c.x <= XMAX) vLine(ctx, tf, c.x, c.type === 'flat' ? COLORS.amber : COLORS.guide)
    })
  }

  const cursorLine = (ctx: CanvasRenderingContext2D, tf: Tf) => vLine(ctx, tf, trackX, '#0f172a', [2, 3], 1.2)

  const drawTop = (ctx: CanvasRenderingContext2D, tf: Tf) => {
    drawGrid(ctx, tf)
    fillSign(ctx, tf, g)
    guides(ctx, tf)
    plotFn(ctx, tf, g, COLORS.curve, 2.5)
    // 부호 기호 (색만으로 구분하지 않도록)
    segments.forEach((s) => {
      const py = tf.Y(0) + (s.sign > 0 ? -14 : 24)
      label(ctx, s.sign > 0 ? '+' : '−', tf.X(s.mid), Math.max(22, Math.min(tf.h - 6, py)), s.sign > 0 ? COLORS.pos : COLORS.neg, 'center', '800 22px system-ui')
    })
    cursorLine(ctx, tf)
    crit.forEach((c) => dot(ctx, tf, c.x, 0, 4.5, c.type === 'flat' ? COLORS.amber : COLORS.guide))
    dot(ctx, tf, trackX, g(trackX), 6, slope > 0 ? COLORS.pos : slope < 0 ? COLORS.neg : COLORS.axis)
    label(ctx, 'y = f ′(x)', 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  const drawBottom = (ctx: CanvasRenderingContext2D, tf: Tf) => {
    drawGrid(ctx, tf)
    guides(ctx, tf)
    plotFnBySign(ctx, tf, f, g, 3.5)
    segments.forEach((s) => {
      const py = tf.Y(f(s.mid)) + (s.sign > 0 ? -16 : -16)
      label(ctx, s.sign > 0 ? '↗ 증가' : '↘ 감소', tf.X(s.mid), Math.max(18, Math.min(tf.h - 8, py)), s.sign > 0 ? COLORS.pos : COLORS.neg, 'center', '700 13px system-ui')
    })
    cursorLine(ctx, tf)
    crit.forEach((c) => {
      if (c.x < XMIN || c.x > XMAX) return
      if (c.type === 'flat') {
        dot(ctx, tf, c.x, c.y, 5, COLORS.amber)
        return
      }
      dot(ctx, tf, c.x, c.y, 6, c.type === 'max' ? COLORS.neg : COLORS.pos)
      label(ctx, c.type === 'max' ? '극대' : '극소', tf.X(c.x), tf.Y(c.y) + (c.type === 'max' ? -28 : 22), COLORS.axis)
    })
    infl.forEach((p) => {
      if (p.x >= XMIN && p.x <= XMAX) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(tf.X(p.x) - 4, tf.Y(p.y) - 4, 8, 8)
        ctx.strokeStyle = COLORS.green
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()
      }
    })
    dot(ctx, tf, trackX, f(trackX), 6.5, slope > 0 ? COLORS.pos : slope < 0 ? COLORS.neg : COLORS.axis)
    label(ctx, 'y = f(x)', 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  const onMove = (p: { x: number }) => setCx(p.x)

  const trend =
    Math.abs(slope) < 0.02 ? (
      <span className="inline-flex items-center gap-1 text-amber-600">
        <Minus size={16} /> f′ = 0
      </span>
    ) : slope > 0 ? (
      <span className="inline-flex items-center gap-1 text-blue-600">
        <ArrowUpRight size={16} /> f′ &gt; 0 증가
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-red-600">
        <ArrowDownRight size={16} /> f′ &lt; 0 감소
      </span>
    )

  const dq = cubicDiscriminantQuarter(coeffs)

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] md:gap-4">
      {/* 그래프: 화면 위에 고정되어, 아래 조절판을 만지는 동안에도 계속 보인다 */}
      <section className="sticky top-0 z-10 -mx-4 self-start bg-slate-50 px-4 pb-2 md:top-2 md:col-start-2 md:row-start-1 md:mx-0 md:bg-transparent md:px-0 md:pb-0">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <GraphCanvas view={topView} height={topH} draw={drawTop} onPointerMove={onMove} ariaLabel="도함수 그래프" />
          <div className="h-px bg-slate-200" />
          <GraphCanvas view={botView} height={botH} draw={drawBottom} onPointerMove={onMove} ariaLabel="원함수 그래프" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-sm tabular-nums text-slate-700">
            <b>x = {fmt(trackX)}</b>
            <span>f′ = {fmt(slope)}</span>
            <span>f = {fmt(f(trackX))}</span>
            <span className="font-bold">{trend}</span>
            <span className="ml-auto hidden text-xs text-slate-400 sm:inline">그래프를 만지며 좌우로 움직여 보세요</span>
          </div>
        </div>
      </section>

      <aside className="space-y-3 md:col-start-1 md:row-start-1 md:space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-slate-700">증감표</h3>
          <p className="mb-2 text-xs text-slate-400">노란 칸이 지금 커서가 있는 구간입니다.</p>
          <SignTable f={coeffs} highlightX={trackX} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-slate-700">개형 프리셋</h3>
          <div className="mb-2 text-xs font-semibold text-slate-500">
            {deg === 3 ? '삼차: 판별식 D = b²−3ac 의 부호' : '사차: f′(x)=0의 실근 구조'}
          </div>
          <PresetPicker presets={presets} coeffs={coeffs} onSelect={(p) => setCoeffs(p.coeffs)} />
        </div>

        <CoefficientPanel coeffs={coeffs} onChange={setCoeffs} onDegreeChange={changeDegree} />

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="mb-1 font-bold text-slate-700">f′(x) = {formatPoly(fp)}</p>
          {deg === 3 && (
            <p className="text-slate-600">
              D/4 = b²−3ac = <b className="tabular-nums">{fmt(dq)}</b> {dq > 1e-9 ? '(> 0)' : Math.abs(dq) <= 1e-9 ? '(= 0)' : '(< 0)'}
            </p>
          )}
          <ul className="mt-1 space-y-0.5 text-slate-600">
            {crit.length === 0 && <li>f′(x)=0인 실근이 없음 → 극값 없음</li>}
            {infl.map((p) => (
              <li key={`i${p.x}`} className="text-green-700">
                변곡점 ({fmt(p.x)}, {fmt(p.y)})
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <Legend color="bg-blue-500" text="f′ > 0 (+, ↗)" />
            <Legend color="bg-red-500" text="f′ < 0 (−, ↘)" />
            <Legend color="bg-indigo-500" text="f′ = 0" />
            <Legend color="bg-amber-500" text="극값 아닌 f′=0" />
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 border-2 border-green-600" /> 변곡점
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      {text}
    </span>
  )
}
